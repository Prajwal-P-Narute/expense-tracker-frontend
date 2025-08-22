import React, { useEffect, useState, useMemo, useRef } from "react";
import "./ExpenseTracker.css";
import { useNavigate, useLocation } from "react-router-dom";
import { BASE_URL } from "../utils/api";

const ExpenseTracker = ({ setToken }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [transactions, setTransactions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [openingBalance, setOpeningBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const token = localStorage.getItem("token");

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const userData = { name: "" };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
    return ["All Categories", ...Array.from(unique)];
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let filtered =
      selectedCategory === "All Categories"
        ? transactions
        : transactions.filter((t) => t.category === selectedCategory);

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
  }, [transactions, selectedCategory, startDate, endDate]);

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
    if (el) el.textContent = `${now.getDate()} ${monthsArr[now.getMonth()]} ${now.getFullYear()}`;
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.clear();
    setToken(null);
    navigate("/login");
  };

  const finalBalance =
    transactions.length > 0 ? transactions[0].runningBalance : openingBalance;

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

      {/* Date Range Filter */}
      <div className="date-filter" style={{ marginBottom:"1rem", display:"flex", gap:"1rem", alignItems:"center" }}>
        <label>
          Start Date:{" "}
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }} max={endDate || undefined}/>
        </label>
        <label>
          End Date:{" "}
          <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }} min={startDate || undefined}/>
        </label>
        {(startDate || endDate) && (
          <button onClick={() => { setStartDate(""); setEndDate(""); setCurrentPage(1); }} style={{ cursor: "pointer" }}>
            Clear Dates
          </button>
        )}
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
          <select className="filter-dropdown" value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}>
            {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
          </select>
          <button className="action-btn">Export to Excel</button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseTracker;
