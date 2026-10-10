# ==============================================================================
# KMA HOSPITAL MANAGEMENT SYSTEM (HMS)
# POSTGRESQL AUTOMATED BACKUP SCRIPT FOR WINDOWS SERVER (POWERSHELL)
# ==============================================================================

[CmdletBinding()]
param (
    [string]$DbName = "",
    [string]$DbUser = "",
    [string]$DbPass = "",
    [string]$DbHost = "",
    [int]$DbPort = 5432,
    [string]$BackupDir = "",
    [int]$RetentionDays = 30
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$EnvFile = Join-Path $RootDir ".env"

# 1. Load environment variables from .env
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if (-not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $name = $parts[0].Trim()
            $val = $parts[1].Trim()
            if (-not [Environment]::GetEnvironmentVariable($name)) {
                [Environment]::SetEnvironmentVariable($name, $val, "Process")
            }
        }
    }
}

if (-not $DbName) { $DbName = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "kmahos" } }
if (-not $DbUser) { $DbUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "postgres" } }
if (-not $DbPass) { $DbPass = if ($env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD } else { "postgres" } }
if (-not $DbHost) { $DbHost = if ($env:POSTGRES_HOST) { $env:POSTGRES_HOST } else { "localhost" } }
if (-not $BackupDir) { $BackupDir = Join-Path $RootDir "backups" }

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir ("backup_" + $DbName + "_" + $Timestamp + ".dump")
$LogFile = Join-Path $BackupDir "backup.log"

function Write-BackupLog {
    param([string]$Message)
    $Formatted = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Write-Host $Formatted
    Add-Content -Path $LogFile -Value $Formatted
}

Write-BackupLog "=========================================================="
Write-BackupLog "STARTING DATABASE BACKUP: $DbName at ${DbHost}:${DbPort}"

$env:PGPASSWORD = $DbPass

# Search pg_dump in standard paths or system PATH
$pgDumpCmd = "pg_dump"
if (-not (Get-Command "pg_dump" -ErrorAction SilentlyContinue)) {
    $searchPaths = @(
        "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe"
    )
    foreach ($path in $searchPaths) {
        if (Test-Path $path) {
            $pgDumpCmd = $path
            break
        }
    }
}

Write-BackupLog "Using pg_dump binary: $pgDumpCmd"

try {
    & $pgDumpCmd -h $DbHost -p $DbPort -U $DbUser -F c -b -f $BackupFile $DbName
    if ($LASTEXITCODE -eq 0 -and (Test-Path $BackupFile)) {
        $sizeMB = [math]::Round(((Get-Item $BackupFile).Length / 1MB), 2)
        Write-BackupLog "SUCCESS: Created backup file $BackupFile (Size: $sizeMB MB)"
        
        # Calculate SHA256 Checksum
        $hash = (Get-FileHash -Path $BackupFile -Algorithm SHA256).Hash
        $shaPath = $BackupFile + ".sha256"
        $fileName = [System.IO.Path]::GetFileName($BackupFile)
        Set-Content -Path $shaPath -Value "$hash *$fileName"
        Write-BackupLog "SUCCESS: Generated SHA256 checksum at $shaPath"
    } else {
        Write-BackupLog "ERROR: pg_dump failed with exit code $LASTEXITCODE"
        exit 1
    }
} catch {
    Write-BackupLog "EXCEPTION: $_"
    exit 1
} finally {
    $env:PGPASSWORD = $null
}

# Cleanup backups older than RetentionDays
$cutOffDate = (Get-Date).AddDays(-$RetentionDays)
$filterPattern = "backup_" + $DbName + "_*.*"
$oldFiles = Get-ChildItem -Path $BackupDir -Filter $filterPattern | Where-Object { $_.LastWriteTime -lt $cutOffDate }
if ($oldFiles) {
    $oldFiles | Remove-Item -Force
    $cleanedCount = $oldFiles.Count
    Write-BackupLog "Cleaned up $cleanedCount expired backup files older than $RetentionDays days."
} else {
    Write-BackupLog "No expired backup files exceeding $RetentionDays days retention limit."
}

Write-BackupLog "DATABASE BACKUP COMPLETED SUCCESSFULLY."
Write-BackupLog "=========================================================="
exit 0
