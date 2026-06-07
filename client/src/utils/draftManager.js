import { openDB } from 'idb';

const DB_NAME    = 'attendance-drafts';
const DB_VERSION = 1;
const STORE      = 'drafts';

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'sessionId' });
      }
    },
  });
}

// Save draft — keyed by sessionId
export async function saveDraft(sessionId, records) {
  const db = await getDB();
  await db.put(STORE, { sessionId, records, savedAt: Date.now() });
}

// Load draft for a session
export async function loadDraft(sessionId) {
  const db     = await getDB();
  const draft  = await db.get(STORE, sessionId);
  if (!draft) return null;

  // Expire drafts older than 24 hours
  const age = Date.now() - draft.savedAt;
  if (age > 24 * 60 * 60 * 1000) {
    await db.delete(STORE, sessionId);
    return null;
  }
  return draft;
}

// Clear draft after successful submit
export async function clearDraft(sessionId) {
  const db = await getDB();
  await db.delete(STORE, sessionId);
}

// List all active draft session ids
export async function listDrafts() {
  const db   = await getDB();
  const all  = await db.getAll(STORE);
  return all.filter((d) => Date.now() - d.savedAt < 24 * 60 * 60 * 1000);
}
