#!/usr/bin/env node
/**
 * scripts/generate-brand-tokens.mjs
 * 
 * Generates verified platform-specific brand token adapters for web and mobile
 * from the neutral single source of truth at shared/brand/brand-tokens.json.
 * Also verifies SHA-256 logo parity between hospital-ui and hospital-mobile.
 * 
 * Usage:
 *   node scripts/generate-brand-tokens.mjs          # Generate & sync
 *   node scripts/generate-brand-tokens.mjs --check  # Fail if drifted
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const isCheckMode = process.argv.includes('--check');

const SOURCE_TOKENS_PATH = path.join(rootDir, 'shared', 'brand', 'brand-tokens.json');
const CANONICAL_LOGO_PATH = path.join(rootDir, 'hospital-ui', 'public', 'images', 'logo.png');
const MOBILE_LOGO_PATH = path.join(rootDir, 'hospital-mobile', 'assets', 'images', 'brand-logo.png');

const WEB_TARGET_PATH = path.join(rootDir, 'hospital-ui', 'src', 'theme', 'brandTokens.generated.js');
const MOBILE_TARGET_PATH = path.join(rootDir, 'hospital-mobile', 'src', 'theme', 'brandTokens.generated.ts');

function sha256File(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizeContent(str) {
  return str.replace(/\r\n/g, '\n').trim();
}

// 1. Read & Validate Source Tokens
if (!fs.existsSync(SOURCE_TOKENS_PATH)) {
  console.error(`[ERROR] Missing source tokens file: ${SOURCE_TOKENS_PATH}`);
  process.exit(1);
}

const rawJson = fs.readFileSync(SOURCE_TOKENS_PATH, 'utf8');
let tokens;
try {
  tokens = JSON.parse(rawJson);
} catch (err) {
  console.error(`[ERROR] Invalid JSON in ${SOURCE_TOKENS_PATH}:`, err.message);
  process.exit(1);
}

// 2. Prepare Generated Contents
const jsonFormatted = JSON.stringify(tokens, null, 2);

const webOutput = `/**
 * AUTO-GENERATED from shared/brand/brand-tokens.json.
 * DO NOT EDIT DIRECTLY. Run: node scripts/generate-brand-tokens.mjs
 */

export const brandTokens = ${jsonFormatted};

export default brandTokens;
`;

const mobileOutput = `/**
 * AUTO-GENERATED from shared/brand/brand-tokens.json.
 * DO NOT EDIT DIRECTLY. Run: node scripts/generate-brand-tokens.mjs
 */

export const brandTokens = ${jsonFormatted} as const;

export type BrandTokens = typeof brandTokens;

export default brandTokens;
`;

// 3. Check Mode or Generation Mode
let hasDrift = false;

// Validate logo parity
const canonicalLogoHash = sha256File(CANONICAL_LOGO_PATH);
if (!canonicalLogoHash) {
  console.error(`[ERROR] Canonical logo not found at: ${CANONICAL_LOGO_PATH}`);
  process.exit(1);
}

const mobileLogoHash = sha256File(MOBILE_LOGO_PATH);

if (isCheckMode) {
  console.log('[CHECK] Verifying brand tokens & logo synchronization...');

  // Check Web generated file
  if (!fs.existsSync(WEB_TARGET_PATH)) {
    console.error(`[DRIFT] Missing web tokens file: ${WEB_TARGET_PATH}`);
    hasDrift = true;
  } else {
    const existingWeb = fs.readFileSync(WEB_TARGET_PATH, 'utf8');
    if (normalizeContent(existingWeb) !== normalizeContent(webOutput)) {
      console.error(`[DRIFT] Web tokens file is out of date: ${WEB_TARGET_PATH}`);
      hasDrift = true;
    }
  }

  // Check Mobile generated file
  if (!fs.existsSync(MOBILE_TARGET_PATH)) {
    console.error(`[DRIFT] Missing mobile tokens file: ${MOBILE_TARGET_PATH}`);
    hasDrift = true;
  } else {
    const existingMobile = fs.readFileSync(MOBILE_TARGET_PATH, 'utf8');
    if (normalizeContent(existingMobile) !== normalizeContent(mobileOutput)) {
      console.error(`[DRIFT] Mobile tokens file is out of date: ${MOBILE_TARGET_PATH}`);
      hasDrift = true;
    }
  }

  // Check Logo parity
  if (canonicalLogoHash !== mobileLogoHash) {
    console.error(`[DRIFT] Logo SHA-256 mismatch between canonical web logo and mobile brand-logo.png`);
    console.error(`  Web canonical: ${canonicalLogoHash}`);
    console.error(`  Mobile asset:  ${mobileLogoHash || '<missing>'}`);
    hasDrift = true;
  }

  if (hasDrift) {
    console.error('\n[FAIL] Brand artifacts have drifted. Run "node scripts/generate-brand-tokens.mjs" to synchronize.');
    process.exit(1);
  }

  console.log('[PASS] Brand tokens & logo are 100% in sync across web and mobile.');
  process.exit(0);
}

// Generation Mode
console.log('[GENERATE] Synchronizing brand tokens and assets...');

// Ensure target directories exist
fs.mkdirSync(path.dirname(WEB_TARGET_PATH), { recursive: true });
fs.mkdirSync(path.dirname(MOBILE_TARGET_PATH), { recursive: true });
fs.mkdirSync(path.dirname(MOBILE_LOGO_PATH), { recursive: true });

// Write generated files
fs.writeFileSync(WEB_TARGET_PATH, webOutput, 'utf8');
console.log(`  -> Wrote ${path.relative(rootDir, WEB_TARGET_PATH)}`);

fs.writeFileSync(MOBILE_TARGET_PATH, mobileOutput, 'utf8');
console.log(`  -> Wrote ${path.relative(rootDir, MOBILE_TARGET_PATH)}`);

// Sync Logo
if (canonicalLogoHash !== mobileLogoHash) {
  fs.copyFileSync(CANONICAL_LOGO_PATH, MOBILE_LOGO_PATH);
  console.log(`  -> Copied canonical logo to ${path.relative(rootDir, MOBILE_LOGO_PATH)} (SHA-256: ${canonicalLogoHash})`);
} else {
  console.log(`  -> Mobile logo already matches SHA-256: ${canonicalLogoHash}`);
}

console.log('[SUCCESS] All brand tokens and assets generated successfully.');

