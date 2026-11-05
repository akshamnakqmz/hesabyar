import { addSale, getSales } from "./sales.js";
import { addExpense, getExpenses } from "./expenses.js";
import {
  addCustomer,
  getCustomers,
  getCustomerSales,
  addPayment
} from "./customers.js";
import { getFinancialReport } from "./reports.js";

const $ = id => document.getElementById(id);

let currentCustomerName = "";

// ------------------------------
// توابع عمومی
// ------------------------------

function formatMoney(amount) {
  return new Intl.NumberFormat("fa-AF", {
    maximumFractionDigits: 0
  }).format(Number(amount) || 0) + " افغانی";
}

function getToday() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  if (!date) return "نامشخص";

  const parts = String(date).slice(0, 10).split("-");

  if (parts.length !== 3) return date;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function setText(id, value) {
  const element = $(id);

  if (element) {
    element.textContent = value;
  }
}

function showError(id, message) {
  const element = $(id);

  if (!element) return;

  element.textContent = message;
  element.hidden = !message;
}

function clearError(id) {
  showError(id, "");
}

function createElement(tag, className = "", text = "") {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  element.textContent = text;

  return element;
}

function createEmptyMessage(message) {
  return createElement("p", "empty-message", message);
}

function showSection(sectionId) {
  const sections = [
    "sales-section",
    "expenses-section",
    "customers-section",
    "reports-section"
  ];

  ["welcome", "dashboard", "navigation"].forEach(id => {
    const element = $(id);

    if (element) {
      element.hidden = true;
    }
  });

  sections.forEach(id => {
    const element = $(id);

    if (element) {
      element.hidden = id !== sectionId;
    }
  });
}

function showDashboard() {
  const sections = [
    "sales-section",
    "expenses-section",
    "customers-section",
    "reports-section"
  ];

  sections.forEach(id => {
    const element = $(id);

    if (element) {
      element.hidden = true;
    }
  });

  ["welcome", "dashboard", "navigation"].forEach(id => {
    const element = $(id);

    if (element) {
      element.hidden = false;
    }
  });

  currentCustomerName = "";
}

// ------------------------------
// داشبورد
// ------------------------------

export async function refreshDashboard() {
  try {
    const [sales, expenses, customers] = await Promise.all([
      getSales(),
      getExpenses(),
      getCustomers()
    ]);

    const today = getToday();

    const todaySales = sales.filter(
      sale => String(sale.date || "").slice(0, 10) === today
    );

    const todayExpenses = expenses.filter(
      expense => String(expense.date || "").slice(0, 10) === today
    );

    const salesAmount = todaySales.reduce(
      (sum, sale) => sum + Number(sale.total || 0),
      0
    );

    const expensesAmount = todayExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    );

    const grossProfit = todaySales.reduce(
      (sum, sale) => sum + Number(sale.profit || 0),
      0
    );

    const estimatedProfit = grossProfit - expensesAmount;

    const customerDebts = customers.reduce(
      (sum, customer) => sum + Number(customer.totalDebt || 0),
      0
    );

    setText("today-sales", formatMoney(salesAmount));
    setText("today-expenses", formatMoney(expensesAmount));
    setText("estimated-profit", formatMoney(estimatedProfit));
    setText("customer-debts", formatMoney(customerDebts));

  } catch (error) {
    console.error("Dashboard error:", error);
  }
}

// ------------------------------
// بخش فروش
// ------------------------------

export function initSalesUI() {initThemeUI();
  const openButton = $("open-sales");
  const closeButton = $("close-sales");
  const form = $("sale-form");

  if (!form) return;

  openButton?.addEventListener("click", async () => {
    showSection("sales-section");
    clearError("sale-error");
    await renderSales();
  });

  closeButton?.addEventListener("click", showDashboard);

  const previewInputs = [
    "quantity",
    "purchase-price",
    "sale-price",
    "paid-amount"
  ];

  previewInputs.forEach(id => {
    $(id)?.addEventListener("input", updateSalePreview);
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();

    clearError("sale-error");

    const data = {
      product: $("product-name")?.value,
      customer: $("customer-name")?.value,
      quantity: $("quantity")?.value,
      purchasePrice: $("purchase-price")?.value,
      salePrice: $("sale-price")?.value,
      paid: $("paid-amount")?.value
    };

    try {
      await addSale(data);

      form.reset();

      updateSalePreview();

      await renderSales();
      await refreshDashboard();

      alert("فروش با موفقیت ثبت شد.");

    } catch (error) {
      showError("sale-error", error.message || "ثبت فروش ناموفق بود.");
    }
  });

  updateSalePreview();
}

function updateSalePreview() {
  const quantity = Number($("quantity")?.value || 0);
  const purchasePrice = Number($("purchase-price")?.value || 0);
  const salePrice = Number($("sale-price")?.value || 0);
  const paid = Number($("paid-amount")?.value || 0);

  const total = quantity * salePrice;
  const cost = quantity * purchasePrice;
  const profit = total - cost;
  const debt = Math.max(0, total - paid);

  setText("preview-total", formatMoney(total));
  setText("preview-profit", formatMoney(profit));
  setText("preview-debt", formatMoney(debt));
}

async function renderSales() {
  const container = $("sales-list");

  if (!container) return;

  container.replaceChildren();

  try {
    const sales = await getSales();

    if (sales.length === 0) {
      container.appendChild(
        createEmptyMessage("هنوز هیچ فروشی ثبت نشده است.")
      );

      return;
    }

    sales.forEach(sale => {
      const card = createElement("div", "history-item");

      card.appendChild(
        createElement("strong", "item-title", sale.product || "بدون نام")
      );

      card.appendChild(
        createElement(
          "p",
          "item-info",
          `مشتری: ${sale.customer || "نقدی"}`
        )
      );

      card.appendChild(
        createElement(
          "p",
          "item-info",
          `تعداد: ${sale.quantity || 0} | تاریخ: ${formatDate(sale.date)}`
        )
      );

      card.appendChild(
        createElement(
          "p",
          "item-info",
          `مجموع فروش: ${formatMoney(sale.total)}`
        )
      );

      card.appendChild(
        createElement(
          "p",
          "item-info",
          `پرداخت اولیه: ${formatMoney(sale.paid)}`
        )
      );

      card.appendChild(
        createElement(
          "p",
          "item-info",
          `قرض اولیه: ${formatMoney(sale.debt)}`
        )
      );

      card.appendChild(
        createElement(
          "p",
          "item-profit",
          `سود: ${formatMoney(sale.profit)}`
        )
      );

      container.appendChild(card);
    });

  } catch (error) {
    console.error("Sales list error:", error);

    container.appendChild(
      createEmptyMessage("دریافت فهرست فروش‌ها ناموفق بود.")
    );
  }
}

// ------------------------------
// بخش مصارف
// ------------------------------

export function initExpensesUI() {
  const openButton = $("open-expenses");
  const closeButton = $("close-expenses");
  const form = $("expense-form");

  if (!form) return;

  openButton?.addEventListener("click", async () => {
    showSection("expenses-section");
    clearError("expense-error");
    await renderExpenses();
  });

  closeButton?.addEventListener("click", showDashboard);

  const dateInput = $("expense-date");

  if (dateInput && !dateInput.value) {
    dateInput.value = getToday();
  }

  const amountInput = $("expense-amount");

  amountInput?.addEventListener("input", updateExpensePreview);

  form.addEventListener("submit", async event => {
    event.preventDefault();

    clearError("expense-error");

    const data = {
      title: $("expense-title")?.value,
      category: $("expense-category")?.value,
      amount: $("expense-amount")?.value,
      date: $("expense-date")?.value,
      description: $("expense-description")?.value
    };

    try {
      await addExpense(data);

      form.reset();

      if (dateInput) {
        dateInput.value = getToday();
      }

      updateExpensePreview();

      await renderExpenses();
      await refreshDashboard();

      alert("مصرف با موفقیت ثبت شد.");

    } catch (error) {
      showError(
        "expense-error",
        error.message || "ثبت مصرف ناموفق بود."
      );
    }
  });

  updateExpensePreview();
}

function updateExpensePreview() {
  const amount = Number($("expense-amount")?.value || 0);

  setText("expense-preview", formatMoney(amount));
}

async function renderExpenses() {
  const container = $("expenses-list");

  if (!container) return;

  container.replaceChildren();

  try {
    const expenses = await getExpenses();

    if (expenses.length === 0) {
      container.appendChild(
        createEmptyMessage("هنوز هیچ مصرفی ثبت نشده است.")
      );

      return;
    }

    expenses.forEach(expense => {
      const card = createElement("div", "history-item");

      card.appendChild(
        createElement("strong", "item-title", expense.title)
      );

      card.appendChild(
        createElement(
          "p",
          "item-info",
          `دسته‌بندی: ${expense.category}`
        )
      );

      card.appendChild(
        createElement(
          "p",
          "item-info",
          `تاریخ: ${formatDate(expense.date)}`
        )
      );

      card.appendChild(
        createElement(
          "p",
          "item-amount",
          `مبلغ: ${formatMoney(expense.amount)}`
        )
      );

      if (expense.description) {
        card.appendChild(
          createElement("p", "item-info", expense.description)
        );
      }

      container.appendChild(card);
    });

  } catch (error) {
    console.error("Expenses list error:", error);

    container.appendChild(
      createEmptyMessage("دریافت فهرست مصارف ناموفق بود.")
    );
  }
}

// ------------------------------
// بخش مشتریان
// ------------------------------

export function initCustomersUI() {
  const openButton = $("open-customers");
  const closeButton = $("close-customers");
  const closeDetailsButton = $("close-customer-details");
  const form = $("customer-form");

  openButton?.addEventListener("click", async () => {
    showSection("customers-section");

    currentCustomerName = "";

    if ($("customer-details")) {
      $("customer-details").hidden = true;
    }

    clearError("customer-error");

    await renderCustomers();
  });

  closeButton?.addEventListener("click", showDashboard);

  closeDetailsButton?.addEventListener("click", () => {
    currentCustomerName = "";

    if ($("customer-details")) {
      $("customer-details").hidden = true;
    }
  });

  form?.addEventListener("submit", async event => {
    event.preventDefault();

    clearError("customer-error");

    const name = $("new-customer-name")?.value || "";

    try {
      await addCustomer(name);

      form.reset();

      await renderCustomers();

      alert("مشتری با موفقیت ثبت شد.");

    } catch (error) {
      showError(
        "customer-error",
        error.message || "ثبت مشتری ناموفق بود."
      );
    }
  });
}

async function renderCustomers() {
  const container = $("customers-list");

  if (!container) return;

  container.replaceChildren();

  try {
    const customers = await getCustomers();

    if (customers.length === 0) {
      container.appendChild(
        createEmptyMessage("هنوز هیچ مشتری ثبت نشده است.")
      );

      return;
    }

    customers.forEach(customer => {
      const card = createElement("div", "customer-card");

      card.appendChild(
        createElement("strong", "item-title", customer.name)
      );

      card.appendChild(
        createElement(
          "p",
          "item-info",
          `تعداد خریدها: ${customer.salesCount}`
        )
      );

      card.appendChild(
        createElement(
          "p",
          "item-info",
          `مجموع خرید: ${formatMoney(customer.totalSales)}`
        )
      );

      card.appendChild(
        createElement(
          "p",
          "item-debt",
          `قرض باقی‌مانده: ${formatMoney(customer.totalDebt)}`
        )
      );

      const button = createElement(
        "button",
        "view-customer-button",
        "مشاهده حساب مشتری"
      );

      button.type = "button";

      button.addEventListener("click", () => {
        openCustomerDetails(customer.name);
      });

      card.appendChild(button);

      container.appendChild(card);
    });

  } catch (error) {
    console.error("Customers list error:", error);

    container.appendChild(
      createEmptyMessage("دریافت فهرست مشتریان ناموفق بود.")
    );
  }
}

async function openCustomerDetails(customerName) {
  currentCustomerName = customerName;

  const details = $("customer-details");

  if (!details) return;

  details.hidden = false;

  showTextCustomerName(customerName);

  await renderCustomerSales(customerName);
}

function showTextCustomerName(name) {
  setText("customer-detail-name", name);
}

async function renderCustomerSales(customerName) {
  const container = $("customer-sales-list");

  if (!container) return;

  container.replaceChildren();

  try {
    const sales = await getCustomerSales(customerName);

    if (sales.length === 0) {
      container.appendChild(
        createEmptyMessage("این مشتری هنوز خریدی ثبت نکرده است.")
      );

      return;
    }

    sales.forEach(sale => {
      const card = createElement("div", "history-item");

      card.appendChild(
        createElement("strong", "item-title", sale.product || "فروش")
      );

      card.appendChild(
        createElement(
          "p",
          "item-info",
          `تاریخ خرید: ${formatDate(sale.date)}`
        )
      );

      card.appendChild(
        createElement(
          "p",
          "item-info",
          `مجموع خرید: ${formatMoney(sale.total)}`
        )
      );

      const totalPaid = Number(sale.paid || 0) +
        Number(sale.paidLater || 0);

      card.appendChild(
        createElement(
          "p",
          "item-info",
          `مجموع پرداخت‌شده: ${formatMoney(totalPaid)}`
        )
      );

      card.appendChild(
        createElement(
          "p",
          "item-debt",
          `قرض باقی‌مانده: ${formatMoney(sale.remainingDebt)}`
        )
      );

      if (sale.remainingDebt > 0) {
        const paymentForm = createElement(
          "form",
          "payment-form"
        );

        const amountInput = createElement(
          "input",
          "payment-input"
        );

        amountInput.type = "number";
        amountInput.min = "0.01";
        amountInput.step = "0.01";
        amountInput.max = String(sale.remainingDebt);
        amountInput.placeholder = "مبلغ پرداخت";
        amountInput.required = true;

        const submitButton = createElement(
          "button",
          "payment-button",
          "ثبت پرداخت"
        );

        submitButton.type = "submit";

        const errorMessage = createElement(
          "p",
          "form-error",
          ""
        );

        errorMessage.hidden = true;

        paymentForm.appendChild(amountInput);
        paymentForm.appendChild(submitButton);
        paymentForm.appendChild(errorMessage);

        paymentForm.addEventListener("submit", async event => {
          event.preventDefault();

          errorMessage.hidden = true;

          submitButton.disabled = true;

          try {
            await addPayment(sale.id, amountInput.value);

            await renderCustomerSales(customerName);
            await renderCustomers();
            await refreshDashboard();

            alert("پرداخت با موفقیت ثبت شد.");

          } catch (error) {
            errorMessage.textContent =
              error.message || "ثبت پرداخت ناموفق بود.";

            errorMessage.hidden = false;

          } finally {
            submitButton.disabled = false;
          }
        });

        card.appendChild(paymentForm);
      } else {
        card.appendChild(
          createElement(
            "p",
            "paid-status",
            "این خرید کاملاً تسویه شده است."
          )
        );
      }

      container.appendChild(card);
    });

  } catch (error) {
    console.error("Customer details error:", error);

    container.appendChild(
      createEmptyMessage("دریافت حساب مشتری ناموفق بود.")
    );
  }
}

// ------------------------------
// بخش گزارش‌های مالی
// ------------------------------

export function initReportsUI() {
  const openButton = $("open-reports");
  const closeButton = $("close-reports");
  const periodSelect = $("report-period");

  openButton?.addEventListener("click", async () => {
    showSection("reports-section");
    await renderReport();
  });

  closeButton?.addEventListener("click", showDashboard);

  periodSelect?.addEventListener("change", renderReport);
}

async function renderReport() {
  try {
    const period = $("report-period")?.value || "all";

    const report = await getFinancialReport(period);

    setText("report-sales", formatMoney(report.totalSales));

    setText("report-expenses", formatMoney(report.totalExpenses));

    setText(
      "report-gross-profit",
      formatMoney(report.grossProfit)
    );

    setText(
      "report-net-profit",
      formatMoney(report.netProfit)
    );

    setText(
      "report-debts",
      formatMoney(report.totalDebts)
    );

    renderReportDetails(report.details);

  } catch (error) {
    console.error("Financial report error:", error);

    const container = $("report-details");

    if (container) {
      container.replaceChildren(
        createEmptyMessage("دریافت گزارش مالی ناموفق بود.")
      );
    }
  }
}

function renderReportDetails(details) {
  const container = $("report-details");

  if (!container) return;

  container.replaceChildren();

  if (!details || details.length === 0) {
    container.appendChild(
      createEmptyMessage("برای این دوره اطلاعاتی ثبت نشده است.")
    );

    return;
  }

  details.forEach(item => {
    const isSale = item.type === "sale";

    const card = createElement(
      "div",
      isSale ? "report-item sale-report" : "report-item expense-report"
    );

    card.appendChild(
      createElement(
        "strong",
        "item-title",
        isSale ? `فروش: ${item.title}` : `مصرف: ${item.title}`
      )
    );

    card.appendChild(
      createElement(
        "p",
        "item-info",
        `تاریخ: ${formatDate(item.date)}`
      )
    );

    if (isSale) {
      card.appendChild(
        createElement(
          "p",
          "item-info",
          `مشتری: ${item.customer}`
        )
      );

      card.appendChild(
        createElement(
          "p",
          "item-profit",
          `سود: ${formatMoney(item.profit)}`
        )
      );

    } else {
      card.appendChild(
        createElement(
          "p",
          "item-info",
          `دسته‌بندی: ${item.category}`
        )
      );

      if (item.description) {
        card.appendChild(
          createElement("p", "item-info", item.description)
        );
      }
    }

    card.appendChild(
      createElement(
        "p",
        "item-amount",
        `مبلغ: ${formatMoney(item.amount)}`
      )
    );

    container.appendChild(card);
  });
}// ------------------------------
// سیستم تغییر تم
// ------------------------------

function initThemeUI() {
  const button = $("theme-toggle");

  if (!button) return;

  // دریافت تم ذخیره‌شده
  let savedTheme = localStorage.getItem("hesabyar-theme");

  if (savedTheme !== "light" && savedTheme !== "dark") {
    savedTheme = "dark";
  }

  // اعمال تم
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;

    button.textContent =
      theme === "light"
        ? "🌙 تم تاریک"
        : "☀️ تم روشن";

    localStorage.setItem("hesabyar-theme", theme);
  }

  // اعمال تم هنگام شروع برنامه
  applyTheme(savedTheme);

  // تغییر تم با کلیک
  button.addEventListener("click", () => {
    const currentTheme =
      document.documentElement.dataset.theme;

    const newTheme =
      currentTheme === "dark" ? "light" : "dark";

    applyTheme(newTheme);
  });
}
}
