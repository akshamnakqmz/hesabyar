import { getDB } from "./db.js";

// دسته‌بندی‌های مجاز مصارف
const EXPENSE_CATEGORIES = [
  "کرایه",
  "برق و آب",
  "انتقالات",
  "معاشات",
  "تعمیرات",
  "لوازم و مواد مصرفی",
  "سایر"
];


// ------------------------------
// ثبت مصرف جدید
// ------------------------------

export async function addExpense(data) {
  const title = String(data.title || "").trim();
  const category = String(data.category || "").trim();
  const amount = Number(data.amount);
  const date = String(data.date || "").trim();
  const description = String(data.description || "").trim();

  // بررسی عنوان مصرف
  if (!title) {
    throw new Error("عنوان مصرف را وارد کنید.");
  }

  // بررسی دسته‌بندی
  if (!EXPENSE_CATEGORIES.includes(category)) {
    throw new Error("دسته‌بندی مصرف معتبر نیست.");
  }

  // بررسی مبلغ
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("مبلغ مصرف باید بیشتر از صفر باشد.");
  }

  // بررسی ساختار تاریخ
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("تاریخ معتبر نیست.");
  }

  // بررسی واقعی بودن تاریخ
  const [year, month, day] = date.split("-").map(Number);

  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    throw new Error("تاریخ واردشده معتبر نیست.");
  }

  // ساخت اطلاعات مصرف
  const expense = {
    title,
    category,
    amount,
    date,
    description,
    createdAt: new Date().toISOString()
  };

  const db = getDB();

  // ذخیره در دیتابیس
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      "expenses",
      "readwrite"
    );

    const store = transaction.objectStore("expenses");

    store.add(expense);

    transaction.oncomplete = () => {
      resolve(expense);
    };

    transaction.onerror = () => {
      reject(
        transaction.error ||
        new Error("ثبت مصرف ناموفق بود.")
      );
    };

    transaction.onabort = () => {
      reject(
        transaction.error ||
        new Error("عملیات ثبت مصرف لغو شد.")
      );
    };
  });
}


// ------------------------------
// دریافت تمام مصارف
// ------------------------------

export async function getExpenses() {
  const db = getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      "expenses",
      "readonly"
    );

    const store = transaction.objectStore("expenses");

    const request = store.getAll();

    request.onsuccess = () => {
      const expenses = request.result || [];

      // مرتب‌سازی از جدیدترین به قدیمی‌ترین
      expenses.sort((a, b) => {
        return String(b.date || "").localeCompare(
          String(a.date || "")
        );
      });

      resolve(expenses);
    };

    request.onerror = () => {
      reject(
      request.error ||
        new Error("دریافت مصارف ناموفق بود.")
      );
    };
  });
}