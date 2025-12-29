import { openDB } from "idb";

export const dbPromise = openDB("pnl-files-db", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("files")) {
      db.createObjectStore("files");
    }
  },
});

// save file
export async function saveFile(id: string, file: File) {
  const db = await dbPromise;
  await db.put("files", file, id);
}

// get file
export async function getFile(id: string): Promise<File | undefined> {
  const db = await dbPromise;
  return db.get("files", id);
}

// delete file (later use)
export async function deleteFile(id: string) {
  const db = await dbPromise;
  await db.delete("files", id);
}
