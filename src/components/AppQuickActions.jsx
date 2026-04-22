import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./AppQuickActions.css";

const DASHBOARD_PATHS = new Set(["/", "/expense-tracker"]);

export default function AppQuickActions({
  visible,
  showThemeToggle,
  isDarkMode,
  onToggleDarkMode,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!visible) {
    return null;
  }

  const onDashboard = DASHBOARD_PATHS.has(location.pathname);

  return (
    <div className="app-quick-actions" aria-label="Quick actions">
      <button
        type="button"
        className={`app-quick-action ${onDashboard ? "active" : ""}`}
        onClick={() => navigate("/expense-tracker")}
        disabled={onDashboard}
        aria-current={onDashboard ? "page" : undefined}
      >
        <i className="bi bi-speedometer2" aria-hidden="true" />
        <span>Dashboard</span>
      </button>

      {showThemeToggle ? (
        <button
          type="button"
          className="app-quick-action"
          onClick={onToggleDarkMode}
          aria-pressed={isDarkMode}
        >
          <i
            className={`bi ${
              isDarkMode ? "bi-brightness-high-fill" : "bi-moon-stars-fill"
            }`}
            aria-hidden="true"
          />
          <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
        </button>
      ) : null}
    </div>
  );
}
