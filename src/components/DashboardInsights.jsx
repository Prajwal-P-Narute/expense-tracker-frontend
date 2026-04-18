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
    centerLabel: "Category share",
    tableLabel: "Category",
    emptyMessage: "No debit transactions match the current filters.",
    interactionHint: "Tap a category bar or breakdown row to open matching debit transactions.",
  },
  credit: {
    label: "Credit",
    title: "Credit Categories",
    subtitle: "Spot your strongest income sources and jump straight to those entries.",
    totalLabel: "Credit total",
    centerLabel: "Category share",
    tableLabel: "Category",
    emptyMessage: "No credit transactions match the current filters.",
    interactionHint: "Tap a category bar or breakdown row to open matching credit transactions.",
  },
  labels: {
    label: "Labels",
    title: "Label Distribution",
    subtitle: "Compare how your filtered transactions are distributed across labels.",
    totalLabel: "Label total",
    centerLabel: "Label share",
    tableLabel: "Label",
    emptyMessage: "No labeled data matches the current filters.",
    interactionHint: "Tap a label segment, legend item, or breakdown row to open matching transactions.",
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

function PieChart({
  items,
  total,
  selectedKey,
  tabKey,
  onSelectItem,
  canSelectItem,
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
          (() => {
            const isInteractive = canSelectItem(items[0]);
            const itemKey = items[0].id || items[0].name;

            return (
              <circle
                cx="110"
                cy="110"
                r="96"
                fill={items[0].resolvedColor}
                className={`insights-pie-slice ${isInteractive ? "interactive" : ""} ${
                  selectedKey === `${tabKey}:${itemKey}` ? "active" : ""
                }`}
                role={isInteractive ? "button" : undefined}
                tabIndex={isInteractive ? 0 : undefined}
                aria-pressed={
                  isInteractive ? selectedKey === `${tabKey}:${itemKey}` : undefined
                }
                onClick={isInteractive ? () => onSelectItem(items[0]) : undefined}
                onKeyDown={
                  isInteractive
                    ? (event) => handleSvgKeyDown(event, () => onSelectItem(items[0]))
                    : undefined
                }
              >
                <title>{buildTooltip(items[0])}</title>
              </circle>
            );
          })()
        ) : (
          segments.map(({ item, startAngle, endAngle, midAngle }) => {
            const itemKey = item.id || item.name;
            const isActive = selectedKey === `${tabKey}:${itemKey}`;
            const isInteractive = canSelectItem(item);
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
                  isInteractive ? "interactive" : ""
                } ${isActive ? "active" : ""}`}
                role={isInteractive ? "button" : undefined}
                tabIndex={isInteractive ? 0 : undefined}
                aria-pressed={isInteractive ? isActive : undefined}
                onClick={isInteractive ? () => onSelectItem(item) : undefined}
                onKeyDown={
                  isInteractive
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
        <span>{TAB_CONFIG[tabKey].centerLabel}</span>
      </div>
    </div>
  );
}

function HorizontalBarChart({
  items,
  selectedKey,
  tabKey,
  onSelectItem,
  canSelectItem,
}) {
  return (
    <div
      className="insights-bar-chart"
      role="list"
      aria-label={`${TAB_CONFIG[tabKey].label} category horizontal bar chart`}
    >
      {items.map((item) => {
        const itemKey = item.id || item.name;
        const isActive = selectedKey === `${tabKey}:${itemKey}`;
        const isInteractive = canSelectItem(item);
        const minWidth = item.percentage > 0 ? 8 : 0;
        const barWidth = Math.max(Math.min(item.percentage, 100), minWidth);
        const content = (
          <>
            <div className="insights-bar-head">
              <div className="insights-bar-label">
                <span
                  className="insights-name-dot"
                  style={{ backgroundColor: item.resolvedColor }}
                />
                <strong>{item.name}</strong>
              </div>
              <div className="insights-bar-metrics">
                <span>{formatCurrency(item.amount)}</span>
                <strong>{formatPercentage(item.percentage)}</strong>
              </div>
            </div>

            <div className="insights-bar-track">
              <div
                className="insights-bar-fill"
                style={{
                  width: `${barWidth}%`,
                  background: `linear-gradient(90deg, ${item.resolvedColor}, ${item.resolvedColor}cc)`,
                }}
              />
            </div>
          </>
        );

        if (isInteractive) {
          return (
            <button
              key={item.name}
              type="button"
              className={`insights-bar-item interactive ${isActive ? "active" : ""}`}
              title={buildTooltip(item)}
              aria-pressed={isActive}
              onClick={() => onSelectItem(item)}
            >
              {content}
            </button>
          );
        }

        return (
          <div
            key={item.name}
            className="insights-bar-item"
            title={buildTooltip(item)}
          >
            {content}
          </div>
        );
      })}
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
  const canSelectInsights = typeof onSelectItem === "function";
  const canSelectItem = (item) =>
    canSelectInsights && (activeTab !== "labels" || Boolean(item?.id));
  const usesBarChart = activeTab === "debit" || activeTab === "credit";

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
              {usesBarChart ? (
                <HorizontalBarChart
                  items={currentSection.items}
                  tabKey={activeTab}
                  selectedKey={activeItemKey}
                  canSelectItem={canSelectItem}
                  onSelectItem={(item) => onSelectItem(activeTab, item)}
                />
              ) : (
                <div className="insights-visual-layout">
                  <PieChart
                    items={currentSection.items}
                    total={currentSection.total}
                    tabKey={activeTab}
                    selectedKey={activeItemKey}
                    canSelectItem={canSelectItem}
                    onSelectItem={(item) => onSelectItem(activeTab, item)}
                  />

                  <div className="insights-legend">
                    {currentSection.items.map((item) => {
                      const itemKey = item.id || item.name;
                      const isActive = activeItemKey === `${activeTab}:${itemKey}`;
                      const isInteractive = canSelectItem(item);
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

                      return isInteractive ? (
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
              )}

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
                    const itemKey = item.id || item.name;
                    const isActive = activeItemKey === `${activeTab}:${itemKey}`;
                    const isInteractive = canSelectItem(item);
                    const rowClassName = isInteractive
                      ? `insights-clickable-row ${isActive ? "active" : ""}`
                      : "";

                    return (
                      <tr
                        key={item.name}
                        className={rowClassName}
                        title={buildTooltip(item)}
                        onClick={
                          isInteractive
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
