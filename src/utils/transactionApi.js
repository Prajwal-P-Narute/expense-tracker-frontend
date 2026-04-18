// src/utils/transactionApi.js

import { BASE_URL } from "./api";
import { fetchWithAuth } from "./apiInterceptor";

const EMPTY_ANALYTICS = {
  debit: { total: 0, maxAmount: 0, items: [] },
  credit: { total: 0, maxAmount: 0, items: [] },
  labels: { total: 0, maxAmount: 0, items: [] },
};

const buildEmptyWorkspaceResponse = () => ({
  openingBalance: 0,
  transactions: [],
  totalElements: 0,
  totalPages: 0,
  totalIncome: 0,
  totalExpense: 0,
  finalBalance: 0,
  analytics: EMPTY_ANALYTICS,
});

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

function buildTransactionFilterParams(filters = {}, includeSort = false) {
  const params = new URLSearchParams();
  let typeFilter =
    filters.typeFilter && filters.typeFilter !== "All" ? filters.typeFilter : "";

  if (filters.category && filters.category !== "All")
    params.append("category", filters.category);
  if (filters.startDate)
    params.append("startDate", filters.startDate);
  if (filters.endDate)
    params.append("endDate", filters.endDate);
  if (filters.labelId && filters.labelId !== "All")
    params.append("labelId", filters.labelId);

  if (filters.search?.date?.trim())
    params.append("dateSearch", filters.search.date.trim());
  if (filters.search?.category?.trim())
    params.append("categorySearch", filters.search.category.trim());
  if (filters.search?.comments?.trim())
    params.append("commentsSearch", filters.search.comments.trim());
  if (filters.search?.label?.trim())
    params.append("labelSearch", filters.search.label.trim());

  if (filters.search?.debit?.trim()) {
    params.append("amountSearch", filters.search.debit.trim());
    typeFilter = "debit";
  }

  if (filters.search?.credit?.trim()) {
    params.append("amountSearch", filters.search.credit.trim());
    typeFilter = "credit";
  }

  if (filters.search?.balance?.trim())
    params.append("balanceSearch", filters.search.balance.trim());

  if (includeSort && filters.sortBy) {
    if (filters.sortBy === "debit") {
      params.append("sortBy", "amount");
      params.append("sortDir", filters.sortDir || "desc");
      if (!filters.search?.debit?.trim()) {
        typeFilter = "debit";
      }
    } else if (filters.sortBy === "credit") {
      params.append("sortBy", "amount");
      params.append("sortDir", filters.sortDir || "desc");
      if (!filters.search?.credit?.trim()) {
        typeFilter = "credit";
      }
    } else {
      params.append("sortBy", filters.sortBy);
      params.append("sortDir", filters.sortDir || "desc");
    }
  }

  if (typeFilter) {
    params.append("typeFilter", typeFilter);
  }

  return params;
}

/**
 * Fetch paginated transactions with full server-side filtering AND sorting.
 */
export async function fetchTransactionsPageable(page = 0, pageSize = 15, filters = {}) {
  try {
    const safePage     = Number.isFinite(Number(page))     ? Math.max(0, Math.floor(Number(page)))     : 0;
    const safePageSize = Number.isFinite(Number(pageSize)) ? Math.max(1, Math.floor(Number(pageSize))) : 15;

    const params = buildTransactionFilterParams(filters, true);
    params.append("page", safePage);
    params.append("size", safePageSize);

    const res = await fetchWithAuth(
      `${BASE_URL}/api/transactions?${params.toString()}`,
      { headers: authHeaders() }
    );

    if (!res.ok) {
      console.error("Failed to load transactions, status:", res.status);
      return { content: [], totalElements: 0, totalPages: 0 };
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching paginated transactions:", error);
    return { content: [], totalElements: 0, totalPages: 0 };
  }
}

/**
 * Fetch aggregated summary (totalIncome, totalExpense, finalBalance)
 * for the exact same filter set as fetchTransactionsPageable.
 */
export async function fetchFilteredSummary(filters = {}) {
  try {
    const params = buildTransactionFilterParams(filters);

    const res = await fetchWithAuth(
      `${BASE_URL}/api/transactions/summary?${params.toString()}`,
      { headers: authHeaders() }
    );

    if (!res.ok) {
      console.error("Failed to load summary, status:", res.status);
      return { totalIncome: 0, totalExpense: 0, finalBalance: 0 };
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching filtered summary:", error);
    return { totalIncome: 0, totalExpense: 0, finalBalance: 0 };
  }
}

export async function fetchTransactionAnalytics(filters = {}) {
  try {
    const params = buildTransactionFilterParams(filters);

    const res = await fetchWithAuth(
      `${BASE_URL}/api/transactions/analytics?${params.toString()}`,
      { headers: authHeaders() }
    );

    if (!res.ok) {
      console.error("Failed to load analytics, status:", res.status);
      return {
        debit: { total: 0, maxAmount: 0, items: [] },
        credit: { total: 0, maxAmount: 0, items: [] },
        labels: { total: 0, maxAmount: 0, items: [] },
      };
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching transaction analytics:", error);
    return {
      debit: { total: 0, maxAmount: 0, items: [] },
      credit: { total: 0, maxAmount: 0, items: [] },
      labels: { total: 0, maxAmount: 0, items: [] },
    };
  }
}

export async function fetchTransactionWorkspace(
  page = 0,
  pageSize = 15,
  filters = {},
  includeAnalytics = false,
) {
  try {
    const safePage = Number.isFinite(Number(page))
      ? Math.max(0, Math.floor(Number(page)))
      : 0;
    const safePageSize = Number.isFinite(Number(pageSize))
      ? Math.max(1, Math.floor(Number(pageSize)))
      : 15;

    const params = buildTransactionFilterParams(filters, true);
    params.append("page", safePage);
    params.append("size", safePageSize);
    params.append("includeAnalytics", includeAnalytics ? "true" : "false");

    const res = await fetchWithAuth(
      `${BASE_URL}/api/transactions/workspace?${params.toString()}`,
      { headers: authHeaders() },
    );

    if (!res.ok) {
      console.error("Failed to load transaction workspace, status:", res.status);
      return buildEmptyWorkspaceResponse();
    }

    const data = await res.json();
    return {
      ...buildEmptyWorkspaceResponse(),
      ...data,
      transactions: Array.isArray(data?.transactions) ? data.transactions : [],
      analytics: data?.analytics || EMPTY_ANALYTICS,
    };
  } catch (error) {
    console.error("Error fetching transaction workspace:", error);
    return buildEmptyWorkspaceResponse();
  }
}

/**
 * Returns the 0-based page number where a transaction lives after an edit,
 * using newest-first ordering with no filters.
 * Call this AFTER updateTransaction so the new date is already persisted.
 *
 * @param {string} id       - transaction ID
 * @param {number} pageSize - must match PAGE_SIZE used in ExpenseTracker (default 15)
 * @returns {Promise<number>} 0-based page index; falls back to 0 on error
 */
export async function fetchTransactionPageNumber(id, pageSize = 15) {
  try {
    const res = await fetchWithAuth(
      `${BASE_URL}/api/transactions/${id}/page-number?size=${pageSize}`,
      { headers: authHeaders() }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return typeof data.page === "number" ? data.page : 0;
  } catch (error) {
    console.error("Error fetching transaction page number:", error);
    return 0;
  }
}

export async function fetchTransactions() {
  try {
    return await fetchAllTransactions();
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}

export async function fetchAllTransactions() {
  try {
    let allTransactions = [];
    let page = 0;
    const pageSize = 50;
    let hasMore = true;

    while (hasMore) {
      const res = await fetchWithAuth(
        `${BASE_URL}/api/transactions?page=${page}&size=${pageSize}`,
        { headers: authHeaders() }
      );
      if (!res.ok) { console.error("Failed:", res.status); break; }

      const data = await res.json();
      if (data?.content && Array.isArray(data.content)) {
        allTransactions = [...allTransactions, ...data.content];
        hasMore = !data.last && data.content.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    return allTransactions;
  } catch (error) {
    console.error("Error fetching all transactions:", error);
    return [];
  }
}

export async function fetchContactTransactions(page = 0, pageSize = 20, contactId = null, search = null) {
  const params = new URLSearchParams();
  params.append("page", page);
  params.append("size", pageSize);
  if (contactId) params.append("contactId", contactId);
  if (search)    params.append("search", search);

  const res = await fetchWithAuth(
    `${BASE_URL}/api/transactions/contacts?${params.toString()}`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error("Failed to load contact transactions");
  return res.json();
}

export async function createTransaction(payload) {
  const res = await fetchWithAuth(`${BASE_URL}/api/transactions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to create transaction");
  }
  return res.json();
}

export async function updateTransaction(id, payload) {
  const res = await fetchWithAuth(`${BASE_URL}/api/transactions/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to update transaction");
  }
  return res.json();
}

export async function deleteTransaction(id) {
  const res = await fetchWithAuth(`${BASE_URL}/api/transactions/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (res.status !== 204) throw new Error("Failed to delete transaction");
  return { success: true };
}
