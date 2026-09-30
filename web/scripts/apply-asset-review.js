/**
 * scripts/apply-asset-review.js
 *
 * Đọc file quyết định review (asset-review-decisions.json) và thực hiện:
 *  - Đổi tên ảnh theo userNewName
 *  - Di chuyển ảnh vào thư mục đúng theo userLabel
 *  - Đánh dấu file safe-to-delete-candidate
 *  - Tạo backup trước khi xóa
 *
 * Mặc định chạy DRY-RUN: chỉ báo sẽ làm gì, không thực sự thay đổi file.
 * Để thực sự apply: set env CONFIRM_APPLY_ASSETS=true
 * Để xóa:          set env CONFIRM_DELETE_ASSETS=true
 *
 * Usage:
 *   node scripts/apply-asset-review.js              (dry-run)
 *   CONFIRM_APPLY_ASSETS=true node scripts/apply-asset-review.js  (apply)
 *   CONFIRM_DELETE_ASSETS=true node scripts/apply-asset-review.js  (apply + delete)
 *
 * Windows:
 *   $env:CONFIRM_APPLY_ASSETS="true"; node scripts/apply-asset-review.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WEB_ROOT = path.join(__dirname, '..');
const PUBLIC_IMAGES = path.join(WEB_ROOT, 'public', 'images');
const SCAN_FILE = path.join(PUBLIC_IMAGES, 'asset-review-scan.json');
const DECISIONS_FILE = path.join(PUBLIC_IMAGES, 'asset-review-decisions.json');
const BACKUP_DIR = path.join(WEB_ROOT, 'asset-backup', new Date().toISOString().replace(/[:.]/g, '-'));

const DRY_RUN = process.env.CONFIRM_APPLY_ASSETS !== 'true';
const DO_DELETE = process.env.CONFIRM_DELETE_ASSETS === 'true';

// ── Group → directory mapping ─────────────────────────────
const GROUP_TO_DIR = {
  'banner':                    'public/images/banners',
  'category-women':            'public/images/categories',
  'category-men':              'public/images/categories',
  'category-kids':             'public/images/categories',
  'category-accessories':      'public/images/categories',
  'category-family':           'public/images/categories',
  'product-women':             'public/images/products/women',
  'product-men':               'public/images/products/men',
  'product-kids':              'public/images/products/kids',
  'product-accessories':       'public/images/products/accessories',
  'product-family':            'public/images/products/family',
  'lookbook':                  'public/images/lookbook',
  'recommendation-similar':    'public/images/recommendations/similar',
  'recommendation-outfit':     'public/images/recommendations/outfit',
  'uncategorized':             'public/images/uncategorized',
};

// ── Load data ─────────────────────────────────────────────
if (!fs.existsSync(SCAN_FILE)) {
  console.error('❌ Scan file not found. Run: node scan-assets.js first.');
  process.exit(1);
}
if (!fs.existsSync(DECISIONS_FILE)) {
  console.error('❌ Decisions file not found. No decisions made yet in /asset-review.');
  process.exit(1);
}

const scan = JSON.parse(fs.readFileSync(SCAN_FILE, 'utf-8'));
const decisions = JSON.parse(fs.readFileSync(DECISIONS_FILE, 'utf-8'));

// ── Build action plan ─────────────────────────────────────
const actions = {
  rename:   [], // { from, to, reason }
  move:     [], // { from, to, reason }
  delete:   [], // { path, reason }
  skipUsed: [], // decisions to delete but file is in use
  noChange: 0,
};

for (const [relativePath, decision] of Object.entries(decisions)) {
  const img = scan.images.find((i) => i.relativePath === relativePath);
  if (!img) {
    console.warn(`[WARN] Image not found in scan: ${relativePath}`);
    continue;
  }

  const { userLabel, userNewName, status } = decision;
  const absPath = path.join(WEB_ROOT, relativePath);

  // DELETE candidate
  if (status === 'safe-to-delete-candidate') {
    if (img.isUsed) {
      actions.skipUsed.push({ path: relativePath, usedIn: img.usedIn });
    } else {
      actions.delete.push({ path: relativePath, absPath, reason: 'marked safe-to-delete-candidate' });
    }
    continue;
  }

  let changed = false;

  // Determine target directory from label
  const targetDir = userLabel ? GROUP_TO_DIR[userLabel] : null;
  const targetFilename = userNewName || img.filename;
  const targetRelPath = targetDir
    ? `${targetDir}/${targetFilename}`
    : path.join(img.directory, targetFilename).replace(/\\/g, '/');

  const absTarget = path.join(WEB_ROOT, targetRelPath);

  // Needs rename/move?
  if (absTarget !== absPath) {
    if (absPath.startsWith(path.join(WEB_ROOT, path.dirname(targetRelPath)))) {
      // Same directory, just rename
      actions.rename.push({ from: relativePath, to: targetRelPath, reason: `renamed to ${targetFilename}` });
    } else {
      // Different directory → move
      actions.move.push({ from: relativePath, to: targetRelPath, reason: `moved to ${targetDir}, renamed to ${targetFilename}` });
    }
    changed = true;
  }

  if (!changed) actions.noChange++;
}

// ── Print plan ────────────────────────────────────────────
console.log('\n' + '═'.repeat(60));
console.log(`🗂  APPLY ASSET REVIEW${DRY_RUN ? ' [DRY RUN]' : ' [LIVE]'}`);
console.log('═'.repeat(60));
console.log(`  Renames:     ${actions.rename.length}`);
console.log(`  Moves:       ${actions.move.length}`);
console.log(`  Deletes:     ${actions.delete.length}${DO_DELETE ? '' : ' (skipped — set CONFIRM_DELETE_ASSETS=true)'}`);
console.log(`  Skip (used): ${actions.skipUsed.length}`);
console.log(`  No change:   ${actions.noChange}`);
console.log('');

if (actions.rename.length > 0) {
  console.log('📝 Renames:');
  actions.rename.forEach(a => console.log(`  ${a.from}\n    → ${a.to}`));
  console.log('');
}
if (actions.move.length > 0) {
  console.log('📦 Moves:');
  actions.move.forEach(a => console.log(`  ${a.from}\n    → ${a.to}`));
  console.log('');
}
if (actions.delete.length > 0) {
  console.log('🗑  Delete candidates:');
  actions.delete.forEach(a => console.log(`  ${a.path}`));
  console.log('');
}
if (actions.skipUsed.length > 0) {
  console.log('⚠️  Marked delete but STILL IN USE (skipped):');
  actions.skipUsed.forEach(a => console.log(`  ${a.path} → used in: ${a.usedIn.join(', ')}`));
  console.log('');
}

if (DRY_RUN) {
  console.log('ℹ️  Dry run complete. To apply: set CONFIRM_APPLY_ASSETS=true');
  console.log('   Windows PowerShell: $env:CONFIRM_APPLY_ASSETS="true"; node scripts/apply-asset-review.js');
  process.exit(0);
}

// ── Apply changes ─────────────────────────────────────────
function ensureDir(p) { fs.mkdirSync(path.dirname(p), { recursive: true }); }

// Rename
for (const a of actions.rename) {
  const from = path.join(WEB_ROOT, a.from);
  const to = path.join(WEB_ROOT, a.to);
  ensureDir(to);
  fs.copyFileSync(from, to);
  console.log(`✓ Rename: ${a.from} → ${a.to}`);
}

// Move (copy + keep original, update decisions)
for (const a of actions.move) {
  const from = path.join(WEB_ROOT, a.from);
  const to = path.join(WEB_ROOT, a.to);
  ensureDir(to);
  fs.copyFileSync(from, to);
  console.log(`✓ Move: ${a.from} → ${a.to}`);
}

// Delete
if (DO_DELETE && actions.delete.length > 0) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  for (const a of actions.delete) {
    const backupPath = path.join(BACKUP_DIR, a.from.replace(/\//g, '_'));
    fs.copyFileSync(a.absPath, backupPath);
    fs.unlinkSync(a.absPath);
    console.log(`🗑 Deleted (backup at ${backupPath}): ${a.path}`);
  }
} else if (actions.delete.length > 0) {
  console.log(`ℹ️  ${actions.delete.length} files marked for delete but CONFIRM_DELETE_ASSETS not set. Skipped.`);
}

console.log('\n✅ Done! Run node scan-assets.js to refresh the review page.');
