import React, { useState } from "react";
import "./TransactionForm.css";
import { useNavigate } from "react-router-dom";

const TransactionForm = () => {
  const navigate = useNavigate();

  // Get today's date in yyyy-MM-dd format
  const getTodayDate = () => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split("T")[0];
  };

  // Initialize formData with today's date as default for date field
  const [formData, setFormData] = useState({
    date: getTodayDate(),
    debitCategory: "",
    creditCategory: "",
    debitAmount: "",
    creditAmount: "",
    reimbursable: "",
    comments: "",
  });

  const [type, setType] = useState("debit");
  const [errors, setErrors] = useState({});

  const handleTypeToggle = (selectedType) => {
    setType(selectedType);
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      date: formData.date,
      type,
      category:
        type === "debit" ? formData.debitCategory : formData.creditCategory,
      amount: type === "debit" ? formData.debitAmount : formData.creditAmount,
      reimbursable: type === "debit" ? formData.reimbursable : "N",
      comments: formData.comments,
    };

    fetch("https://expense-tracker-backend-y788.onrender.com/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then(() => {
        alert("Transaction added successfully!");
        navigate("/");
      })
      .catch((err) => console.error("Error:", err));
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Add New Transaction</h1>
        <button className="back-btn" onClick={() => navigate("/")}>
          ← Back to List
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
          />
          {errors.date && <div className="error-message">{errors.date}</div>}
        </div>

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
              >
                <option value="">-- Select Category --</option>
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Accommodation">Accommodation</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Lending">Lending</option>
                <option value="Family Support">Family Support</option>
                <option value="Donation">Donation</option>
                <option value="Others">Others</option>
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
              >
                <option value="">-- Select Category --</option>
                <option value="Salary">Salary</option>
                <option value="Refund">Refund</option>
                <option value="Investment">Investment</option>
                <option value="Gift">Gift</option>
                <option value="Other Income">Other Income</option>
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

        <button type="submit" className="submit-btn">
          Add Transaction
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
