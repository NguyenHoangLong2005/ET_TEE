/**
 * scripts/hard-cleanup-assets.js
 * 
 * Task 1, 2, 3: Scan, Backup, and Delete all images in the web project.
 * 
 * Usage: 
 *   node scripts/hard-cleanup-assets.js --dry-run
 *   node scripts/hard-cleanup-assets.js --confirm
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.join(__dirname, '..');
const BACKUP_DIR = path.join(WEB_ROOT, 'asset-backup-before-cleanup');
const MANIFEST_FILE = path.join(BACKUP_DIR, 'backup-manifest.json');

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
const EXCLUDE_DIRS = new Set(['node_modules', '.next', 'asset-backup-before-cleanup', 'asset-backup']);

const DRY_RUN = !process.argv.includes('--confirm');

// 1. Scan
console.log('🔍 TASK 1: Scanning images...');
const foundImages = [];

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (EXCLUDE_DIRS.has(entry.name)) continue;
        
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(fullPath);
        } else {
            const ext = path.extname(entry.name).toLowerCase();
            if (IMAGE_EXTS.has(ext)) {
                const stats = fs.statSync(fullPath);
                foundImages.push({
                    originalPath: fullPath,
                    relativePath: path.relative(WEB_ROOT, fullPath).replace(/\\/g, '/'),
                    fileName: entry.name,
                    size: stats.size,
                    extension: ext
                });
            }
        }
    }
}

walk(WEB_ROOT);

console.log(`Found ${foundImages.length} images.`);
if (foundImages.length === 0) {
    console.log('No images found. Exiting.');
    process.exit(0);
}

// Group by location for reporting
let inPublicImages = 0;
let inWebRoot = 0;
let others = 0;
foundImages.forEach(img => {
    if (img.relativePath.startsWith('public/images/')) inPublicImages++;
    else if (!img.relativePath.includes('/')) inWebRoot++;
    else others++;
});

console.log(`- In public/images/: ${inPublicImages}`);
console.log(`- In web root (stray): ${inWebRoot}`);
console.log(`- Others: ${others}`);

if (DRY_RUN) {
    console.log('\n🛑 DRY RUN: No files will be backed up or deleted.');
    console.log('To execute, run: node scripts/hard-cleanup-assets.js --confirm');
    
    // Print a sample table
    console.log('\nSample of files to process:');
    console.table(foundImages.slice(0, 10).map((img, i) => ({
        'STT': i + 1,
        'File': img.fileName,
        'Path': img.relativePath,
        'Size (KB)': (img.size / 1024).toFixed(2),
        'Action': 'Will Backup & Delete'
    })));
    process.exit(0);
}

// 2. Backup
console.log('\n💾 TASK 2: Backing up images...');
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const manifest = [];
let backupCount = 0;

foundImages.forEach(img => {
    // Flatten structure in backup, using relative path to avoid collisions
    const backupFileName = img.relativePath.replace(/\//g, '_');
    const backupPath = path.join(BACKUP_DIR, backupFileName);
    
    try {
        fs.copyFileSync(img.originalPath, backupPath);
        manifest.push({
            originalPath: img.originalPath,
            backupPath: backupPath,
            fileName: img.fileName,
            size: img.size,
            extension: img.extension,
            backedUpAt: new Date().toISOString()
        });
        backupCount++;
    } catch (e) {
        console.error(`Failed to backup ${img.relativePath}:`, e.message);
    }
});

fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
console.log(`Successfully backed up ${backupCount} images to ${path.relative(process.cwd(), BACKUP_DIR)}`);
console.log(`Manifest created at ${path.relative(process.cwd(), MANIFEST_FILE)}`);

if (backupCount !== foundImages.length) {
    console.error('⚠️ Backup count does not match found count. Aborting deletion for safety.');
    process.exit(1);
}

// 3. Delete
console.log('\n🗑️ TASK 3: Deleting old images...');
let deleteCount = 0;
foundImages.forEach(img => {
    try {
        fs.unlinkSync(img.originalPath);
        deleteCount++;
    } catch (e) {
        console.error(`Failed to delete ${img.relativePath}:`, e.message);
    }
});

console.log(`Successfully deleted ${deleteCount} images.`);

console.log('\n✅ Cleanup complete!');
