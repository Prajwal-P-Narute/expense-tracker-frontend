import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/api";
import "./Login.css";
import logo from "../assets/expenseimg.png"; 

const Login = ({setToken}) => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/expense-tracker");
    }
  }, [navigate]); // ✅ Dependency added

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const token = await res.text();
        localStorage.setItem("token", token);
        setToken(token);
        navigate("/expense-tracker");
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      setError("Network error, please try again");
    }
  };

  return (
    <section className="vh-100" >
      <div className="container-fluid">
        <div className="row">
          <div className="col-sm-6 text-black">
            <div className="px-5 ms-xl-4">
              <i
                className="fas fa-crow fa-2x me-3 pt-5 mt-xl-4"
                style={{ color: "#709085" }}
              ></i>
              <img src={logo} alt="Logo" className="h1 fw-bold mb-0" style={{ height: "200px" }} />

            </div>

            <div className="d-flex align-items-center h-custom-2 px-5 ms-xl-4  pt-5 pt-xl-0 mt-xl-n">
              <form onSubmit={handleSubmit} style={{ width: "23rem" }} noValidate>
                <h3 className="fw-normal mb-3 pb-3" style={{ letterSpacing: "1px" }}>
                  Log in
                </h3>

                <div className="form-outline mb-4">
                  <input
                    type="email"
                    id="email"
                    className="form-control form-control-lg"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                  <label className="form-label" htmlFor="email">
                    Email address
                  </label>
                </div>

                <div className="form-outline mb-4">
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

                {error && (
                  <div className="text-danger mb-3" role="alert">
                    {error}
                  </div>
                )}

                <div className="pt-1 mb-4">
                  <button className="btn btn-info btn-lg btn-block" type="submit">
                    Login
                  </button>
                </div>

                <p className="small mb-5 pb-lg-2">
                  <a className="text-muted" href="#!">
                    Forgot password?
                  </a>
                </p>
                <p>
                  Don’t have an account?{" "}
                  <a href="/register" className="link-info">
                    Register here
                  </a>
                </p>
              </form>
            </div>
          </div>

          {/* <div className="col-sm-6 px-0 d-none d-sm-block">
            <img
              src="https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-login-form/img3.webp"
              alt="Login"
              className="w-100 vh-100"
              style={{ objectFit: "cover", objectPosition: "left" }}
            />
          </div> */}
        </div>
      </div>
    </section>
  );
};

export default Login;
