import { getDB } from "./db.js";

export async function addCustomer(name) {
  name = String(name || "").trim();

  if (!name) {
    throw new Error("نام مشتری را وارد کنید.");
  }

  const customers = await getCustomers();

  const exists = customers.some(
    customer => customer.name.toLowerCase() === name.toLowerCase()
  );

  if (exists) {
    throw new Error("این مشتری قبلاً ثبت شده است.");
  }

  const db = getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("customers", "readwrite");

    transaction.objectStore("customers").add({
      name,
      createdAt: new Date().toISOString()
    });

    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => {
      reject(transaction.error || new Error("ثبت مشتری ناموفق بود."));
    };
    transaction.onabort = () => {
      reject(transaction.error || new Error("ثبت مشتری لغو شد."));
    };
  });
}

export async function getCustomers() {
  const db = getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      ["customers", "sales", "payments"],
      "readonly"
    );

    const customerRequest = transaction.objectStore("customers").getAll();
    const salesRequest = transaction.objectStore("sales").getAll();
    const paymentsRequest = transaction.objectStore("payments").getAll();

    transaction.oncomplete = () => {
      const customers = customerRequest.result || [];
      const sales = salesRequest.result || [];
      const payments = paymentsRequest.result || [];

      const customerMap = new Map();

      customers.forEach(customer => {
        const name = String(customer.name || "").trim();

        if (name) {
          customerMap.set(name.toLowerCase(), {
            id: customer.id,
            name,
            createdAt: customer.createdAt
          });
        }
      });

      sales.forEach(sale => {
        const name = String(sale.customer || "").trim();

        if (name && !customerMap.has(name.toLowerCase())) {
          customerMap.set(name.toLowerCase(), { name });
        }
      });

      const result = [];

      customerMap.forEach(customer => {
        const customerSales = sales.filter(
          sale =>
            String(sale.customer || "").trim().toLowerCase() ===
            customer.name.toLowerCase()
        );

        let totalSales = 0;
        let totalPaid = 0;
        let totalDebt = 0;

        customerSales.forEach(sale => {
          const paidLater = payments
            .filter(payment => payment.saleId === sale.id)
            .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

          totalSales += Number(sale.total || 0);
          totalPaid += Number(sale.paid || 0) + paidLater;

          totalDebt += Math.max(
            0,
            Number(sale.debt || 0) - paidLater
          );
        });

        result.push({
          ...customer,
          totalSales,
          totalPaid,
          totalDebt,
          salesCount: customerSales.length
        });
      });

      result.sort((a, b) => a.name.localeCompare(b.name, "fa"));

      resolve(result);
    };

    transaction.onerror = () => {
      reject(transaction.error || new Error("دریافت مشتریان ناموفق بود."));
    };
  });
}

export async function getCustomerSales(customerName) {
  const db = getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      ["sales", "payments"],
      "readonly"
    );

    const salesRequest = transaction.objectStore("sales").getAll();
    const paymentsRequest = transaction.objectStore("payments").getAll();

    transaction.oncomplete = () => {
      const sales = salesRequest.result || [];
      const payments = paymentsRequest.result || [];

      const result = sales
        .filter(
          sale =>
            String(sale.customer || "").trim().toLowerCase() ===
            String(customerName || "").trim().toLowerCase()
        )
        .map(sale => {
          const paidLater = payments
            .filter(payment => payment.saleId === sale.id)
            .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

          return {
            ...sale,
            paidLater,
            remainingDebt: Math.max(
              0,
              Number(sale.debt || 0) - paidLater
            )
          };
        });

      result.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      resolve(result);
    };

    transaction.onerror = () => {
      reject(transaction.error || new Error("دریافت حساب مشتری ناموفق بود."));
    };
  });
}

export async function addPayment(saleId, amount) {
  amount = Number(amount);

  if (!Number.isSafeInteger(Number(saleId)) || Number(saleId) <= 0) {
    throw new Error("شناسه فروش معتبر نیست.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("مبلغ پرداخت باید بیشتر از صفر باشد.");
  }

  const db = getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      ["sales", "payments"],
      "readwrite"
    );

    const salesStore = transaction.objectStore("sales");
    const paymentsStore = transaction.objectStore("payments");

    const saleRequest = salesStore.get(Number(saleId));
    const paymentsRequest = paymentsStore.getAll();

    let sale;
    let payments;
    let saleReady = false;
    let paymentsReady = false;
    let operationError = null;
    let paymentAdded = false;

    function checkPayment() {
      if (!saleReady || !paymentsReady || operationError || paymentAdded) {
        return;
      }

      if (!sale) {
        operationError = new Error("فروش موردنظر پیدا نشد.");
        transaction.abort();
        return;
      }

      const paidLater = payments
        .filter(payment => payment.saleId === sale.id)
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      const remainingDebt = Math.max(
        0,
        Number(sale.debt || 0) - paidLater
      );

      if (remainingDebt <= 0) {
        operationError = new Error("این قرض قبلاً تسویه شده است.");
        transaction.abort();
        return;
      }

      if (amount > remainingDebt) {
        operationError = new Error(
          "مبلغ پرداخت از قرض باقی‌مانده بیشتر است."
        );
        transaction.abort();
        return;
      }

      paymentsStore.add({
        saleId: sale.id,
        customer: sale.customer || "",
        amount,
        date: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString()
      });

      paymentAdded = true;
    }

    saleRequest.onsuccess = () => {
      sale = saleRequest.result;
      saleReady = true;
      checkPayment();
    };

    paymentsRequest.onsuccess = () => {
      payments = paymentsRequest.result || [];
      paymentsReady = true;
      checkPayment();
    };

    saleRequest.onerror = () => {
      operationError = saleRequest.error;
      transaction.abort();
    };

    paymentsRequest.onerror = () => {
      operationError = paymentsRequest.error;
      transaction.abort();
    };

    transaction.oncomplete = () => {
      resolve({
        success: true,
        amount
      });
    };

    transaction.onerror = () => {
      reject(
        operationError ||
        transaction.error ||
        new Error("ثبت پرداخت ناموفق بود.")
      );
    };

    transaction.onabort = () => {
      reject(
        operationError ||
        transaction.error ||
        new Error("عملیات پرداخت لغو شد.")
      );
    };
  });
}