import React, { useEffect, useRef, useState } from 'react';
import './ExpenseTracker.css';
import { useNavigate } from 'react-router-dom';

const ExpenseTracker = () => {
  const netBalanceRef = useRef(null);
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [openingBalance, setOpeningBalance] = useState(0);

  // Fetch transactions
  useEffect(() => {
    fetch("https://expense-tracker-backend-y788.onrender.com/api/transactions")
      .then(res => res.json())
      .then(data => setTransactions(data))
      .catch(err => console.error("Failed to load transactions", err));
  }, []);

  // Fetch opening balance
  useEffect(() => {
    fetch("https://expense-tracker-backend-y788.onrender.com/api/transactions/opening-balance")
      .then(res => res.json())
      .then(data => setOpeningBalance(data))
      .catch(err => console.error("Failed to load opening balance", err));
  }, []);

  // Set current date
  useEffect(() => {
    const now = new Date();
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    document.getElementById('currentDate').textContent =
      `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }, []);

  return (
    <div className="container">
      <div className="header">
        <h1>Expense Tracker</h1>
        <div>
          <span id="currentDate" className="current-month"></span>
          <button className="add-btn" onClick={() => navigate("/add-transaction")}>+ Add Transaction</button>
        </div>
      </div>

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
          {transactions.map((entry, index) => (
            <tr key={index}>
              <td className="date-month">{new Date(entry.date).toLocaleDateString()}</td>
              <td>{entry.category}</td>
              <td>{entry.comments}</td>
              <td className="debit-amount">{entry.type === "debit" ? Number(entry.amount).toLocaleString() : "-"}</td>
              <td className="credit-amount">{entry.type === "credit" ? Number(entry.amount).toLocaleString() : "-"}</td>
              <td className={entry.reimbursable === 'Y' ? 'reimbursable-Y' : 'reimbursable-N'}>
                {entry.reimbursable}
              </td>
              <td className={`running-total ${entry.runningBalance < 0 ? "negative-balance" : "positive-balance"}`}>
                {Number(entry.runningBalance).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="footer">
        <div className="total-summary">
          Current Balance: ₹<span id="netBalance" ref={netBalanceRef}>
            {transactions.length > 0
              ? Number(transactions[transactions.length - 1].runningBalance).toLocaleString()
              : Number(openingBalance).toLocaleString()}
          </span>
        </div>
        <div>
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
