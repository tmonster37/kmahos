import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FORBIDDEN_KEY_PATTERN =
  /(SECRET|PASSWORD|PRIVATE_KEY|CLIENT_SECRET|CHECKSUM_KEY|API_KEY|ACCESS_TOKEN|REFRESH_TOKEN|JWT_SECRET|PAYOS_API_KEY|PAYOS_CHECKSUM_KEY)/i;

const FORBIDDEN_VALUE_PATTERN =
  /(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|sk_live_[A-Za-z0-9]+|SENTINEL_SECRET_[A-Za-z0-9_]+)/;

export function inspectPublicConfigObject(obj, sourceName = 'config') {
  const violations = [];

  function walk(value, currentPath) {
    if (value == null) return;
    if (typeof value === 'string') {
      if (FORBIDDEN_VALUE_PATTERN.test(value)) {
        violations.push(`${sourceName}:${currentPath} contains a forbidden secret value pattern`);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, idx) => walk(item, `${currentPath}[${idx}]`));
      return;
    }
    if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        const nextPath = currentPath ? `${currentPath}.${k}` : k;
        if (FORBIDDEN_KEY_PATTERN.test(k)) {
          violations.push(`${sourceName}:${nextPath} uses a forbidden secret key name`);
        }
        walk(v, nextPath);
      }
    }
  }

  walk(obj, '');
  return violations;
}

export function inspectEnvFileContent(content, sourceName = '.env.example') {
  const violations = [];
  const lines = String(content).split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();

    if (FORBIDDEN_KEY_PATTERN.test(key)) {
      violations.push(`${sourceName}:${key} uses a forbidden secret variable name`);
    }
    if (FORBIDDEN_VALUE_PATTERN.test(val)) {
      violations.push(`${sourceName}:${key} contains a forbidden secret value pattern`);
    }
  }

  return violations;
}

export function checkMobilePublicConfig(rootDir) {
  const appJsonPath = path.join(rootDir, 'app.json');
  const easJsonPath = path.join(rootDir, 'eas.json');
  const envExamplePath = path.join(rootDir, '.env.example');

  const violations = [];

  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    violations.push(...inspectPublicConfigObject(appJson, 'app.json'));
  } else {
    violations.push('Missing app.json');
  }

  if (fs.existsSync(easJsonPath)) {
    const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
    violations.push(...inspectPublicConfigObject(easJson, 'eas.json'));
  } else {
    violations.push('Missing eas.json');
  }

  if (fs.existsSync(envExamplePath)) {
    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    violations.push(...inspectEnvFileContent(envContent, '.env.example'));
  } else {
    violations.push('Missing .env.example');
  }

  return violations;
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFilePath)) {
  const mobileRoot = path.resolve(path.dirname(currentFilePath), '..');
  const found = checkMobilePublicConfig(mobileRoot);
  if (found.length > 0) {
    console.error('Public configuration check failed:\n' + found.join('\n'));
    process.exit(1);
  }
  console.log('Public configuration check passed: 0 secret leaks detected.');
}

