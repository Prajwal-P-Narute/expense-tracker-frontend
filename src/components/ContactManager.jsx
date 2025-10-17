import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-toastify';
import { FaEdit, FaTrash, FaUserPlus } from 'react-icons/fa';
import {
  fetchContacts,
  createContact,
  updateContact,
  deleteContact,
} from '../utils/contactApi';
import { fetchContactTransactions } from '../utils/contactTransactionApi';
import './ContactManager.css';

const ContactManager = () => {
  const [contacts, setContacts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentContact, setCurrentContact] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', mobNo: '' });
  const [errors, setErrors] = useState({});
  const nameInputRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contactsData, transactionsData] = await Promise.all([
        fetchContacts(),
        fetchContactTransactions(),
      ]);
      setContacts(contactsData);
      setTransactions(transactionsData);
    } catch (e) {
      toast.error('Failed to load necessary data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const transactionContactIds = useMemo(() => 
    new Set(transactions.map(t => t.contactId)), 
    [transactions]
  );

  useEffect(() => {
    if (showModal && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [showModal]);

  const resetForm = () => {
    setFormData({ name: '', email: '', mobNo: '' });
    setCurrentContact(null);
    setIsEditMode(false);
    setErrors({});
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
      email: contact.email || '',
      mobNo: contact.mobNo || '',
    });
    setShowModal(true);
  };

  const handleOpenDeleteModal = (contact) => {
    setCurrentContact(contact);
    setShowDeleteModal(true);
  };

  // --- 1. NEW UNIFIED DELETE CLICK HANDLER ---
  const handleDeleteClick = (contact) => {
    const hasTransactions = transactionContactIds.has(contact.id);
    if (hasTransactions) {
      // If transactions exist, show a warning toast and do nothing else.
      toast.warn("Cannot delete a contact that has associated transactions.");
    } else {
      // Otherwise, open the confirmation modal.
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
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: undefined }));
    }
  };
  
  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is mandatory.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      nameInputRef.current.focus();
      return;
    }
    try {
      if (isEditMode) {
        await updateContact(currentContact.id, formData);
        toast.success('Contact updated successfully!');
      } else {
        await createContact(formData);
        toast.success('Contact added successfully!');
      }
      handleCloseModals();
      await loadData();
    } catch (error) {
      toast.error(error.message || 'An error occurred.');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteContact(currentContact.id);
      toast.success('Contact deleted successfully!');
      handleCloseModals();
      await loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to delete contact.');
    }
  };

  const renderContactList = () => {
    if (loading) return <div className="centered-message">Loading contacts...</div>;
    if (contacts.length === 0) return <div className="centered-message">No contacts found. Add one to get started!</div>;
    
    return (
        <div className="contact-list">
            {contacts.map((contact) => (
                <div key={contact.id} className="contact-item">
                    <span><strong>{contact.name}</strong></span>
                    <span>{contact.email || '-'}</span>
                    <span>{contact.mobNo || '-'}</span>
                    <div className="contact-actions">
                    <button className="edit-btn" onClick={() => handleOpenEditModal(contact)}>
                        <FaEdit /> Edit
                    </button>
                    {/* --- 2. UPDATE THE BUTTON'S onCLick and remove disabled/title --- */}
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

  // ... (rest of the component JSX is unchanged)
  return (
    <div className="manager-container">
      <header>
        <h1>Manage Contacts</h1>
        <p className="subtitle">Your personal address book for financial tracking</p>
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
              <h3>{isEditMode ? 'Edit Contact' : 'Add New Contact'}</h3>
              <button className="close-btn" onClick={handleCloseModals}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name" className='required'>Name</label>
                <input
                  id="name"
                  type="text"
                  className={`form-control ${errors.name ? 'input-error' : ''}`}
                  ref={nameInputRef}
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter contact's name"
                />
                {errors.name && <div className="error-message">{errors.name}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="form-control"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address (optional)"
                />
              </div>
              <div className="form-group">
                <label htmlFor="mobNo">Mobile Number</label>
                <input
                  id="mobNo"
                  type="tel"
                  className="form-control"
                  value={formData.mobNo}
                  onChange={handleChange}
                  placeholder="Enter mobile number (optional)"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModals}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditMode ? 'Save Changes' : 'Add Contact'}</button>
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
              <button className="close-btn" onClick={handleCloseModals}>&times;</button>
            </div>
            <p>Are you sure you want to delete the contact "<strong>{currentContact?.name}</strong>"? This action cannot be undone.</p>
            <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModals}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactManager;