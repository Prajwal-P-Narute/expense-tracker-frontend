// src/utils/transactionApi.js

import { BASE_URL } from "./api";
import { fetchWithAuth } from "./apiInterceptor";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export async function fetchTransactions() {
  try {
    // Use fetchAllTransactions to get ALL transactions
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
    const pageSize = 50; // Fetch more per request
    let hasMore = true;
    
    while (hasMore) {
      const res = await fetchWithAuth(
        `${BASE_URL}/api/transactions?page=${page}&size=${pageSize}`,
        {
          headers: authHeaders(),
        }
      );
      
      if (!res.ok) {
        console.error("Failed to load transactions, status:", res.status);
        break;
      }
      
      const data = await res.json();
      console.log(`Page ${page} response:`, data);
      
      if (data && data.content && Array.isArray(data.content)) {
        allTransactions = [...allTransactions, ...data.content];
        // Check if there are more pages
        hasMore = !data.last && data.content.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`Total transactions fetched: ${allTransactions.length}`);
    return allTransactions;
  } catch (error) {
    console.error("Error fetching all transactions:", error);
    return [];
  }
}

// New function for FinTrack page
export async function fetchContactTransactions(page = 0, pageSize = 20, contactId = null, search = null) {
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('size', pageSize);
  if (contactId) params.append('contactId', contactId);
  if (search) params.append('search', search);
  
  const res = await fetchWithAuth(`${BASE_URL}/api/transactions/contacts?${params.toString()}`, {
    headers: authHeaders(),
  });
  
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
    const errorData = await res.json();
    throw new Error(errorData.message || "Failed to create transaction");
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
    const errorData = await res.json();
    throw new Error(errorData.message || "Failed to update transaction");
  }
  return res.json();
}

export async function deleteTransaction(id) {
  const res = await fetchWithAuth(`${BASE_URL}/api/transactions/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (res.status !== 204) {
    throw new Error("Failed to delete transaction");
  }
  return { success: true };
}