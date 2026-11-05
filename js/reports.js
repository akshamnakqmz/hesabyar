import { getSales } from "./sales.js";
import { getExpenses } from "./expenses.js";
import { getCustomers } from "./customers.js";

function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPeriodRange(period) {
  const today = new Date();
  const todayString = getLocalDate(today);

  if (period === "today") {
    return {
      start: todayString,
      end: todayString
    };
  }

  if (period === "week") {
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6);

    return {
      start: getLocalDate(startDate),
      end: todayString
    };
  }

  if (period === "month") {
    const startDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    return {
      start: getLocalDate(startDate),
      end: todayString
    };
  }

  return {
    start: null,
    end: null
  };
}

export async function getFinancialReport(period = "all") {
  const allowedPeriods = ["today", "week", "month", "all"];

  if (!allowedPeriods.includes(period)) {
    period = "all";
  }

  const [allSales, allExpenses, customers] = await Promise.all([
    getSales(),
    getExpenses(),
    getCustomers()
  ]);

  const range = getPeriodRange(period);

  const sales = allSales.filter(sale => {
    if (!range.start) return true;

    const date = String(sale.date || "").slice(0, 10);

    return date >= range.start && date <= range.end;
  });

  const expenses = allExpenses.filter(expense => {
    if (!range.start) return true;

    const date = String(expense.date || "").slice(0, 10);

    return date >= range.start && date <= range.end;
  });

  let totalSales = 0;
  let totalCost = 0;
  let grossProfit = 0;
  let totalExpenses = 0;

  sales.forEach(sale => {
    const total = Number(sale.total || 0);

    const cost = Number(
      sale.costTotal ??
      (Number(sale.quantity || 0) * Number(sale.purchasePrice || 0))
    );

    const profit = Number(
      sale.profit ?? (total - cost)
    );

    totalSales += total;
    totalCost += cost;
    grossProfit += profit;
  });

  expenses.forEach(expense => {
    totalExpenses += Number(expense.amount || 0);
  });

  const netProfit = grossProfit - totalExpenses;

  const totalDebts = customers.reduce(
    (sum, customer) => sum + Number(customer.totalDebt || 0),
    0
  );

  const saleDetails = sales.map(sale => {
    const total = Number(sale.total || 0);
    const cost = Number(
      sale.costTotal ??
      (Number(sale.quantity || 0) * Number(sale.purchasePrice || 0))
    );

    return {
      type: "sale",
      title: sale.product || "فروش",
      customer: sale.customer || "مشتری نامشخص",
      date: sale.date || "",
      amount: total,
      profit: Number(sale.profit ?? (total - cost))
    };
  });

  const expenseDetails = expenses.map(expense => ({
    type: "expense",
    title: expense.title || "مصرف",
    category: expense.category || "سایر",
    date: expense.date || "",
    amount: Number(expense.amount || 0),
    description: expense.description || ""
  }));

  const details = [
    ...saleDetails,
    ...expenseDetails
  ].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  return {
    period,
    startDate: range.start,
    endDate: range.end,

    totalSales,
    totalCost,
    grossProfit,
    totalExpenses,
    netProfit,
    totalDebts,

    salesCount: sales.length,
    expensesCount: expenses.length,

    details
  };
}