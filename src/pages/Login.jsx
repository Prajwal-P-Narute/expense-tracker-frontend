import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/api";
import logo from "../assets/expenseimg.png";
import { toast } from "react-toastify";
import "./Auth.css";

const Login = ({ setToken }) => {
  const [loading, setLoading] = useState(false);  
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/expense-tracker");
    }

    // Check if user was redirected due to session expiration
    const sessionExpired = sessionStorage.getItem("sessionExpired");
    if (sessionExpired === "true") {
      toast.warning("Your session has expired. Please login again.", {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      // Clear the flag
      sessionStorage.removeItem("sessionExpired");
    }
  }, [navigate]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("userName", data.name);
        setToken(data.token);
        
        // Show success toast
        toast.success("Login successful! Redirecting to dashboard...", {
          position: "top-center",
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        // Redirect after short delay
        setTimeout(() => {
          navigate("/expense-tracker");
        }, 1000);
      } else {
        setError("Invalid email or password");
        toast.error("Invalid email or password", {
          position: "top-center",
          autoClose: 3000,
        });
      }
    } catch (err) {
      setError("Network error, please try again");
      toast.error("Network error, please try again", {
        position: "top-center",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-brand">
          <div className="auth-brand-row">
            <img src={logo} alt="Expense Tracker logo" className="auth-logo" />
            <div>
              <span className="auth-kicker">Expense Tracker</span>
              <h1 className="auth-title">Welcome back</h1>
            </div>
          </div>
          <p className="auth-subtitle">
            Sign in to see your dashboard, open your transactions workspace, and keep your money
            flow in one place.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="email" className="auth-field">
            Email address
            <input
              type="email"
              id="email"
              className="auth-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label htmlFor="password" className="auth-field">
            Password
            <input
              type="password"
              id="password"
              className="auth-input"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button className="auth-action" type="submit" disabled={loading}>
            {loading ? (
              <span className="btn-with-spinner">
                <span className="btn-spinner" aria-hidden="true" />
                Signing in...
              </span>
            ) : (
              "Login"
            )}
          </button>

          <div className="auth-links">
            <a href="/reset-password" className="auth-link">
              Forgot password?
            </a>
            <span>
              New here?{" "}
              <a href="/register" className="auth-link">
                Create account
              </a>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
