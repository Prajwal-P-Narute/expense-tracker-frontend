// src/utils/transactionApi.js

import { BASE_URL } from "./api";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});


export async function fetchTransactions() {
  const res = await fetch(`${BASE_URL}/api/transactions`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load transactions");
  return res.json();
}

// New function for FinTrack page
export async function fetchContactTransactions() {
    const res = await fetch(`${BASE_URL}/api/transactions/contacts`, {
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load contact transactions");
    return res.json();
}

export async function createTransaction(payload) {
  const res = await fetch(`${BASE_URL}/api/transactions`, {
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
  const res = await fetch(`${BASE_URL}/api/transactions/${id}`, {
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
    const res = await fetch(`${BASE_URL}/api/transactions/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    if (res.status !== 204) {
        throw new Error("Failed to delete transaction");
    }
    return { success: true };
}