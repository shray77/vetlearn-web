/**
 * IndexedDB wrapper for storing large blobs (full text of imported documents).
 *
 * Why IndexedDB and not localStorage:
 *   - localStorage has a 5MB cap per origin (the rest of the app already uses
 *     it heavily for zustand state).
 *   - Imported PDF/lecture text can easily exceed 1MB per document.
 *   - IndexedDB offers gigabyte-scale storage and survives browser restarts.
 *
 * Failure modes:
 *   - Safari private mode: IndexedDB may be unavailable or throw on open.
 *     We catch and fall back to a no-op that signals "unavailable" — callers
 *     must gracefully degrade (e.g. not allow re-extraction from saved doc).
 *   - Firefox private mode: same as Safari.
 */

const DB_NAME = 'vetlearn-docs';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });

  return dbPromise;
}

export async function saveDocumentText(id: string, text: string): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ id, text, savedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function getDocumentText(id: string): Promise<string | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result?.text ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function deleteDocumentText(id: string): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
