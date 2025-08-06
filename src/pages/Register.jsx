import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/api";
import "./Register.css";

const Register = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
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

    try {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setMessage("Registration successful! Redirecting to login...");
        setForm({ name: "", email: "", password: "" });
        setTimeout(() => navigate("/login"), 2000);
      } else {
        const text = await res.text();
        setError(text || "Failed to register");
      }
    } catch {
      setError("Network error");
    }
  };

  return (
    <div>
      <section
        className="vh-100 bg-image"
        style={{
          backgroundImage:
            "url('https://mdbcdn.b-cdn.net/img/Photos/new-templates/search-box/img4.webp')",
        }}
      >
        <div className="mask d-flex align-items-center h-100 gradient-custom-3">
          <div className="container h-100">
            <div className="row d-flex justify-content-center align-items-center h-100">
              <div className="col-12 col-md-9 col-lg-7 col-xl-6">
                <div className="card" style={{ borderRadius: "15px" }}>
                  <div className="card-body p-5">
                    <h2 className="text-uppercase text-center mb-5">
                      Create an account
                    </h2>

                    <form onSubmit={handleSubmit} noValidate>
                      <div data-mdb-input-init className="form-outline mb-4">
                        <input
                          type="text"
                          id="name"
                          className="form-control form-control-lg"
                          value={form.name}
                          onChange={handleChange}
                          required
                        />
                        <label className="form-label" htmlFor="name">
                          Your Name
                        </label>
                      </div>

                      <div data-mdb-input-init className="form-outline mb-4">
                        <input
                          type="email"
                          id="email"
                          className="form-control form-control-lg"
                          value={form.email}
                          onChange={handleChange}
                          required
                        />
                        <label className="form-label" htmlFor="email">
                          Your Email
                        </label>
                      </div>

                      <div data-mdb-input-init className="form-outline mb-4">
                        <input
                          type="password"
                          id="password"
                          className="form-control form-control-lg"
                          value={form.password}
                          onChange={handleChange}
                          required
                        />
                        <label className="form-label" htmlFor="password">
                          Password
                        </label>
                      </div>

                      {message && (
                        <p className="text-success text-center">{message}</p>
                      )}
                      {error && (
                        <p className="text-danger text-center">{error}</p>
                      )}

                      <div className="d-flex justify-content-center">
                        <button
                          type="submit"
                          data-mdb-button-init
                          data-mdb-ripple-init
                          className="btn btn-success btn-block btn-lg gradient-custom-4 text-body"
                        >
                          Register
                        </button>
                      </div>

                      <p className="text-center text-muted mt-5 mb-0">
                        Have already an account?{" "}
                        <a href="/login" className="fw-bold text-body">
                          <u>Login here</u>
                        </a>
                      </p>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Register;
