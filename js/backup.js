import { getDB } from "./db.js";

const STORES = [
    "sales",
    "customers",
    "payments",
    "expenses"
];

// گرفتن اطلاعات یک بخش از دیتابیس
function getAllData(db, storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const request = transaction.objectStore(storeName).getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ساخت نسخه پشتیبان
export async function exportBackup() {
    try {
        const db = getDB();

        const backup = {
            app: "HesabYar",
            version: 1,
            createdAt: new Date().toISOString(),
            data: {}
        };

        for (const store of STORES) {
            backup.data[store] = await getAllData(db, store);
        }

        const blob = new Blob(
            [JSON.stringify(backup, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "HesabYar-Backup.json";
        link.click();

        URL.revokeObjectURL(url);

        return true;

    } catch (error) {
        console.error("Backup Error:", error);
        throw error;
    }
}

// بازیابی نسخه پشتیبان
export async function importBackup(file) {
    if (!file) {
        throw new Error("فایل پشتیبان انتخاب نشده است.");
    }

    const text = await file.text();
    const backup = JSON.parse(text);

    if (
        backup.app !== "HesabYar" ||
        !backup.data ||
        !STORES.every(store => Array.isArray(backup.data[store]))
    ) {
        throw new Error("فایل پشتیبان معتبر نیست.");
    }

    const db = getDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES, "readwrite");

        transaction.oncomplete = () => resolve(true);

        transaction.onerror = () => {
            reject(transaction.error);
        };

        transaction.onabort = () => {
            reject(transaction.error || new Error("بازیابی لغو شد."));
        };

        for (const storeName of STORES) {
            const store = transaction.objectStore(storeName);

            store.clear();

            for (const record of backup.data[storeName]) {
                store.put(record);
            }
        }
    });
}