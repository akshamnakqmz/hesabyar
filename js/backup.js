import { getDB } from "./db.js";

const STORES = [
    "sales",
    "customers",
    "payments",
    "expenses"
];

function getAllData(db, storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const request = transaction.objectStore(storeName).getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function exportBackup() {
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
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return true;
}

export async function importBackup(file) {
    if (!file) {
        throw new Error("فایل پشتیبان انتخاب نشده است.");
    }

    const backup = JSON.parse(await file.text());

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

export function initBackupUI() {
    const exportButton = document.getElementById("backup-export");
    const importButton = document.getElementById("backup-import");
    const fileInput = document.getElementById("backup-file");
    const status = document.getElementById("backup-status");

    if (exportButton) {
        exportButton.addEventListener("click", async () => {
            try {
                await exportBackup();

                if (status) {
                    status.textContent = "نسخه پشتیبان با موفقیت تهیه شد.";
                }
            } catch (error) {
                console.error("Backup Error:", error);

                if (status) {
                    status.textContent = "تهیه نسخه پشتیبان ناموفق بود.";
                }
            }
        });
    }

    if (importButton) {
        importButton.addEventListener("click", async () => {
            try {
                if (!fileInput || !fileInput.files.length) {
                    throw new Error("ابتدا فایل پشتیبان را انتخاب کنید.");
                }

                if (!confirm("بازیابی، اطلاعات فعلی را با اطلاعات فایل پشتیبان جایگزین می‌کند. ادامه می‌دهید؟")) {
                    return;
                }

                await importBackup(fileInput.files[0]);

                if (status) {
                    status.textContent = "اطلاعات با موفقیت بازیابی شد.";
                }

                fileInput.value = "";
            } catch (error) {
                console.error("Restore Error:", error);

                if (status) {
                    status.textContent = error.message || "بازیابی ناموفق بود.";
                }
            }
        });
    }
}
