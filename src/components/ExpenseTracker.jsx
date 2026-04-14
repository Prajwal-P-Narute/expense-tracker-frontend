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
import DashboardInsights from "./DashboardInsights";
import { fetchCategories } from "../utils/categoryApi";
import { fetchLabels } from "../utils/labelApi";
import {
  deleteTransaction,
  fetchTransactionAnalytics,
  fetchTransactionsPageable,
  fetchFilteredSummary,
} from "../utils/transactionApi";
import TransactionFilter from "./TransactionFilter";
import { fetchWithAuth } from "../utils/apiInterceptor";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15;

const EMPTY_SEARCH = {
  date: "",
  category: "",
  comments: "",
  label: "",
  debit: "",
  credit: "",
  balance: "",
};

const EMPTY_ANALYTICS = {
  debit: { total: 0, maxAmount: 0, items: [] },
  credit: { total: 0, maxAmount: 0, items: [] },
  labels: { total: 0, maxAmount: 0, items: [] },
};

const LoadingOverlay = ({ message = "Loading transactions..." }) => (
  <div className="loading-overlay">
    <div className="spinner" />
    <p>{message}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const ExpenseTracker = ({ setToken }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");

  // ── Data ──────────────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState([]);
  const [openingBalance, setOpeningBalance] = useState(0);

  // ── Summary (now driven by filtered data from server) ─────────────────────
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [finalBalance, setFinalBalance] = useState(0);
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);

  // ── Pagination ────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // ── Loading ───────────────────────────────────────────────────────────────
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [userName, setUserName] = useState("");
  const [activeSearchColumn, setActiveSearchColumn] = useState(null);
  const [pendingNavigation, setPendingNavigation] = useState("");

  // ── Filters (dropdown / date-range) ──────────────────────────────────────
  const [selectedType, setSelectedType] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("All");

  // ── Column search (ALL server-side) ──────────────────────────────────────
  const [columnSearch, setColumnSearch] = useState(EMPTY_SEARCH);

  // ── Sort (server-side) ────────────────────────────────────────────────────
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "desc",
  });

  // ── Supporting data ───────────────────────────────────────────────────────
  const [categoryOptions, setCategoryOptions] = useState(["All"]);
  const [labelMap, setLabelMap] = useState({});
  const [labelOptions, setLabelOptions] = useState(["All"]);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchPopupRef = useRef(null);
  const transactionsSectionRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH TRIGGER PATTERN
  // ─────────────────────────────────────────────────────────────────────────
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const filtersRef = useRef({});

  const snapshotFilters = useCallback(
    (overrides = {}) => {
      filtersRef.current = {
        selectedCategory,
        selectedType,
        startDate,
        endDate,
        selectedLabel,
        columnSearch,
        sortConfig,
        currentPage,
        ...overrides,
      };
    },
    [
      selectedCategory,
      selectedType,
      startDate,
      endDate,
      selectedLabel,
      columnSearch,
      sortConfig,
      currentPage,
    ],
  );

  // const triggerFetch = useCallback(
  //   (overrides = {}, resetPage = false) => {
  //     const pg = resetPage ? 1 : (overrides.currentPage ?? currentPage);
  //     snapshotFilters({ ...overrides, currentPage: pg });
  //     if (resetPage) setCurrentPage(1);
  //     setFetchTrigger((t) => t + 1);
  //   },
  //   [snapshotFilters, currentPage],
  // );

  const doFetch = useCallback(async () => {
    const f = filtersRef.current;
    setIsLoadingPage(true);
    try {
      const filters = {
        category: f.selectedCategory,
        typeFilter: f.selectedType,
        startDate: f.startDate,
        endDate: f.endDate,
        labelId: f.selectedLabel,
        search: f.columnSearch,
        sortBy: f.sortConfig?.key || null,
        sortDir: f.sortConfig?.direction || "desc",
      };

      const [openingBal, pageData, summary, analyticsData] = await Promise.all([
        fetchWithAuth(`${BASE_URL}/api/transactions/opening-balance`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
        fetchTransactionsPageable(
          Math.max(0, (Number(f.currentPage) || 1) - 1),
          PAGE_SIZE,
          filters,
        ),
        fetchFilteredSummary(filters),
        fetchTransactionAnalytics(filters),
      ]);

      setOpeningBalance(openingBal);
      setTransactions(pageData.content || []);
      setTotalPages(pageData.totalPages || 0);

      // Update summary cards with filtered totals
      setTotalIncome(summary.totalIncome ?? 0);
      setTotalExpense(summary.totalExpense ?? 0);
      setFinalBalance(summary.finalBalance ?? 0);
      setAnalytics(analyticsData || EMPTY_ANALYTICS);
    } catch (err) {
      if (!err.message?.includes("Session expired"))
        toast.error("Failed to load transactions.");
      setTransactions([]);
      setAnalytics(EMPTY_ANALYTICS);
    } finally {
      setIsLoadingPage(false);
      setIsInitialLoad(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) doFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTrigger]);

  // ─────────────────────────────────────────────────────────────────────────────
// AUTH + initial load
// ─────────────────────────────────────────────────────────────────────────────
useEffect(() => {
  if (!token) {
    navigate("/login");
    return;
  }

  if (location.state?.refresh && location.state?.returnPage) {
    const pg = location.state.returnPage;
    navigate(location.pathname, { replace: true, state: {} });
    setCurrentPage(pg);
    snapshotFilters({ currentPage: pg });
  } else {
    // ── Restore page from sessionStorage on refresh, default to 1 ──
    const savedPage = parseInt(sessionStorage.getItem("et_currentPage"), 10);
    const pg = savedPage && savedPage > 0 ? savedPage : 1;
    setCurrentPage(pg);
    snapshotFilters({ currentPage: pg });
  }
  setIsLoadingPage(true);
  setFetchTrigger((t) => t + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [token]);

// Persist current page so browser refresh lands on the same page
useEffect(() => {
  sessionStorage.setItem("et_currentPage", String(currentPage));
}, [currentPage]);
  // ─────────────────────────────────────────────────────────────────────────
  // Supporting data
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [cats, labels] = await Promise.all([
          fetchCategories(),
          fetchLabels(),
        ]);
        setCategoryOptions([
          "All",
          ...Array.from(new Set(cats.map((c) => c.name))),
        ]);
        setLabelMap(
          Object.fromEntries(
            labels.map((l) => [l.id, { name: l.name, color: l.color }]),
          ),
        );
        setLabelOptions(["All", ...labels.map((l) => l.id)]);
      } catch (e) {
        if (!e.message?.includes("Session expired"))
          toast.error("Failed to load categories or labels.");
      }
    };
    load();
  }, [location.key, token]);

  // ─────────────────────────────────────────────────────────────────────────
  // Misc UI effects
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const name = localStorage.getItem("userName");
    if (name) setUserName(name);
  }, []);

  useEffect(() => {
    const now = new Date();
    const months = [
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
      el.textContent = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }, []);

  useEffect(() => {
    if (activeSearchColumn && searchInputRef.current)
      setTimeout(() => searchInputRef.current?.focus(), 0);
  }, [activeSearchColumn]);

  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (
        activeSearchColumn &&
        searchPopupRef.current &&
        !searchPopupRef.current.contains(e.target)
      )
        setActiveSearchColumn(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [activeSearchColumn]);

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers — check if any filter/search is currently active
  // ─────────────────────────────────────────────────────────────────────────
  const hasActiveFilters = useMemo(() => {
    const hasColumnSearch = Object.values(columnSearch).some(
      (v) => v.trim() !== "",
    );
    return (
      selectedType !== "All" ||
      selectedCategory !== "All" ||
      startDate !== "" ||
      endDate !== "" ||
      selectedLabel !== "All" ||
      hasColumnSearch
    );
  }, [
    selectedType,
    selectedCategory,
    startDate,
    endDate,
    selectedLabel,
    columnSearch,
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // Filter / search / sort change handlers
  // ─────────────────────────────────────────────────────────────────────────

  const requestDataRefresh = useCallback(
    (overrides = {}, nextPage = 1) => {
      setIsLoadingPage(true);
      snapshotFilters({ ...overrides, currentPage: nextPage });
      setCurrentPage(nextPage);
      setFetchTrigger((t) => t + 1);
    },
    [snapshotFilters],
  );

  const handleFilterChange = (setter, key, value) => {
    setter(value);
    requestDataRefresh({ [key]: value }, 1);
  };

  const handleColumnSearchChange = (key, value) => {
    const newCS = { ...columnSearch, [key]: value };
    setColumnSearch(newCS);
    requestDataRefresh({ columnSearch: newCS }, 1);
  };

  const applyColumnSuggestion = (key, value) => {
    const newCS = { ...columnSearch, [key]: value };
    setColumnSearch(newCS);
    setActiveSearchColumn(null);
    requestDataRefresh({ columnSearch: newCS }, 1);
  };

  const handleSort = (key, direction) => {
    const newSort = { key, direction };
    setSortConfig(newSort);
    requestDataRefresh({ sortConfig: newSort }, 1);
  };

  const handlePageChange = (newPage) => {
    const safePage = Number.isFinite(Number(newPage))
      ? Math.max(1, Math.floor(Number(newPage)))
      : 1;
    requestDataRefresh({}, safePage);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Suggestions (from current page — autocomplete)
  // ─────────────────────────────────────────────────────────────────────────
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
            ? tx.labelIds
                .map((id) => labelMap[id]?.name)
                .filter(Boolean)
                .join(", ")
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
    [labelMap],
  );

  const getSuggestions = useCallback(
    (key, typed) => {
      if (!typed || !Array.isArray(transactions)) return [];
      return [
        ...new Set(
          transactions
            .map((tx) => getColumnValue(tx, key))
            .filter(Boolean)
            .map((v) => v.toString())
            .filter((v) => v.toLowerCase().includes(typed.toLowerCase())),
        ),
      ].slice(0, 8);
    },
    [transactions, getColumnValue],
  );

  const formatDate = (d) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────
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
      await doFetch();
    } catch (err) {
      if (!err.message?.includes("Session expired"))
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

  const navigateWithLoader = useCallback(
    (path, options = {}, message = "Opening...") => {
      if (pendingNavigation) return;

      if (location.pathname === path) {
        setDropdownOpen(false);
        return;
      }

      setPendingNavigation(message);
      setDropdownOpen(false);
      window.requestAnimationFrame(() => {
        navigate(path, options);
      });
    },
    [location.pathname, navigate, pendingNavigation],
  );

  const activeInsightKey = useMemo(() => {
    if (
      selectedType !== "All" &&
      selectedCategory !== "All" &&
      (selectedType === "debit" || selectedType === "credit")
    ) {
      return `${selectedType}:${selectedCategory}`;
    }

    return null;
  }, [selectedType, selectedCategory]);

  const handleInsightSelection = useCallback(
    (sectionKey, item) => {
      if (!item || sectionKey === "labels") return;

      setSelectedType(sectionKey);
      setSelectedCategory(item.name);
      setFilterOpen(true);
      requestDataRefresh(
        {
          selectedType: sectionKey,
          selectedCategory: item.name,
        },
        1,
      );
      window.requestAnimationFrame(() => {
        transactionsSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    },
    [requestDataRefresh],
  );

  const resetFilters = () => {
    setIsLoadingPage(true);
    setSelectedType("All");
    setSelectedCategory("All");
    setStartDate("");
    setEndDate("");
    setSelectedLabel("All");
    setColumnSearch(EMPTY_SEARCH);
    setSortConfig({ key: null, direction: "desc" });
    setCurrentPage(1);
    filtersRef.current = {
      selectedType: "All",
      selectedCategory: "All",
      startDate: "",
      endDate: "",
      selectedLabel: "All",
      columnSearch: EMPTY_SEARCH,
      sortConfig: { key: null, direction: "desc" },
      currentPage: 1,
    };
    setFetchTrigger((t) => t + 1);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PDF Export
  // ─────────────────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;
    const fileName = `ExpenseReport_${userName.replace(/\s+/g, "_")}_${dateStr}_${timeStr}.pdf`;

    doc.setFillColor(245, 247, 250);
    doc.rect(0, 0, 210, 297, "F");
    doc.setFillColor(33, 150, 243);
    doc.rect(0, 0, 210, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Expense Report", 105, 13, { align: "center" });

    const closingBal =
      transactions.length > 0 ? transactions[0].runningBalance : openingBalance;

    doc.setFontSize(14);
    doc.setTextColor(33, 33, 33);
    doc.text("Summary", 14, 28);
    autoTable(doc, {
      startY: 34,
      head: [["Metric", "Value"]],
      body: [
        [
          "Total Expense",
          totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
        ],
        [
          "Total Credit",
          totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
        ],
        [
          "Closing Balance",
          closingBal.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
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
        1: { halign: "right", cellWidth: 60 },
      },
    });

    doc.setFontSize(14);
    doc.setTextColor(33, 33, 33);
    doc.text("Applied Filters", 14, doc.lastAutoTable.finalY + 12);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 18,
      head: [["Category", "Date Range"]],
      body: [
        [
          selectedCategory !== "All" ? selectedCategory : "All",
          startDate && endDate
            ? `${formatDate(startDate)} To ${formatDate(endDate)}`
            : "All Dates",
        ],
      ],
      theme: "grid",
      styles: { fontSize: 10, halign: "center" },
      headStyles: { fillColor: [255, 152, 0], textColor: 255 },
      bodyStyles: { fillColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [255, 243, 224] },
    });

    doc.setFontSize(14);
    doc.setTextColor(33, 33, 33);
    doc.text("Transactions", 14, doc.lastAutoTable.finalY + 12);
    const rows = transactions.map((txn) => {
      const amt = Number(txn.amount) || 0;
      const lbl = Array.isArray(txn.labelIds)
        ? txn.labelIds
            .map((id) => labelMap[id]?.name || "")
            .filter(Boolean)
            .join(", ")
        : "-";
      return [
        formatDate(txn.date),
        txn.category,
        txn.comments || "-",
        lbl,
        txn.type === "debit"
          ? amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })
          : "",
        txn.type === "credit"
          ? amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })
          : "",
        Number(txn.runningBalance).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        }),
      ];
    });

    if (!rows.length) {
      doc.setFontSize(12);
      doc.setTextColor(200, 0, 0);
      doc.text(
        "No transactions match the selected filters.",
        14,
        doc.lastAutoTable.finalY + 18,
      );
    } else {
      autoTable(doc, {
        head: [
          [
            "Date",
            "Category",
            "Comments",
            "Labels",
            "Debit",
            "Credit",
            "Balance",
          ],
        ],
        body: rows,
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
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(
      `Report Date: ${new Date().toLocaleString()}`,
      200,
      doc.internal.pageSize.height - 10,
      { align: "right" },
    );
    doc.save(fileName);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  const renderSearchPopup = (key, placeholder) => (
    <div className="search-popup" ref={searchPopupRef}>
      <input
        ref={searchInputRef}
        placeholder={placeholder}
        value={columnSearch[key]}
        onChange={(e) => handleColumnSearchChange(key, e.target.value)}
      />
      {columnSearch[key] && (
        <button
          style={{
            fontSize: "11px",
            padding: "2px 8px",
            marginTop: "4px",
            background: "#f0f0f0",
            border: "1px solid #ddd",
            borderRadius: "4px",
            cursor: "pointer",
            width: "100%",
          }}
          onClick={() => {
            handleColumnSearchChange(key, "");
            setActiveSearchColumn(null);
          }}
        >
          ✕ Clear
        </button>
      )}
      <ul>
        {getSuggestions(key, columnSearch[key]).map((s) => (
          <li key={s} onClick={() => applyColumnSuggestion(key, s)}>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );

  const renderColumnHeader = (searchKey, label, placeholder, sortKey) => {
    const sk = sortKey || searchKey;
    const hasSearch = Boolean(columnSearch[searchKey]);
    const isSortAsc = sortConfig.key === sk && sortConfig.direction === "asc";
    const isSortDesc = sortConfig.key === sk && sortConfig.direction === "desc";
    const isSortActive = isSortAsc || isSortDesc;

    return (
      <th style={{ position: "relative", whiteSpace: "nowrap" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            flexWrap: "nowrap",
          }}
        >
          <span style={{ flex: "1 1 auto" }}>{label}</span>

          <span
            title={
              hasSearch
                ? `Filtering: "${columnSearch[searchKey]}"`
                : `Search ${label}`
            }
            onClick={() =>
              setActiveSearchColumn(
                activeSearchColumn === searchKey ? null : searchKey,
              )
            }
            style={{
              cursor: "pointer",
              fontSize: "15px",
              padding: "2px 4px",
              borderRadius: "4px",
              color: hasSearch ? "#fff" : "#999",
              background: hasSearch ? "#4361ee" : "transparent",
              transition: "all 0.15s",
              lineHeight: 2,
              userSelect: "none",
            }}
          >
            🔍
          </span>

          {hasSearch && (
            <span
              title="Clear search filter"
              onClick={() => handleColumnSearchChange(searchKey, "")}
              style={{
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 700,
                padding: "1px 5px",
                borderRadius: "10px",
                color: "#fff",
                background: "#f72585",
                lineHeight: 1.4,
                userSelect: "none",
              }}
            >
              ✕
            </span>
          )}

          <span
            style={{
              display: "inline-flex",
              flexDirection: "column",
              gap: "0px",
              marginLeft: "2px",
            }}
          >
            <span
              title="Sort ascending"
              onClick={() => handleSort(sk, "asc")}
              style={{
                cursor: "pointer",
                fontSize: "13px",
                lineHeight: "13px",
                color: isSortAsc ? "#4361ee" : "#bbb",
                fontWeight: isSortAsc ? 900 : 400,
                transition: "color 0.15s",
                userSelect: "none",
                display: "block",
              }}
            >
              ▲
            </span>
            <span
              title="Sort descending"
              onClick={() => handleSort(sk, "desc")}
              style={{
                cursor: "pointer",
                fontSize: "13px",
                lineHeight: "13px",
                color: isSortDesc ? "#4361ee" : "#bbb",
                fontWeight: isSortDesc ? 900 : 400,
                transition: "color 0.15s",
                userSelect: "none",
                display: "block",
              }}
            >
              ▼
            </span>
          </span>

          {isSortActive && (
            <span
              title="Clear sort"
              onClick={() => {
                const clearedSort = { key: null, direction: "desc" };
                setSortConfig(clearedSort);
                requestDataRefresh({ sortConfig: clearedSort }, 1);
              }}
              style={{
                cursor: "pointer",
                fontSize: "10px",
                fontWeight: 700,
                padding: "1px 4px",
                borderRadius: "8px",
                color: "#fff",
                background: "#3a0ca3",
                lineHeight: 1.4,
                userSelect: "none",
              }}
            >
              ✕
            </span>
          )}
        </div>

        {activeSearchColumn === searchKey &&
          renderSearchPopup(searchKey, placeholder)}
      </th>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {isInitialLoad && <LoadingOverlay />}
      {pendingNavigation && !isInitialLoad && (
        <LoadingOverlay message={pendingNavigation} />
      )}
      <div className="container">
        {/* ── Header ── */}
        <div className="header">
          <h1>Expense Tracker</h1>
          <div className="header-right">
            <span id="currentDate" className="current-month" />
            <div className="button-group">
              <button
                className="add-btn"
                disabled={!!pendingNavigation}
                onClick={() =>
                  navigateWithLoader(
                    "/add-transaction",
                    { state: { returnPage: currentPage } },
                    "Opening transaction form...",
                  )
                }
              >
                {pendingNavigation === "Opening transaction form..." ? (
                  <span className="btn-with-spinner">
                    <span className="btn-spinner" aria-hidden="true" />
                    Opening...
                  </span>
                ) : (
                  "+ Add Entry"
                )}
              </button>
              <button
                className="add-btn"
                disabled={!!pendingNavigation}
                onClick={() => setFilterOpen((p) => !p)}
              >
                {filterOpen ? "Hide Filters" : "Show Filters"}
              </button>
              <div className="profile-wrapper" ref={dropdownRef}>
                <button
                  className="profile-btn"
                  disabled={!!pendingNavigation}
                  onClick={() => setDropdownOpen((o) => !o)}
                  aria-label="Profile menu"
                >
                  <div className="profile-avatar">
                    <i className="fas fa-user" />
                  </div>
                </button>
                <div
                  className={`profile-dropdown${dropdownOpen ? " show" : ""}`}
                >
                  <div className="profile-header">
                    <div className="profile-avatar large">
                      <i className="fas fa-user" />
                    </div>
                    <div>
                      <h4>Hello, {userName} 👋</h4>
                      <p>Manage your account</p>
                    </div>
                  </div>
                  <div className="profile-menu">
                    {[
                      {
                        path: "/expense-tracker",
                        icon: "fa-th-large",
                        label: "Dashboard",
                        sub: "View overview and analytics",
                        cls: "bg-green",
                        message: "Opening dashboard...",
                      },
                      {
                        path: "/manage-finances",
                        icon: "fa-book",
                        label: "Contact Ledger",
                        sub: "View all contacts",
                        cls: "bg-blue",
                        message: "Opening contact ledger...",
                      },
                      {
                        path: "/manage-contacts",
                        icon: "fa-users",
                        label: "Manage Contacts",
                        sub: "Add and edit contacts",
                        cls: "bg-purple",
                        message: "Opening contacts...",
                      },
                      {
                        path: "/manage-categories",
                        icon: "fa-cog",
                        label: "Manage Categories",
                        sub: "Organize expenses",
                        cls: "bg-indigo",
                        message: "Opening categories...",
                      },
                      {
                        path: "/manage-labels",
                        icon: "fa-tag",
                        label: "Manage Labels",
                        sub: "Create custom labels",
                        cls: "bg-violet",
                        message: "Opening labels...",
                      },
                    ].map(({ path, icon, label, sub, cls, message }) => (
                      <button
                        key={path}
                        type="button"
                        className="profile-item"
                        disabled={!!pendingNavigation}
                        onClick={() => navigateWithLoader(path, {}, message)}
                      >
                        <div className={`icon ${cls}`}>
                          <i className={`fas ${icon}`} />
                        </div>
                        <div>
                          <span>{label}</span>
                          <small>{sub}</small>
                        </div>
                        <i className="fas fa-chevron-right arrow" />
                      </button>
                    ))}
                  </div>
                  <div className="profile-footer">
                    <button className="logout-btn" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt" /> Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <TransactionFilter
          filterOpen={filterOpen}
          selectedType={selectedType}
          setSelectedType={(v) => handleFilterChange(setSelectedType, "selectedType", v)}
          categoryOptions={categoryOptions}
          selectedCategory={selectedCategory}
          setSelectedCategory={(v) =>
            handleFilterChange(setSelectedCategory, "selectedCategory", v)
          }
          startDate={startDate}
          setStartDate={(v) => handleFilterChange(setStartDate, "startDate", v)}
          endDate={endDate}
          setEndDate={(v) => handleFilterChange(setEndDate, "endDate", v)}
          labelOptions={labelOptions}
          selectedLabel={selectedLabel}
          setSelectedLabel={(v) =>
            handleFilterChange(setSelectedLabel, "selectedLabel", v)
          }
          resetFilters={resetFilters}
          labelMap={labelMap}
          loading={isLoadingPage}
        />

        {/* ── Summary ── */}
        <div className="summary-section">
          <h2 className="summary-title">
            Summary
            {hasActiveFilters && (
              <span
                style={{
                  marginLeft: "10px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#4361ee",
                  background: "#eef2ff",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  verticalAlign: "middle",
                  border: "1px solid #c7d2fe",
                }}
              >
                Filtered view
              </span>
            )}
          </h2>
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

          <DashboardInsights
            analytics={analytics}
            hasActiveFilters={hasActiveFilters}
            selectedType={selectedType}
            activeItemKey={activeInsightKey}
            onSelectItem={handleInsightSelection}
          />
        </div>

        {/* ── Table ── */}
        <div className="table-wrapper" ref={transactionsSectionRef}>
          <h2 className="month-heading">
            Transactions
            {isLoadingPage && !isInitialLoad && (
              <span
                style={{
                  marginLeft: "10px",
                  fontSize: "13px",
                  color: "#3f51b5",
                  fontWeight: 400,
                  verticalAlign: "middle",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    border: "2px solid #c7d2fe",
                    borderTop: "2px solid #3f51b5",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    marginRight: 6,
                    verticalAlign: "middle",
                  }}
                />
                Loading…
              </span>
            )}
          </h2>
          <table>
            <thead>
              <tr>
                {renderColumnHeader("date", "Date", "Search date…", "date")}
                {renderColumnHeader(
                  "category",
                  "Category",
                  "Search category…",
                  "category",
                )}
                {renderColumnHeader(
                  "comments",
                  "Comments",
                  "Search comments…",
                  "comments",
                )}
                {renderColumnHeader("label", "Label", "Search label…", "type")}
                {renderColumnHeader("debit", "Debit", "Search debit…", "debit")}
                {renderColumnHeader(
                  "credit",
                  "Credit",
                  "Search credit…",
                  "credit",
                )}
                {renderColumnHeader(
                  "balance",
                  "Balance",
                  "Search balance…",
                  "balance",
                )}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingPage ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} style={{ padding: "14px 12px" }}>
                        <div
                          className="skeleton-cell"
                          style={{
                            width: j === 2 ? "75%" : j === 7 ? "55%" : "65%",
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : transactions.length > 0 ? (
                transactions.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.date)}</td>
                    <td>{entry.category}</td>
                    <td>{entry.comments || "-"}</td>
                    <td>
                      {(() => {
                        const validLabels = Array.isArray(entry.labelIds)
                          ? entry.labelIds.filter((lid) => labelMap[lid])
                          : [];
                        return validLabels.length > 0 ? (
                          validLabels.map((lid) => (
                            <span
                              key={lid}
                              className="label-badge"
                              style={{
                                backgroundColor: `${labelMap[lid].color || "#6c5ce7"}22`,
                                color: labelMap[lid].color || "#6c5ce7",
                                border: `1px solid ${labelMap[lid].color || "#6c5ce7"}`,
                              }}
                            >
                              {labelMap[lid].name}
                            </span>
                          ))
                        ) : (
                          <span>-</span>
                        );
                      })()}
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
                              returnPage: currentPage,
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
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
{/* ── Pagination ── */}
{totalPages > 1 && (
  <div className="pagination-bar">
    {/* First */}
    <button
      className="pg-btn pg-edge"
      onClick={() => handlePageChange(1)}
      disabled={currentPage === 1 || isLoadingPage}
      title="First page"
    >
      «
    </button>

    {/* Previous */}
    <button
      className="pg-btn pg-prev-next"
      onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
      disabled={currentPage === 1 || isLoadingPage}
      title="Previous page"
    >
      ‹
    </button>

    {/* Page number buttons */}
    <div className="pg-numbers">
      {(() => {
        const total = totalPages || 1;
        const delta = 2;
        const start = Math.max(1, currentPage - delta);
        const end = Math.min(total, currentPage + delta);
        const pages = [];
        for (let p = start; p <= end; p++) pages.push(p);
        return pages.map((p) => (
          <button
            key={p}
            className={`pg-btn pg-num ${p === currentPage ? "pg-active" : ""}`}
            onClick={() => handlePageChange(p)}
            disabled={isLoadingPage}
          >
            {p}
          </button>
        ));
      })()}
    </div>

    {/* Next */}
    <button
      className="pg-btn pg-prev-next"
      onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
      disabled={currentPage >= totalPages || isLoadingPage}
      title="Next page"
    >
      ›
    </button>

    {/* Last */}
    <button
      className="pg-btn pg-edge"
      onClick={() => handlePageChange(totalPages)}
      disabled={currentPage >= totalPages || isLoadingPage}
      title="Last page"
    >
      »
    </button>

    {/* Page info */}
    <span className="pg-info">
      {currentPage} / {totalPages}
    </span>
  </div>
)}

        {/* ── Footer ── */}
        <div className="footer">
          <button
            className="export-pdf-fab"
            onClick={handleExportPDF}
            title="Export to PDF"
          >
            📄
          </button>
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
