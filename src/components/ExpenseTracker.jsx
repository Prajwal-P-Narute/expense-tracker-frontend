import React, { useEffect, useRef, useState, useMemo } from "react";
import "./ExpenseTracker.css";
import { useNavigate, useLocation } from "react-router-dom";
import { BASE_URL } from "../utils/api";

const ExpenseTracker = ({ setToken }) => {
  const netBalanceRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [transactions, setTransactions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [openingBalance, setOpeningBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
// jkajdkj
  const token = localStorage.getItem("token");

  // Fetch opening balance and transactions together
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    Promise.all([
      fetch(`${BASE_URL}/api/transactions/opening-balance`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),

      fetch(`${BASE_URL}/api/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        if (res.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
          return null;
        }
        return res.json();
      }),
    ])
      .then(([openingBal, data]) => {
        if (!data) return;

        setOpeningBalance(openingBal);

        // Sort descending by date, then descending by id (newest first)
        const sortedDesc = data.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);

          if (dateA.getTime() === dateB.getTime()) {
            const idA = Number(a.id);
            const idB = Number(b.id);

            if (!isNaN(idA) && !isNaN(idB)) {
              return idB - idA;
            } else {
              if (b.id > a.id) return 1;
              if (b.id < a.id) return -1;
              return 0;
            }
          }
          return dateB - dateA;
        });

        setTransactions(sortedDesc);
        setCurrentPage(1);
      })
      .catch((err) => console.error("Failed to load data", err));
  }, [location, navigate, token]);

  // Slice transactions for current page (newest first shown)
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return transactions.slice(start, start + pageSize);
  }, [transactions, currentPage]);

  // Calculate total income and expense for ALL transactions combined
  useEffect(() => {
    let income = 0;
    let expense = 0;

    transactions.forEach((tx) => {
      if (tx.type === "credit") {
        income += Number(tx.amount);
      } else if (tx.type === "debit") {
        expense += Number(tx.amount);
      }
    });

    setTotalIncome(income);
    setTotalExpense(expense);
  }, [transactions]);

  // Set current date display
  useEffect(() => {
    const now = new Date();
    const monthsArr = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const el = document.getElementById("currentDate");
    if (el) {
      el.textContent = `${now.getDate()} ${monthsArr[now.getMonth()]} ${now.getFullYear()}`;
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.clear();
    setToken(null);
    navigate("/login");
  };

  // Current Balance: runningBalance of newest transaction (first element in sorted descending array)
  const finalBalance =
    transactions.length > 0
      ? transactions[0].runningBalance
      : openingBalance;

  return (
    <div className="container">
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

            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <h2 className="month-heading">Transactions</h2>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Comments</th>
              <th>Debit Amount</th>
              <th>Credit Amount</th>
              <th>Reimbursable (Y/N)</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((entry, index) => (
                <tr key={entry.id || index}>
                  <td className="date-month">
                    {new Date(entry.date).toLocaleDateString()}
                  </td>
                  <td>{entry.category}</td>
                  <td>{entry.comments}</td>
                  <td className="debit-amount">
                    {entry.type === "debit" ? (
                      <strong>
                        {Number(entry.amount).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </strong>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="credit-amount">
                    {entry.type === "credit" ? (
                      <strong>
                        {Number(entry.amount).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </strong>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td
                    className={
                      entry.reimbursable ? "reimbursable-Y" : "reimbursable-N"
                    }
                  >
                    {entry.reimbursable ? "Y" : "N"}
                  </td>

                  <td
                    className={`running-total ${
                      entry.runningBalance < 0
                        ? "negative-balance"
                        : "positive-balance"
                    }`}
                  >
                    {Number(entry.runningBalance).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "1rem" }}>
                  No transactions to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          ← Previous
        </button>
        <span>
          Page {currentPage} of {Math.ceil(transactions.length / pageSize)}
        </span>
        <button
          onClick={() =>
            setCurrentPage((prev) =>
              Math.min(prev + 1, Math.ceil(transactions.length / pageSize))
            )
          }
          disabled={currentPage === Math.ceil(transactions.length / pageSize)}
        >
          Next →
        </button>
      </div>

      <div className="footer">
        <div className="total-summary">
          <div>
            <strong>Current Balance:</strong> ₹
            <span
              id="netBalance"
              ref={netBalanceRef}
            >
              {Number(finalBalance).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          <div>
            <strong>Total Income:</strong> ₹
            {totalIncome.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>

          <div>
            <strong>Total Expense:</strong> ₹
            {totalExpense.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        <div className="footer-actions">
          <select className="filter-dropdown">
            <option>All Categories</option>
          </select>
          <button className="action-btn">Export to Excel</button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseTracker;
