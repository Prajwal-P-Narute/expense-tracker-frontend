import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/api";
import { toast } from "react-toastify";
import logo from "../assets/expenseimg.png";
import "./Auth.css";

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    openingBalance: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true); //  disable button
    toast.info("Registering..."); //  show loading toast

    const payload = {
    ...form,
    openingBalance: form.openingBalance ? Number(form.openingBalance) : 0,
  };

    try {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage("Registration successful! Redirecting to login...");
        toast.success("Registration successful! Redirecting to login...");
        setForm({ name: "", email: "", password: "", openingBalance: "" });
        setTimeout(() => navigate("/login"), 2000);
      } else {
        const text = await res.text();
        setError(text || "Failed to register");
        toast.error(text || "Failed to register");
      }
    } catch {
      setError("Network error");
      toast.error("Network error, please try again");
    }finally {
      setLoading(false); // ✅ enable button again
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-brand">
          <div className="auth-brand-row">
            <img src={logo} alt="Expense Tracker logo" className="auth-logo" />
            <div>
              <span className="auth-kicker">Get Started</span>
              <h1 className="auth-title">Create your account</h1>
            </div>
          </div>
          <p className="auth-subtitle">
            Start with your opening balance, track daily movement, and keep the dashboard ready
            from day one.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="name" className="auth-field">
            Full name
            <input
              type="text"
              id="name"
              className="auth-input"
              placeholder="Your name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>

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
              placeholder="Create a password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          <label htmlFor="openingBalance" className="auth-field">
            Opening balance
            <input
              type="number"
              id="openingBalance"
              className="auth-input"
              placeholder="Optional"
              value={form.openingBalance || ""}
              onChange={handleChange}
            />
          </label>

          {message && <div className="auth-success">{message}</div>}
          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-action" disabled={loading}>
            {loading ? (
              <span className="btn-with-spinner">
                <span className="btn-spinner" aria-hidden="true" />
                Creating account...
              </span>
            ) : (
              "Register"
            )}
          </button>

          <div className="auth-meta">
            <span>Already registered?</span>
            <a href="/login" className="auth-link">
              Login here
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
