import React, { useEffect, useMemo, useRef, useState } from "react";

const SORT_OPTIONS = [
  { value: "", label: "Default (Newest First)" },
  { value: "date", label: "Date" },
  { value: "category", label: "Category" },
  { value: "debit", label: "Debit Amount" },
  { value: "credit", label: "Credit Amount" },
  { value: "balance", label: "Balance" },
];

const normalizeOptions = (options = []) =>
  options.map((option) =>
    typeof option === "string"
      ? { value: option, label: option }
      : {
          value: option.value,
          label: option.label,
          color: option.color,
        },
  );

function SearchableMultiSelect({
  label,
  options,
  selectedValues,
  onChange,
  placeholder,
  loading,
}) {
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);
  const filteredOptions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return normalizedOptions;
    return normalizedOptions.filter((option) =>
      option.label.toLowerCase().includes(query),
    );
  }, [normalizedOptions, searchTerm]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const toggleValue = (value) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((item) => item !== value));
      return;
    }

    onChange([...selectedValues, value]);
  };

  const selectVisible = () => {
    const merged = new Set(selectedValues);
    filteredOptions.forEach((option) => merged.add(option.value));
    onChange([...merged]);
  };

  const clearSelection = () => onChange([]);

  const selectedLabels = normalizedOptions
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label);

  const triggerLabel =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.length} selected`;

  return (
    <div className="filter-field multi-select-field" ref={wrapperRef}>
      <span className="filter-label">{label}</span>
      <button
        type="button"
        className={`multi-select-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        disabled={loading}
        aria-expanded={open}
      >
        <span>{triggerLabel}</span>
        <i className={`bi ${open ? "bi-chevron-up" : "bi-chevron-down"}`} />
      </button>

      {open && (
        <div className="multi-select-dropdown">
          <div className="multi-select-toolbar">
            <input
              type="search"
              className="multi-select-search"
              placeholder={`Search ${label.toLowerCase()}...`}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <div className="multi-select-actions">
              <button
                type="button"
                className="multi-select-link"
                onClick={selectVisible}
                disabled={!filteredOptions.length}
              >
                Select visible
              </button>
              <button
                type="button"
                className="multi-select-link"
                onClick={clearSelection}
                disabled={!selectedValues.length}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="multi-select-options">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <label className="multi-select-option" key={option.value}>
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option.value)}
                    onChange={() => toggleValue(option.value)}
                  />
                  {option.color ? (
                    <span
                      className="option-color-dot"
                      style={{ backgroundColor: option.color }}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span>{option.label}</span>
                </label>
              ))
            ) : (
              <div className="multi-select-empty">No matching options found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const TransactionFilter = ({
  filterOpen,
  selectedType,
  setSelectedType,
  categoryOptions,
  selectedCategories,
  setSelectedCategories,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  labelOptions,
  selectedLabels,
  setSelectedLabels,
  sortConfig,
  setSortConfig,
  resetFilters,
  loading,
}) => {
  if (!filterOpen) return null;

  return (
    <div className="date-filter">
      <div className="date-filter-head">
        <div>
          <strong>Smart Filters</strong>
          <span>
            Search options, pick multiple categories or labels, and sort the
            result set from one panel.
          </span>
        </div>
        {loading && (
          <div className="date-filter-status" role="status" aria-live="polite">
            <span className="inline-spinner" aria-hidden="true" />
            Updating results...
          </div>
        )}
      </div>

      <label className="filter-field">
        <span className="filter-label">Type</span>
        <select
          value={selectedType}
          onChange={(event) => setSelectedType(event.target.value)}
        >
          <option value="All">All</option>
          <option value="debit">Debit</option>
          <option value="credit">Credit</option>
        </select>
      </label>

      <SearchableMultiSelect
        label="Categories"
        options={categoryOptions}
        selectedValues={selectedCategories}
        onChange={setSelectedCategories}
        placeholder="All categories"
        loading={loading}
      />

      <label className="filter-field">
        <span className="filter-label">Start Date</span>
        <input
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          max={endDate || undefined}
        />
      </label>

      <label className="filter-field">
        <span className="filter-label">End Date</span>
        <input
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          min={startDate || undefined}
        />
      </label>

      <SearchableMultiSelect
        label="Labels"
        options={labelOptions}
        selectedValues={selectedLabels}
        onChange={setSelectedLabels}
        placeholder="All labels"
        loading={loading}
      />

      <label className="filter-field">
        <span className="filter-label">Sort By</span>
        <select
          value={sortConfig?.key || ""}
          onChange={(event) =>
            setSortConfig({
              key: event.target.value || null,
              direction: sortConfig?.direction || "desc",
            })
          }
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value || "default"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="filter-field">
        <span className="filter-label">Direction</span>
        <select
          value={sortConfig?.direction || "desc"}
          onChange={(event) =>
            setSortConfig({
              key: sortConfig?.key || null,
              direction: event.target.value,
            })
          }
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
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
