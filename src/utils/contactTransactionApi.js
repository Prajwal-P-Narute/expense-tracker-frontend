import { BASE_URL } from "./api";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export async function fetchContactTransactions() {
  const res = await fetch(`${BASE_URL}/api/contact-transactions`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load contact transactions");
  return res.json();
}

export async function createContactTransaction(payload) {
  const res = await fetch(`${BASE_URL}/api/contact-transactions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
     const errorData = await res.json();
     throw new Error(errorData.message || "Failed to create contact transaction");
  }
  return res.json();
}

export async function updateContactTransaction(id, payload) {
  const res = await fetch(`${BASE_URL}/api/contact-transactions/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
     const errorData = await res.json();
     throw new Error(errorData.message || "Failed to update contact transaction");
  }
  return res.json();
}

export async function deleteContactTransaction(id) {
  const res = await fetch(`${BASE_URL}/api/contact-transactions/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (res.status !== 204) { // 204 No Content is a success status for DELETE
    throw new Error("Failed to delete contact transaction");
  }
  return { success: true };
}