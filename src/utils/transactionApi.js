// src/utils/transactionApi.js

import { BASE_URL } from "./api";
import { fetchWithAuth } from "./apiInterceptor";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export async function fetchTransactions() {
  try {
    const res = await fetchWithAuth(`${BASE_URL}/api/transactions`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      // If not OK, return empty array instead of throwing
      console.error("Failed to load transactions, status:", res.status);
      return [];
    }
    const data = await res.json();
    // Ensure we always return an array
    return Array.isArray(data) ? data : (Array.isArray(data.content) ? data.content : []);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return []; // Return empty array instead of throwing
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