import React from 'react';
import './DeleteModal.css'; // We will use one stylesheet

const DeleteModal = ({ show, onConfirm, onCancel, message }) => {
  if (!show) {
    return null;
  }

  return (
    <div className="delete-modal-backdrop" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Confirm Deletion</h3>
          <button className="close-btn" onClick={onCancel}>&times;</button>
        </div>
        <p>{message || 'Are you sure you want to delete this item? This action cannot be undone.'}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;