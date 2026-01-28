// src/components/PaginationControls.jsx
import React, { useState } from "react";
import "./PaginationControls.css";



const PaginationControls = ({
  currentPage,
  totalPages,
  pageSize,
  totalElements,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
}) => {
  const [goToPageInput, setGoToPageInput] = useState("");
const [goToPageError, setGoToPageError] = useState("");

  const handleGoToPage = (e) => {
  e.preventDefault();

  if (goToPageInput === "") return;

  const pageNum = Number(goToPageInput);

  if (isNaN(pageNum)) {
    setGoToPageError("Please enter a valid number");
    return;
  }

  if (pageNum < 1) {
    setGoToPageError("Page number must be at least 1");
    return;
  }

  if (pageNum > totalPages) {
    setGoToPageError(
      `Page number exceeds total pages (${totalPages})`
    );
    return;
  }

  // ✅ Valid page
  setGoToPageError("");
  onPageChange(pageNum - 1); // 0-based index
  setGoToPageInput("");
};


  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value, 10);
    onPageSizeChange(newSize);
  };

  const getPageRange = () => {
    const range = [];
    const maxVisible = 5;
    let start = Math.max(0, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages - 1, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(0, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    
    return range;
  };

   if (totalElements === 0) {
    return null; // Don't show if no data at all
  }

  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalElements);

  return (
    <div className="pagination-container" aria-label="Pagination">
      {/* Results info */}
      <div className="pagination-info">
        <span className="pagination-count">
          Showing {startItem}–{endItem} of {totalElements.toLocaleString()}
        </span>
      </div>

      {/* Pagination controls */}
      <nav className="pagination-nav" aria-label="Page navigation">
        <div className="pagination-buttons">
          {/* First button */}
          <button
            className="pagination-btn first"
            onClick={() => onPageChange(0)}
            disabled={currentPage === 0 || isLoading}
            aria-label="Go to first page"
          >
            <i className="fas fa-angle-double-left"></i>
          </button>

          {/* Previous button */}
          <button
            className="pagination-btn prev"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0 || isLoading}
            aria-label="Go to previous page"
          >
            <i className="fas fa-angle-left"></i>
          </button>

          {/* Page numbers */}
          {getPageRange().map((pageNum) => (
            <button
              key={pageNum}
              className={`pagination-btn page-number ${
                currentPage === pageNum ? "active" : ""
              }`}
              onClick={() => onPageChange(pageNum)}
              disabled={isLoading}
              aria-label={`Go to page ${pageNum + 1}`}
              aria-current={currentPage === pageNum ? "page" : undefined}
            >
              {pageNum + 1}
            </button>
          ))}

          {/* Next button */}
          <button
            className="pagination-btn next"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1 || isLoading}
            aria-label="Go to next page"
          >
            <i className="fas fa-angle-right"></i>
          </button>

          {/* Last button */}
          <button
            className="pagination-btn last"
            onClick={() => onPageChange(totalPages - 1)}
            disabled={currentPage >= totalPages - 1 || isLoading}
            aria-label="Go to last page"
          >
            <i className="fas fa-angle-double-right"></i>
          </button>
        </div>

        {/* Page size selector and Go to page */}
        <div className="pagination-extra-controls">
          {/* Page size selector */}
          <div className="page-size-selector">
            <label htmlFor="pageSizeSelect" className="sr-only">
              Rows per page
            </label>
            <select
              id="pageSizeSelect"
              value={pageSize}
              onChange={handlePageSizeChange}
              disabled={isLoading}
              className="page-size-select"
              aria-label="Select number of rows per page"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>

          {/* Go to page */}
          <form onSubmit={handleGoToPage} className="go-to-page-form">
            <label htmlFor="goToPageInput" className="sr-only">
              Go to page number
            </label>
            <input
              id="goToPageInput"
              type="number"
              min="1"
              max={totalPages}
              value={goToPageInput}
             onChange={(e) => {
  setGoToPageInput(e.target.value);
  setGoToPageError("");
}}

              placeholder={`Go to page (1-${totalPages})`}
              className="go-to-page-input"
              aria-label="Enter page number to navigate to"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="go-to-page-btn"
              disabled={isLoading}
              aria-label="Submit page number"
            >
              Go
            </button>
          </form>
        </div>
      </nav>

      {/* Loading indicator */}
      {isLoading && (
        <div className="pagination-loading" role="status">
          <span className="spinner"></span>
          <span className="sr-only">Loading...</span>
        </div>
      )}

      {goToPageError && (
  <div className="go-to-page-error" role="alert">
    {goToPageError}
  </div>
)}

    </div>
  );
};

export default PaginationControls;