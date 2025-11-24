import { BASE_URL } from "../utils/api";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export async function fetchCategories() {
  const res = await fetch(`${BASE_URL}/api/categories`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load categories");
  return res.json(); // [{id,name,type}]
}

export async function createCategory(name, type, status) {
  const res = await fetch(`${BASE_URL}/api/categories`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name, type, status }),
  });
  if (res.status === 409) {
    const msg = await res.text();
    throw new Error(msg || "Category already exists");
  }

  if (!res.ok) throw new Error("Failed to create category");
  return res.json();
}

export async function renameCategory(id, newName) {
  const res = await fetch(`${BASE_URL}/api/categories/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ newName }),
  });
  if (!res.ok) throw new Error("Failed to rename category");
  return res.json();
}

export async function deleteCategory(id, transferToId) {
  const url = transferToId
    ? `${BASE_URL}/api/categories/${id}?transferTo=${encodeURIComponent(
        transferToId
      )}`
    : `${BASE_URL}/api/categories/${id}`;
  const res = await fetch(url, { method: "DELETE", headers: authHeaders() });
  if (res.status === 204) return { success: true };
  if (!res.ok) throw new Error("Failed to delete category");
  return res.json();
}

export async function getCategoryUsage(id) {
  const res = await fetch(`${BASE_URL}/api/categories/${id}/usage`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to check category usage");
  return res.json(); // { count: number }
}
