import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./FinTrack.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { fetchContacts } from "../utils/contactApi";
import { fetchContactTransactions, deleteContactTransaction } from "../utils/contactTransactionApi";
import { toast } from "react-toastify";
import DeleteModal from "./DeleteModal"; // Import the modal

const FinTrack = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // State for delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  const loadData = useCallback(async () => {
    // No setLoading(true) here to avoid flicker on refresh
    try {
      const [contactsData, transactionsData] = await Promise.all([
        fetchContacts(),
        fetchContactTransactions(),
      ]);
      setContacts(contactsData);
      setTransactions(transactionsData);
    } catch (error) {
      toast.error("Failed to load financial data.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const handleEdit = (transaction) => {
    navigate('/edit-transaction', { 
      state: { 
        transaction: {
          // Re-shape the object to match what TransactionForm expects
          ...transaction,
          reimbursable: false // Default for contact transactions
        }, 
        isContactTransaction: true // Flag to identify the type
      } 
    });
  };

  const handleDelete = (transaction) => {
    setTransactionToDelete(transaction);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      await deleteContactTransaction(transactionToDelete.id);
      toast.success("Transaction deleted successfully!");
      setShowDeleteModal(false);
      setTransactionToDelete(null);
      await loadData(); // Refresh data after deletion
    } catch (error) {
      toast.error(error.message || "Failed to delete transaction.");
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setTransactionToDelete(null);
  };

  // ... rest of your useMemo and helper functions (getInitials, contactMap, etc.) ...
  const getInitials = (name) => name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "";
  const contactMap = useMemo(() => contacts.reduce((acc, c) => { acc[c.id] = c; return acc; }, {}), [contacts]);
  const contactsWithSummary = useMemo(() => contacts.map(c => {
    const contactTxs = transactions.filter(t => t.contactId === c.id);
    const totalGiven = contactTxs.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
    const totalReceived = contactTxs.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    return { ...c, netAmount: totalReceived - totalGiven };
  }), [contacts, transactions]);
  const filteredContactsForSidebar = useMemo(() => contactsWithSummary.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())), [contactsWithSummary, searchTerm]);
  const displayedTransactions = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    return selectedContact ? sorted.filter(t => t.contactId === selectedContact.id) : sorted;
  }, [transactions, selectedContact]);
  const summaryStats = useMemo(() => {
    const source = displayedTransactions;
    const totalGiven = source.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
    const totalReceived = source.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalReceived - totalGiven;
    const activeContactIds = new Set(source.map(t => t.contactId));
    return { totalGiven, totalReceived, netBalance, totalContacts: selectedContact ? 1 : activeContactIds.size };
  }, [displayedTransactions, selectedContact]);

  if (loading) {
    return <div style={{ textAlign: "center", padding: "50px" }}>Loading your contact ledger...</div>;
  }

  return (
    <>
      <div className={`fintrack-container`}>
        {/* ... Header and Dashboard JSX ... */}
        <header>
            <div className="logo"><i className="fas fa-chart-line"></i><span>Contact Ledger</span></div>
            <div className="controls"><button className="btn btn-primary" onClick={() => navigate("/add-transaction")}><i className="fas fa-plus"></i> Add Transaction</button></div>
        </header>
        <div className="dashboard">
            <div className="card stat-card"><div className="stat-icon"><i className="fas fa-users"></i></div><div className="stat-value">{summaryStats.totalContacts}</div><div className="stat-title">Contacts</div></div>
            <div className="card stat-card"><div className="stat-icon"><i className="fas fa-arrow-up"></i></div><div className="stat-value positive">₹{summaryStats.totalReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div><div className="stat-title">Total Received</div></div>
            <div className="card stat-card"><div className="stat-icon"><i className="fas fa-arrow-down"></i></div><div className="stat-value negative">₹{summaryStats.totalGiven.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div><div className="stat-title">Total Given</div></div>
            <div className="card stat-card"><div className="stat-icon"><i className="fas fa-balance-scale"></i></div><div className={`stat-value ${summaryStats.netBalance >= 0 ? "positive" : "negative"}`}>₹{summaryStats.netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div><div className="stat-title">Net Balance</div></div>
        </div>

        <div className="view-container">
          {/* ... Sidebar JSX ... */}
          <div className="sidebar">
              <div className="search-box"><i className="fas fa-search"></i><input type="text" placeholder="Search contacts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
              <div className="contact-list">
                  <div className={`contact-item ${!selectedContact ? "active" : ""}`} onClick={() => setSelectedContact(null)}><div className="contact-avatar"><i className="fas fa-globe"></i></div><div className="contact-info"><div className="contact-name">All Contacts</div></div></div>
                  {filteredContactsForSidebar.map((contact) => (<div key={contact.id} className={`contact-item ${selectedContact?.id === contact.id ? "active" : ""}`} onClick={() => setSelectedContact(contact)}><div className="contact-avatar">{getInitials(contact.name)}</div><div className="contact-info"><div className="contact-name">{contact.name}</div></div><div className={`contact-net ${contact.netAmount >= 0 ? "positive" : "negative"}`}>₹{Math.abs(contact.netAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div></div>))}
              </div>
          </div>
          <div className="main-content">
            <h2>{selectedContact ? `${selectedContact.name}'s Ledger` : "All Contact Transactions"}</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  {!selectedContact && <th>Contact</th>}
                  <th>Description</th>
                  <th>Received</th>
                  <th>Given</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedTransactions.length > 0 ? (
                  displayedTransactions.map((t) => (
                    <tr key={t.id}>
                      <td>{new Date(t.date).toLocaleDateString("en-IN")}</td>
                      {!selectedContact && <td>{contactMap[t.contactId]?.name || "Unknown"}</td>}
                      <td>{t.comments || "-"}</td>
                      <td className="positive">{t.type === "credit" ? `₹${t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}</td>
                      <td className="negative">{t.type === "debit" ? `₹${t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="action-btn edit-btn" onClick={() => handleEdit(t)}>
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className="action-btn delete-btn" onClick={() => handleDelete(t)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={!selectedContact ? 6 : 5} style={{ textAlign: "center", padding: "20px" }}>No transactions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <footer><p>FinTrack © 2025 - Your Personal Finance Manager</p></footer>
      </div>

      <DeleteModal
        show={showDeleteModal}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        message={`Are you sure you want to delete this transaction? This action cannot be undone.`}
      />
    </>
  );
};

export default FinTrack;