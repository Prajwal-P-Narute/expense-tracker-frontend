import React from "react";

const TransactionFilter = ({
  filterOpen,
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
  setCurrentPage,
}) => {
  if (!filterOpen) return null;
  return (
    <div className="date-filter">
      <label>
        Category:
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setCurrentPage(1);
          }}
        >
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
          onChange={(e) => {
            setStartDate(e.target.value);
            setCurrentPage(1);
          }}
          max={endDate || undefined}
        />
      </label>

      <label>
        End Date:
        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setCurrentPage(1);
          }}
          min={startDate || undefined}
        />
      </label>

      <label>
        Label:
        <select
          value={selectedLabel}
          onChange={(e) => {
            setSelectedLabel(e.target.value);
            setCurrentPage(1);
          }}
        >
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

      <button onClick={resetFilters}>Reset</button>
    </div>
  );
};

export default TransactionFilter;
