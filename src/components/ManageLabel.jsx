import React, { useEffect, useState } from "react";
import "./ManageLabel.css";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaTimes,
  FaSave,
  FaExclamationTriangle,
} from "react-icons/fa";
import { toast } from "react-toastify";
import {
  fetchLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  labelUsageAll,
} from "../utils/labelApi";

const colorOptions = [
  "#4CAF50",
  "#F44336",
  "#2196F3",
  "#FF9800",
  "#9C27B0",
  "#6c5ce7",
];

export default function ManageLabel() {
  const [labels, setLabels] = useState([]);
  const [usageMap, setUsageMap] = useState({});

  // ✅ initialize with first color (not whole array)
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(colorOptions[0]);

  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(null);

  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(colorOptions[0]);
  const [transferTo, setTransferTo] = useState("");

  const reload = async () => {
    try {
      const [ls, usage] = await Promise.all([fetchLabels(), labelUsageAll()]);
      setLabels(ls);
      setUsageMap(Object.fromEntries(usage.map((u) => [u.id, u.count])));
    } catch (e) {
      toast.error("Failed to load labels");
    }
  };

  useEffect(() => {
    reload();
  }, []);

  // Add new label
  const handleAddLabel = async (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    try {
      await createLabel({ name: newLabel.trim(), color: newColor });
      setNewLabel("");
      setNewColor(colorOptions[0]); // reset
      await reload();
      toast.success("Label created");
    } catch {
      toast.error("Failed to create label");
    }
  };

  // Open edit modal
  const openEditModal = (label) => {
    setSelectedLabel(label);
    setEditName(label.name);
    setEditColor(label.color || colorOptions[0]);
    setEditModal(true);
  };

  // Save edited label
  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      await updateLabel(selectedLabel.id, {
        name: editName.trim(),
        color: editColor,
      });
      setEditModal(false);
      await reload();
      toast.success("Label updated");
    } catch {
      toast.error("Failed to update label");
    }
  };

  // Open delete modal
  const openDeleteModal = (label) => {
    setSelectedLabel(label);
    setTransferTo("");
    setDeleteModal(true);
  };

  // Delete label with optional reassignment
  const handleDelete = async (e) => {
    e.preventDefault();
    const usedCount = usageMap[selectedLabel.id] || 0;
    if (usedCount > 0 && !transferTo) {
      toast.error("Select a transfer label");
      return;
    }
    try {
      await deleteLabel(selectedLabel.id, usedCount > 0 ? transferTo : undefined);
setDeleteModal(false);
setTransferTo("");
await reload(); // existing
window.dispatchEvent(new Event("labelsUpdated")); // 🔥 new

      toast.success("Label deleted");
    } catch (err) {
      toast.error(err.message || "Failed to delete label");
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Manage Labels</h1>
        <p className="subtitle">
          Create and manage labels for your transactions
        </p>
      </header>

      <div className="labels-container">
        <div className="section-header">
          <h2>Transaction Labels</h2>
          <span className="count-badge">{labels.length} labels</span>
        </div>

        {/* Add Label Form */}
        <form className="add-label-form" onSubmit={handleAddLabel}>
          <input
            type="text"
            className="add-label-input"
            placeholder="Enter a new label name"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <div className="color-picker">
            {colorOptions.map((c) => (
              <div
                key={c}
                className={`color-option ${newColor === c ? "selected" : ""}`}
                style={{ backgroundColor: c }}
                onClick={() => setNewColor(c)}
              />
            ))}
          </div>
          <button type="submit" className="add-btn">
            <FaPlus /> Add Label
          </button>
        </form>

        {/* Labels List */}
        <ul className="labels-list">
          {labels.map((label) => (
            <li className="label-item" key={label.id}>
              <div className="label-info">
                <div
                  className="label-color"
                  style={{ backgroundColor: label.color || "#6c5ce7" }}
                />
                <span className="label-name">{label.name}</span>
                <span className="label-usage">
                  Used in {usageMap[label.id] || 0} transactions
                </span>
              </div>
              <div className="label-actions">
                <button
                  type="button"
                  className="edit-btn"
                  onClick={() => openEditModal(label)}
                >
                  <FaEdit /> Edit
                </button>
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => openDeleteModal(label)}
                >
                  <FaTrash /> Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Edit Label Modal */}
      {/* Edit Label Modal */}
{editModal && (
  <div
    className="edit-modal"
    onClick={(e) =>
      e.target.classList.contains("edit-modal") && setEditModal(false)
    }
  >
    <div className="edit-modal-content">
      <div className="modal-header">
        <h3>Edit Label</h3>
        <button className="close-btn" onClick={() => setEditModal(false)}>
          <FaTimes />
        </button>
      </div>
      <form onSubmit={handleEditSave}>
        <div className="form-group">
          <label>Label Name</label>
          <input
            type="text"
            className="form-control"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Label Color</label>
          <div className="color-picker">
            {colorOptions.map((color) => (
              <div
                key={color}
                className={`color-option ${
                  editColor === color ? "selected" : ""
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setEditColor(color)}
              />
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setEditModal(false)}
          >
            <FaTimes /> Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            <FaSave /> Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* Delete Label Modal */}
{deleteModal && (
  <div
    className="delete-modal"
    onClick={(e) =>
      e.target.classList.contains("delete-modal") && setDeleteModal(false)
    }
  >
    <div className="delete-modal-content">
      <div className="modal-header">
        <h3>Delete Label</h3>
        <button
          className="close-btn"
          onClick={() => setDeleteModal(false)}
        >
          <FaTimes />
        </button>
      </div>
      {(usageMap[selectedLabel?.id] || 0) > 0 && (
        <div className="transaction-warning">
          <FaExclamationTriangle />
          <p>
            This label is used in transactions. Please select a new label
            to reassign those transactions before deleting.
          </p>
        </div>
      )}
      <form onSubmit={handleDelete}>
        {(usageMap[selectedLabel?.id] || 0) > 0 && (
          <div className="form-group">
            <label>Reassign transactions to</label>
            <select
              className="form-control"
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
            >
              <option value="">Select a label</option>
              {labels
                .filter((lbl) => lbl.id !== selectedLabel?.id)
                .map((lbl) => (
                  <option key={lbl.id} value={lbl.id}>
                    {lbl.name}
                  </option>
                ))}
            </select>
          </div>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setDeleteModal(false)}
          >
            <FaTimes /> Cancel
          </button>
          <button type="submit" className="btn btn-danger">
            <FaTrash /> Delete Label
          </button>
        </div>
      </form>
    </div>
  </div>
)}

    </div>
  );
}
