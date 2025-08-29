import React, { useEffect, useState, useMemo, useRef } from "react";
import "./ExpenseTracker.css";
import { useNavigate, useLocation } from "react-router-dom";
import { BASE_URL } from "../utils/api";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


const ExpenseTracker = ({ setToken }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [transactions, setTransactions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [reimbursable, setReimbursable] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [openingBalance, setOpeningBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const token = localStorage.getItem("token");

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const dropdownRef = useRef(null);

  const userData = { name: "" };

  // close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    Promise.all([
      fetch(`${BASE_URL}/api/transactions/opening-balance`, {
        credentials: "include",
      }).then((res) => res.json()),

      fetch(`${BASE_URL}/api/transactions`, { credentials: "include" }).then(
        (res) => {
          if (res.status === 401) {
            localStorage.removeItem("token");
            navigate("/login");
            return null;
          }
          return res.json();
        }
      ),
    ])
      .then(([openingBal, data]) => {
        if (!data) return;
        setOpeningBalance(openingBal);
        setTransactions(data);
        setCurrentPage(1);
      })
      .catch((err) => console.error("Failed to load data", err));
  }, [location, navigate, token]);

  const categories = useMemo(() => {
    const unique = new Set(transactions.map((t) => t.category));
    return ["All", ...Array.from(unique)];
  }, [transactions]);

  // ✅ Filtering Logic
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (selectedCategory !== "All") {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    if (reimbursable !== "All") {
      const flag = reimbursable === "Yes";
      filtered = filtered.filter((t) => t.reimbursable === flag);
    }

    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter((t) => new Date(t.date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((t) => new Date(t.date) <= end);
    }

    return filtered.sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time}`);
      const dateTimeB = new Date(`${b.date}T${b.time}`);
      if (dateTimeA.getTime() === dateTimeB.getTime()) {
        return Number(b.id) - Number(a.id);
      }
      return dateTimeB - dateTimeA;
    });
  }, [transactions, selectedCategory, reimbursable, startDate, endDate]);

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage]);

  useEffect(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.type === "credit") income += Number(tx.amount);
      else if (tx.type === "debit") expense += Number(tx.amount);
    });
    setTotalIncome(income);
    setTotalExpense(expense);
  }, [filteredTransactions]);

  useEffect(() => {
    const now = new Date();
    const monthsArr = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December",
    ];
    const el = document.getElementById("currentDate");
    if (el)
      el.textContent = `${now.getDate()} ${monthsArr[now.getMonth()]} ${now.getFullYear()}`;
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.clear();
    setToken(null);
    navigate("/login");
    toast.success("Logged out successfully");
  };

  const resetFilters = () => {
    setSelectedCategory("All");
    setReimbursable("All");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const finalBalance =
    transactions.length > 0 ? transactions[0].runningBalance : openingBalance;



  // ✅ Export PDF handler
// ✅ Export PDF handler
// ✅ Export PDF handler
const handleExportPDF = () => {
  const doc = new jsPDF();

  // --- Background ---
  doc.setFillColor(245, 247, 250); // light gray-blue background
  doc.rect(0, 0, 210, 297, "F"); // full A4 background

  // --- Title Banner ---
  doc.setFillColor(33, 150, 243); // blue banner
  doc.rect(0, 0, 210, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(" Expense Report", 105, 13, { align: "center" });

  // --- Summary Section ---
  const totalDebit = filteredTransactions
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalCredit = filteredTransactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const currentBal =
    filteredTransactions.length > 0
      ? filteredTransactions[0].runningBalance
      : openingBalance;

  doc.setFontSize(14);
  doc.setTextColor(33, 33, 33);
  doc.text(" Summary", 14, 28);

  autoTable(doc, {
    startY: 34,
    head: [["Metric", "Value"]],
    body: [
      ["Total Expense", totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })],
      ["Total Credit", totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })],
      ["Closing Balance", currentBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })],
    ],
    theme: "grid",
    styles: { fontSize: 11, valign: "middle" },
    headStyles: { fillColor: [76, 175, 80], textColor: 255, halign: "center" }, // green header
    bodyStyles: { fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [240, 248, 255] }, // light blue
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", cellWidth: 80 },
      1: { halign: "right", cellWidth: 60, textColor: [33, 33, 33] },
    },
  });

  // --- Filters Section ---
  doc.setFontSize(14);
  doc.setTextColor(33, 33, 33);
  doc.text(" Applied Filters", 14, doc.lastAutoTable.finalY + 12);

  const categoryText = selectedCategory !== "All" ? selectedCategory : "All";
  const dateText =
    startDate && endDate
      ? `${new Date(startDate).toLocaleDateString("en-IN")} ➝ ${new Date(endDate).toLocaleDateString("en-IN")}`
      : "All Dates";
  const reimbursableText =
    reimbursable === "Yes" ? "Yes" : reimbursable === "No" ? "No" : "All";

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 18,
    head: [["Category", "Date Range", "Reimbursable"]],
    body: [[categoryText, dateText, reimbursableText]],
    theme: "grid",
    styles: { fontSize: 10, halign: "center" },
    headStyles: { fillColor: [255, 152, 0], textColor: 255 }, // orange header
    bodyStyles: { fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [255, 243, 224] }, // light orange
  });

  // --- Transactions Section ---
  doc.setFontSize(14);
  doc.setTextColor(33, 33, 33);
  doc.text(" Transactions", 14, doc.lastAutoTable.finalY + 12);

  const tableColumn = ["Date", "Category", "Comments", "Debit", "Credit", "Reimb.", "Balance"];
  const tableRows = filteredTransactions.map((txn) => {
    const amount = Number(txn.amount) || 0;
    const runningBalance = Number(txn.runningBalance) || 0;

    return [
      new Date(txn.date).toLocaleDateString("en-IN"),
      txn.category,
      txn.comments || "-",
      txn.type === "debit" ? `${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "",
      txn.type === "credit" ? `${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "",
      txn.reimbursable ? "Yes" : "No",
      runningBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
    ];
  });

  if (tableRows.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(200, 0, 0);
    doc.text("⚠️ No transactions match the selected filters.", 14, doc.lastAutoTable.finalY + 18);
  } else {
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: doc.lastAutoTable.finalY + 18,
      styles: { fontSize: 9, valign: "middle" },
      headStyles: { fillColor: [63, 81, 181], textColor: 255, halign: "center" }, // Indigo header
      alternateRowStyles: { fillColor: [232, 234, 246] }, // light indigo
      bodyStyles: { textColor: [33, 33, 33] },
      columnStyles: {
        0: { halign: "center" }, // Date
        1: { halign: "center" }, // Category
        2: { halign: "left" },   // Comments
        3: { halign: "right", textColor: [200, 0, 0], fontStyle: "bold" }, // Debit red
        4: { halign: "right", textColor: [0, 150, 0], fontStyle: "bold" }, // Credit green
        5: { halign: "center" }, // Reimb.
        6: { halign: "right", fontStyle: "bold" }, // Balance
      },
    });
  }

  // --- Report Date (bottom-right corner) ---
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(` Report Date: ${new Date().toLocaleString()}`, 200, pageHeight - 10, {
    align: "right",
  });

  doc.save("expense_report.pdf");
};



  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <h1>Expense Tracker</h1>
        <div className="header-right">
          <span id="currentDate" className="current-month"></span>
          <div className="button-group">
            <button
              className="add-btn"
              onClick={() => navigate("/add-transaction")}
            >
              + Add Transaction
            </button>
            <button
              className="add-btn"
              onClick={() => setFilterOpen((prev) => !prev)}
            >
              {filterOpen ? "Hide Filters" : "Show Filters"}
            </button>
            <div className="user-dropdown-wrapper" ref={dropdownRef}>
              <div
                className="bg-dark text-white rounded-circle d-flex justify-content-center align-items-center"
                style={{
                  width: "40px",
                  height: "40px",
                  cursor: "pointer",
                  userSelect: "none",
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                }}
                onClick={() => setDropdownOpen((prev) => !prev)}
                title={userData.name || "User"}
              >
                {userData.name ? userData.name[0].toUpperCase() : "👤"}
              </div>
              {dropdownOpen && (
                <div
                  className="position-absolute shadow bg-white rounded p-2"
                  style={{ top: "50px", right: 0, zIndex: 100, minWidth: "150px" }}
                >
                  <div
                    className="dropdown-item py-1 px-2 text-danger"
                    style={{ cursor: "pointer" }}
                    onClick={handleLogout}
                  >
                    Logout
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Filter Section */}
      {filterOpen && (
        <div className="date-filter">
          <label>
            Category:
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </label>

          <label>
            Start Date:
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              max={endDate || undefined}
            />
          </label>

          <label>
            End Date:
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              min={startDate || undefined}
            />
          </label>

          <label>
            Reimbursable:
            <select
              value={reimbursable}
              onChange={(e) => { setReimbursable(e.target.value); setCurrentPage(1); }}
            >
              <option value="All">All</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </label>

          <button onClick={resetFilters}>Reset</button>
        </div>
      )}

      {/* ✅ Summary Section */}
      <div className="summary-section">
        <h2 className="summary-title">Summary</h2>
        <div className="summary-cards">
          <div className="summary-card balance">
            <h3>Current Balance</h3>
            <p>
              ₹{Number(finalBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="summary-card income">
            <h3>Total Income</h3>
            <p>
              ₹{Number(totalIncome).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="summary-card expense">
            <h3>Total Expense</h3>
            <p>
              ₹{Number(totalExpense).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Transactions table */}
      <div className="table-wrapper">
        <h2 className="month-heading">Transactions</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Category</th><th>Comments</th>
              <th>Debit Amount</th><th>Credit Amount</th>
              <th>Reimbursable (Y/N)</th><th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((entry, index) => (
                <tr key={entry.id || index}>
                  <td>{new Date(entry.date).toLocaleDateString()}</td>
                  <td>{entry.category}</td>
                  <td>{entry.comments}</td>
                  <td className="debit-amount">
                    {entry.type === "debit" ? (
                      <strong>
                        {Number(entry.amount).toLocaleString("en-IN",{ minimumFractionDigits: 2 })}
                      </strong>
                    ) : "-"}
                  </td>
                  <td className="credit-amount">
                    {entry.type === "credit" ? (
                      <strong>
                        {Number(entry.amount).toLocaleString("en-IN",{ minimumFractionDigits: 2 })}
                      </strong>
                    ) : "-"}
                  </td>
                  <td className={entry.reimbursable ? "reimbursable-Y" : "reimbursable-N"}>
                    {entry.reimbursable ? "Y" : "N"}
                  </td>
                  <td className={entry.runningBalance < 0 ? "negative-balance" : "positive-balance"}>
                    {Number(entry.runningBalance).toLocaleString("en-IN",{ minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "1rem" }}>No transactions to display.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>← Previous</button>
        <span>Page {currentPage} of {Math.ceil(filteredTransactions.length / pageSize)}</span>
        <button onClick={() => setCurrentPage((p) => Math.min(p + 1, Math.ceil(filteredTransactions.length / pageSize)))} disabled={currentPage === Math.ceil(filteredTransactions.length / pageSize)}>Next →</button>
      </div>

      {/* Footer summary */}
      <div className="footer">
        <div className="footer-actions">
          <button className="action-btn" onClick={handleExportPDF}>
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseTracker;
