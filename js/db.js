/* ==============================
   HesabYar - Database
============================== */

const DB_NAME = "HesabYarDB";
const DB_VERSION = 1;

let database = null;


/* Initialize Database */

export function initDB() {

    return new Promise((resolve, reject) => {

        if (!window.indexedDB) {
            reject(new Error("مرورگر از IndexedDB پشتیبانی نمی‌کند."));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {

            const db = event.target.result;

            // Sales
            if (!db.objectStoreNames.contains("sales")) {

                db.createObjectStore("sales", {
                    keyPath: "id",
                    autoIncrement: true
                });

            }

            // Customers
            if (!db.objectStoreNames.contains("customers")) {

                db.createObjectStore("customers", {
                    keyPath: "id",
                    autoIncrement: true
                });

            }

            // Payments
            if (!db.objectStoreNames.contains("payments")) {

                db.createObjectStore("payments", {
                    keyPath: "id",
                    autoIncrement: true
                });

            }

            // Expenses
            if (!db.objectStoreNames.contains("expenses")) {

                db.createObjectStore("expenses", {
                    keyPath: "id",
                    autoIncrement: true
                });

            }

        };


        request.onsuccess = () => {

            database = request.result;

            // Close connection when another version is requested
            database.onversionchange = () => {

                database.close();
                database = null;

            };

            resolve(database);

        };


        request.onerror = () => {

            reject(
                request.error ||
                new Error("اتصال به دیتابیس ناموفق بود.")
            );

        };


        request.onblocked = () => {

            console.warn(
                "Database upgrade is blocked by another open connection."
            );

        };

    });

}


/* Get Database Connection */

export function getDB() {

    if (!database) {

        throw new Error(
            "دیتابیس هنوز راه‌اندازی نشده است."
        );

    }

    return database;

}