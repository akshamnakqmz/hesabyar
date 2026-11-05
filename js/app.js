import { initDB } from "./db.js";

import {
    initSalesUI,
    initExpensesUI,
    initCustomersUI,
    initReportsUI,
    refreshDashboard
} from "./ui.js";

import {
    initBackupUI
} from "./backup.js";


async function startApp() {

    try {

        // راه‌اندازی دیتابیس
        await initDB();


        // فعال‌سازی بخش‌های برنامه
        initSalesUI();

        initExpensesUI();

        initCustomersUI();

        initReportsUI();


        // فعال‌سازی پشتیبان‌گیری
        initBackupUI();


        // به‌روزرسانی داشبورد
        await refreshDashboard();


        console.log("HesabYar is ready.");

    } catch (error) {

        console.error(
            "HesabYar startup error:",
            error
        );

        alert(
            "راه‌اندازی حساب‌یار ناموفق بود. صفحه را دوباره بارگذاری کنید."
        );

    }

}


// شروع برنامه پس از آماده‌شدن HTML
if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        startApp
    );

} else {

    startApp();

}


// ثبت Service Worker
if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

        navigator.serviceWorker
            .register("./sw.js")

            .then(registration => {

                console.log(
                    "HesabYar Offline Ready:",
                    registration.scope
                );

            })

            .catch(error => {

                console.error(
                    "Service Worker Error:",
                    error
                );

            });

    });

}