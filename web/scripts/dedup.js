/**
 * scripts/dedup.js
 *
 * Xử lý duplicate ảnh thông minh:
 * 1. Với mỗi nhóm duplicate, chọn file canonical tốt nhất.
 * 2. Cập nhật toàn bộ references trong code/data sang canonical.
 * 3. Dry-run: liệt kê những gì sẽ xảy ra.
 * 4. Khi có CONFIRM_DEDUP=true, thực hiện thật sự.
 *
 * Usage:
 *   node scripts/dedup.js           (dry-run)
 *   $env:CONFIRM_DEDUP="true"; node scripts/dedup.js  (live)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WEB_ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(WEB_ROOT, 'public');
const SCAN_FILE = path.join(PUBLIC, 'images', 'asset-review-scan.json');

const DRY_RUN = process.env.CONFIRM_DEDUP !== 'true';

// ────────────────────────────────────────
// STEP 1: Load scan data
// ────────────────────────────────────────
if (!fs.existsSync(SCAN_FILE)) {
  console.error('Run node scan-assets.js first!');
  process.exit(1);
}
const scan = JSON.parse(fs.readFileSync(SCAN_FILE, 'utf-8'));
const duplicates = scan.duplicates; // 76 groups

// ────────────────────────────────────────
// STEP 2: Scoring rules to pick canonical
// ────────────────────────────────────────

/**
 * Score a file path. Higher = better canonical.
 * Rules:
 * - Meaningful descriptive name (not just menXX.webp or womenXX.webp) → +20
 * - In /products/ directory → +5
 * - In correct gender folder matching filename → +10
 * - NOT a mismatch (men- name in women/ folder or vice versa) → +15
 * - Is currently used in code → +3
 */
function scoreCanonical(file) {
  const p = file.path.replace('public/images/', '');
  const fname = path.basename(p);
  let score = 0;

  // Descriptive name (contains hyphenated content-describing words)
  const isDescriptive = /^(women|men|kids|accessory|accessory|banner|lookbook|family|category)-[a-z]/.test(fname)
    && !/^(women|men|kids|accessories)-\d+\.webp$/.test(fname);
  if (isDescriptive) score += 20;

  // Numeric-only names (bad): men-07.webp, women-19.webp
  if (/^(women|men|kids|accessories)-\d+\.webp$/.test(fname)) score -= 5;

  // In /products/ 
  if (p.includes('products/')) score += 5;

  // Gender consistency: women- name in /women/ folder
  if (fname.startsWith('women-') && p.includes('products/women/')) score += 10;
  if (fname.startsWith('men-')   && p.includes('products/men/'))   score += 10;
  if (fname.startsWith('kids-')  && p.includes('products/kids/'))  score += 10;
  if (fname.startsWith('accessory-') && p.includes('products/accessories/')) score += 10;

  // PENALTY: gender mismatch — men-outfit in women folder or vice versa
  if (fname.startsWith('men-') && p.includes('products/women/')) score -= 30;
  if (fname.startsWith('women-') && p.includes('products/men/'))  score -= 30;
  if (fname.startsWith('men-') && p.includes('lookbook/'))  score -= 5;

  // Banner/lookbook bonus for banner-named files
  if (fname.startsWith('banner-') && p.includes('banners/'))  score += 15;
  if (fname.startsWith('lookbook-') && p.includes('lookbook/')) score += 15;

  // Currently used
  if (file.isUsed) score += 3;

  return score;
}

// ────────────────────────────────────────
// STEP 3: For each group, decide canonical
// ────────────────────────────────────────

const actions = {
  updateRef: [],    // { from: '/images/...', to: '/images/...', reason }
  deleteFile: [],   // { path: 'public/images/...' , usedIn: [] }
  keepFile: [],     // { path, reason }
  specialMoves: [], // accessories-12 etc.
};

// Special cases first
const SPECIAL_MOVES = [
  {
    from: 'public/images/products/accessories/accessories-12.webp',
    to:   'public/images/products/women/women-tshirt-yellow-basic-01.webp',
    reason: 'Not an accessory — is a yellow women tshirt',
  },
  {
    from: 'public/images/products/accessories/acc-tshirt-yellow-01.webp',
    to:   'public/images/products/women/women-tshirt-yellow-basic-01.webp',
    reason: 'Duplicate of accessories-12, also not an accessory',
  },
];

for (const sm of SPECIAL_MOVES) {
  const srcExists = fs.existsSync(path.join(WEB_ROOT, sm.from));
  if (!sm.from.includes('acc-tshirt') || srcExists) {
    actions.specialMoves.push(sm);
  }
}

// Process each duplicate group
const processed = new Set(); // track files already handled

for (const group of duplicates) {
  // Score each file
  const scored = group.files.map(f => ({ ...f, score: scoreCanonical(f) }));
  scored.sort((a, b) => b.score - a.score);

  const canonical = scored[0];
  const rest = scored.slice(1);

  // Determine the canonical web path
  const canonicalWebPath = '/' + canonical.path.replace('public/', '');

  actions.keepFile.push({
    path: canonical.path,
    score: canonical.score,
    reason: `highest score (${canonical.score}), descriptive name + correct folder`,
  });

  for (const dup of rest) {
    if (processed.has(dup.path)) continue;
    processed.add(dup.path);

    const dupWebPath = '/' + dup.path.replace('public/', '');

    // If dup is used somewhere, we need to update those references
    if (dup.isUsed) {
      actions.updateRef.push({
        from: dupWebPath,
        to: canonicalWebPath,
        usedIn: dup.usedIn,
        reason: `dup of canonical ${canonical.path}`,
      });
    }

    actions.deleteFile.push({
      path: dup.path,
      absPath: path.join(WEB_ROOT, dup.path),
      usedIn: dup.usedIn,
      canonical: canonical.path,
      canonicalWebPath,
    });
  }
}

// ────────────────────────────────────────
// STEP 4: Print dry-run report
// ────────────────────────────────────────

console.log('\n' + '═'.repeat(72));
console.log(`🔍 DEDUP REPORT${DRY_RUN ? ' [DRY RUN]' : ' [LIVE MODE]'}`);
console.log('═'.repeat(72));
console.log(`Duplicate groups: ${duplicates.length}`);
console.log(`Files to keep:    ${actions.keepFile.length}`);
console.log(`Refs to update:   ${actions.updateRef.length}`);
console.log(`Files to delete:  ${actions.deleteFile.length}`);
console.log(`Special moves:    ${actions.specialMoves.length}`);

console.log('\n📌 SPECIAL MOVES (non-accessory images in wrong folder):');
for (const sm of actions.specialMoves) {
  console.log(`  ${sm.from.replace('public/images/','')}`);
  console.log(`    → ${sm.to.replace('public/images/','')} [${sm.reason}]`);
}

console.log('\n🔗 REFERENCE UPDATES (used files → canonical):');
const criticalUpdates = actions.updateRef.filter(u => {
  // Highlight men↔women mismatches
  const fromName = path.basename(u.from);
  const toName = path.basename(u.to);
  const fromGender = fromName.startsWith('men-') ? 'men' : fromName.startsWith('women-') ? 'women' : 'other';
  const toGender = toName.startsWith('men-') ? 'men' : toName.startsWith('women-') ? 'women' : 'other';
  return fromGender !== 'other' && toGender !== 'other' && fromGender !== toGender;
});

const normalUpdates = actions.updateRef.filter(u => !criticalUpdates.includes(u));

if (criticalUpdates.length > 0) {
  console.log(`\n  ⚠️  GENDER MISMATCH refs (${criticalUpdates.length}) — these were wrong assignments:`);
  for (const u of criticalUpdates) {
    console.log(`  [${path.basename(u.from)}] → [${path.basename(u.to)}]`);
    console.log(`    used in: ${u.usedIn.slice(0,3).join(', ')}`);
  }
}

console.log(`\n  Normal updates (${normalUpdates.length}):`);
for (const u of normalUpdates.slice(0, 20)) {
  console.log(`  ${u.from.replace('/images/','')} → ${u.to.replace('/images/','')}`);
}
if (normalUpdates.length > 20) console.log(`  ... and ${normalUpdates.length - 20} more`);

console.log('\n🗑  FILES TO DELETE (after ref update):');
const stillUsedBeforeDelete = actions.deleteFile.filter(d => d.usedIn.length > 0);
const safeToDelete = actions.deleteFile.filter(d => d.usedIn.length === 0);
console.log(`  Safe to delete (not used):  ${safeToDelete.length}`);
console.log(`  Must update refs first:     ${stillUsedBeforeDelete.length}`);

console.log('\n  Sample of safe-to-delete:');
safeToDelete.slice(0, 15).forEach(d => console.log(`  - ${d.path.replace('public/images/','')}`));
if (safeToDelete.length > 15) console.log(`  ... and ${safeToDelete.length - 15} more`);

if (DRY_RUN) {
  console.log('\n' + '─'.repeat(72));
  console.log('ℹ️  DRY RUN complete — no files changed.');
  console.log('   To apply: $env:CONFIRM_DEDUP="true"; node scripts/dedup.js');
  
  // Write dry-run plan to file for review
  const planPath = path.join(PUBLIC, 'images', 'dedup-plan.json');
  fs.writeFileSync(planPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    stats: {
      duplicateGroups: duplicates.length,
      refsToUpdate: actions.updateRef.length,
      filesToDelete: actions.deleteFile.length,
      safeToDelete: safeToDelete.length,
      specialMoves: actions.specialMoves.length,
    },
    specialMoves: actions.specialMoves,
    refUpdates: actions.updateRef,
    filesToDelete: actions.deleteFile.map(d => ({
      path: d.path,
      canonical: d.canonical,
      isUsed: d.usedIn.length > 0,
      usedIn: d.usedIn,
    })),
  }, null, 2));
  console.log(`\n📄 Plan saved: public/images/dedup-plan.json`);
  process.exit(0);
}

// ────────────────────────────────────────
// STEP 5: LIVE MODE — Apply changes
// ────────────────────────────────────────
console.log('\n🚀 Applying changes...\n');

// 5a. Special moves: copy misplaced files
for (const sm of actions.specialMoves) {
  const from = path.join(WEB_ROOT, sm.from);
  const to = path.join(WEB_ROOT, sm.to);
  if (!fs.existsSync(from)) { console.log(`[SKIP] not found: ${sm.from}`); continue; }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log(`[MOVE] ${sm.from.replace('public/images/','')} → ${sm.to.replace('public/images/','')}`);
}

// 5b. Update source code references
const SRC_DIR = path.join(WEB_ROOT, 'src');
const srcFiles = [];
function walkSrc(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') walkSrc(full);
    else if (/\.(tsx?|jsx?|json)$/.test(entry.name)) srcFiles.push(full);
  }
}
walkSrc(SRC_DIR);
// Also check public/images JSON files
srcFiles.push(path.join(PUBLIC, 'images', 'asset-mapping.json'));

// Also add special move refs
const allUpdates = [...actions.updateRef];
for (const sm of actions.specialMoves) {
  allUpdates.push({
    from: '/' + sm.from.replace('public/', ''),
    to: '/' + sm.to.replace('public/', ''),
    usedIn: [],
  });
}

let totalFilesModified = 0;

for (const srcFile of srcFiles) {
  if (!fs.existsSync(srcFile)) continue;
  let content;
  try { content = fs.readFileSync(srcFile, 'utf-8'); } catch { continue; }
  let modified = false;

  for (const update of allUpdates) {
    if (content.includes(update.from)) {
      content = content.split(update.from).join(update.to);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(srcFile, content, 'utf-8');
    const rel = path.relative(WEB_ROOT, srcFile).replace(/\\/g, '/');
    console.log(`[UPDATE] ${rel}`);
    totalFilesModified++;
  }
}

console.log(`\n✓ Updated ${totalFilesModified} source files`);

// 5c. Delete safe-to-delete files
// Create backup directory
const BACKUP_DIR = path.join(WEB_ROOT, 'asset-backup', 'dedup-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
fs.mkdirSync(BACKUP_DIR, { recursive: true });

let deleted = 0;
let skipped = 0;

for (const d of actions.deleteFile) {
  // Re-check if still referenced after updates
  const webPath = '/' + d.path.replace('public/', '');
  let stillUsed = false;

  for (const srcFile of srcFiles) {
    if (!fs.existsSync(srcFile)) continue;
    let content;
    try { content = fs.readFileSync(srcFile, 'utf-8'); } catch { continue; }
    if (content.includes(webPath)) {
      stillUsed = true;
      console.warn(`[WARN] Still referenced: ${webPath} in ${path.relative(WEB_ROOT, srcFile)}`);
      break;
    }
  }

  if (stillUsed) { skipped++; continue; }

  const abs = path.join(WEB_ROOT, d.path);
  if (!fs.existsSync(abs)) { skipped++; continue; }

  // Backup
  const backupName = d.path.replace(/\//g, '_').replace(/\\/g, '_');
  fs.copyFileSync(abs, path.join(BACKUP_DIR, backupName));
  fs.unlinkSync(abs);
  deleted++;
  console.log(`[DELETE] ${d.path.replace('public/images/', '')}`);
}

console.log(`\n✅ DONE!`);
console.log(`  Updated source files: ${totalFilesModified}`);
console.log(`  Deleted duplicates:   ${deleted}`);
console.log(`  Skipped (still used): ${skipped}`);
console.log(`  Backup location:      ${path.relative(WEB_ROOT, BACKUP_DIR)}`);
console.log('\nNext: node scan-assets.js && npm run build');
