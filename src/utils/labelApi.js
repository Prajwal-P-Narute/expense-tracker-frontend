import { BASE_URL } from "./api";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`, // ✅ fixed
});


export async function fetchLabels() {
  const res = await fetch(`${BASE_URL}/api/labels`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch labels");
  return res.json();
}

export async function createLabel(payload) {
  const res = await fetch(`${BASE_URL}/api/labels`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create label");
  return res.json();
}

export async function updateLabel(id, payload) {
  const res = await fetch(`${BASE_URL}/api/labels/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update label");
  return res.json();
}

export async function labelUsage(id) {
  const res = await fetch(`${BASE_URL}/api/labels/${id}/usage`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch label usage");
  return res.json(); // number
}

export async function labelUsageAll() {
  const res = await fetch(`${BASE_URL}/api/labels/usage`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch label usage");
  return res.json();
}

export async function deleteLabel(id, transferTo) {
  const url = new URL(`${BASE_URL}/api/labels/${id}`);
  if (transferTo) url.searchParams.set("transferTo", transferTo);
  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete label");
  return true; // 204 is success with no body
}
