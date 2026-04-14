import React, { useMemo, useState } from "react";
import "./DashboardInsights.css";

const CATEGORY_COLORS = [
  "#4361ee",
  "#2ec4b6",
  "#ff9f1c",
  "#ef476f",
  "#118ab2",
  "#8338ec",
  "#06d6a0",
  "#f4a261",
];

const EMPTY_SECTION = {
  total: 0,
  maxAmount: 0,
  items: [],
};

const TAB_CONFIG = {
  debit: {
    label: "Debit",
    title: "Debit Categories",
    subtitle: "Understand which expense categories are taking the biggest share.",
    totalLabel: "Debit total",
    tableLabel: "Category",
    emptyMessage: "No debit transactions match the current filters.",
  },
  credit: {
    label: "Credit",
    title: "Credit Categories",
    subtitle: "See where your income is coming from at a glance.",
    totalLabel: "Credit total",
    tableLabel: "Category",
    emptyMessage: "No credit transactions match the current filters.",
  },
  labels: {
    label: "Labels",
    title: "Label Distribution",
    subtitle: "Compare how your filtered transactions are distributed across labels.",
    totalLabel: "Label total",
    tableLabel: "Label",
    emptyMessage: "No labeled data matches the current filters.",
  },
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatCurrency = (value) =>
  `₹${currencyFormatter.format(Number(value) || 0)}`;

const formatPercentage = (value) =>
  `${percentFormatter.format(Number(value) || 0)}%`;

const buildTooltip = (item) =>
  `${item.name}: ${formatCurrency(item.amount)} (${formatPercentage(item.percentage)})`;

const resolveColor = (item, index) =>
  item.color || CATEGORY_COLORS[index % CATEGORY_COLORS.length];

const normalizeSection = (section = EMPTY_SECTION) => {
  const items = Array.isArray(section.items)
    ? section.items
        .map((item, index) => ({
          ...item,
          amount: Number(item.amount) || 0,
          percentage: Number(item.percentage) || 0,
          resolvedColor: resolveColor(item, index),
        }))
        .filter((item) => item.amount > 0)
    : [];

  const maxAmount =
    Number(section.maxAmount) ||
    items.reduce((max, item) => Math.max(max, item.amount), 0);

  return {
    total: Number(section.total) || 0,
    maxAmount,
    items,
  };
};

function DonutChart({ items, total }) {
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="insights-donut-wrap">
      <svg
        className="insights-donut-chart"
        viewBox="0 0 200 200"
        role="img"
        aria-label="Label distribution chart"
      >
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#e8ecff"
          strokeWidth="34"
        />
        {items.map((item) => {
          const segmentLength = (item.percentage / 100) * circumference;
          const currentOffset = offset;
          offset += segmentLength;

          return (
            <circle
              key={item.name}
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={item.resolvedColor}
              strokeWidth="34"
              strokeDasharray={`${segmentLength} ${circumference}`}
              strokeDashoffset={-currentOffset}
              transform="rotate(-90 100 100)"
              className="insights-donut-segment"
            >
              <title>{buildTooltip(item)}</title>
            </circle>
          );
        })}
      </svg>

      <div className="insights-donut-center">
        <strong>{formatCurrency(total)}</strong>
        <span>Total</span>
      </div>
    </div>
  );
}

export default function DashboardInsights({ analytics, hasActiveFilters }) {
  const [activeTab, setActiveTab] = useState("debit");

  const sections = useMemo(
    () => ({
      debit: normalizeSection(analytics?.debit),
      credit: normalizeSection(analytics?.credit),
      labels: normalizeSection(analytics?.labels),
    }),
    [analytics],
  );

  const currentSection = sections[activeTab] || EMPTY_SECTION;
  const currentTab = TAB_CONFIG[activeTab];
  const hasData = currentSection.items.length > 0;

  return (
    <section className="insights-panel">
      <div className="insights-header">
        <div>
          <h3>Insights</h3>
          <p>
            Interactive breakdowns for debit, credit, and label distribution.
          </p>
        </div>

        <div className="insights-header-meta">
          {hasActiveFilters && <span className="insights-filter-pill">Filtered</span>}
          <div className="insights-tabs" role="tablist" aria-label="Dashboard insights views">
            {Object.entries(TAB_CONFIG).map(([key, tab]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                className={`insights-tab ${activeTab === key ? "active" : ""}`}
                onClick={() => setActiveTab(key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="insights-body">
        <div className="insights-chart-card">
          <div className="insights-chart-head">
            <div>
              <h4>{currentTab.title}</h4>
              <p>{currentTab.subtitle}</p>
            </div>
            <div className="insights-chart-total">
              <span>{currentTab.totalLabel}</span>
              <strong>{formatCurrency(currentSection.total)}</strong>
            </div>
          </div>

          {hasData ? (
            activeTab === "labels" ? (
              <div className="insights-label-chart">
                <DonutChart items={currentSection.items} total={currentSection.total} />
                <div className="insights-legend">
                  {currentSection.items.map((item) => (
                    <div
                      key={item.name}
                      className="insights-legend-item"
                      title={buildTooltip(item)}
                    >
                      <span
                        className="insights-legend-swatch"
                        style={{ backgroundColor: item.resolvedColor }}
                      />
                      <div>
                        <strong>{item.name}</strong>
                        <span>{formatPercentage(item.percentage)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="insights-bar-chart-scroll">
                <div className="insights-bar-chart">
                  {currentSection.items.map((item) => {
                    const relativeHeight =
                      currentSection.maxAmount > 0
                        ? Math.max((item.amount / currentSection.maxAmount) * 100, 10)
                        : 0;

                    return (
                      <div key={item.name} className="insights-bar-column">
                        <div className="insights-bar-topline">
                          <span>{formatPercentage(item.percentage)}</span>
                          <strong>{formatCurrency(item.amount)}</strong>
                        </div>
                        <div className="insights-bar-shell">
                          <div
                            className="insights-bar-fill"
                            style={{
                              height: `${relativeHeight}%`,
                              background: `linear-gradient(180deg, ${item.resolvedColor}, ${item.resolvedColor}cc)`,
                            }}
                            title={buildTooltip(item)}
                          />
                        </div>
                        <div className="insights-bar-label" title={item.name}>
                          {item.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            <div className="insights-empty-state">{currentTab.emptyMessage}</div>
          )}
        </div>

        <div className="insights-breakdown-card">
          <div className="insights-breakdown-head">
            <h4>Breakdown</h4>
            <span>
              {currentSection.items.length} {currentSection.items.length === 1 ? "item" : "items"}
            </span>
          </div>

          {hasData ? (
            <div className="insights-breakdown-table-wrap">
              <table className="insights-breakdown-table">
                <thead>
                  <tr>
                    <th>{currentTab.tableLabel}</th>
                    <th>Amount</th>
                    <th>Percentage</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSection.items.map((item) => (
                    <tr key={item.name} title={buildTooltip(item)}>
                      <td>
                        <div className="insights-name-cell">
                          <span
                            className="insights-name-dot"
                            style={{ backgroundColor: item.resolvedColor }}
                          />
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td>{formatCurrency(item.amount)}</td>
                      <td>{formatPercentage(item.percentage)}</td>
                      <td>
                        <div className="insights-progress-track">
                          <div
                            className="insights-progress-fill"
                            style={{
                              width: `${Math.min(item.percentage, 100)}%`,
                              background: `linear-gradient(90deg, ${item.resolvedColor}, ${item.resolvedColor}cc)`,
                            }}
                            title={buildTooltip(item)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td>{formatCurrency(currentSection.total)}</td>
                    <td>100%</td>
                    <td>
                      <div className="insights-progress-track total">
                        <div className="insights-progress-fill total" style={{ width: "100%" }} />
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="insights-empty-state compact">Nothing to break down yet.</div>
          )}
        </div>
      </div>
    </section>
  );
}
