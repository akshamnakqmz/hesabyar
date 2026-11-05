import { initDB } from "./db.js";

import {
    initSalesUI,
    initExpensesUI,
    initCustomersUI,
    initReportsUI,
    refreshDashboard
} from "./ui.js";

import { initBackupUI } from "./backup.js";

async function startApp() {
    try {
        await initDB();

        initSalesUI();
        initExpensesUI();
        initCustomersUI();
        initReportsUI();
        initBackupUI();

        await refreshDashboard();

        console.log("HesabYar is ready.");

    } catch (error) {
        console.error("HesabYar startup error:", error);
        alert("راه‌اندازی حساب‌یار ناموفق بود. صفحه را دوباره بارگذاری کنید.");
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp);
} else {
    startApp();
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("./sw.js")
            .then(registration => {
                console.log("HesabYar Offline Ready:", registration.scope);
            })
            .catch(error => {
                console.error("Service Worker Error:", error);
            });
    });
}
