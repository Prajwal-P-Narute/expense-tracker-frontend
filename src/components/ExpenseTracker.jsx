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
import { fetchTransactions, deleteTransaction } from "../utils/transactionApi";
import { fetchWithAuth } from "../utils/apiInterceptor";

const ExpenseTracker = ({ setToken }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [transactions, setTransactions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [categoryOptions, setCategoryOptions] = useState(["All"]);
  const [labelMap, setLabelMap] = useState({});
  const [selectedLabel, setSelectedLabel] = useState("All");
  const [labelOptions, setLabelOptions] = useState(["All"]);
  const [userName, setUserName] = useState("");
  const token = localStorage.getItem("token");
  const searchInputRef = useRef(null);


  // 🔍 Column search
  const [columnSearch, setColumnSearch] = useState({
    date: "",
    category: "",
    comments: "",
    label: "",
    debit: "",
    credit: "",
    balance: "",
  });
  const [exactMatchColumns, setExactMatchColumns] = useState({});

  // which column search popup is open
  const [activeSearchColumn, setActiveSearchColumn] = useState(null);

  // ▲▼ Sorting
  const [sortConfig, setSortConfig] = useState({
    key: null, // column key
    direction: null, // "asc" | "desc"
  });
  useEffect(() => {
  if (activeSearchColumn && searchInputRef.current) {
    // slight delay ensures popup is rendered
    setTimeout(() => {
      searchInputRef.current.focus();
    }, 0);
  }
}, [activeSearchColumn]);


  useEffect(() => {
    const name = localStorage.getItem("userName");
    if (name) setUserName(name);
  }, []);

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

  const getColumnValue = useCallback(
    (tx, key) => {
      switch (key) {
        case "date":
          return tx.date || "";

        case "category":
          return tx.category || "";

        case "comments":
          return tx.comments || "";

        case "label":
          return Array.isArray(tx.labelIds)
            ? tx.labelIds.map((id) => labelMap[id]?.name).join(", ")
            : "";

        case "debit":
          return tx.type === "debit" ? String(tx.amount) : null;

        case "credit":
          return tx.type === "credit" ? String(tx.amount) : null;

        case "balance":
          return String(tx.runningBalance ?? "");

        default:
          return "";
      }
    },
    [labelMap]
  );

  const getSuggestions = (key, typedValue) => {
    if (!typedValue) return [];

    return [
      ...new Set(
        transactions
          .map((tx) => getColumnValue(tx, key))
          .filter(Boolean)
          .map((v) => v.toString())
          .filter((v) => v.toLowerCase().includes(typedValue.toLowerCase()))
      ),
    ].slice(0, 8); // limit suggestions
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  // ✅ Centralized fetch helper with automatic token expiration handling
  const refreshTransactions = useCallback(async () => {
    try {
      const [openingBal, data] = await Promise.all([
        fetchWithAuth(`${BASE_URL}/api/transactions/opening-balance`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((res) => res.json()),
        fetchTransactions(),
      ]);
      setOpeningBalance(openingBal);
      setTransactions(data);
      setCurrentPage(1);
    } catch (err) {
      // Token expiration is handled by apiInterceptor
      // Only handle other errors here
      if (!err.message.includes("Session expired")) {
        toast.error("Failed to load transactions.");
      }
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    if (location.state?.refresh) {
      navigate(location.pathname, { replace: true, state: {} });
    }
    refreshTransactions();
  }, [location, navigate, token, refreshTransactions]);

  useEffect(() => {
    // Fetch categories and labels
    const loadSupportingData = async () => {
      try {
        const [cats, labels] = await Promise.all([
          fetchCategories(),
          fetchLabels(),
        ]);
        const catNames = Array.from(new Set(cats.map((c) => c.name)));
        setCategoryOptions(["All", ...catNames]);

        setLabelMap(
          Object.fromEntries(
            labels.map((l) => [l.id, { name: l.name, color: l.color }])
          )
        );
        setLabelOptions(["All", ...labels.map((l) => l.id)]);
      } catch (error) {
        if (!error.message.includes("Session expired")) {
          toast.error("Failed to load categories or labels.");
        }
      }
    };
    loadSupportingData();
  }, [location.key]);

  const filteredTransactions = useMemo(() => {
    let data = [...transactions];

    // existing filters (UNCHANGED)
    if (selectedCategory !== "All") {
      data = data.filter((t) => t.category === selectedCategory);
    }

    if (startDate) {
      data = data.filter((t) => new Date(t.date) >= new Date(startDate));
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      data = data.filter((t) => new Date(t.date) <= end);
    }

    if (selectedLabel !== "All") {
      data = data.filter(
        (t) => Array.isArray(t.labelIds) && t.labelIds.includes(selectedLabel)
      );
    }

    // 🔍 COLUMN SEARCH FILTER
    Object.entries(columnSearch).forEach(([key, value]) => {
  if (!value) return;

  data = data.filter((tx) => {
    // 🚫 enforce correct transaction type
    if (key === "debit" && tx.type !== "debit") return false;
    if (key === "credit" && tx.type !== "credit") return false;

    const rawValue = getColumnValue(tx, key);
    if (rawValue == null) return false;

    const cellValue = rawValue.toString().toLowerCase();
    const searchValue = value.toLowerCase();

    // exact match from suggestion
    if (exactMatchColumns[key]) {
      return cellValue === searchValue;
    }

    return cellValue.includes(searchValue);
  });
});


    // ▲▼ SORTING (ONLY FILTER VIEW – NO CALC IMPACT)
    if (sortConfig.key) {
  data.sort((a, b) => {
    const { key, direction } = sortConfig;

    // 🔴 DEBIT SORT
    if (key === "debit") {
      if (a.type !== "debit" && b.type !== "debit") return 0;
      if (a.type !== "debit") return 1;
      if (b.type !== "debit") return -1;

      return direction === "asc"
        ? a.amount - b.amount
        : b.amount - a.amount;
    }

    // 🟢 CREDIT SORT
    if (key === "credit") {
      if (a.type !== "credit" && b.type !== "credit") return 0;
      if (a.type !== "credit") return 1;
      if (b.type !== "credit") return -1;

      return direction === "asc"
        ? a.amount - b.amount
        : b.amount - a.amount;
    }

    // 🟡 OTHER COLUMNS (existing behavior)
    const A = getColumnValue(a, key);
    const B = getColumnValue(b, key);

    if (A == null && B == null) return 0;
    if (A == null) return 1;
    if (B == null) return -1;

    if (A < B) return direction === "asc" ? -1 : 1;
    if (A > B) return direction === "asc" ? 1 : -1;
    return 0;
  });
}


    return data;
  }, [
    transactions,
    selectedCategory,
    startDate,
    endDate,
    selectedLabel,
    columnSearch,
    exactMatchColumns,
    sortConfig,
    getColumnValue,
  ]);

  const handleSort = (key, direction) => {
    setSortConfig({ key, direction });
  };

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  useEffect(() => {
    const { income, expense } = filteredTransactions.reduce(
      (acc, tx) => {
        if (tx.type === "credit") acc.income += tx.amount;
        if (tx.type === "debit") acc.expense += tx.amount;
        return acc;
      },
      { income: 0, expense: 0 }
    );
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
    localStorage.removeItem("userName");
    sessionStorage.clear();
    setToken(null);
    navigate("/login");
    toast.success("Logged out successfully");
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      await deleteTransaction(transactionToDelete);
      toast.success("Transaction deleted successfully");
      await refreshTransactions();
    } catch (err) {
      if (!err.message.includes("Session expired")) {
        toast.error("Error deleting transaction");
      }
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
    setStartDate("");
    setEndDate("");
    setSelectedLabel("All");
    setColumnSearch({
      date: "",
      category: "",
      comments: "",
      label: "",
    });
    setSortConfig({ key: null, direction: null });
    setCurrentPage(1);
  };

  const finalBalance =
    transactions.length > 0 ? transactions[0].runningBalance : openingBalance;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 0, 210, 297, "F");
    doc.setFillColor(33, 150, 243);
    doc.rect(0, 0, 210, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(" Expense Report", 105, 13, { align: "center" });

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
      },
      bodyStyles: { fillColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      columnStyles: {
        0: { halign: "left", fontStyle: "bold", cellWidth: 80 },
        1: { halign: "right", cellWidth: 60, textColor: [33, 33, 33] },
      },
    });

    doc.setFontSize(14);
    doc.setTextColor(33, 33, 33);
    doc.text(" Applied Filters", 14, doc.lastAutoTable.finalY + 12);

    const categoryText = selectedCategory !== "All" ? selectedCategory : "All";
    const dateText =
      startDate && endDate
        ? `${formatDate(startDate)} To ${formatDate(endDate)}`
        : "All Dates";

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 18,
      head: [["Category", "Date Range"]],
      body: [[categoryText, dateText]],
      theme: "grid",
      styles: { fontSize: 10, halign: "center" },
      headStyles: { fillColor: [255, 152, 0], textColor: 255 },
      bodyStyles: { fillColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [255, 243, 224] },
    });

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
        formatDate(txn.date),
        txn.category,
        txn.comments || "-",
        labelNames,
        txn.type === "debit"
          ? amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })
          : "",
        txn.type === "credit"
          ? amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })
          : "",
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
        },
        alternateRowStyles: { fillColor: [232, 234, 246] },
        bodyStyles: { textColor: [33, 33, 33] },
        columnStyles: {
          0: { halign: "center" },
          1: { halign: "center" },
          2: { halign: "left" },
          3: { halign: "left" },
          4: { halign: "right", textColor: [200, 0, 0], fontStyle: "bold" },
          5: { halign: "right", textColor: [0, 150, 0], fontStyle: "bold" },
          6: { halign: "right", fontStyle: "bold" },
        },
      });
    }

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(
      ` Report Date: ${new Date().toLocaleString()}`,
      200,
      pageHeight - 10,
      { align: "right" }
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
              <div className="profile-wrapper" ref={dropdownRef}>
                <button
                  className="profile-btn"
                  ref={avatarBtnRef}
                  onClick={() => setDropdownOpen((o) => !o)}
                  aria-label="Profile menu"
                >
                  <div className="profile-avatar">
                    <i className="fas fa-user" />
                  </div>
                </button>

                <div
                  className={`profile-dropdown ${dropdownOpen ? "show" : ""}`}
                >
                  {/* Header */}
                  <div className="profile-header">
                    <div className="profile-avatar large">
                      <i className="fas fa-user" />
                    </div>
                    <div>
                      <h4>Hello, {userName} 👋</h4>
                      <p>Manage your account</p>
                    </div>
                  </div>

                  {/* Menu */}
                  <div className="profile-menu">
                    <div
                      className="profile-item"
                      onClick={() => {
                        navigate("/dashboard");
                        setDropdownOpen(false);
                      }}
                    >
                      <div className="icon bg-green">
                        <i className="fas fa-th-large" />
                      </div>
                      <div>
                        <span>Dashboard</span>
                        <small>View overview and analytics</small>
                      </div>
                      <i className="fas fa-chevron-right arrow" />
                    </div>

                    <div
                      className="profile-item"
                      onClick={() => {
                        navigate("/manage-finances");
                        setDropdownOpen(false);
                      }}
                    >
                      <div className="icon bg-blue">
                        <i className="fas fa-book" />
                      </div>
                      <div>
                        <span>Contact Ledger</span>
                        <small>View all contacts</small>
                      </div>
                      <i className="fas fa-chevron-right arrow" />
                    </div>

                    <div
                      className="profile-item"
                      onClick={() => {
                        navigate("/manage-contacts");
                        setDropdownOpen(false);
                      }}
                    >
                      <div className="icon bg-purple">
                        <i className="fas fa-users" />
                      </div>
                      <div>
                        <span>Manage Contacts</span>
                        <small>Add and edit contacts</small>
                      </div>
                      <i className="fas fa-chevron-right arrow" />
                    </div>

                    <div
                      className="profile-item"
                      onClick={() => {
                        navigate("/manage-categories");
                        setDropdownOpen(false);
                      }}
                    >
                      <div className="icon bg-indigo">
                        <i className="fas fa-cog" />
                      </div>
                      <div>
                        <span>Manage Categories</span>
                        <small>Organize expenses</small>
                      </div>
                      <i className="fas fa-chevron-right arrow" />
                    </div>

                    <div
                      className="profile-item"
                      onClick={() => {
                        navigate("/manage-labels");
                        setDropdownOpen(false);
                      }}
                    >
                      <div className="icon bg-violet">
                        <i className="fas fa-tag" />
                      </div>
                      <div>
                        <span>Manage Labels</span>
                        <small>Create custom labels</small>
                      </div>
                      <i className="fas fa-chevron-right arrow" />
                    </div>
                  </div>

                  {/* Logout */}
                  <div className="profile-footer">
                    <button className="logout-btn" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Section */}
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

        {/* Summary Section */}
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
                <th>
                  Date
                  <span className="icon-group">
                    <i
                      className="fas fa-search"
                      onClick={() =>
                        setActiveSearchColumn(
                          activeSearchColumn === "date" ? null : "date"
                        )
                      }
                    />
                    <i
                      className={`fas fa-sort-up ${
                        sortConfig.key === "date" &&
                        sortConfig.direction === "desc"
                          ? "active"
                          : ""
                      }`}
                      onClick={() => handleSort("date", "desc")}
                    />
                    <i
                      className={`fas fa-sort-down ${
                        sortConfig.key === "date" &&
                        sortConfig.direction === "asc"
                          ? "active"
                          : ""
                      }`}
                      onClick={() => handleSort("date", "asc")}
                    />
                  </span>
                  {activeSearchColumn === "date" && (
                    <div className="search-popup">
                      <input
                      ref={searchInputRef}
                        placeholder="Search date..."
                        value={columnSearch.date}
                        onChange={(e) =>
                          setColumnSearch({
                            ...columnSearch,
                            date: e.target.value,
                          })
                        }
                      />
                      <ul>
                        {getSuggestions("date", columnSearch.date).map((s) => (
                          <li
                            key={s}
                            onClick={() => {
                              setColumnSearch({ ...columnSearch, date: s });

                              setExactMatchColumns((prev) => ({
                                ...prev,
                                date: true, // 👈 EXACT MATCH
                              }));

                              setActiveSearchColumn(null);
                            }}
                          >
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </th>

                <th>
                  Category
                  <span className="icon-group">
                    {/* 🔍 SEARCH */}
                    <i
                      className="fas fa-search"
                      onClick={() =>
                        setActiveSearchColumn(
                          activeSearchColumn === "category" ? null : "category"
                        )
                      }
                    />

                    {/* ▲▼ SORT */}
                    <i
                      className={`fas fa-sort-up ${
                        sortConfig.key === "category" &&
                        sortConfig.direction === "desc"
                          ? "active"
                          : ""
                      }`}
                      onClick={() => handleSort("category", "desc")}
                    />
                    <i
                      className={`fas fa-sort-down ${
                        sortConfig.key === "category" &&
                        sortConfig.direction === "asc"
                          ? "active"
                          : ""
                      }`}
                      onClick={() => handleSort("category", "asc")}
                    />
                  </span>
                  {/* 🔍 SEARCH BOX */}
                  {activeSearchColumn === "category" && (
                    <div className="search-popup">
                      <input
                      ref={searchInputRef}
                        placeholder="Search category..."
                        value={columnSearch.category}
                        onChange={(e) =>
                          setColumnSearch({
                            ...columnSearch,
                            category: e.target.value,
                          })
                        }
                      />
                      <ul>
                        {getSuggestions("category", columnSearch.category).map(
                          (s) => (
                            <li
                              key={s}
                              onClick={() => {
                                setColumnSearch({
                                  ...columnSearch,
                                  category: s,
                                });

                                setExactMatchColumns((prev) => ({
                                  ...prev,
                                  category: true, // 👈 EXACT MATCH
                                }));

                                setActiveSearchColumn(null);
                              }}
                            >
                              {s}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </th>

                <th>
                  Comments
                  <span className="icon-group">
                    <i
                      className="fas fa-search"
                      onClick={() =>
                        setActiveSearchColumn(
                          activeSearchColumn === "comments" ? null : "comments"
                        )
                      }
                    />
                    <i
                      className={`fas fa-sort-up ${
                        sortConfig.key === "comments" &&
                        sortConfig.direction === "desc"
                          ? "active"
                          : ""
                      }`}
                      onClick={() => handleSort("comments", "desc")}
                    />
                    <i
                      className={`fas fa-sort-down ${
                        sortConfig.key === "comments" &&
                        sortConfig.direction === "asc"
                          ? "active"
                          : ""
                      }`}
                      onClick={() => handleSort("comments", "asc")}
                    />
                  </span>
                  {activeSearchColumn === "comments" && (
                    <div className="search-popup">
                      <input
                      ref={searchInputRef}
                        placeholder="Search comments..."
                        value={columnSearch.comments}
                        onChange={(e) =>
                          setColumnSearch({
                            ...columnSearch,
                            comments: e.target.value,
                          })
                        }
                      />
                      <ul>
                        {getSuggestions("comments", columnSearch.comments).map(
                          (s) => (
                            <li
                              key={s}
                              onClick={() => {
                                setColumnSearch({
                                  ...columnSearch,
                                  comments: s,
                                });

                                setExactMatchColumns((prev) => ({
                                  ...prev,
                                  comments: true, // 👈 EXACT MATCH
                                }));

                                setActiveSearchColumn(null);
                              }}
                            >
                              {s}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </th>

                <th>
                  Label
                  <span className="icon-group">
                    <i
                      className="fas fa-search"
                      onClick={() =>
                        setActiveSearchColumn(
                          activeSearchColumn === "label" ? null : "label"
                        )
                      }
                    />
                    <i
                      className={`fas fa-sort-up ${
                        sortConfig.key === "label" &&
                        sortConfig.direction === "desc"
                          ? "active"
                          : ""
                      }`}
                      onClick={() => handleSort("label", "desc")}
                    />
                    <i
                      className={`fas fa-sort-down ${
                        sortConfig.key === "label" &&
                        sortConfig.direction === "asc"
                          ? "active"
                          : ""
                      }`}
                      onClick={() => handleSort("label", "asc")}
                    />
                  </span>
                  {activeSearchColumn === "label" && (
                    <div className="search-popup">
                      <input
                      ref={searchInputRef}
                        placeholder="Search label..."
                        value={columnSearch.label}
                        onChange={(e) => {
                          setColumnSearch({
                            ...columnSearch,
                            label: e.target.value,
                          });

                          setExactMatchColumns((prev) => ({
                            ...prev,
                            label: false, // 👈 CONTAINS search
                          }));
                        }}
                      />

                      <ul>
                        {getSuggestions("label", columnSearch.label).map(
                          (s) => (
                            <li
                              key={s}
                              onClick={() => {
                                setColumnSearch({ ...columnSearch, label: s });

                                setExactMatchColumns((prev) => ({
                                  ...prev,
                                  label: true, // 👈 EXACT MATCH
                                }));

                                setActiveSearchColumn(null);
                              }}
                            >
                              {s}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </th>

                <th>
                  Debit
                  <span className="icon-group">
                    <i
                      className="fas fa-search"
                      onClick={() =>
                        setActiveSearchColumn(
                          activeSearchColumn === "debit" ? null : "debit"
                        )
                      }
                    />
                    <i
                      className={`fas fa-sort-up ${
                        sortConfig.key === "debit" &&
                        sortConfig.direction === "desc"
                          ? "active"
                          : ""
                      }`}
                      onClick={() => handleSort("debit", "desc")}
                    />
                    <i
                      className={`fas fa-sort-down ${
                        sortConfig.key === "debit" &&
                        sortConfig.direction === "asc"
                          ? "active"
                          : ""
                      }`}
                      onClick={() => handleSort("debit", "asc")}
                    />
                  </span>
                  {activeSearchColumn === "debit" && (
                    <div className="search-popup">
                      <input
                      ref={searchInputRef}
                        placeholder="Search debit..."
                        value={columnSearch.debit}
                        onChange={(e) => {
                          setColumnSearch({
                            ...columnSearch,
                            debit: e.target.value,
                          });
                          setExactMatchColumns((p) => ({ ...p, debit: false }));
                        }}
                      />
                      <ul>
                        {getSuggestions("debit", columnSearch.debit).map(
                          (s) => (
                            <li
                              key={s}
                              onClick={() => {
                                setColumnSearch({ ...columnSearch, debit: s });
                                setExactMatchColumns((p) => ({
                                  ...p,
                                  debit: true,
                                }));
                                setActiveSearchColumn(null);
                              }}
                            >
                              {s}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </th>

                <th>
                  Credit
                  <span className="icon-group">
                    <i
                      className="fas fa-search"
                      onClick={() =>
                        setActiveSearchColumn(
                          activeSearchColumn === "credit" ? null : "credit"
                        )
                      }
                    />
                    <i
                      className={`fas fa-sort-up ${
                        sortConfig.key === "credit" &&
                        sortConfig.direction === "desc"
                          ? "active"
                          : ""
                      }`}
                      onClick={() => handleSort("credit", "desc")}
                    />
                    <i
                      className={`fas fa-sort-down ${
                        sortConfig.key === "credit" &&
                        sortConfig.direction === "asc"
                          ? "active"
                          : ""
                      }`}
                      onClick={() => handleSort("credit", "asc")}
                    />
                  </span>
                  {activeSearchColumn === "credit" && (
                    <div className="search-popup">
                      <input
                      ref={searchInputRef}
                        placeholder="Search credit..."
                        value={columnSearch.credit}
                        onChange={(e) => {
                          setColumnSearch({
                            ...columnSearch,
                            credit: e.target.value,
                          });
                          setExactMatchColumns((p) => ({
                            ...p,
                            credit: false,
                          }));
                        }}
                      />
                      <ul>
                        {getSuggestions("credit", columnSearch.credit).map(
                          (s) => (
                            <li
                              key={s}
                              onClick={() => {
                                setColumnSearch({ ...columnSearch, credit: s });
                                setExactMatchColumns((p) => ({
                                  ...p,
                                  credit: true,
                                }));
                                setActiveSearchColumn(null);
                              }}
                            >
                              {s}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </th>

                <th>
                  Balance
                  <span className="icon-group">
                    <i
                      className="fas fa-search"
                      onClick={() =>
                        setActiveSearchColumn(
                          activeSearchColumn === "balance" ? null : "balance"
                        )
                      }
                    />
                    <i
                      className={`fas fa-sort-up ${
                        sortConfig.key === "balance" &&
                        sortConfig.direction === "desc"
                          ? "active"
                          : ""
                      }`}
                      onClick={() => handleSort("balance", "desc")}
                    />
                    <i
                      className={`fas fa-sort-down ${
                        sortConfig.key === "balance" &&
                        sortConfig.direction === "asc"
                          ? "active"
                          : ""
                      }`}
                      onClick={() => handleSort("balance", "asc")}
                    />
                  </span>
                  {activeSearchColumn === "balance" && (
                    <div className="search-popup">
                      <input
                      ref={searchInputRef}
                        placeholder="Search balance..."
                        value={columnSearch.balance}
                        onChange={(e) => {
                          setColumnSearch({
                            ...columnSearch,
                            balance: e.target.value,
                          });
                          setExactMatchColumns((p) => ({
                            ...p,
                            balance: false,
                          }));
                        }}
                      />
                      <ul>
                        {getSuggestions("balance", columnSearch.balance).map(
                          (s) => (
                            <li
                              key={s}
                              onClick={() => {
                                setColumnSearch({
                                  ...columnSearch,
                                  balance: s,
                                });
                                setExactMatchColumns((p) => ({
                                  ...p,
                                  balance: true,
                                }));
                                setActiveSearchColumn(null);
                              }}
                            >
                              {s}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </th>

                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.date)}</td>
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
                              backgroundColor: `${
                                labelMap[lid]?.color || "#6c5ce7"
                              }22`,
                              color: labelMap[lid]?.color || "#6c5ce7",
                              border: `1px solid ${
                                labelMap[lid]?.color || "#6c5ce7"
                              }`,
                            }}
                          >
                            {labelMap[lid]?.name || "Label"}
                          </span>
                        ))
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td
                      className={entry.type === "debit" ? "debit-amount" : ""}
                    >
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
                            state: {
                              transaction: entry,
                              isContactTransaction: !!entry.contactId,
                            },
                          })
                        }
                      >
                        <i className="fas fa-edit" />
                      </span>
                      <span
                        className="action-icon delete"
                        title="Delete"
                        onClick={() => {
                          setTransactionToDelete(entry.id);
                          setShowDeleteModal(true);
                        }}
                      >
                        <i className="fas fa-trash" />
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="8"
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

      <DeleteModal
        show={showDeleteModal}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
};

export default ExpenseTracker;
