import React, { useState, useEffect } from "react";
import "./TransactionForm.css";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { fetchCategories } from "../utils/categoryApi";
import { fetchLabels } from "../utils/labelApi";
import { fetchContacts } from "../utils/contactApi";
import {
  createContactTransaction,
  updateContactTransaction,
} from "../utils/contactTransactionApi";
import { createTransaction, updateTransaction } from "../utils/transactionApi";

const TransactionForm = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Distinguish between transaction types
  const editingTransaction = location.state?.transaction || null;
  const isContactTransaction = location.state?.isContactTransaction || false;
  const isEditMode = !!editingTransaction;

  // --- STATE DECLARATIONS ---
  const [allCategories, setAllCategories] = useState([]);
  const [allLabels, setAllLabels] = useState([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState(
    editingTransaction?.labelIds || []
  );
  const [allContacts, setAllContacts] = useState([]);
  const [showContactSelect, setShowContactSelect] =
    useState(isContactTransaction);

  // Set initial contact ID if editing a contact transaction
  const [selectedContactId, setSelectedContactId] = useState(
    isContactTransaction ? editingTransaction?.contactId || "" : ""
  );

  const [type, setType] = useState(
    editingTransaction ? editingTransaction.type : "debit"
  );

  const [submitting, setSubmitting] = useState(false);

  const getTodayDate = () => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState(() => {
    if (editingTransaction) {
      return {
        date: editingTransaction.date.split("T")[0],
        debitCategory:
          editingTransaction.type === "debit"
            ? editingTransaction.category
            : "",
        creditCategory:
          editingTransaction.type === "credit"
            ? editingTransaction.category
            : "",
        debitAmount:
          editingTransaction.type === "debit" ? editingTransaction.amount : "",
        creditAmount:
          editingTransaction.type === "credit" ? editingTransaction.amount : "",
        reimbursable: editingTransaction.reimbursable ? "Y" : "N",
        comments: editingTransaction.comments || "",
      };
    }
    return {
      date: getTodayDate(),
      debitCategory: "",
      creditCategory: "",
      debitAmount: "",
      creditAmount: "",
      reimbursable: "N",
      comments: "",
    };
  });

  const debitCats = allCategories.filter((c) => c.type === "debit");
  const creditCats = allCategories.filter((c) => c.type === "credit");

  // --- EFFECTS ---
  useEffect(() => {
    (async () => {
      try {
        setAllCategories(await fetchCategories());
        setAllLabels(await fetchLabels());
        setAllContacts(await fetchContacts());
      } catch (error) {
        toast.error("Failed to load necessary data.");
      }
    })();
  }, []);

  useEffect(() => {
    const selectedCategoryName =
      type === "debit" ? formData.debitCategory : formData.creditCategory;
    if (!selectedCategoryName) {
      if (!isContactTransaction) setShowContactSelect(false);
      return;
    }
    const category = allCategories.find(
      (c) => c.name === selectedCategoryName && c.type === type
    );
    if (
      category &&
      (category.status === "given" || category.status === "received")
    ) {
      setShowContactSelect(true);
    } else {
      if (!isContactTransaction) setShowContactSelect(false);
    }
  }, [
    formData.debitCategory,
    formData.creditCategory,
    allCategories,
    type,
    isContactTransaction,
  ]);

  // --- HANDLERS ---
  const handleTypeToggle = (selectedType) => {
    if (isEditMode && isContactTransaction) return; // Lock type toggle when editing a contact transaction
    setType(selectedType);
    setFormData((prev) => ({
      ...prev,
      debitCategory: "",
      creditCategory: "",
      debitAmount: "",
      creditAmount: "",
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleLabelChange = (labelId) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Simplified validation can be added later

    const isSpecialCategory = showContactSelect || isContactTransaction;
    if (isSpecialCategory && !selectedContactId) {
      toast.error("Please select a contact for this category.");
      return;
    }

    setSubmitting(true);

    if (isSpecialCategory) {
      // Handle Contact Transaction (Create or Update)
      const payload = {
        date: formData.date,
        type,
        category:
          type === "debit" ? formData.debitCategory : formData.creditCategory,
        amount: type === "debit" ? formData.debitAmount : formData.creditAmount,
        comments: formData.comments,
        contactId: selectedContactId,
        labelIds: selectedLabelIds,
      };
      try {
        if (isEditMode) {
          await updateContactTransaction(editingTransaction.id, payload);
          toast.success("Contact transaction updated successfully!");
        } else {
          await createContactTransaction(payload);
          toast.success("Contact transaction added successfully!");
        }
        navigate("/manage-finances", { state: { refresh: true } });
      } catch (error) {
        toast.error(error.message || "An error occurred.");
      } finally {
        setSubmitting(false);
      }
    } else {
      const payload = {
        date: formData.date,
        type,
        category:
          type === "debit" ? formData.debitCategory : formData.creditCategory,
        amount: type === "debit" ? formData.debitAmount : formData.creditAmount,
        reimbursable: formData.reimbursable, // Should be 'Y' or 'N'
        comments: formData.comments,
        labelIds: selectedLabelIds,
      };

      try {
        if (isEditMode) {
          await updateTransaction(editingTransaction.id, payload);
          toast.success("Transaction updated successfully!");
        } else {
          await createTransaction(payload);
          toast.success("Transaction added successfully!");
        }
        // Navigate back to the main expense tracker page
        navigate("/", { state: { refresh: true } });
      } catch (error) {
        toast.error(error.message || "An error occurred.");
      } finally {
        // This is the crucial part that was missing
        setSubmitting(false);
      }
    }
  };

  // --- RENDER ---
  return (
    <div className="container">
      <div className="header">
        <h1>{isEditMode ? "Edit Transaction" : "Add New Transaction"}</h1>
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        {/* ... form fields JSX, mostly unchanged ... */}
        {/* Your existing form fields for date, type, categories, amounts, comments etc. go here. */}
        {/* The conditional rendering of the contact dropdown is the key part */}

        {/* Date */}
        <div className="form-group">
          <label htmlFor="date" className="required">
            Date
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
          />
        </div>

        {/* Type toggle */}
        <div className="transaction-type">
          <button
            type="button"
            className={`transaction-type-btn ${
              type === "debit" ? "active" : ""
            }`}
            onClick={() => handleTypeToggle("debit")}
            disabled={isEditMode && isContactTransaction}
          >
            Debit
          </button>
          <button
            type="button"
            className={`transaction-type-btn ${
              type === "credit" ? "active" : ""
            }`}
            onClick={() => handleTypeToggle("credit")}
            disabled={isEditMode && isContactTransaction}
          >
            Credit
          </button>
        </div>

        {/* Debit Section */}
        {type === "debit" && (
          <div>
            <div className="form-group">
              <label htmlFor="debitCategory" className="required">
                Category
              </label>
              <select
                id="debitCategory"
                name="debitCategory"
                value={formData.debitCategory}
                onChange={handleChange}
              >
                <option value="">-- Select --</option>
                {debitCats.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {showContactSelect && (
              <div className="form-group">
                <label htmlFor="contactId" className="required">
                  Contact
                </label>
                <select
                  id="contactId"
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                >
                  <option value="">-- Select --</option>
                  {allContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label htmlFor="debitAmount" className="required">
                Amount (₹)
              </label>
              <input
                type="number"
                id="debitAmount"
                name="debitAmount"
                value={formData.debitAmount}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
            {!isContactTransaction && (
              <div className="form-group">
                <label className="required">Reimbursable</label>
                <div className="radio-group">
                  {/* ... your radio buttons ... */}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Credit Section */}
        {type === "credit" && (
          <div>
            <div className="form-group">
              <label htmlFor="creditCategory" className="required">
                Category
              </label>
              <select
                id="creditCategory"
                name="creditCategory"
                value={formData.creditCategory}
                onChange={handleChange}
              >
                <option value="">-- Select --</option>
                {creditCats.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {showContactSelect && (
              <div className="form-group">
                <label htmlFor="contactId" className="required">
                  Contact
                </label>
                <select
                  id="contactId"
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                >
                  <option value="">-- Select --</option>
                  {allContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label htmlFor="creditAmount" className="required">
                Amount (₹)
              </label>
              <input
                type="number"
                id="creditAmount"
                name="creditAmount"
                value={formData.creditAmount}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="form-group">
          <label htmlFor="comments">Comments</label>
          <textarea
            id="comments"
            name="comments"
            value={formData.comments}
            onChange={handleChange}
            rows="3"
          ></textarea>
        </div>

        {/* Labels */}
        <div className="form-group">
          <label>Labels</label>
          <div className="checkbox-group">
            {allLabels.length === 0 ? (
              <p className="no-labels">No labels available</p>
            ) : (
              allLabels.map((label) => (
                <label key={label.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    value={label.id}
                    checked={selectedLabelIds.includes(label.id)}
                    onChange={() => handleLabelChange(label.id)}
                  />
                  {label.name}
                </label>
              ))
            )}
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting
            ? "Saving..."
            : isEditMode
            ? "Update Transaction"
            : "Add Transaction"}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
