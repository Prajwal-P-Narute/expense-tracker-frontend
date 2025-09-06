import React, { useEffect, useState } from "react";
import { FaTrashAlt } from "react-icons/fa";
import "./DeleteModal.css";

const DeleteModal = ({ show, onConfirm, onCancel, message }) => {
  const [visible, setVisible] = useState(show);

  // Handle fade-out animation before removing modal from DOM
  useEffect(() => {
    if (show) setVisible(true);
    else {
      const timeout = setTimeout(() => setVisible(false), 300); // match fadeOut duration
      return () => clearTimeout(timeout);
    }
  }, [show]);

  if (!visible) return null;

  return (
    <div
      className={`modal-backdrop ${show ? "fade-in" : "fade-out"}`}
      onClick={onCancel} // clicking outside closes modal
    >
      <div
        className={`modal-content slide-down`}
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking modal itself
      >
        <div className="trash-icon-wrapper">
          <FaTrashAlt className="trash-icon" />
        </div>
        <h3>Delete Confirmation</h3>
        <p>{message || "Are you sure you want to delete this transaction?"}</p>
        <div className="modal-buttons">
          <button className="btn btn-confirm" onClick={onConfirm}>
            Yes
          </button>
          <button className="btn btn-cancel" onClick={onCancel}>
            No
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
