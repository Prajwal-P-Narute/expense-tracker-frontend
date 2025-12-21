import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./FinTrack.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { fetchContacts } from "../utils/contactApi";
import {
  fetchContactTransactions,
  deleteTransaction,
} from "../utils/transactionApi";
import { toast } from "react-toastify";
import DeleteModal from "./DeleteModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const FinTrack = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [contactsData, transactionsData] = await Promise.all([
        fetchContacts(),
        fetchContactTransactions(), // Uses the new, dedicated API endpoint
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
    loadData();
  }, [loadData]);

  const handleEdit = (transaction) => {
    navigate("/edit-transaction", {
      state: { transaction, isContactTransaction: true },
    });
  };

  const handleDelete = (transaction) => {
    setTransactionToDelete(transaction);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      await deleteTransaction(transactionToDelete.id); // Uses the unified delete API
      toast.success("Transaction deleted successfully!");
      await loadData(); // Refresh data from the server
    } catch (error) {
      toast.error(error.message || "Failed to delete transaction.");
    } finally {
      setShowDeleteModal(false);
      setTransactionToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setTransactionToDelete(null);
  };

  const getInitials = (name) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "";
  const contactMap = useMemo(
    () => contacts.reduce((acc, c) => ({ ...acc, [c.id]: c }), {}),
    [contacts]
  );

  const contactsWithSummary = useMemo(
    () =>
      contacts.map((c) => {
        const { given, received } = transactions
          .filter((t) => t.contactId === c.id)
          .reduce(
            (acc, t) => {
              if (t.type === "debit") acc.given += t.amount;
              if (t.type === "credit") acc.received += t.amount;
              return acc;
            },
            { given: 0, received: 0 }
          );
        return { ...c, netAmount: received - given };
      }),
    [contacts, transactions]
  );

  const filteredContactsForSidebar = useMemo(
    () =>
      contactsWithSummary.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [contactsWithSummary, searchTerm]
  );

  const displayedTransactions = useMemo(() => {
    const sorted = [...transactions]; // Data is already sorted by the API
    return selectedContact
      ? sorted.filter((t) => t.contactId === selectedContact.id)
      : sorted;
  }, [transactions, selectedContact]);

  const summaryStats = useMemo(() => {
    const source = displayedTransactions;
    const { given, received } = source.reduce(
      (acc, t) => {
        if (t.type === "debit") acc.given += t.amount;
        if (t.type === "credit") acc.received += t.amount;
        return acc;
      },
      { given: 0, received: 0 }
    );
    const activeContactIds = new Set(source.map((t) => t.contactId));
    return {
      totalGiven: given,
      totalReceived: received,
      netBalance: received - given,
      totalContacts: selectedContact ? 1 : activeContactIds.size,
    };
  }, [displayedTransactions, selectedContact]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        Loading your contact ledger...
      </div>
    );
  }

 const handleExportPDF = () => {
  const doc = new jsPDF();
  
  // --- 1. Generate Detailed Timestamp for Filename ---
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // Format: 2025-12-21
  const timeStr = now.getHours().toString().padStart(2, '0') + "-" + 
                  now.getMinutes().toString().padStart(2, '0') + "-" + 
                  now.getSeconds().toString().padStart(2, '0'); // Format: 11-45-30
  
  const contactName = selectedContact ? selectedContact.name : "AllContacts";
  
  // Example Result: ContactLedger_John_Doe_2025-12-21_11-45-30.pdf
  const fileName = `ContactLedger_${contactName.replace(/\s+/g, "_")}_${dateStr}_${timeStr}.pdf`;

  // --- 2. PDF Header Section ---
  doc.setFillColor(67, 97, 238); // Primary Blue
  doc.rect(0, 0, 210, 25, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("CONTACT LEDGER REPORT", 105, 16, { align: "center" });

  // --- 3. Report Metadata ---
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Contact: ${selectedContact ? selectedContact.name : "All Contacts"}`, 14, 35);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on: ${now.toLocaleString("en-IN")}`, 14, 41);

  // --- 4. Dynamic Summary Table (Dashboard Style) ---
  autoTable(doc, {
    startY: 48,
    head: [["Total Given", "Total Received", "Net Balance"]],
    body: [[
      `INR ${summaryStats.totalGiven.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      `INR ${summaryStats.totalReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      `INR ${summaryStats.netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
    ]],
    theme: "grid",
    headStyles: { 
      fillColor: [52, 58, 64], // Dark Gray
      halign: "center",
      fontSize: 11 
    },
    styles: { 
      halign: "center", 
      fontSize: 12, 
      fontStyle: "bold",
      cellPadding: 5 
    },
    didParseCell: function (data) {
      if (data.section === 'body') {
        // Total Given Column (Red)
        if (data.column.index === 0) {
          data.cell.styles.textColor = [220, 53, 69];
          data.cell.styles.fillColor = [255, 241, 242];
        }
        // Total Received Column (Green)
        if (data.column.index === 1) {
          data.cell.styles.textColor = [40, 167, 69];
          data.cell.styles.fillColor = [240, 253, 244];
        }
        // Dynamic Net Balance Column (Red if negative, Blue if positive)
        if (data.column.index === 2) {
          if (summaryStats.netBalance < 0) {
            data.cell.styles.textColor = [220, 53, 69]; 
            data.cell.styles.fillColor = [255, 235, 235]; 
          } else {
            data.cell.styles.textColor = [67, 97, 238]; 
            data.cell.styles.fillColor = [235, 240, 255]; 
          }
        }
      }
    }
  });

  // --- 5. Transactions List Table ---
  const tableColumn = ["Date", "Contact", "Description", "Type", "Amount"];
  const tableRows = displayedTransactions.map((t) => [
    new Date(t.date).toLocaleDateString("en-IN"),
    contactMap[t.contactId]?.name || "Unknown",
    t.comments || "-",
    t.type === "debit" ? "GIVEN" : "RECEIVED",
    t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })
  ]);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 15,
    head: [tableColumn],
    body: tableRows,
    theme: "striped",
    headStyles: { fillColor: [67, 97, 238] },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 35 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 30, halign: "center" },
      4: { cellWidth: 35, halign: "right", fontStyle: "bold" }
    },
    didParseCell: function (data) {
      // Color-code the GIVEN/RECEIVED labels in the list
      if (data.section === 'body' && data.column.index === 3) {
        if (data.cell.raw === "GIVEN") {
          data.cell.styles.textColor = [220, 53, 69]; // Red
        } else {
          data.cell.styles.textColor = [40, 167, 69]; // Green
        }
      }
    }
  });

  // --- 6. Footer (Page Numbers) ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`, 
      doc.internal.pageSize.width / 2, 
      doc.internal.pageSize.height - 10, 
      { align: "center" }
    );
  }

  // --- 7. Save the File ---
  doc.save(fileName);
};
  return (
    <>
      <div className={`fintrack-container`}>
        <header>
          <div className="logo">
            <i className="fas fa-chart-line"></i>
            <span>Contact Ledger</span>
          </div>
          <div className="controls">
            <button className="btn btn-secondary" onClick={() => navigate("/")}>
              <i className="fas fa-home"></i> Home
            </button>

            <button
              className="btn btn-primary"
              onClick={() =>
                navigate("/add-transaction", {
                  state: { isContactTransaction: true },
                })
              }
            >
              <i className="fas fa-plus"></i> Add Transaction
            </button>
          </div>
        </header>

        <div className="dashboard">
          <div className="card stat-card">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-value">{summaryStats.totalContacts}</div>
            <div className="stat-title">Contacts</div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon">
              <i className="fas fa-arrow-up"></i>
            </div>
            <div className="stat-value positive">
              ₹
              {summaryStats.totalReceived.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="stat-title">Total Received</div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon">
              <i className="fas fa-arrow-down"></i>
            </div>
            <div className="stat-value negative">
              ₹
              {summaryStats.totalGiven.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="stat-title">Total Given</div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon">
              <i className="fas fa-balance-scale"></i>
            </div>
            <div
              className={`stat-value ${
                summaryStats.netBalance >= 0 ? "positive" : "negative"
              }`}
            >
              ₹
              {summaryStats.netBalance.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="stat-title">Net Balance</div>
          </div>
        </div>

        <div className="view-container">
          <div className="sidebar">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="contact-list">
              <div
                className={`contact-item ${!selectedContact ? "active" : ""}`}
                onClick={() => setSelectedContact(null)}
              >
                <div className="contact-avatar">
                  <i className="fas fa-globe"></i>
                </div>
                <div className="contact-info">
                  <div className="contact-name">All Contacts</div>
                </div>
              </div>
              {filteredContactsForSidebar.map((contact) => (
                <div
                  key={contact.id}
                  className={`contact-item ${
                    selectedContact?.id === contact.id ? "active" : ""
                  }`}
                  onClick={() => setSelectedContact(contact)}
                >
                  <div className="contact-avatar">
                    {getInitials(contact.name)}
                  </div>
                  <div className="contact-info">
                    <div className="contact-name">{contact.name}</div>
                  </div>
                  <div
                    className={`contact-net ${
                      contact.netAmount >= 0 ? "positive" : "negative"
                    }`}
                  >
                    ₹
                    {Math.abs(contact.netAmount).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="main-content">
            <h2>
              {selectedContact
                ? `${selectedContact.name}'s Ledger`
                : "All Contact Transactions"}
            </h2>
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
                      {!selectedContact && (
                        <td>{contactMap[t.contactId]?.name || "Unknown"}</td>
                      )}
                      <td>{t.comments || "-"}</td>
                      <td className="positive">
                        {t.type === "credit"
                          ? `₹${t.amount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}`
                          : "-"}
                      </td>
                      <td className="negative">
                        {t.type === "debit"
                          ? `₹${t.amount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}`
                          : "-"}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn edit-btn"
                            onClick={() => handleEdit(t)}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete(t)}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={!selectedContact ? 6 : 5}
                      style={{ textAlign: "center", padding: "20px" }}
                    >
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* <footer>
          <p>FinTrack © 2025 - Your Personal Finance Manager</p>
        </footer> */}
      </div>
      <button
  className="export-pdf-fab"
  onClick={handleExportPDF}
  title="Export PDF"
>
  <i className="fas fa-file-pdf"></i>
</button>

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
