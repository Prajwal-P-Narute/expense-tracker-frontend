import React, { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "react-toastify";
import { FaEdit, FaTrash, FaUserPlus } from "react-icons/fa";
import {
  fetchAllContacts,
  createContact,
  updateContact,
  deleteContact,
} from "../utils/contactApi";
import { fetchContactTransactions } from "../utils/contactTransactionApi";
import "./ContactManager.css";

const ContactManager = () => {
  const [contacts, setContacts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentContact, setCurrentContact] = useState(null);
  const [formData, setFormData] = useState({ name: "", email: "", mobNo: "" });
  const [errors, setErrors] = useState({});
  const nameInputRef = useRef(null);
  const [touched, setTouched] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [contactsList, transactionsData] = await Promise.all([
        fetchAllContacts(),
        fetchContactTransactions(),
      ]);

      setContacts(contactsList);
      setTransactions(transactionsData);
    } catch (e) {
      toast.error("Failed to load necessary data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const transactionContactIds = useMemo(
    () => new Set(transactions.map((t) => t.contactId)),
    [transactions],
  );

  useEffect(() => {
    if (showModal && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [showModal]);

  const resetForm = () => {
    setFormData({ name: "", email: "", mobNo: "" });
    setCurrentContact(null);
    setIsEditMode(false);
    setErrors({});
    setTouched({});
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEditModal = (contact) => {
    resetForm();
    setIsEditMode(true);
    setCurrentContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email || "",
      mobNo: contact.mobNo || "",
    });
    setShowModal(true);
  };

  const handleOpenDeleteModal = (contact) => {
    setCurrentContact(contact);
    setShowDeleteModal(true);
  };

  const handleDeleteClick = (contact) => {
    const hasTransactions = transactionContactIds.has(contact.id);
    if (hasTransactions) {
      toast.warn("Cannot delete a contact that has associated transactions.");
    } else {
      handleOpenDeleteModal(contact);
    }
  };

  const handleCloseModals = () => {
    setShowModal(false);
    setShowDeleteModal(false);
    resetForm();
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    setTouched((prev) => ({ ...prev, [id]: true }));
  };

  const validate = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is mandatory.";
    } else if (formData.name.length < 3) {
      newErrors.name = "Name must be at least 3 characters.";
    } else if (!/^[A-Za-z ]+$/.test(formData.name)) {
      newErrors.name = "Name can contain only letters and spaces.";
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format.";
    }

    // Mobile number validation - unified message
    if (formData.mobNo) {
      // Only validate if mobNo has a value
      if (!/^[0-9]{10}$/.test(formData.mobNo)) {
        newErrors.mobNo = "Mobile number must be 10 digits.";
      }
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  const newErrors = validate();
  setTouched({ name: true, email: true, mobNo: true });

  if (Object.keys(newErrors).length > 0) {
    const firstErrorField = Object.keys(newErrors)[0];
    if (firstErrorField) document.getElementById(firstErrorField)?.focus();
    return;
  }

  try {
    if (isEditMode) {
      await updateContact(currentContact.id, formData);
      toast.success("Contact updated successfully!");
    } else {
      await createContact(formData);
      toast.success("Contact added successfully!");
    }
    handleCloseModals();
    await loadData();
  } catch (error) {
    // Check for 409 conflict from backend
    if (error.message.includes("already exists")) {
      toast.error(error.message); // proper conflict toast
    } else {
      toast.error(error.message || "An error occurred.");
    }
  }
};


  const handleDelete = async () => {
    try {
      await deleteContact(currentContact.id);
      toast.success("Contact deleted successfully!");
      handleCloseModals();
      await loadData();
    } catch (error) {
      toast.error(error.message || "Failed to delete contact.");
    }
  };

  const renderContactList = () => {
    if (loading)
      return <div className="centered-message">Loading contacts...</div>;
    if (contacts.length === 0)
      return (
        <div className="centered-message">
          No contacts found. Add one to get started!
        </div>
      );

    return (
      <div className="contact-list">
        {contacts.map((contact) => (
          <div key={contact.id} className="contact-item">
            <span>
              <strong>{contact.name}</strong>
            </span>
            <span>{contact.email || "-"}</span>
            <span>{contact.mobNo || "-"}</span>
            <div className="contact-actions">
              <button
                className="edit-btn"
                onClick={() => handleOpenEditModal(contact)}
              >
                <FaEdit /> Edit
              </button>
              <button
                className="delete-btn"
                onClick={() => handleDeleteClick(contact)}
              >
                <FaTrash /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="manager-container">
      <header>
        <h1>Manage Contacts</h1>
        <p className="subtitle">
          Your personal address book for financial tracking
        </p>
      </header>

      <div className="toolbar">
        <button className="btn-add-new" onClick={handleOpenAddModal}>
          <FaUserPlus /> Add New Contact
        </button>
      </div>
      {renderContactList()}
      
      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={handleCloseModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isEditMode ? "Edit Contact" : "Add New Contact"}</h3>
              <button className="close-btn" onClick={handleCloseModals}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name" className="required">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  className={`form-control ${errors.name ? "input-error" : ""}`}
                  ref={nameInputRef}
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter contact's name"
                />
                {touched.name && errors.name && (
                  <div className="error-message">{errors.name}</div>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className={`form-control ${errors.email ? "input-error" : ""}`}
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address (optional)"
                />
                {touched.email && errors.email && (
                  <div className="error-message">{errors.email}</div>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="mobNo">Mobile Number</label>
                <input
                  id="mobNo"
                  type="tel"
                  maxLength={10}
                  className={`form-control ${errors.mobNo ? "input-error" : ""}`}
                  value={formData.mobNo}
                  onChange={handleChange}
                  placeholder="Enter mobile number (optional)"
                />
                {touched.mobNo && errors.mobNo && (
                  <div className="error-message">{errors.mobNo}</div>
                )}
              </div>
              
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModals}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditMode ? "Save Changes" : "Add Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop" onClick={handleCloseModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button className="close-btn" onClick={handleCloseModals}>
                &times;
              </button>
            </div>
            <p>
              Are you sure you want to delete the contact "
              <strong>{currentContact?.name}</strong>"? This action cannot be
              undone.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseModals}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactManager;