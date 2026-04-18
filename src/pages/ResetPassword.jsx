import React, { useState, useRef } from "react";
import {  useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/api";
import axios from "axios";
import { toast } from "react-toastify";
import logo from "../assets/expenseimg.png";
import "./Auth.css";

const ResetPassword = () => {
  const navigate = useNavigate();
  const inputRef = useRef([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [isOtpSubmitted, setIsOtpSubmitted] = useState(false);

  const handleChange = (e, index) => {
    const value = e.target.value.replace(/\D/, "");
    e.target.value = value;
    if (value && index < 5) {
      inputRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !e.target.value && index > 0) {
      inputRef.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").slice(0, 6).split("");
    paste.forEach((char, index) => {
      if (inputRef.current[index]) {
        inputRef.current[index].value = char;
      }
    });
    const next = paste.length < 6 ? paste.length : 5;
    inputRef.current[next].focus();
  };

  const sendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/send-reset-otp?email=${email}`);
      if (res.status === 200) {
        toast.success("OTP sent to your email address");
        setIsEmailSent(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = () => {
    const enteredOtp = inputRef.current.map((input) => input.value).join("");
    if (enteredOtp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }
    setOtp(enteredOtp);
    setIsOtpSubmitted(true);
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/reset-password`, {
        email,
        otp,
        newPassword,
      });
      if (res.status === 200) {
        toast.success("Password reset successful. Please login.");
        navigate("/login");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      {!isEmailSent && (
        <div className="auth-panel">
          <div className="auth-brand">
            <div className="auth-brand-row">
              <img src={logo} alt="Expense Tracker logo" className="auth-logo" />
              <div>
                <span className="auth-kicker">Security</span>
                <h1 className="auth-title">Reset password</h1>
              </div>
            </div>
            <p className="auth-subtitle">
              Enter your registered email and we’ll send a one-time code to verify the request.
            </p>
          </div>
          <form className="auth-form" onSubmit={sendOtp}>
            <label className="auth-field" htmlFor="reset-email">
              Email address
              <input
                id="reset-email"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                required
              />
            </label>
            <button type="submit" className="auth-action" disabled={loading}>
              {loading ? (
                <span className="btn-with-spinner">
                  <span className="btn-spinner" aria-hidden="true" />
                  Sending OTP...
                </span>
              ) : (
                "Send OTP"
              )}
            </button>
          </form>
        </div>
      )}

      {isEmailSent && !isOtpSubmitted && (
        <div className="auth-panel">
          <div className="auth-brand">
            <span className="auth-step">Step 2 of 3</span>
            <h1 className="auth-title">Verify OTP</h1>
            <p className="auth-subtitle">Check your email and enter the 6-digit code below.</p>
          </div>
          <div className="auth-form">
            <div className="auth-otp-grid">
              {[...Array(6)].map((_, i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  className="auth-otp-input"
                  ref={(el) => (inputRef.current[i] = el)}
                  onChange={(e) => handleChange(e, i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  onPaste={handlePaste}
                />
              ))}
            </div>
            <button className="auth-action" disabled={loading} onClick={verifyOtp}>
              {loading ? (
                <span className="btn-with-spinner">
                  <span className="btn-spinner" aria-hidden="true" />
                  Verifying...
                </span>
              ) : (
                "Verify"
              )}
            </button>
          </div>
        </div>
      )}

      {isOtpSubmitted && (
        <div className="auth-panel">
          <div className="auth-brand">
            <span className="auth-step">Step 3 of 3</span>
            <h1 className="auth-title">Set new password</h1>
            <p className="auth-subtitle">Choose a fresh password and jump back into your account.</p>
          </div>
          <form className="auth-form" onSubmit={resetPassword}>
            <label className="auth-field" htmlFor="newPassword">
              New password
              <input
                id="newPassword"
                type="password"
                className="auth-input"
                placeholder="Enter your new password"
                onChange={(e) => setNewPassword(e.target.value)}
                value={newPassword}
                required
              />
            </label>
            <button type="submit" className="auth-action" disabled={loading}>
              {loading ? (
                <span className="btn-with-spinner">
                  <span className="btn-spinner" aria-hidden="true" />
                  Resetting...
                </span>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ResetPassword;
