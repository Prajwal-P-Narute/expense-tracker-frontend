import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/api";
import { toast } from "react-toastify";

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    openingBalance: "",
  });
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
        setForm({ name: "", email: "", password: "" });
        setTimeout(() => navigate("/login"), 2000);
      } else {
        const text = await res.text();
        setError(text || "Failed to register");
        toast.error(text || "Failed to register");
      }
    } catch {
      setError("Network error");
      toast.error("Network error, please try again");
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center vh-100"
      style={{ background: "linear-gradient(90deg, #6a5af9, #8268f9)" }}
    >
      <div
        className="rounded-4 p-5 bg-white"
        style={{ width: "100%", maxWidth: "400px" }}
      >
        <h4 className="text-center mb-4">Create an Account</h4>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            id="name"
            className="form-control mb-3"
            placeholder="Your Name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <input
            type="email"
            id="email"
            className="form-control mb-3"
            placeholder="Your Email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            id="password"
            className="form-control mb-3"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <input
            type="number"
            id="openingBalance" 
            className="form-control mb-3"
            placeholder="Opening Balance (optional)"
            value={form.openingBalance || ""}
            onChange={handleChange}
          />

          {message && <p className="text-success text-center">{message}</p>}
          {error && <p className="text-danger text-center">{error}</p>}

          <button type="submit" className="btn btn-primary w-100 mb-3">
            Register
          </button>

          <p className="text-center text-muted">
            Have an account?{" "}
            <a href="/login" className="fw-bold">
              Login here
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
