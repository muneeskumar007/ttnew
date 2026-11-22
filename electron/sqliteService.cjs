/**
 * SQLite Database Service for Desktop Application
 * Stores independent local data per Windows user profile in app.getPath("userData")/database.sqlite
 * Uses sql.js (WebAssembly SQLite) for 100% pure binary SQLite3 compatibility without native C++ compilation.
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let dbInstance = null;
let dbFilePath = null;
let SQL = null;

/**
 * Initialize SQLite database in the provided userData directory.
 */
async function initSqliteDatabase(userDataDir) {
  if (!SQL) {
    let wasmBinary = undefined;
    try {
      const candidates = [
        path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
        path.join(process.resourcesPath || '', 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
        path.join(__dirname, 'sql-wasm.wasm')
      ];
      for (const p of candidates) {
        if (p && fs.existsSync(p)) {
          wasmBinary = fs.readFileSync(p);
          break;
        }
      }
    } catch (e) {
      console.warn('[SQLite] Could not pre-read wasm binary, falling back to default locator:', e);
    }

    SQL = await initSqlJs(wasmBinary ? { wasmBinary } : undefined);
  }

  // Ensure user data directory exists
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  dbFilePath = path.join(userDataDir, 'database.sqlite');

  if (fs.existsSync(dbFilePath)) {
    try {
      const fileBuffer = fs.readFileSync(dbFilePath);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error('[SQLite] Failed to read existing database file, creating fresh one:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  // Auto-create required tables
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS workspace (
      id TEXT PRIMARY KEY,
      department TEXT,
      last_updated TEXT,
      payload_json TEXT
    );
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT
    );
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS local_documents (
      id TEXT PRIMARY KEY,
      filename TEXT,
      original_name TEXT,
      relative_path TEXT,
      mime_type TEXT,
      size_bytes INTEGER,
      created_at TEXT
    );
  `);

  // Persist schema to disk immediately if creating a new file
  saveDatabaseToDisk();

  console.log(`[SQLite] Database initialized at: ${dbFilePath}`);
  return { ok: true, path: dbFilePath };
}

/**
 * Flushes in-memory SQLite database state to physical disk file.
 */
function saveDatabaseToDisk() {
  if (!dbInstance || !dbFilePath) return;
  try {
    const data = dbInstance.export();
    fs.writeFileSync(dbFilePath, Buffer.from(data));
  } catch (err) {
    console.error('[SQLite] Error writing database to disk:', err);
    throw err;
  }
}

/**
 * Loads the active workspace from the local SQLite database.
 */
function loadWorkspace(workspaceId = 'default_workspace') {
  if (!dbInstance) {
    throw new Error('SQLite database is not initialized.');
  }

  try {
    const stmt = dbInstance.prepare('SELECT id, department, last_updated, payload_json FROM workspace WHERE id = ?');
    stmt.bind([workspaceId]);

    let row = null;
    if (stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.free();

    if (row && row.payload_json) {
      const parsed = JSON.parse(row.payload_json);
      return {
        success: true,
        data: parsed,
        status: 'synced',
        lastUpdated: row.last_updated,
        message: 'Loaded from local SQLite database'
      };
    }

    return {
      success: true,
      data: null,
      status: 'empty',
      message: 'Local SQLite database is empty. Ready for initial data input.'
    };
  } catch (err) {
    console.error('[SQLite] Error loading workspace:', err);
    return {
      success: false,
      data: null,
      status: 'error',
      error: err.message
    };
  }
}

/**
 * Saves or updates the workspace state in the local SQLite database.
 */
function saveWorkspace(state, workspaceId = 'default_workspace') {
  if (!dbInstance) {
    throw new Error('SQLite database is not initialized.');
  }

  try {
    const now = new Date().toISOString();
    const department = state.department || 'Engineering & Technology';
    const payloadJson = JSON.stringify(state);

    const stmt = dbInstance.prepare(`
      INSERT OR REPLACE INTO workspace (id, department, last_updated, payload_json)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run([workspaceId, department, now, payloadJson]);
    stmt.free();

    // Flush immediately to disk
    saveDatabaseToDisk();

    return {
      success: true,
      status: 'synced',
      lastUpdated: now,
      message: 'Saved directly to local SQLite database'
    };
  } catch (err) {
    console.error('[SQLite] Error saving workspace:', err);
    return {
      success: false,
      status: 'error',
      error: err.message
    };
  }
}

/**
 * Clears workspace state in the local SQLite database.
 */
function clearWorkspace(workspaceId = 'default_workspace') {
  if (!dbInstance) {
    throw new Error('SQLite database is not initialized.');
  }

  try {
    const stmt = dbInstance.prepare('DELETE FROM workspace WHERE id = ?');
    stmt.run([workspaceId]);
    stmt.free();

    saveDatabaseToDisk();

    return {
      success: true,
      status: 'empty',
      message: 'Local SQLite workspace cleared successfully.'
    };
  } catch (err) {
    console.error('[SQLite] Error clearing workspace:', err);
    return {
      success: false,
      status: 'error',
      error: err.message
    };
  }
}

/**
 * Returns current status of local SQLite database.
 */
function getDatabaseStatus() {
  const exists = dbFilePath && fs.existsSync(dbFilePath);
  let sizeBytes = 0;
  if (exists) {
    try {
      sizeBytes = fs.statSync(dbFilePath).size;
    } catch {
      // Ignore stat error
    }
  }

  return {
    ok: Boolean(dbInstance),
    engine: 'SQLite 3 (sql.js WebAssembly)',
    path: dbFilePath,
    sizeBytes,
    exists
  };
}

module.exports = {
  initSqliteDatabase,
  loadWorkspace,
  saveWorkspace,
  clearWorkspace,
  getDatabaseStatus
};
