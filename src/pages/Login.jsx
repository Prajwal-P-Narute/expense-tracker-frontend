import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/api";
import logo from "../assets/expenseimg.png"; 
import { toast } from "react-toastify";

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
    <div
      className="d-flex align-items-center justify-content-center vh-100"
      style={{ background: "linear-gradient(90deg, #6a5af9, #8268f9)" }}
    >
      <div className="rounded-4 p-5 bg-white text-center" style={{ width: "100%", maxWidth: "400px" }}>
        <img
          src={logo}
          alt="Logo"
          style={{ height: "100px", marginBottom: "20px" }}
        />
        <h4 className="mb-4">Log in</h4>

        <form onSubmit={handleSubmit} noValidate>
          <input
            type="email"
            id="email"
            className="form-control mb-3"
            placeholder="Email address"
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

          {error && (
            <div className="text-danger mb-3" role="alert">
              {error}
            </div>
          )}

          <button className="btn btn-primary w-100 mb-3" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Please wait...
              </>
            ) : (
              "Login"
            )}
          </button>

          <p className="small mb-3">  
            <a href="/reset-password" className="text-muted">
              Forgot password?
            </a>
          </p>
          <p>
            Don't have an account?{" "}
            <a href="/register" className="link-info">
              Register here
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;