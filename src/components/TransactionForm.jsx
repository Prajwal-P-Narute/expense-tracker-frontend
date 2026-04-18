import React, { useState, useEffect } from "react";
import "./TransactionForm.css";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { fetchCategories } from "../utils/categoryApi";
import { fetchLabels } from "../utils/labelApi";
import { fetchAllContacts } from "../utils/contactApi";
import {
  createTransaction,
  updateTransaction,
  fetchTransactionPageNumber,
} from "../utils/transactionApi";

// Must match PAGE_SIZE in ExpenseTracker.jsx
const PAGE_SIZE = 15;

const TransactionForm = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const editingTransaction = location.state?.transaction || null;
  const isContactTransactionOnLoad =
    location.state?.isContactTransaction || false;
  const isEditMode = !!editingTransaction;
  const returnPage = location.state?.returnPage || 1;
  const returnPath = location.state?.returnPath || "/expense-tracker";

  const [allCategories, setAllCategories] = useState([]);
  const [allLabels, setAllLabels] = useState([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState(
    editingTransaction?.labelIds || [],
  );
  const [allContacts, setAllContacts] = useState([]);
  const [showContactSelect, setShowContactSelect] = useState(
    isContactTransactionOnLoad,
  );
  const [selectedContactId, setSelectedContactId] = useState(
    editingTransaction?.contactId || "",
  );
  const [type, setType] = useState(editingTransaction?.type || "debit");
  const [submitting, setSubmitting] = useState(false);

  const getTodayDate = () => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState({
    date: editingTransaction
      ? editingTransaction.date.split("T")[0]
      : getTodayDate(),
    debitCategory:
      editingTransaction?.type === "debit" ? editingTransaction.category : "",
    creditCategory:
      editingTransaction?.type === "credit" ? editingTransaction.category : "",
    debitAmount:
      editingTransaction?.type === "debit" ? editingTransaction.amount : "",
    creditAmount:
      editingTransaction?.type === "credit" ? editingTransaction.amount : "",
    comments: editingTransaction?.comments || "",
  });

  // Derived lists — recalculated on every render when allCategories changes
  const debitCats = allCategories.filter((c) => c.type === "debit");
  const creditCats = allCategories.filter((c) => c.type === "credit");

  useEffect(() => {
    (async () => {
      try {
        const [cats, labels, contacts] = await Promise.all([
          fetchCategories(),
          fetchLabels(),
          fetchAllContacts(),
        ]);
        setAllCategories(cats);
        setAllLabels(labels);
        setAllContacts(contacts);
      } catch (error) {
        toast.error("Failed to load necessary data.");
      }
    })();
  }, []);

  useEffect(() => {
    if (isEditMode && editingTransaction?.contactId) {
      setShowContactSelect(true);
      setSelectedContactId(editingTransaction.contactId);
      return;
    }

    const categoryName =
      type === "debit" ? formData.debitCategory : formData.creditCategory;
    if (!categoryName) {
      setShowContactSelect(false);
      return;
    }
    const category = allCategories.find(
      (c) => c.name === categoryName && c.type === type,
    );

    if (
      category &&
      (category.status === "given" || category.status === "received")
    ) {
      setShowContactSelect(true);
    } else {
      setShowContactSelect(false);
      setSelectedContactId("");
    }
  }, [
    formData.debitCategory,
    formData.creditCategory,
    type,
    allCategories,
    isEditMode,
    editingTransaction,
  ]);

  const handleTypeToggle = (selectedType) => {
    if (isEditMode && isContactTransactionOnLoad) return;
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
        : [...prev, labelId],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (showContactSelect && !selectedContactId) {
      toast.error("Please select a contact for this category.");
      return;
    }
    setSubmitting(true);

    const payload = {
      date: formData.date,
      type,
      category:
        type === "debit" ? formData.debitCategory : formData.creditCategory,
      amount:
        parseFloat(
          type === "debit" ? formData.debitAmount : formData.creditAmount,
        ) || 0,
      comments: formData.comments,
      labelIds: selectedLabelIds,
      contactId: showContactSelect ? selectedContactId : null,
    };

    try {
      if (isEditMode) {
  await updateTransaction(editingTransaction.id, payload);
  toast.success("Transaction updated successfully!");

  // Only re-compute the page when the date actually changed.
  // If date is the same, the transaction stays in its original
  // position so we navigate back to the page the user came from.
  const originalDate = editingTransaction.date.split("T")[0];
  const dateChanged  = originalDate !== formData.date;

  let targetPage = returnPage;
  if (dateChanged) {
    const zeroBasedPage = await fetchTransactionPageNumber(
      editingTransaction.id,
      PAGE_SIZE,
    );
    targetPage = zeroBasedPage + 1;
  }

  navigate(
    showContactSelect ? "/manage-finances" : returnPath,
    { state: { refresh: true, returnPage: targetPage } },
  );
} else {
        await createTransaction(payload);
        toast.success("Transaction added successfully!");

        navigate(
          showContactSelect ? "/manage-finances" : returnPath,
          { state: { refresh: true, returnPage: returnPage } },
        );
      }
    } catch (error) {
      toast.error(error.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container transaction-form-shell">
      <div className="header">
        <h1>{isEditMode ? "Edit Transaction" : "Add New Transaction"}</h1>
        <button className="back-btn" disabled={submitting} onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>
      <form onSubmit={handleSubmit}>
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
            disabled={submitting}
          />
        </div>

        <div className="transaction-type">
          <button
            type="button"
            className={`transaction-type-btn ${
              type === "debit" ? "active" : ""
            }`}
            onClick={() => handleTypeToggle("debit")}
            disabled={submitting || (isEditMode && isContactTransactionOnLoad)}
          >
            Debit
          </button>
          <button
            type="button"
            className={`transaction-type-btn ${
              type === "credit" ? "active" : ""
            }`}
            onClick={() => handleTypeToggle("credit")}
            disabled={submitting || (isEditMode && isContactTransactionOnLoad)}
          >
            Credit
          </button>
        </div>

        {type === "debit" && (
          <div>
            <div className="form-group">
              <label htmlFor="debitCategory" className="required">
                Category
              </label>
              {/*
               * key={debitCats.length} forces React to remount this select
               * once the async category list arrives. Without it, browsers
               * may not reflect the controlled value when options load after
               * the initial render (controlled-select timing quirk).
               */}
              <select
                key={`debit-${debitCats.length}`}
                id="debitCategory"
                name="debitCategory"
                value={formData.debitCategory}
                onChange={handleChange}
                disabled={submitting}
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
                  key={`contact-${allContacts.length}`}
                  id="contactId"
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  disabled={submitting}
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
                disabled={submitting}
              />
            </div>
          </div>
        )}

        {type === "credit" && (
          <div>
            <div className="form-group">
              <label htmlFor="creditCategory" className="required">
                Category
              </label>
              {/*
               * Same key trick for the credit select.
               */}
              <select
                key={`credit-${creditCats.length}`}
                id="creditCategory"
                name="creditCategory"
                value={formData.creditCategory}
                onChange={handleChange}
                disabled={submitting}
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
                  key={`contact-${allContacts.length}`}
                  id="contactId"
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  disabled={submitting}
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
                disabled={submitting}
              />
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="comments">Comments</label>
          <textarea
            id="comments"
            name="comments"
            value={formData.comments}
            onChange={handleChange}
            rows="3"
            disabled={submitting}
          ></textarea>
        </div>

        <div className="form-group">
          <label>Labels (optional)</label>
          <div className="labels-group">
            {allLabels.length > 0 ? (
              allLabels.map((l) => (
                <label
                  key={l.id}
                  className={`label-chip ${
                    selectedLabelIds.includes(l.id) ? "selected" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    value={l.id}
                    checked={selectedLabelIds.includes(l.id)}
                    onChange={() => handleLabelChange(l.id)}
                    disabled={submitting}
                  />
                  {l.name}
                </label>
              ))
            ) : (
              <p className="no-labels">No labels available</p>
            )}
          </div>
        </div>

        <button type="submit" className="submit-btn btn-with-spinner" disabled={submitting}>
          {submitting ? (
            <>
              <span className="btn-spinner" aria-hidden="true" />
              Saving and redirecting...
            </>
          ) : isEditMode
              ? "Update Transaction"
              : "Add Transaction"}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
