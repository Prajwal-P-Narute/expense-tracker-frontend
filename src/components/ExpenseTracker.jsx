import React, { useEffect, useRef, useState } from "react";
import "./ExpenseTracker.css";
import { useNavigate, useLocation } from "react-router-dom";
import { BASE_URL } from "../utils/api";

const ExpenseTracker = ({ setToken }) => {
  const netBalanceRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [transactions, setTransactions] = useState([]);
  const [groupedTransactions, setGroupedTransactions] = useState({});
  const [months, setMonths] = useState([]);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  const token = localStorage.getItem("token");

  const currentMonthKey = months[currentMonthIndex];
  const currentItems = groupedTransactions[currentMonthKey] || [];

  const groupTransactionsByMonth = (transactions) => {
    return transactions.reduce((acc, transaction) => {
      const date = new Date(transaction.date);
      const yearMonth = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      if (!acc[yearMonth]) acc[yearMonth] = [];
      acc[yearMonth].push(transaction);
      return acc;
    }, {});
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetch(`${BASE_URL}/api/transactions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (res.status === 401) {
          // Unauthorized, token expired or invalid
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        const sortedData = data.sort((a, b) => {
          if (a.date === b.date) {
            const idA = typeof a.id === "number" ? a.id : parseInt(a.id) || 0;
            const idB = typeof b.id === "number" ? b.id : parseInt(b.id) || 0;
            return idB - idA;
          }
          return new Date(b.date) - new Date(a.date);
        });

        setTransactions(sortedData);

        const grouped = groupTransactionsByMonth(sortedData);
        const sortedMonths = Object.keys(grouped).sort(
          (a, b) => new Date(b) - new Date(a)
        );

        setGroupedTransactions(grouped);
        setMonths(sortedMonths);
      })
      .catch((err) => console.error("Failed to load transactions", err));
  }, [location, navigate, token]);

  useEffect(() => {
    if (!token) return;
    fetch(`${BASE_URL}/api/transactions/opening-balance`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setOpeningBalance(data))
      .catch((err) => console.error("Failed to load opening balance", err));
  }, [token]);

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
      el.textContent = `${now.getDate()} ${
        monthsArr[now.getMonth()]
      } ${now.getFullYear()}`;
    }
  }, []);

  //   for display purposes, we calculate total income and expense
  //   based on the current month's transactions
  useEffect(() => {
    let income = 0;
    let expense = 0;

    currentItems.forEach((tx) => {
      if (tx.type === "credit") {
        income += Number(tx.amount);
      } else if (tx.type === "debit") {
        expense += Number(tx.amount);
      }
    });

    setTotalIncome(income);
    setTotalExpense(expense);
  }, [currentItems]);

  

  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.clear(); // optional: clear session data
    setToken(null);
    navigate("/login");
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Expense Tracker</h1>
        <div className="header-right">
          <span id="currentDate" className="current-month"></span>
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

      <div className="table-wrapper">
        <h2 className="month-heading">
          {currentMonthKey
            ? new Date(`${currentMonthKey}-01`).toLocaleString("default", {
                month: "long",
                year: "numeric",
              })
            : "No Transactions Yet"}
        </h2>

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
                      entry.reimbursable === "Y"
                        ? "reimbursable-Y"
                        : "reimbursable-N"
                    }
                  >
                    {entry.reimbursable}
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
                <td
                  colSpan="7"
                  style={{ textAlign: "center", padding: "1rem" }}
                >
                  No transactions for this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button
          onClick={() => setCurrentMonthIndex((prev) => Math.max(prev - 1, 0))}
          disabled={currentMonthIndex === 0}
        >
          ← Previous
        </button>
        <span>
          Page {currentMonthIndex + 1} of {months.length}
        </span>
        <button
          onClick={() =>
            setCurrentMonthIndex((prev) =>
              Math.min(prev + 1, months.length - 1)
            )
          }
          disabled={currentMonthIndex === months.length - 1}
        >
          Next →
        </button>
      </div>

      <div className="footer">
        <div className="total-summary">
          <div>
            <strong>Current Balance:</strong> ₹
            <span id="netBalance" ref={netBalanceRef}>
              {transactions.length > 0
                ? Number(transactions[0].runningBalance).toLocaleString(
                    "en-IN",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )
                : Number(openingBalance).toLocaleString("en-IN", {
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
