const CACHE_NAME = "hesabyar-v4";

const APP_FILES = [
    "./",
    "./index.html",
    "./manifest.json",

    "./css/style.css",

    "./js/app.js",
    "./js/db.js",
    "./js/sales.js",
    "./js/customers.js",
    "./js/expenses.js",
    "./js/reports.js",
    "./js/ui.js",
    "./js/backup.js",

    "./assets/icons/icon-192.png",
    "./assets/icons/icon-512.png"
];

// نصب و ذخیره فایل‌های برنامه
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_FILES))
            .then(() => self.skipWaiting())
    );
});

// فعال‌سازی نسخه جدید و پاک‌سازی کش‌های قدیمی حساب‌یار
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys
                    .filter(key =>
                        key.startsWith("hesabyar-") &&
                        key !== CACHE_NAME
                    )
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// مدیریت درخواست‌ها در حالت آفلاین
self.addEventListener("fetch", event => {
    const request = event.request;

    if (request.method !== "GET") return;

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) return;

    // صفحه اصلی
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const copy = response.clone();

                    caches.open(CACHE_NAME).then(cache => {
                        cache.put("./index.html", copy);
                    });

                    return response;
                })
                .catch(() => caches.match("./index.html"))
        );

        return;
    }

    // سایر فایل‌های برنامه
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;

            return fetch(request).then(response => {
                if (response.ok) {
                    const copy = response.clone();

                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, copy);
                    });
                }

                return response;
            });
        })
    );
});