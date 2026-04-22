import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

const COLORS = {
  primary: [12, 68, 124],
  income: [99, 153, 34],
  incomeBg: [234, 243, 222],
  incomeDark: [39, 80, 10],
  expense: [226, 75, 74],
  expenseBg: [252, 235, 235],
  expenseDark: [121, 31, 31],
  balance: [29, 158, 117],
  balanceBg: [225, 245, 238],
  balanceDark: [8, 80, 65],
  white: [255, 255, 255],
  offWhite: [249, 249, 249],
  border: [220, 220, 220],
  textDark: [30, 30, 30],
  textGray: [100, 100, 100],
  rowAlt: [245, 247, 250],
};

const CAT_COLORS_HEX = ["#378ADD", "#1D9E75", "#EF9F27", "#D85A30", "#888780"];
const CAT_COLORS_RGB = [
  [55, 138, 221],
  [29, 158, 117],
  [239, 159, 39],
  [216, 90, 48],
  [136, 135, 128],
];

function chartToBase64(type, data, options, width = 600, height = 300) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const chart = new Chart(canvas, {
      type,
      data,
      options: {
        animation: false,
        responsive: false,
        ...options,
        plugins: {
          legend: { display: false },
          ...(options?.plugins || {}),
        },
      },
    });

    resolve(canvas.toDataURL("image/png"));
    chart.destroy();
  });
}

function fmt(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function setFill(doc, rgb) {
  doc.setFillColor(...rgb);
}

function setDraw(doc, rgb) {
  doc.setDrawColor(...rgb);
}

function setFont(doc, size, weight = "normal", rgb = COLORS.textDark) {
  doc.setFontSize(size);
  doc.setFont("helvetica", weight);
  doc.setTextColor(...rgb);
}

function fillRect(doc, x, y, w, h, rgb, radius = 0) {
  setFill(doc, rgb);
  if (radius > 0) {
    doc.roundedRect(x, y, w, h, radius, radius, "F");
    return;
  }
  doc.rect(x, y, w, h, "F");
}

function drawKpiCard(
  doc,
  x,
  y,
  w,
  h,
  label,
  value,
  sub,
  bgRgb,
  accentRgb,
  labelRgb,
  valueRgb,
) {
  fillRect(doc, x, y, w, h, bgRgb, 3);
  fillRect(doc, x, y, 2.5, h, accentRgb);

  setFont(doc, 7, "normal", labelRgb);
  doc.text(label.toUpperCase(), x + 6, y + 8);

  setFont(doc, 13, "bold", valueRgb);
  doc.text(value, x + 6, y + 17);

  setFont(doc, 7, "normal", labelRgb);
  doc.text(sub, x + 6, y + 23);
}

async function buildPage1(doc, data) {
  const { userName, period, summary, categoryBreakdown } = data;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  fillRect(doc, 0, 0, pageWidth, 38, COLORS.primary);

  setFont(doc, 7, "normal", [133, 183, 235]);
  doc.text("FINANCIAL REPORT", margin, 10);

  setFont(doc, 16, "bold", COLORS.white);
  doc.text(userName, margin, 22);

  setFont(doc, 8, "normal", [133, 183, 235]);
  doc.text("Period", pageWidth - margin - 30, 12, { align: "right" });
  setFont(doc, 10, "bold", COLORS.white);
  doc.text(period, pageWidth - margin, 22, { align: "right" });

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  setFont(doc, 7, "normal", [133, 183, 235]);
  doc.text(`Generated ${today}`, pageWidth - margin, 32, { align: "right" });

  const cardY = 44;
  const cardH = 28;
  const cardW = (pageWidth - margin * 2 - 8) / 3;
  const gap = 4;

  drawKpiCard(
    doc,
    margin,
    cardY,
    cardW,
    cardH,
    "Total Income",
    fmt(summary.totalIncome),
    `${summary.incomeCount} transactions`,
    COLORS.incomeBg,
    COLORS.income,
    COLORS.income,
    COLORS.incomeDark,
  );
  drawKpiCard(
    doc,
    margin + cardW + gap,
    cardY,
    cardW,
    cardH,
    "Total Expense",
    fmt(summary.totalExpense),
    `${summary.expenseCount} transactions`,
    COLORS.expenseBg,
    COLORS.expense,
    COLORS.expense,
    COLORS.expenseDark,
  );
  drawKpiCard(
    doc,
    margin + (cardW + gap) * 2,
    cardY,
    cardW,
    cardH,
    "Current Balance",
    fmt(summary.currentBalance ?? summary.netBalance),
    `Opening ${fmt(summary.openingBalance || 0)}`,
    COLORS.balanceBg,
    COLORS.balance,
    COLORS.balance,
    COLORS.balanceDark,
  );

  const chartData =
    categoryBreakdown.length > 0
      ? categoryBreakdown
      : [{ name: "No expense data", value: 100, amount: 0 }];
  const donutPng = await chartToBase64(
    "doughnut",
    {
      labels: chartData.map((item) => item.name),
      datasets: [
        {
          data: chartData.map((item) => item.value),
          backgroundColor: CAT_COLORS_HEX.slice(0, chartData.length),
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    },
    {
      cutout: "65%",
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
    },
    300,
    300,
  );

  const chartY = cardY + cardH + 8;
  const chartSize = 70;
  doc.addImage(donutPng, "PNG", margin, chartY, chartSize, chartSize);

  const legendX = margin + chartSize + 10;
  let legendY = chartY + 8;

  setFont(doc, 8, "bold", COLORS.textDark);
  doc.text("Expense Breakdown", legendX, legendY);
  legendY += 7;

  chartData.forEach((category, index) => {
    const rgb = CAT_COLORS_RGB[index] || CAT_COLORS_RGB[CAT_COLORS_RGB.length - 1];
    fillRect(doc, legendX, legendY - 2.5, 4, 4, rgb, 1);
    setFont(doc, 8, "normal", COLORS.textDark);
    doc.text(category.name, legendX + 7, legendY + 1);
    setFont(doc, 8, "bold", COLORS.textDark);
    doc.text(`${category.value}%`, legendX + 55, legendY + 1, { align: "right" });
    setFont(doc, 7, "normal", COLORS.textGray);
    doc.text(fmt(category.amount), legendX + 80, legendY + 1, { align: "right" });
    legendY += 9;
  });

  const dividerY = chartY + chartSize + 6;
  setDraw(doc, COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(margin, dividerY, pageWidth - margin, dividerY);

  const statsY = dividerY + 8;
  const stats = [
    { label: "Highest Income", value: fmt(summary.highestIncome) },
    { label: "Highest Expense", value: fmt(summary.highestExpense) },
    { label: "Avg. Daily Spend", value: fmt(summary.avgDailySpend) },
    { label: "Total Days", value: summary.totalDays },
  ];
  const statColW = (pageWidth - margin * 2) / stats.length;

  stats.forEach((stat, index) => {
    const statX = margin + index * statColW;
    setFont(doc, 7, "normal", COLORS.textGray);
    doc.text(stat.label, statX, statsY);
    setFont(doc, 10, "bold", COLORS.textDark);
    doc.text(String(stat.value), statX, statsY + 7);
  });
}

async function buildPage2(doc, data) {
  const { monthlyData } = data;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  fillRect(doc, 0, 0, pageWidth, 12, COLORS.primary);
  setFont(doc, 8, "normal", [133, 183, 235]);
  doc.text("CHARTS & ANALYTICS", margin, 8);
  setFont(doc, 7, "normal", [133, 183, 235]);
  doc.text("Page 2", pageWidth - margin, 8, { align: "right" });

  setFont(doc, 9, "bold", COLORS.textDark);
  doc.text("Monthly Income vs Expense", margin, 24);

  fillRect(doc, margin, 27, 4, 4, COLORS.income, 1);
  setFont(doc, 7, "normal", COLORS.textGray);
  doc.text("Income", margin + 6, 30.5);
  fillRect(doc, margin + 28, 27, 4, 4, COLORS.expense, 1);
  doc.text("Expense", margin + 34, 30.5);

  const months = monthlyData.map((item) => item.month);
  const incomes = monthlyData.map((item) => item.income);
  const expenses = monthlyData.map((item) => item.expense);

  const barPng = await chartToBase64(
    "bar",
    {
      labels: months,
      datasets: [
        {
          label: "Income",
          data: incomes,
          backgroundColor: "#639922",
          borderRadius: 4,
          barPercentage: 0.7,
        },
        {
          label: "Expense",
          data: expenses,
          backgroundColor: "#E24B4A",
          borderRadius: 4,
          barPercentage: 0.7,
        },
      ],
    },
    {
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 13 } } },
        y: {
          grid: { color: "rgba(200,200,200,0.3)" },
          ticks: {
            font: { size: 11 },
            callback: (value) => `${(value / 1000).toFixed(0)}k`,
          },
        },
      },
    },
    600,
    280,
  );

  const barHeight = 72;
  doc.addImage(barPng, "PNG", margin, 34, pageWidth - margin * 2, barHeight);

  const lineY = 34 + barHeight + 12;
  setFont(doc, 9, "bold", COLORS.textDark);
  doc.text("Cumulative Balance Trend", margin, lineY - 2);

  const runningBalances = monthlyData.map((item) => item.balance || 0);

  const linePng = await chartToBase64(
    "line",
    {
      labels: months,
      datasets: [
        {
          label: "Balance",
          data: runningBalances,
          borderColor: "#1D9E75",
          backgroundColor: "rgba(29,158,117,0.1)",
          borderWidth: 2.5,
          tension: 0.4,
          pointBackgroundColor: "#1D9E75",
          pointRadius: 5,
          fill: true,
        },
      ],
    },
    {
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 13 } } },
        y: {
          grid: { color: "rgba(200,200,200,0.3)" },
          ticks: {
            font: { size: 11 },
            callback: (value) => `${(value / 1000).toFixed(0)}k`,
          },
        },
      },
    },
    600,
    220,
  );

  const lineHeight = 56;
  doc.addImage(linePng, "PNG", margin, lineY + 3, pageWidth - margin * 2, lineHeight);

  const tableY = lineY + 3 + lineHeight + 10;
  setFont(doc, 9, "bold", COLORS.textDark);
  doc.text("Monthly Summary Table", margin, tableY);

  autoTable(doc, {
    startY: tableY + 4,
    head: [["Month", "Income", "Expense", "Balance", "Savings %"]],
    body: monthlyData.map((item) => {
      const monthlyMovement = item.income - item.expense;
      const balance = item.balance || 0;
      const savingsRate = item.income > 0 ? Math.round((monthlyMovement / item.income) * 100) : 0;
      return [
        item.month,
        fmt(item.income),
        fmt(item.expense),
        fmt(balance),
        `${savingsRate}%`,
      ];
    }),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
      halign: "right",
    },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "right", textColor: COLORS.incomeDark },
      2: { halign: "right", textColor: COLORS.expenseDark },
      3: { halign: "right", textColor: COLORS.balanceDark },
      4: { halign: "right" },
    },
    alternateRowStyles: { fillColor: COLORS.rowAlt },
    margin: { left: margin, right: margin },
  });
}

async function buildPage3(doc, data) {
  const { transactions } = data;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  fillRect(doc, 0, 0, pageWidth, 12, COLORS.primary);
  setFont(doc, 8, "normal", [133, 183, 235]);
  doc.text("TRANSACTION DETAILS", margin, 8);
  setFont(doc, 7, "normal", [133, 183, 235]);
  doc.text("Page 3", pageWidth - margin, 8, { align: "right" });

  setFont(doc, 9, "bold", COLORS.textDark);
  doc.text("All Transactions", margin, 22);

  fillRect(doc, margin, 25, 4, 4, COLORS.income, 1);
  setFont(doc, 7, "normal", COLORS.textGray);
  doc.text("Income", margin + 6, 28.5);
  fillRect(doc, margin + 28, 25, 4, 4, COLORS.expense, 1);
  doc.text("Expense", margin + 34, 28.5);

  const rows = transactions.map((transaction) => [
    transaction.date || "",
    transaction.description || transaction.title || "",
    transaction.category || "",
    fmt(transaction.amount || 0),
    transaction.type === "income" ? "Income" : "Expense",
  ]);

  autoTable(doc, {
    startY: 32,
    head: [["Date", "Description", "Category", "Amount", "Type"]],
    body: rows,
    styles: { fontSize: 8, cellPadding: 4, overflow: "ellipsize" },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 28 },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 22, halign: "center" },
    },
    bodyStyles: { valign: "middle" },
    didParseCell: (hookData) => {
      if (hookData.section !== "body") return;

      const rowType = (rows[hookData.row.index]?.[4] || "").toLowerCase();
      if (rowType === "income") {
        hookData.cell.styles.fillColor = COLORS.incomeBg;
        hookData.cell.styles.textColor = COLORS.incomeDark;
        if (hookData.column.index === 3) {
          hookData.cell.styles.fontStyle = "bold";
        }
        return;
      }

      hookData.cell.styles.fillColor =
        hookData.row.index % 2 === 0 ? COLORS.white : COLORS.rowAlt;
      if (hookData.column.index === 3) {
        hookData.cell.styles.textColor = COLORS.expenseDark;
      }
    },
    didDrawCell: (hookData) => {
      if (hookData.section !== "body" || hookData.column.index !== 4) return;

      const rowType = (rows[hookData.row.index]?.[4] || "").toLowerCase();
      const { x, y, width, height } = hookData.cell;
      const badgeW = 18;
      const badgeH = 5;
      const badgeX = x + (width - badgeW) / 2;
      const badgeY = y + (height - badgeH) / 2;
      const isIncome = rowType === "income";

      fillRect(
        hookData.doc,
        badgeX,
        badgeY,
        badgeW,
        badgeH,
        isIncome ? COLORS.incomeBg : COLORS.expenseBg,
        2,
      );
      setFont(
        hookData.doc,
        7,
        "bold",
        isIncome ? COLORS.income : COLORS.expense,
      );
      hookData.doc.text(
        isIncome ? "+ Income" : "- Expense",
        badgeX + badgeW / 2,
        badgeY + badgeH - 1.2,
        { align: "center" },
      );
    },
    margin: { left: margin, right: margin },
    showFoot: "lastPage",
    foot: [
      [
        {
          content: `Total — ${transactions.length} transactions`,
          colSpan: 3,
          styles: { fontStyle: "bold", fillColor: COLORS.rowAlt },
        },
        {
          content: fmt(
            transactions.reduce((sum, transaction) => {
              const sign = transaction.type === "income" ? 1 : -1;
              return sum + sign * (transaction.amount || 0);
            }, 0),
          ),
          styles: {
            halign: "right",
            fontStyle: "bold",
            fillColor: COLORS.rowAlt,
            textColor: COLORS.balanceDark,
          },
        },
        { content: "", styles: { fillColor: COLORS.rowAlt } },
      ],
    ],
    footStyles: { fillColor: COLORS.rowAlt, textColor: COLORS.textDark },
  });

  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    fillRect(doc, 0, pageHeight - 10, pageWidth, 10, COLORS.primary);
    setFont(doc, 7, "normal", [133, 183, 235]);
    doc.text("Expense Tracker  •  Confidential", margin, pageHeight - 3.5);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 3.5, {
      align: "right",
    });
  }
}

export async function generateExpensePDF(data) {
  const monthlyData =
    Array.isArray(data.monthlyData) && data.monthlyData.length > 0
      ? data.monthlyData
      : [{ month: data.period || "Current", income: 0, expense: 0 }];
  const safeData = {
    ...data,
    monthlyData,
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    categoryBreakdown: Array.isArray(data.categoryBreakdown)
      ? data.categoryBreakdown
      : [],
  };

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  await buildPage1(doc, safeData);
  doc.addPage();
  await buildPage2(doc, safeData);
  doc.addPage();
  await buildPage3(doc, safeData);

  const safeName = (safeData.userName || "report").replace(/\s+/g, "_");
  const safePeriod = (safeData.period || "report").replace(/\s+/g, "_");
  doc.save(`Expense_Report_${safeName}_${safePeriod}.pdf`);
}
