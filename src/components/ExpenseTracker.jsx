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
const handleExportPDF = () => {
  const doc = new jsPDF();

  // --- Title Banner ---
  doc.setFillColor(41, 128, 185); // blue banner
  doc.rect(0, 0, 210, 20, "F"); // full width rectangle
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("Expense Report", 105, 13, { align: "center" });

  // --- Report Date ---
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  // --- Filters Box ---
  doc.setFontSize(12);
  doc.setTextColor(0);
  

  const categoryText = selectedCategory !== "All" ? selectedCategory : "All";
  const dateText =
    startDate && endDate
      ? `${new Date(startDate).toLocaleDateString("en-IN")} to ${new Date(endDate).toLocaleDateString("en-IN")}`
      : "All Dates";
  const reimbursableText = reimbursable === "Yes" ? "Yes" : reimbursable === "No" ? "No" : "All";

  autoTable(doc, {
    startY: 32,
    head: [["Category", "Date Range", "Reimbursable"]],
    body: [[categoryText, dateText, reimbursableText]],
    theme: "grid",
    styles: { fontSize: 10, halign: "center" },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
  });

  // --- Transactions Table ---
  const tableColumn = ["Date", "Category", "Comments", "Debit", "Credit", "Reimb.", "Balance"];

  const tableRows = filteredTransactions.map((txn) => {
    const amount = Number(txn.amount) || 0;
    const runningBalance = Number(txn.runningBalance) || 0;

    return [
      new Date(txn.date).toLocaleDateString("en-IN"),
      txn.category,
      txn.comments || "-",
      txn.type === "debit" ? `-${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "",
      txn.type === "credit" ? `+${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "",
      txn.reimbursable ? "Yes" : "No",
      runningBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
    ];
  });

  let finalY = 50;

  if (tableRows.length === 0) {
    doc.setFontSize(12);
    doc.text("No transactions match the selected filters.", 14, finalY);
  } else {
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 50,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 240, 240] }, // zebra rows
      columnStyles: {
        3: { halign: "right", textColor: [200, 0, 0] }, // debit red
        4: { halign: "right", textColor: [0, 150, 0] }, // credit green
        6: { halign: "right", fontStyle: "bold" },       // balance bold
      },
    });

    finalY = doc.lastAutoTable.finalY + 10;
  }

  // --- Summary Section ---
  const totalDebit = filteredTransactions
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalCredit = filteredTransactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  

  const reimbursableCount = filteredTransactions.filter((t) => t.reimbursable).length;

  autoTable(doc, {
    startY: finalY,
    head: [["Summary", "Value"]],
    body: [
      ["Total Expense", totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })],
      ["Total Credit", totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })],
      ["Reimbursable Count", reimbursableCount],
    ],
    theme: "striped",
    styles: { fontSize: 11 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "right" },
    },
  });

  // --- Save PDF ---
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
