import React, { useState, useEffect } from "react";
import "./TransactionForm.css";
import { useNavigate, useLocation } from "react-router-dom";
import { BASE_URL } from "../utils/api";
import { toast } from "react-toastify";
import { fetchCategories } from "../utils/categoryApi";
import { fetchLabels } from "../utils/labelApi";

const TransactionForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editingTransaction = location.state?.transaction || null;
  const isEditMode = !!editingTransaction;

  const [allCategories, setAllCategories] = useState([]); // [{id,name,type}]
  const [allLabels, setAllLabels] = useState([]); // [{id,name,color}]
  const [selectedLabelIds, setSelectedLabelIds] = useState(
    editingTransaction?.labelIds || []
  );

  const debitCats = allCategories.filter((c) => c.type === "debit");
  const creditCats = allCategories.filter((c) => c.type === "credit");

  // Load categories
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchCategories();
        setAllCategories(data);
      } catch {
        toast.error("Failed to load categories");
      }
    })();
  }, []);

  // Load labels
  useEffect(() => {
    (async () => {
      try {
        const ls = await fetchLabels();
        setAllLabels(ls);
      } catch {
        // Labels optional
      }
    })();
  }, []);

  // Get today's date
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
        reimbursable:
          editingTransaction.type === "debit"
            ? editingTransaction.reimbursable
              ? "Y"
              : "N"
            : "N",
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

  const [type, setType] = useState(
    editingTransaction ? editingTransaction.type : "debit"
  );
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleTypeToggle = (selectedType) => {
    setType(selectedType);
    setErrors({});
    setFormData((prev) => ({
      ...prev,
      debitCategory: "",
      creditCategory: "",
      debitAmount: "",
      creditAmount: "",
      reimbursable: selectedType === "debit" ? "N" : "",
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onLabelsChange = (id) => {
    setSelectedLabelIds(
      (prev) =>
        prev.includes(id)
          ? prev.filter((labelId) => labelId !== id) // uncheck
          : [...prev, id] // check
    );
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = "Please select a date";

    if (type === "debit") {
      if (!formData.debitCategory)
        newErrors.debitCategory = "Please select a category";
      if (!formData.debitAmount || parseFloat(formData.debitAmount) <= 0)
        newErrors.debitAmount = "Please enter a valid amount";
      if (!formData.reimbursable)
        newErrors.reimbursable = "Please select an option";
    } else {
      if (!formData.creditCategory)
        newErrors.creditCategory = "Please select a category";
      if (!formData.creditAmount || parseFloat(formData.creditAmount) <= 0)
        newErrors.creditAmount = "Please enter a valid amount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    const payload = {
      date: formData.date,
      type,
      category:
        type === "debit" ? formData.debitCategory : formData.creditCategory,
      amount: type === "debit" ? formData.debitAmount : formData.creditAmount,
      reimbursable: type === "debit" ? formData.reimbursable : "N",
      comments: formData.comments,
      labelIds: selectedLabelIds, // <-- multiple or none
    };

    try {
      const url = isEditMode
        ? `${BASE_URL}/api/transactions/${editingTransaction.id}`
        : `${BASE_URL}/api/transactions`;

      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to submit transaction");

      toast.success(
        isEditMode
          ? "Transaction updated successfully!"
          : "Transaction added successfully!"
      );
      navigate("/expense-tracker", { state: { refresh: true } });
    } catch (error) {
      console.error("Submission Error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>{isEditMode ? "Edit Transaction" : "Add New Transaction"}</h1>
        <button
          className="back-btn"
          onClick={() => navigate("/expense-tracker")}
        >
          ← Back to List
        </button>
      </div>

      <form onSubmit={handleSubmit}>
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
          {errors.date && <div className="error-message">{errors.date}</div>}
        </div>

        {/* Type toggle */}
        <div className="transaction-type">
          <button
            type="button"
            className={`transaction-type-btn ${
              type === "debit" ? "active" : ""
            }`}
            onClick={() => handleTypeToggle("debit")}
          >
            Debit
          </button>
          <button
            type="button"
            className={`transaction-type-btn ${
              type === "credit" ? "active" : ""
            }`}
            onClick={() => handleTypeToggle("credit")}
          >
            Credit
          </button>
        </div>

        {/* Debit section */}
        {type === "debit" && (
          <div id="debitSection">
            <div className="form-group">
              <label htmlFor="debitCategory" className="required">
                Category
              </label>
              <select
                id="debitCategory"
                name="debitCategory"
                value={formData.debitCategory}
                onChange={handleChange}
                disabled={allCategories.length === 0}
              >
                <option value="">
                  {allCategories.length === 0
                    ? "Loading categories..."
                    : "-- Select Category --"}
                </option>
                {debitCats.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              {errors.debitCategory && (
                <div className="error-message">{errors.debitCategory}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="debitAmount" className="required">
                Amount (₹)
              </label>
              <input
                type="number"
                id="debitAmount"
                name="debitAmount"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.debitAmount}
                onChange={handleChange}
              />
              {errors.debitAmount && (
                <div className="error-message">{errors.debitAmount}</div>
              )}
            </div>

            <div className="form-group">
              <label className="required">Reimbursable</label>
              <div className="radio-group">
                <div className="radio-option">
                  <input
                    type="radio"
                    id="reimbursableY"
                    name="reimbursable"
                    value="Y"
                    checked={formData.reimbursable === "Y"}
                    onChange={handleChange}
                  />
                  <label htmlFor="reimbursableY">Yes</label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="reimbursableN"
                    name="reimbursable"
                    value="N"
                    checked={formData.reimbursable === "N"}
                    onChange={handleChange}
                  />
                  <label htmlFor="reimbursableN">No</label>
                </div>
              </div>
              {errors.reimbursable && (
                <div className="error-message">{errors.reimbursable}</div>
              )}
            </div>
          </div>
        )}

        {/* Credit section */}
        {type === "credit" && (
          <div id="creditSection">
            <div className="form-group">
              <label htmlFor="creditCategory" className="required">
                Category
              </label>
              <select
                id="creditCategory"
                name="creditCategory"
                value={formData.creditCategory}
                onChange={handleChange}
                disabled={allCategories.length === 0}
              >
                <option value="">
                  {allCategories.length === 0
                    ? "Loading categories..."
                    : "-- Select Category --"}
                </option>
                {creditCats.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              {errors.creditCategory && (
                <div className="error-message">{errors.creditCategory}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="creditAmount" className="required">
                Amount (₹)
              </label>
              <input
                type="number"
                id="creditAmount"
                name="creditAmount"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.creditAmount}
                onChange={handleChange}
              />
              {errors.creditAmount && (
                <div className="error-message">{errors.creditAmount}</div>
              )}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="form-group">
          <label htmlFor="comments">Comments</label>
          <textarea
            id="comments"
            name="comments"
            rows="3"
            placeholder="Optional notes about the transaction"
            value={formData.comments}
            onChange={handleChange}
          ></textarea>
        </div>

        {/* Labels */}
        <div className="form-group">
          <label>Labels (optional)</label>
  <div className="labels-group">
    {allLabels.map((l) => (
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
          onChange={() => onLabelsChange(l.id)}
        />
        {l.name}
      </label>
    ))}
  </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="submit-btn d-flex align-items-center justify-content-center"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
              Please wait...
            </>
          ) : isEditMode ? (
            "Update Transaction"
          ) : (
            "Add Transaction"
          )}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
