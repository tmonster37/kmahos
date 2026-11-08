declare const require: (moduleId: string) => {
  readFileSync: (filePath: string, encoding: string) => string;
  resolve: (...segments: string[]) => string;
  join: (...segments: string[]) => string;
};
declare const __dirname: string;

const FORBIDDEN_KEY_PATTERN =
  /(SECRET|PASSWORD|PRIVATE_KEY|CLIENT_SECRET|CHECKSUM_KEY|API_KEY|ACCESS_TOKEN|REFRESH_TOKEN|JWT_SECRET|PAYOS_API_KEY|PAYOS_CHECKSUM_KEY)/i;

const FORBIDDEN_VALUE_PATTERN =
  /(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|sk_live_[A-Za-z0-9]+|SENTINEL_SECRET_[A-Za-z0-9_]+)/;

function inspectObject(obj: unknown, sourceName: string): string[] {
  const violations: string[] = [];

  function walk(val: unknown, currentPath: string) {
    if (val == null) return;
    if (typeof val === 'string') {
      if (FORBIDDEN_VALUE_PATTERN.test(val)) {
        violations.push(`${sourceName}:${currentPath} contains forbidden value`);
      }
      return;
    }
    if (Array.isArray(val)) {
      val.forEach((item, idx) => walk(item, `${currentPath}[${idx}]`));
      return;
    }
    if (typeof val === 'object') {
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        const nextPath = currentPath ? `${currentPath}.${k}` : k;
        if (FORBIDDEN_KEY_PATTERN.test(k)) {
          violations.push(`${sourceName}:${nextPath} uses forbidden secret key`);
        }
        walk(v, nextPath);
      }
    }
  }

  walk(obj, '');
  return violations;
}

describe('release-config security check', () => {
  it('releaseConfigContainsNoSecrets', () => {
    const fs = require('fs');
    const path = require('path');
    const rootDir = path.resolve(__dirname, '../../..');
    const appJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'app.json'), 'utf8'));
    const easJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'eas.json'), 'utf8'));
    const envExample = fs.readFileSync(path.join(rootDir, '.env.example'), 'utf8');

    expect(inspectObject(appJson, 'app.json')).toEqual([]);
    expect(inspectObject(easJson, 'eas.json')).toEqual([]);

    for (const rawLine of envExample.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const [key = '', val = ''] = line.split('=');
      expect(FORBIDDEN_KEY_PATTERN.test(key.trim())).toBe(false);
      expect(FORBIDDEN_VALUE_PATTERN.test(val.trim())).toBe(false);
    }

    const sentinelViolations = inspectObject(
      { extra: { PAYOS_API_KEY: 'SENTINEL_SECRET_999' } },
      'sentinel'
    );
    expect(sentinelViolations.length).toBeGreaterThan(0);
  });
});
