import React from "react";

const TransactionFilter = ({
  filterOpen,
  selectedType,
  setSelectedType,
  categoryOptions,
  selectedCategory,
  setSelectedCategory,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  labelOptions,
  selectedLabel,
  labelMap,
  setSelectedLabel,
  resetFilters,
  loading,
}) => {
  if (!filterOpen) return null;
  return (
    <div className="date-filter">
      <div className="date-filter-head">
        <div>
          <strong>Smart Filters</strong>
          <span>Refine the dashboard and transactions together.</span>
        </div>
        {loading && (
          <div className="date-filter-status" role="status" aria-live="polite">
            <span className="inline-spinner" aria-hidden="true" />
            Updating results...
          </div>
        )}
      </div>

      <label>
        Type:
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="All">All</option>
          <option value="debit">Debit</option>
          <option value="credit">Credit</option>
        </select>
      </label>

      <label>
        Category:
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          {categoryOptions.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </label>

      <label>
        Start Date:
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          max={endDate || undefined}
        />
      </label>

      <label>
        End Date:
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          min={startDate || undefined}
        />
      </label>

      <label>
        Label:
        <select value={selectedLabel} onChange={(e) => setSelectedLabel(e.target.value)}>
          {labelOptions.map((l) =>
            l === "All" ? (
              <option key="All" value="All">
                All
              </option>
            ) : (
              <option key={l} value={l}>
                {labelMap[l]?.name || l}
              </option>
            )
          )}
        </select>
      </label>

      <div className="date-filter-actions">
        <button onClick={resetFilters} disabled={loading}>
          {loading ? (
            <span className="btn-with-spinner">
              <span className="btn-spinner" aria-hidden="true" />
              Resetting...
            </span>
          ) : (
            "Reset"
          )}
        </button>
      </div>
    </div>
  );
};

export default TransactionFilter;
