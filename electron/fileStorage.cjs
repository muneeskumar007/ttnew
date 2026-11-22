/**
 * Local File and Document Storage Service
 * Manages user uploads, exported files, and settings inside Windows userData directory:
 *   - userData/uploads/
 *   - userData/settings/
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let uploadsDir = null;
let settingsDir = null;
let userDataPath = null;

function initFileStorage(userDataDir) {
  userDataPath = userDataDir;
  uploadsDir = path.join(userDataDir, 'uploads');
  settingsDir = path.join(userDataDir, 'settings');

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }

  console.log(`[Storage] Initialized uploads dir: ${uploadsDir}`);
  console.log(`[Storage] Initialized settings dir: ${settingsDir}`);

  return { uploadsDir, settingsDir, userDataPath };
}

/**
 * Saves a file locally in the uploads directory.
 */
function saveLocalFile({ name, base64Data, mimeType }) {
  if (!uploadsDir) throw new Error('File storage is not initialized.');
  if (!name || !base64Data) throw new Error('Invalid file payload.');

  const fileId = crypto.randomUUID();
  const ext = path.extname(name);
  const safeBaseName = path.basename(name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const storedFilename = `${safeBaseName}_${fileId.slice(0, 8)}${ext}`;
  const targetPath = path.join(uploadsDir, storedFilename);

  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(targetPath, buffer);

  const stats = fs.statSync(targetPath);

  return {
    id: fileId,
    filename: storedFilename,
    originalName: name,
    filePath: targetPath,
    relativePath: path.join('uploads', storedFilename),
    mimeType: mimeType || 'application/octet-stream',
    sizeBytes: stats.size,
    createdAt: new Date().toISOString()
  };
}

/**
 * Reads a file from the uploads directory as base64.
 */
function getLocalFile(filename) {
  if (!uploadsDir) throw new Error('File storage is not initialized.');
  const safeFilename = path.basename(filename);
  const targetPath = path.join(uploadsDir, safeFilename);

  if (!fs.existsSync(targetPath)) {
    throw new Error(`File not found: ${safeFilename}`);
  }

  const buffer = fs.readFileSync(targetPath);
  const stats = fs.statSync(targetPath);

  return {
    filename: safeFilename,
    filePath: targetPath,
    sizeBytes: stats.size,
    base64Data: buffer.toString('base64')
  };
}

/**
 * Lists all files stored in the uploads directory.
 */
function listLocalFiles() {
  if (!uploadsDir || !fs.existsSync(uploadsDir)) return [];

  const files = fs.readdirSync(uploadsDir);
  return files.map((f) => {
    try {
      const p = path.join(uploadsDir, f);
      const st = fs.statSync(p);
      return {
        filename: f,
        filePath: p,
        sizeBytes: st.size,
        modifiedAt: st.mtime.toISOString()
      };
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Deletes a file from the uploads directory.
 */
function deleteLocalFile(filename) {
  if (!uploadsDir) throw new Error('File storage is not initialized.');
  const safeFilename = path.basename(filename);
  const targetPath = path.join(uploadsDir, safeFilename);

  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
    return { success: true, filename: safeFilename };
  }

  return { success: false, message: 'File did not exist.' };
}

/**
 * Saves a setting JSON file in the settings directory.
 */
function saveSetting(key, value) {
  if (!settingsDir) throw new Error('File storage is not initialized.');
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetPath = path.join(settingsDir, `${safeKey}.json`);
  fs.writeFileSync(targetPath, JSON.stringify(value, null, 2), 'utf8');
  return { success: true, key: safeKey };
}

/**
 * Reads a setting JSON file from the settings directory.
 */
function getSetting(key) {
  if (!settingsDir) return null;
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetPath = path.join(settingsDir, `${safeKey}.json`);
  if (!fs.existsSync(targetPath)) return null;
  try {
    const raw = fs.readFileSync(targetPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[Storage] Error reading setting ${key}:`, err);
    return null;
  }
}

function getStoragePaths() {
  return {
    userDataPath,
    uploadsDir,
    settingsDir
  };
}

module.exports = {
  initFileStorage,
  saveLocalFile,
  getLocalFile,
  listLocalFiles,
  deleteLocalFile,
  saveSetting,
  getSetting,
  getStoragePaths
};
