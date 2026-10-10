# ==============================================================================
# KMA HOSPITAL MANAGEMENT SYSTEM (HMS)
# POSTGRESQL DISASTER RECOVERY & RESTORE SCRIPT (POWERSHELL)
# ==============================================================================

[CmdletBinding()]
param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$DbName = "",
    [string]$DbUser = "",
    [string]$DbPass = "",
    [string]$DbHost = "",
    [int]$DbPort = 5432,
    [switch]$Force
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$EnvFile = Join-Path $RootDir ".env"

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

if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup file '$BackupFile' does not exist!"
    exit 1
}

# Verify SHA256 Checksum if present
$shaFile = $BackupFile + ".sha256"
if (Test-Path $shaFile) {
    Write-Host "Verifying SHA256 checksum integrity..."
    $expectedHash = (Get-Content $shaFile).Split(" ")[0].Trim().ToUpper()
    $actualHash = (Get-FileHash -Path $BackupFile -Algorithm SHA256).Hash.ToUpper()
    if ($expectedHash -ne $actualHash) {
        Write-Error "CHECKSUM MISMATCH! Backup file may be corrupted."
        exit 1
    }
    Write-Host "Checksum verification PASSED."
}

if (-not $Force) {
    $confirm = Read-Host "WARNING: This will overwrite data in database '$DbName'. Continue? (y/N)"
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        Write-Host "Restore operation aborted by user."
        exit 0
    }
}

$pgRestoreCmd = "pg_restore"
if (-not (Get-Command "pg_restore" -ErrorAction SilentlyContinue)) {
    $searchPaths = @(
        "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe",
        "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe",
        "C:\Program Files\PostgreSQL\16\bin\pg_restore.exe",
        "C:\Program Files\PostgreSQL\15\bin\pg_restore.exe",
        "C:\Program Files\PostgreSQL\14\bin\pg_restore.exe"
    )
    foreach ($path in $searchPaths) {
        if (Test-Path $path) {
            $pgRestoreCmd = $path
            break
        }
    }
}

Write-Host "Restoring database $DbName from $BackupFile using $pgRestoreCmd..."

$env:PGPASSWORD = $DbPass
try {
    & $pgRestoreCmd -h $DbHost -p $DbPort -U $DbUser -d $DbName --clean --if-exists -v $BackupFile
    Write-Host "DATABASE RESTORE COMPLETED SUCCESSFULLY."
} catch {
    Write-Error "Restore execution failed: $_"
} finally {
    $env:PGPASSWORD = $null
}
