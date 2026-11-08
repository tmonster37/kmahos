import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkMobilePublicConfig,
  inspectEnvFileContent,
  inspectPublicConfigObject,
} from '../check-public-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '../..');

test('releaseConfigContainsNoSecrets passes on repository public configs', () => {
  const violations = checkMobilePublicConfig(mobileRoot);
  assert.deepEqual(violations, []);
});

test('releaseConfigContainsNoSecrets catches sentinel secret keys and values', () => {
  const badConfig = {
    expo: {
      extra: {
        PAYOS_CHECKSUM_KEY: 'SENTINEL_SECRET_TEST_VALUE',
      },
    },
  };
  const configViolations = inspectPublicConfigObject(badConfig, 'app.json');
  assert.equal(configViolations.length >= 1, true);

  const badEnv = 'EXPO_PUBLIC_API_URL=http://10.0.2.2:8080\nEXPO_PUBLIC_JWT_SECRET=SENTINEL_SECRET_123';
  const envViolations = inspectEnvFileContent(badEnv, '.env.example');
  assert.equal(envViolations.length >= 1, true);
});

