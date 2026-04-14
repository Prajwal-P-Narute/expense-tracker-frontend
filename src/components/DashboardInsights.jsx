import React, { useEffect, useMemo, useState } from "react";
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
    subtitle: "See where your spending is concentrated and drill into it instantly.",
    totalLabel: "Debit total",
    tableLabel: "Category",
    emptyMessage: "No debit transactions match the current filters.",
    interactionHint: "Click a slice, legend item, or breakdown row to load matching debit transactions.",
  },
  credit: {
    label: "Credit",
    title: "Credit Categories",
    subtitle: "Spot your strongest income sources and jump straight to those entries.",
    totalLabel: "Credit total",
    tableLabel: "Category",
    emptyMessage: "No credit transactions match the current filters.",
    interactionHint: "Click a slice, legend item, or breakdown row to load matching credit transactions.",
  },
  labels: {
    label: "Labels",
    title: "Label Distribution",
    subtitle: "Compare how your filtered transactions are distributed across labels.",
    totalLabel: "Label total",
    tableLabel: "Label",
    emptyMessage: "No labeled data matches the current filters.",
    interactionHint: "Label analytics stay in summary mode so you can compare patterns at a glance.",
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

const toRadians = (degrees) => ((degrees - 90) * Math.PI) / 180;

const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => ({
  x: centerX + radius * Math.cos(toRadians(angleInDegrees)),
  y: centerY + radius * Math.sin(toRadians(angleInDegrees)),
});

const describePieSlice = (centerX, centerY, radius, startAngle, endAngle) => {
  const start = polarToCartesian(centerX, centerY, radius, startAngle);
  const end = polarToCartesian(centerX, centerY, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
};

const handleSvgKeyDown = (event, onActivate) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onActivate();
  }
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

function PieChart({
  items,
  total,
  selectedKey,
  tabKey,
  onSelectItem,
  canSelect,
}) {
  const segments = useMemo(() => {
    let currentAngle = 0;

    return items.map((item) => {
      const sliceAngle = total > 0 ? (item.amount / total) * 360 : 0;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      return {
        item,
        startAngle,
        endAngle,
        midAngle: startAngle + sliceAngle / 2,
      };
    });
  }, [items, total]);

  return (
    <div className="insights-pie-wrap">
      <svg
        className="insights-pie-chart"
        viewBox="0 0 220 220"
        role="img"
        aria-label={`${TAB_CONFIG[tabKey].label} category pie chart`}
      >
        <circle cx="110" cy="110" r="96" fill="#eef2ff" />
        {items.length === 1 ? (
          <circle
            cx="110"
            cy="110"
            r="96"
            fill={items[0].resolvedColor}
            className={`insights-pie-slice ${canSelect ? "interactive" : ""} ${
              selectedKey === `${tabKey}:${items[0].name}` ? "active" : ""
            }`}
            role={canSelect ? "button" : undefined}
            tabIndex={canSelect ? 0 : undefined}
            aria-pressed={
              canSelect ? selectedKey === `${tabKey}:${items[0].name}` : undefined
            }
            onClick={canSelect ? () => onSelectItem(items[0]) : undefined}
            onKeyDown={
              canSelect
                ? (event) => handleSvgKeyDown(event, () => onSelectItem(items[0]))
                : undefined
            }
          >
            <title>{buildTooltip(items[0])}</title>
          </circle>
        ) : (
          segments.map(({ item, startAngle, endAngle, midAngle }) => {
            const isActive = selectedKey === `${tabKey}:${item.name}`;
            const offsetDistance = isActive ? 8 : 0;
            const offsetX = Math.cos(toRadians(midAngle)) * offsetDistance;
            const offsetY = Math.sin(toRadians(midAngle)) * offsetDistance;

            return (
              <path
                key={item.name}
                d={describePieSlice(110, 110, 96, startAngle, endAngle)}
                fill={item.resolvedColor}
                transform={`translate(${offsetX} ${offsetY})`}
                className={`insights-pie-slice ${
                  canSelect ? "interactive" : ""
                } ${isActive ? "active" : ""}`}
                role={canSelect ? "button" : undefined}
                tabIndex={canSelect ? 0 : undefined}
                aria-pressed={canSelect ? isActive : undefined}
                onClick={canSelect ? () => onSelectItem(item) : undefined}
                onKeyDown={
                  canSelect
                    ? (event) => handleSvgKeyDown(event, () => onSelectItem(item))
                    : undefined
                }
              >
                <title>{buildTooltip(item)}</title>
              </path>
            );
          })
        )}
      </svg>

      <div className="insights-pie-center">
        <strong>{formatCurrency(total)}</strong>
        <span>{items.length} slices</span>
      </div>
    </div>
  );
}

export default function DashboardInsights({
  analytics,
  hasActiveFilters,
  selectedType,
  activeItemKey,
  onSelectItem,
}) {
  const [activeTab, setActiveTab] = useState("debit");

  useEffect(() => {
    if (selectedType === "debit" || selectedType === "credit") {
      setActiveTab(selectedType);
    }
  }, [selectedType]);

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
  const canSelectInsights = activeTab !== "labels" && typeof onSelectItem === "function";

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
            <>
              <div className="insights-visual-layout">
                {activeTab === "labels" ? (
                  <DonutChart items={currentSection.items} total={currentSection.total} />
                ) : (
                  <PieChart
                    items={currentSection.items}
                    total={currentSection.total}
                    tabKey={activeTab}
                    selectedKey={activeItemKey}
                    canSelect={canSelectInsights}
                    onSelectItem={(item) => onSelectItem(activeTab, item)}
                  />
                )}

                <div className="insights-legend">
                  {currentSection.items.map((item) => {
                    const isActive = activeItemKey === `${activeTab}:${item.name}`;
                    const content = (
                      <>
                        <span
                          className="insights-legend-swatch"
                          style={{ backgroundColor: item.resolvedColor }}
                        />
                        <div>
                          <strong>{item.name}</strong>
                          <span>
                            {formatPercentage(item.percentage)} • {formatCurrency(item.amount)}
                          </span>
                        </div>
                      </>
                    );

                    return canSelectInsights ? (
                      <button
                        key={item.name}
                        type="button"
                        className={`insights-legend-item interactive ${
                          isActive ? "active" : ""
                        }`}
                        title={buildTooltip(item)}
                        onClick={() => onSelectItem(activeTab, item)}
                      >
                        {content}
                      </button>
                    ) : (
                      <div
                        key={item.name}
                        className="insights-legend-item"
                        title={buildTooltip(item)}
                      >
                        {content}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="insights-click-hint">
                {currentTab.interactionHint}
              </div>
            </>
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
                  {currentSection.items.map((item) => {
                    const isActive = activeItemKey === `${activeTab}:${item.name}`;
                    const rowClassName = canSelectInsights
                      ? `insights-clickable-row ${isActive ? "active" : ""}`
                      : "";

                    return (
                      <tr
                        key={item.name}
                        className={rowClassName}
                        title={buildTooltip(item)}
                        onClick={
                          canSelectInsights
                            ? () => onSelectItem(activeTab, item)
                            : undefined
                        }
                      >
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
                    );
                  })}
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
