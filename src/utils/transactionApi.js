// src/utils/transactionApi.js

import { BASE_URL } from "./api";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

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