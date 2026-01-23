/* =====================================================
   IndexedDB Helper — Habit Tracker
===================================================== */

const DB_NAME = "habit-tracker";
const DB_VERSION = 1;

let dbInstance = null;

/* OPEN DATABASE */
function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("state")) {
        db.createObjectStore("state");
      }

      if (!db.objectStoreNames.contains("habits")) {
        db.createObjectStore("habits");
      }
    };

    request.onsuccess = event => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject("IndexedDB failed to open");
    };
  });
}

/* SAVE DATA */
async function idbSet(storeName, key, value) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value, key);
    tx.oncomplete = () => resolve(true);
  });
}

/* GET DATA */
async function idbGet(storeName, key) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}
