import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import "./ExpenseTracker.css";
import { useNavigate, useLocation } from "react-router-dom";
import { BASE_URL } from "../utils/api";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import DeleteModal from "./DeleteModal";
import { fetchCategories } from "../utils/categoryApi";
import { fetchLabels } from "../utils/labelApi";

const ExpenseTracker = ({ setToken }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [transactions, setTransactions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [reimbursable, setReimbursable] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const avatarBtnRef = useRef(null);
  const pageSize = 15;

  const [openingBalance, setOpeningBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [filterOpen, setFilterOpen] = useState(false);
  // state for modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [categoryOptions, setCategoryOptions] = useState(["All"]);

  const [labelMap, setLabelMap] = useState({}); // id -> {name,color}
  const [selectedLabel, setSelectedLabel] = useState("All");
  const [labelOptions, setLabelOptions] = useState(["All"]);

  const token = localStorage.getItem("token");

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

  // Add above the effect
  const fallbackFromTx = useMemo(() => {
    const unique = new Set(transactions.map((t) => t.category));
    return ["All", ...Array.from(unique)];
  }, [transactions]); // safe and correct

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cats = await fetchCategories();
        if (cancelled) return;
        const names = Array.from(new Set(cats.map((c) => c.name)));
        setCategoryOptions(["All", ...names]);
        setSelectedCategory((prev) =>
          prev !== "All" && !names.includes(prev) ? "All" : prev
        );
      } catch {
        if (cancelled) return;
        // Use the memoized fallback so deps can be precise
        setCategoryOptions(fallbackFromTx);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fallbackFromTx, location.key]);

  // load labels on mount or location change similar to categories
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ls = await fetchLabels();
        if (cancelled) return;
        setLabelMap(
          Object.fromEntries(
            ls.map((l) => [l.id, { name: l.name, color: l.color }])
          )
        );
        setLabelOptions(["All", ...ls.map((l) => l.id)]);
        setSelectedLabel((prev) =>
          prev !== "All" && !ls.some((l) => l.id === prev) ? "All" : prev
        );
      } catch {
        // keep empty; labels optional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.key]);

  // ✅ Centralized fetch helper
  const refreshTransactions = useCallback(async () => {
    try {
      const [openingBal, data] = await Promise.all([
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
      ]);

      if (!data) return;
      setOpeningBalance(openingBal);
      setTransactions(data);
      setCurrentPage(1);
    } catch (err) {
      console.error("Failed to load data", err);
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    if (location.state?.refresh) {
      navigate(location.pathname, { replace: true, state: {} }); // clear refresh flag
    }

    refreshTransactions();
  }, [location, navigate, token, refreshTransactions]);

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

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

    if (selectedLabel !== "All") {
      filtered = filtered.filter(
        (t) => Array.isArray(t.labelIds) && t.labelIds.includes(selectedLabel)
      );
    }

    // This sorting logic is correct and will now work as expected on the copied array.
    return filtered.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
  
        // Primary sort: by date, descending (most recent date first)
        if (dateA.getTime() !== dateB.getTime()) {
          return dateB.getTime() - dateA.getTime();
        }
  
        // Secondary sort: by ID, descending (newer item first).
        return Number(b.id) - Number(a.id);
      });
  }, [
    transactions,
    selectedCategory,
    reimbursable,
    startDate,
    endDate,
    selectedLabel,
  ]);

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
    if (el)
      el.textContent = `${now.getDate()} ${
        monthsArr[now.getMonth()]
      } ${now.getFullYear()}`;
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.clear();
    setToken(null);
    navigate("/login");
    toast.success("Logged out successfully");
  };

  const confirmDelete = (id) => {
    setTransactionToDelete(id);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;

    try {
      const res = await fetch(
        `${BASE_URL}/api/transactions/${transactionToDelete}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.status === 204) {
        await refreshTransactions();
        toast.success("Transaction deleted successfully");
      } else {
        toast.error("Failed to delete transaction");
      }
    } catch (err) {
      console.error("Delete failed", err);
      toast.error("Error deleting transaction");
    } finally {
      setShowDeleteModal(false);
      setTransactionToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setTransactionToDelete(null);
  };

  const resetFilters = () => {
    setSelectedCategory("All");
    setReimbursable("All");
    setStartDate("");
    setEndDate("");
    setSelectedLabel("All");
    setCurrentPage(1);
  };

  const finalBalance =
    transactions.length > 0 ? transactions[0].runningBalance : openingBalance;

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
        [
          "Total Expense",
          totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
        ],
        [
          "Total Credit",
          totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
        ],
        [
          "Closing Balance",
          currentBal.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
        ],
      ],
      theme: "grid",
      styles: { fontSize: 11, valign: "middle" },
      headStyles: {
        fillColor: [76, 175, 80],
        textColor: 255,
        halign: "center",
      }, // green header
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
        ? `${new Date(startDate).toLocaleDateString("en-IN")} To ${new Date(
            endDate
          ).toLocaleDateString("en-IN")}`
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

    const tableColumn = [
      "Date",
      "Category",
      "Comments",
      "Labels",
      "Debit",
      "Credit",
      "Reimb.",
      "Balance",
    ];
    const tableRows = filteredTransactions.map((txn) => {
      const amount = Number(txn.amount) || 0;
      const runningBalance = Number(txn.runningBalance) || 0;
      const labelNames = Array.isArray(txn.labelIds)
        ? txn.labelIds
            .map((id) => labelMap[id]?.name || "")
            .filter(Boolean)
            .join(", ")
        : "-";
      return [
        new Date(txn.date).toLocaleDateString("en-IN"),
        txn.category,
        txn.comments || "-",
        labelNames,
        txn.type === "debit"
          ? amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })
          : "",
        txn.type === "credit"
          ? amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })
          : "",
        txn.reimbursable ? "Yes" : "No",
        runningBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
      ];
    });

    if (tableRows.length === 0) {
      doc.setFontSize(12);
      doc.setTextColor(200, 0, 0);
      doc.text(
        " No transactions match the selected filters.",
        14,
        doc.lastAutoTable.finalY + 18
      );
    } else {
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: doc.lastAutoTable.finalY + 18,
        styles: { fontSize: 9, valign: "middle" },
        headStyles: {
          fillColor: [63, 81, 181],
          textColor: 255,
          halign: "center",
        }, // Indigo header
        alternateRowStyles: { fillColor: [232, 234, 246] }, // light indigo
        bodyStyles: { textColor: [33, 33, 33] },
        columnStyles: {
          0: { halign: "center" }, // Date
          1: { halign: "center" }, // Category
          2: { halign: "left" }, // Comments
          3: { halign: "left" }, // Labels
          4: { halign: "right", textColor: [200, 0, 0], fontStyle: "bold" }, // Debit red
          5: { halign: "right", textColor: [0, 150, 0], fontStyle: "bold" }, // Credit green
          6: { halign: "center" }, // Reimb.
          7: { halign: "right", fontStyle: "bold" }, // Balance
        },
      });
    }

    // --- Report Date (bottom-right corner) ---
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(
      ` Report Date: ${new Date().toLocaleString()}`,
      200,
      pageHeight - 10,
      {
        align: "right",
      }
    );

    doc.save("expense_report.pdf");
  };

  return (
    <>
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
                + Add Entry
              </button>
              <button
                className="add-btn"
                onClick={() => setFilterOpen((prev) => !prev)}
              >
                {filterOpen ? "Hide Filters" : "Show Filters"}
              </button>
              <div className="user-dropdown-wrapper" ref={dropdownRef}>
                <div
                  className="user-avatar"
                  id="userMenuBtn"
                  ref={avatarBtnRef}
                  onClick={() => setDropdownOpen((o) => !o)}
                >
                  <i className="fas fa-user" />
                </div>
                <div
                  className={`user-dropdown ${dropdownOpen ? "show" : ""}`}
                  id="userDropdown"
                >
                  <div
                    className="dropdown-item"
                    id="manageLabelsBtn"
                    onClick={() => {
                      navigate("/manage-finances");
                      setDropdownOpen(false);
                    }}
                  >
                    <i className="fas fa-tag" />
                    <span>Manage Finances</span>
                  </div>
                  <div
                    className="dropdown-item"
                    id="manageContactsBtn"
                    onClick={() => {
                      navigate("/manage-contacts");
                      setDropdownOpen(false);
                    }}
                  >
                    <i className="fas fa-address-book" />
                    <span>Manage Contacts</span>
                  </div>
                  <div
                    className="dropdown-item"
                    id="manageCategoriesBtn"
                    onClick={() => {
                      navigate("/manage-categories");
                      setDropdownOpen(false);
                    }}
                  >
                    <i className="fas fa-tags" />
                    <span>Manage Categories</span>
                  </div>
                  <div
                    className="dropdown-item"
                    id="manageLabelsBtn"
                    onClick={() => {
                      navigate("/manage-labels");
                      setDropdownOpen(false);
                    }}
                  >
                    <i className="fas fa-tag" />
                    <span>Manage Labels</span>
                  </div>
                  <div className="dropdown-item logout" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt" />
                    <span>Logout</span>
                  </div>
                </div>
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
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Start Date:
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                max={endDate || undefined}
              />
            </label>

            <label>
              End Date:
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                min={startDate || undefined}
              />
            </label>

            <label>
              Reimbursable:
              <select
                value={reimbursable}
                onChange={(e) => {
                  setReimbursable(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </label>

            <label>
              Label:
              <select
                value={selectedLabel}
                onChange={(e) => {
                  setSelectedLabel(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {labelOptions.map((l) =>
                  l === "All" ? (
                    <option key="All" value="All">
                      All
                    </option>
                  ) : (
                    <option key={l} value={l}>
                      {labelMap[l]?.name || "Unknown"}
                    </option>
                  )
                )}
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
                ₹
                {Number(finalBalance).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="summary-card income">
              <h3>Total Income</h3>
              <p>
                ₹
                {Number(totalIncome).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="summary-card expense">
              <h3>Total Expense</h3>
              <p>
                ₹
                {Number(totalExpense).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
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
                <th>Date</th>
                <th>Category</th>
                <th>Comments</th>
                <th>Label</th>
                <th>Debit Amount</th>
                <th>Credit Amount</th>
                {/* <th>Reimbursable (Y/N)</th> */}
                <th>Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((entry, index) => (
                  <tr key={entry.id || index}>
                    <td>{new Date(entry.date).toLocaleDateString()}</td>
                    <td>{entry.category}</td>
                    <td>{entry.comments || "-"}</td>

                    <td>
                      {Array.isArray(entry.labelIds) &&
                      entry.labelIds.length > 0 ? (
                        entry.labelIds.map((lid) => (
                          <span
                            key={lid}
                            className="label-badge"
                            style={{
                              backgroundColor:
                                (labelMap[lid]?.color || "#6c5ce7") + "22",
                              color: labelMap[lid]?.color || "#6c5ce7",
                              border: `1px solid ${
                                labelMap[lid]?.color || "#6c5ce7"
                              }`,
                              padding: "2px 8px",
                              borderRadius: "12px",
                              marginRight: "4px",
                              display: "inline-block",
                            }}
                          >
                            {labelMap[lid]?.name || "Label"}
                          </span>
                        ))
                      ) : (
                        <span>-</span>
                      )}
                    </td>

                    <td className={entry.type === "debit" ? "debit-amount" : ""}>
                      {entry.type === "debit" ? (
                        <strong>
                          {Number(entry.amount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </strong>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td
                      className={entry.type === "credit" ? "credit-amount" : ""}
                    >
                      {entry.type === "credit" ? (
                        <strong>
                          {Number(entry.amount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </strong>
                      ) : (
                        "-"
                      )}
                    </td>
                    {/* <td
                      className={
                        entry.reimbursable ? "reimbursable-Y" : "reimbursable-N"
                      }
                    >
                      {entry.reimbursable ? "Y" : "N"}
                    </td> */}
                    <td
                      className={
                        entry.runningBalance < 0
                          ? "negative-balance"
                          : "positive-balance"
                      }
                    >
                      {Number(entry.runningBalance).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="action-cell">
                      <span
                        className="action-icon edit"
                        title="Edit"
                        onClick={() =>
                          navigate("/edit-transaction", {
                            state: { transaction: entry },
                          })
                        }
                      >
                        <i className="fas fa-edit" />
                      </span>
                      <span
                        className="action-icon delete"
                        title="Delete"
                        onClick={() => confirmDelete(entry.id)}
                      >
                        <i className="fas fa-trash" />
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="9"
                    style={{ textAlign: "center", padding: "1rem" }}
                  >
                    No transactions to display.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>
          <span>
            Page {currentPage} of{" "}
            {Math.ceil(filteredTransactions.length / pageSize)}
          </span>
          <button
            onClick={() =>
              setCurrentPage((p) =>
                Math.min(
                  p + 1,
                  Math.ceil(filteredTransactions.length / pageSize)
                )
              )
            }
            disabled={
              currentPage === Math.ceil(filteredTransactions.length / pageSize)
            }
          >
            Next →
          </button>
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

      {/* Add this at the end of your JSX, inside the main return */}
      <DeleteModal
        show={showDeleteModal}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
};

export default ExpenseTracker;