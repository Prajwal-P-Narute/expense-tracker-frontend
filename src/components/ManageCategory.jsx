import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ManageCategory.css";
import { FaEdit, FaTrash, FaExclamationTriangle } from "react-icons/fa";
import {
  fetchCategories,
  createCategory,
  renameCategory,
  deleteCategory,
  getCategoryUsage,
} from "../utils/categoryApi";
import { toast } from "react-toastify";

const ManageCategory = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editCategoryName, setEditCategoryName] = useState("");
  const [currentCategory, setCurrentCategory] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transferCategoryId, setTransferCategoryId] = useState("");
  const [categoryType, setCategoryType] = useState({
    debit: { type: "", status: null },
    credit: { type: "", status: null },
  });

  const editInputRef = useRef(null);
  const [usageCount, setUsageCount] = useState(0);
  const [usageLoading, setUsageLoading] = useState(false);

  const debitCategories = useMemo(
    () => categories.filter((c) => c.type === "debit"),
    [categories]
  );
  const creditCategories = useMemo(
    () => categories.filter((c) => c.type === "credit"),
    [categories]
  );

  async function load() {
    setLoading(true);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (e) {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (showEditModal && editInputRef.current) editInputRef.current.focus();
  }, [showEditModal]);

  const handleAddCategory = async (e, sectionType) => {
    e.preventDefault();
    const input = e.target.elements[`add-${sectionType}-input`];
    const name = input.value.trim();
    const { status: catStatus,} = categoryType[sectionType];
    if (!name) {
      toast.error("Please select category type");
      return;
    }
    try {
      await createCategory(name, sectionType, catStatus ?? "");
      toast.success("Category added");
      input.value = "";
      setCategoryType((prev) => ({
        ...prev,
        [sectionType]: { type: "", status: null },
      })); // reset toggle
      await load();
    } catch (e) {
      toast.error(e.message || "Failed to add category");
    }
  };

  const handleEditClick = (cat) => {
    setCurrentCategory(cat);
    setEditCategoryName(cat.name);
    setShowEditModal(true);
  };

  const handleDeleteClick = async (cat) => {
    setCurrentCategory(cat);
    setTransferCategoryId("");
    setShowDeleteModal(true);
    setUsageLoading(true);
    try {
      const data = await getCategoryUsage(cat.id);
      // Ensure usageCount is a number
      const count = data && !isNaN(Number(data.count)) ? Number(data.count) : 0;
      setUsageCount(count);
    } catch (e) {
      setUsageCount(0);
      toast.error("Failed to check category usage");
    } finally {
      setUsageLoading(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editCategoryName.trim()) return;
    try {
      await renameCategory(currentCategory.id, editCategoryName.trim());
      toast.success("Category renamed");
      setShowEditModal(false);
      await load();
    } catch (e) {
      toast.error(e.message || "Rename failed");
    }
  };

  const handleDeleteCategory = async (e) => {
    e.preventDefault();
    try {
      if (usageCount > 0 && !transferCategoryId) {
        alert("Please select a category to transfer transactions to");
        return;
      }
      await deleteCategory(
        currentCategory.id,
        usageCount > 0 ? transferCategoryId : undefined
      );
      toast.success("Category deleted");
      setShowDeleteModal(false);
      setTransferCategoryId("");
      await load();
    } catch (e) {
      toast.error(e.message || "Delete failed");
    }
  };

  const renderCategorySection = (title, list, sectionType) => (
    <section className="category-section">
      <div className="section-header">
        <h2
          className={sectionType === "debit" ? "debit-header" : "credit-header"}
        >
          {title}
        </h2>
        <span className="count-badge">{list.length} categories</span>
      </div>

      <form
        className="add-category-form"
        onSubmit={(e) => handleAddCategory(e, sectionType)}
      >
        <input
          name={`add-${sectionType}-input`}
          type="text"
          className="add-category-input"
          placeholder={`Add new ${sectionType} category`}
        />

        {/* User-friendly toggle */}
        <div className="toggle-group">
          {sectionType === "debit" && (
            <span
              className={
                categoryType[sectionType].status === "given" ? "active" : ""
              }
              onClick={() =>
                setCategoryType((prev) => ({
                  ...prev,
                  debit:
                    prev.debit.status === "given"
                      ? { type: "debit", status: null } // Deselect: keep type as debit, status null
                      : { type: "debit", status: "given" }, // Select: type debit, status given
                }))
              }
            >
              Given
            </span>
          )}
          {sectionType === "credit" && (
            <span
              className={
                categoryType[sectionType].status === "received" ? "active" : ""
              }
              onClick={() =>
                setCategoryType((prev) => ({
                  ...prev,
                  credit:
                    prev.credit.status === "received"
                      ? { type: "credit", status: null } // Deselect: keep type as credit, status null
                      : { type: "credit", status: "received" }, // Select: type credit, status received
                }))
              }
            >
              Received
            </span>
          )}
        </div>

        <button type="submit" className="add-btn">
          Add
        </button>
      </form>

      <ul className="category-list">
        {list.map((cat) => (
          <li key={cat.id} className="category-item">
            <span className="category-name">{cat.name}</span>
            <div className="category-actions">
              <button className="edit-btn" onClick={() => handleEditClick(cat)}>
                <FaEdit /> Edit
              </button>
              <button
                className="delete-btn"
                onClick={() => handleDeleteClick(cat)}
                disabled={
                  (sectionType === "debit" ? debitCategories : creditCategories)
                    .length <= 1
                }
              >
                <FaTrash /> Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );

  if (loading)
    return (
      <div className="container">
        <p>Loading...</p>
      </div>
    );

  return (
    <div className="container">
      <header>
        <h1>Manage Categories</h1>
        <p className="subtitle">
          Add, edit, and organize your debit and credit categories
        </p>
      </header>

      <div className="categories-container">
        {renderCategorySection("Debit Categories", debitCategories, "debit")}
        {renderCategorySection("Credit Categories", creditCategories, "credit")}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Category</h3>
              <button
                className="close-btn"
                onClick={() => setShowEditModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label htmlFor="editCategoryName">Category Name</label>
                <input
                  id="editCategoryName"
                  type="text"
                  className="form-control"
                  ref={editInputRef}
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  placeholder="Enter category name"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowDeleteModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Category</h3>
              <button
                className="close-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                &times;
              </button>
            </div>

            {usageLoading ? (
              <div className="transaction-warning">
                <p>Checking usage...</p>
              </div>
            ) : usageCount > 0 ? (
              <>
                <div className="transaction-warning">
                  <p>
                    <FaExclamationTriangle /> This category has transactions
                    associated with it. Please select a new category to transfer
                    these transactions to before deleting.
                  </p>
                </div>
                <form onSubmit={handleDeleteCategory}>
                  <div className="form-group">
                    <label htmlFor="transferCategory">
                      Transfer transactions to
                    </label>
                    <select
                      id="transferCategory"
                      className="form-control"
                      value={transferCategoryId}
                      onChange={(e) => setTransferCategoryId(e.target.value)}
                    >
                      <option value="">Select a category</option>
                      {(currentCategory?.type === "debit"
                        ? debitCategories
                        : creditCategories
                      )
                        .filter((c) => c.id !== currentCategory?.id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowDeleteModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-danger"
                      disabled={!transferCategoryId}
                    >
                      Delete Category
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="transaction-warning">
                  <p>
                    This category has no transactions and can be deleted safely.
                  </p>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleDeleteCategory}
                  >
                    Delete Category
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCategory;
