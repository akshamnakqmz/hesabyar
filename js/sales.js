/* ==============================
   HesabYar - Sales System
============================== */

import { getDB } from "./db.js";


/* Register New Sale */

export async function addSale(data) {

    const product = String(data.product || "").trim();
    const customer = String(data.customer || "").trim();

    const quantity = Number(data.quantity);
    const purchasePrice = Number(data.purchasePrice);
    const salePrice = Number(data.salePrice);
    const paid = Number(data.paid);

    // Validation

    if (!product) {
        throw new Error("نام جنس را وارد کنید.");
    }

    if (!Number.isSafeInteger(quantity) || quantity < 1) {
        throw new Error("تعداد باید یک عدد صحیح مثبت باشد.");
    }

    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
        throw new Error("قیمت خرید معتبر نیست.");
    }

    if (!Number.isFinite(salePrice) || salePrice <= 0) {
        throw new Error("قیمت فروش باید بیشتر از صفر باشد.");
    }

    if (!Number.isFinite(paid) || paid < 0) {
        throw new Error("مبلغ پرداخت‌شده معتبر نیست.");
    }

    // Financial Calculations

    const total = quantity * salePrice;
    const costTotal = quantity * purchasePrice;
    const profit = total - costTotal;
    const debt = total - paid;

    if (
        !Number.isFinite(total) ||
        !Number.isFinite(costTotal) ||
        !Number.isFinite(profit) ||
        !Number.isFinite(debt)
    ) {
        throw new Error("مقادیر مالی بیش از حد مجاز هستند.");
    }

    if (paid > total) {
        throw new Error(
            "مبلغ پرداخت‌شده نمی‌تواند بیشتر از مجموع فروش باشد."
        );
    }

    if (debt > 0 && !customer) {
        throw new Error(
            "برای ثبت فروش قرضی، نام مشتری را وارد کنید."
        );
    }

    // Sale Record

    const sale = {

        product,

        customer,

        quantity,

        purchasePrice,

        salePrice,

        paid,

        total,

        costTotal,

        profit,

        debt,

        date: new Date().toISOString()

    };

    const db = getDB();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            "sales",
            "readwrite"
        );

        const store = transaction.objectStore("sales");

        const request = store.add(sale);

        request.onsuccess = () => {
            sale.id = request.result;
        };

        transaction.oncomplete = () => {
            resolve(sale);
        };

        transaction.onerror = () => {
            reject(
                transaction.error ||
                new Error("ثبت فروش ناموفق بود.")
            );
        };

        transaction.onabort = () => {
            reject(
                transaction.error ||
                new Error("عملیات ثبت فروش لغو شد.")
            );
        };

    });

}


/* Get All Sales */

export async function getSales() {

    const db = getDB();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            "sales",
            "readonly"
        );

        const store = transaction.objectStore("sales");

        const request = store.getAll();

        request.onsuccess = () => {

            const sales = request.result || [];

            sales.sort((a, b) => {
                return new Date(b.date) - new Date(a.date);
            });

            resolve(sales);

        };

        request.onerror = () => {

            reject(
                request.error ||
                new Error("دریافت فروش‌ها ناموفق بود.")
            );

        };

    });

}


/* Get One Sale */

export async function getSale(id) {

    const db = getDB();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            "sales",
            "readonly"
        );

        const request = transaction
            .objectStore("sales")
            .get(Number(id));

        request.onsuccess = () => {
            resolve(request.result || null);
        };

        request.onerror = () => {
            reject(request.error);
        };

    });

}