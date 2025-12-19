import { BASE_URL } from "./api";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export async function fetchContacts() {
  const res = await fetch(`${BASE_URL}/api/contacts`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load contacts");
  return res.json();
}

export async function createContact(contactData) {
  const res = await fetch(`${BASE_URL}/api/contacts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(contactData), // {name, email, mobNo}
  });
  if(res.status === 409) {
      const msg = await res.text();
      throw new Error(msg || "A contact with this name already exists.");
  }
  if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to create contact");
  }
  return res.json();
}

export async function updateContact(id, contactData) {
  const res = await fetch(`${BASE_URL}/api/contacts/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(contactData), // {name, email, mobNo}
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Failed to update contact");
  }
  return res.json();
}

export async function deleteContact(id) {
  const res = await fetch(`${BASE_URL}/api/contacts/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (res.status !== 204) {
    // Attempt to parse error message if the server sends one
    try {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete contact");
    } catch(e) {
        throw new Error("Failed to delete contact");
    }
  }
  return { success: true };
}