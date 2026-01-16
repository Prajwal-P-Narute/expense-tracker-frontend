import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import PaginationControls from "../components/PaginationControls";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const FinTrack = () => {
  const navigate = useNavigate();
  
  // States for contacts pagination
  const [contactsPage, setContactsPage] = useState(0);
  const [contactsPageSize, setContactsPageSize] = useState(10);
  const [contactsTotalPages, setContactsTotalPages] = useState(0);
  const [contactsTotalElements, setContactsTotalElements] = useState(0);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  
  // States for transactions pagination
  const [transactionsPage, setTransactionsPage] = useState(0);
  const [transactionsPageSize, setTransactionsPageSize] = useState(20);
  const [transactionsTotalPages, setTransactionsTotalPages] = useState(0);
  const [transactionsTotalElements, setTransactionsTotalElements] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  
  // NEW: Store all transactions for summary calculation
  const [allTransactionsForSummary, setAllTransactionsForSummary] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  // Use ref to track if initial load has been done
  const initialLoadDone = useRef(false);

  // Load contacts with pagination
  const loadContacts = useCallback(async (page, size, search) => {
    setContactsLoading(true);
    try {
      const contactsData = await fetchContacts(page, size, search);
      setContacts(contactsData.content || []);
      setContactsTotalPages(contactsData.totalPages || 0);
      setContactsTotalElements(contactsData.totalElements || 0);
    } catch (error) {
      toast.error("Failed to load contacts.");
      console.error(error);
    } finally {
      setContactsLoading(false);
    }
  }, []);

  // Load transactions with pagination
  const loadTransactions = useCallback(async (page, size, contactId, search) => {
    setTransactionsLoading(true);
    try {
      const transactionsData = await fetchContactTransactions(page, size, contactId, search);
      console.log('Transactions API Response:', {
        content: transactionsData.content,
        totalPages: transactionsData.totalPages,
        totalElements: transactionsData.totalElements,
        pageable: transactionsData.pageable
      });
      setTransactions(transactionsData.content || []);
      setTransactionsTotalPages(transactionsData.totalPages || 0);
      setTransactionsTotalElements(transactionsData.totalElements || 0);

      console.log('Transactions state after set:', {
        page: page,
        totalPages: transactionsData.totalPages || 0,
        totalElements: transactionsData.totalElements || 0,
        contentLength: (transactionsData.content || []).length
      });
    } catch (error) {
      toast.error("Failed to load transactions.");
      console.error(error);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  // NEW: Load all transactions for summary (without pagination)
  const loadAllTransactionsForSummary = useCallback(async (contactId) => {
    try {
      const allTransactionsData = await fetchContactTransactions(0, 10000, contactId, "");
      setAllTransactionsForSummary(allTransactionsData.content || []);
    } catch (error) {
      console.error("Failed to load all transactions for summary", error);
      setAllTransactionsForSummary([]);
    }
  }, []);

  // Initial load - only run once
  useEffect(() => {
    if (initialLoadDone.current) return;
    
    const initialLoad = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadContacts(0, contactsPageSize, ""),
          loadTransactions(0, transactionsPageSize, null, ""),
          loadAllTransactionsForSummary(null)
        ]);
        initialLoadDone.current = true;
      } catch (error) {
        toast.error("Failed to load data.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    initialLoad();
    
    // Cleanup function
    return () => {
      // Reset the flag if component unmounts
      initialLoadDone.current = false;
    };
  }, [loadContacts, loadTransactions, loadAllTransactionsForSummary, contactsPageSize, transactionsPageSize]);

  // Handle contact selection change
  useEffect(() => {
    // Skip if no contact selected (initial state) or if initial load hasn't happened
    if (!initialLoadDone.current && selectedContact === null) return;
    
    const contactId = selectedContact?.id || null;
    loadTransactions(0, transactionsPageSize, contactId, "");
    loadAllTransactionsForSummary(contactId);
    setTransactionsPage(0);
  }, [selectedContact, loadTransactions, loadAllTransactionsForSummary, transactionsPageSize]);

  // Handle search term change
  useEffect(() => {
    const timer = setTimeout(() => {
      loadContacts(0, contactsPageSize, searchTerm);
      setContactsPage(0);
    }, 500); // Debounce search

    return () => clearTimeout(timer);
  }, [searchTerm, contactsPageSize, loadContacts]);

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
      await deleteTransaction(transactionToDelete.id);
      toast.success("Transaction deleted successfully!");
      
      // Reload current page after deletion
      const contactId = selectedContact?.id || null;
      await loadTransactions(transactionsPage, transactionsPageSize, contactId, "");
      
      // Reload all transactions for summary
      await loadAllTransactionsForSummary(contactId);
      
      // Also reload contacts to update net amounts
      await loadContacts(contactsPage, contactsPageSize, searchTerm);
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

  // Handle contacts pagination
  const handleContactsPageChange = (newPage) => {
    setContactsPage(newPage);
    loadContacts(newPage, contactsPageSize, searchTerm);
  };

  const handleContactsPageSizeChange = (newSize) => {
    const newPage = Math.floor((contactsPage * contactsPageSize) / newSize);
    setContactsPageSize(newSize);
    setContactsPage(newPage);
    loadContacts(newPage, newSize, searchTerm);
  };

  // Handle transactions pagination
  const handleTransactionsPageChange = (newPage) => {
    setTransactionsPage(newPage);
    const contactId = selectedContact?.id || null;
    loadTransactions(newPage, transactionsPageSize, contactId, "");
  };

  const handleTransactionsPageSizeChange = (newSize) => {
    const newPage = Math.floor((transactionsPage * transactionsPageSize) / newSize);
    setTransactionsPageSize(newSize);
    setTransactionsPage(newPage);
    const contactId = selectedContact?.id || null;
    loadTransactions(newPage, newSize, contactId, "");
  };

  const getInitials = (name) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "";

  // We need to fetch all contacts to calculate summaries
  const [allContacts, setAllContacts] = useState([]);
  useEffect(() => {
    const fetchAllContactsForSummary = async () => {
      try {
        const response = await fetchContacts(0, 1000, "");
        setAllContacts(response.content || []);
      } catch (error) {
        console.error("Failed to load contacts for summary", error);
      }
    };
    fetchAllContactsForSummary();
  }, []);

  const contactMap = useMemo(
    () => allContacts.reduce((acc, c) => ({ ...acc, [c.id]: c }), {}),
    [allContacts]
  );

  // Calculate contact summaries based on ALL transactions (not just current page)
  const contactNetMap = useMemo(() => {
    const map = {};
    allTransactionsForSummary.forEach(t => {
      if (!map[t.contactId]) map[t.contactId] = 0;
      map[t.contactId] += t.type === "credit" ? t.amount : -t.amount;
    });
    return map;
  }, [allTransactionsForSummary]);

  const displayedTransactions = transactions;

  // UPDATED: Calculate summary from ALL transactions for the selected contact/filter
  const summaryStats = useMemo(() => {
    const source = allTransactionsForSummary;
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
  }, [allTransactionsForSummary, selectedContact]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <div className="spinner" style={{ 
          width: '3rem', 
          height: '3rem', 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }}></div>
        <p>Loading your contact ledger...</p>
      </div>
    );
  }

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // --- 1. Generate Detailed Timestamp for Filename ---
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.getHours().toString().padStart(2, '0') + "-" + 
                    now.getMinutes().toString().padStart(2, '0') + "-" + 
                    now.getSeconds().toString().padStart(2, '0');
    
    const contactName = selectedContact ? selectedContact.name : "AllContacts";
    
    const fileName = `ContactLedger_${contactName.replace(/\s+/g, "_")}_${dateStr}_${timeStr}.pdf`;

    // --- 2. PDF Header Section ---
    doc.setFillColor(67, 97, 238);
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

    // --- 4. Dynamic Summary Table ---
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
        fillColor: [52, 58, 64],
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
          if (data.column.index === 0) {
            data.cell.styles.textColor = [220, 53, 69];
            data.cell.styles.fillColor = [255, 241, 242];
          }
          if (data.column.index === 1) {
            data.cell.styles.textColor = [40, 167, 69];
            data.cell.styles.fillColor = [240, 253, 244];
          }
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

    // --- 5. Transactions List Table (use all transactions for export) ---
    const tableColumn = ["Date", "Contact", "Description", "Type", "Amount"];
    const tableRows = allTransactionsForSummary.map((t) => [
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
        if (data.section === 'body' && data.column.index === 3) {
          if (data.cell.raw === "GIVEN") {
            data.cell.styles.textColor = [220, 53, 69];
          } else {
            data.cell.styles.textColor = [40, 167, 69];
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
            <div className="stat-value">{allContacts.length}</div>
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
              {contactsLoading ? (
                <div className="loading-contacts">
                  <div className="spinner small"></div>
                  <span>Loading contacts...</span>
                </div>
              ) : contacts.length > 0 ? (
                contacts.map((contact) => {
                  const net = contactNetMap[contact.id] || 0;

                  return (
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

                      <div className={`contact-net ${net >= 0 ? "positive" : "negative"}`}>
                        ₹
                        {Math.abs(net).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-contacts">
                  No contacts found
                </div>
              )}
            </div>
            
            {/* Contacts Pagination */}
            <PaginationControls
              currentPage={contactsPage}
              totalPages={contactsTotalPages}
              pageSize={contactsPageSize}
              totalElements={contactsTotalElements}
              onPageChange={handleContactsPageChange}
              onPageSizeChange={handleContactsPageSizeChange}
              isLoading={contactsLoading}
            />
          </div>
          
          <div className="main-content">
            <h2>
              {selectedContact
                ? `${selectedContact.name}'s Ledger`
                : "All Contact Transactions"}
            </h2>
            
            {/* Loading indicator for transactions */}
            {transactionsLoading && (
              <div className="transactions-loading">
                <div className="spinner"></div>
                <span>Loading transactions...</span>
              </div>
            )}
            
            <div className="table-wrapper">
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
                {!transactionsLoading && displayedTransactions.length > 0 ? (
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
                  !transactionsLoading && (
                    <tr>
                      <td
                        colSpan={!selectedContact ? 6 : 5}
                        style={{ textAlign: "center", padding: "20px" }}
                      >
                        No transactions found.
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
            </div>
            
            {/* Transactions Pagination */}
            {!transactionsLoading && (
              <PaginationControls
                currentPage={transactionsPage}
                totalPages={transactionsTotalPages}
                pageSize={transactionsPageSize}
                totalElements={transactionsTotalElements}
                onPageChange={handleTransactionsPageChange}
                onPageSizeChange={handleTransactionsPageSizeChange}
                isLoading={transactionsLoading}
              />
            )}
          </div>
        </div>
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