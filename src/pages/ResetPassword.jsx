import React, { useState, useRef } from "react";
import {  useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/api";
import axios from "axios";
import { toast } from "react-toastify";

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
    <div
      className="d-flex align-items-center justify-content-center vh-100"
      style={{ background: "linear-gradient(90deg, #6a5af9, #8268f9)" }}
    >
      {/* Step 1: Email Form */}
      {!isEmailSent && (
        <div className="rounded-4 p-5 bg-white text-center" style={{ width: "100%", maxWidth: "400px" }}>
          <h4>Reset Password</h4>
          <p>Enter your registered email address</p>
          <form onSubmit={sendOtp}>
            <input
              type="email"
              className="form-control mb-3"
              placeholder="Enter email address"
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              required
            />
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        </div>
      )}

      {/* Step 2: OTP Form */}
      {isEmailSent && !isOtpSubmitted && (
        <div className="p-5 rounded-4 bg-white" style={{ width: "100%", maxWidth: "400px" }}>
          <h4 className="text-center">Verify OTP</h4>
          <p className="text-center">Check your email for the OTP code</p>
          <div className="d-flex justify-content-center gap-2 mb-3">
            {[...Array(6)].map((_, i) => (
              <input
                key={i}
                type="text"
                maxLength={1}
                className="form-control text-center fs-4"
                style={{ width: "40px" }}
                ref={(el) => (inputRef.current[i] = el)}
                onChange={(e) => handleChange(e, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                onPaste={handlePaste}
              />
            ))}
          </div>
          <button className="btn btn-primary w-100" disabled={loading} onClick={verifyOtp}>
            {loading ? "Verifying..." : "Verify"}
          </button>
        </div>
      )}

      {/* Step 3: New Password Form */}
      {isOtpSubmitted && (
        <div className="rounded-4 p-5 bg-white" style={{ width: "100%", maxWidth: "400px" }}>
          <h4>New Password</h4>
          <p>Enter your new password</p>
          <form onSubmit={resetPassword}>
            <input
              type="password"
              className="form-control mb-3"
              placeholder="********"
              onChange={(e) => setNewPassword(e.target.value)}
              value={newPassword}
              required
            />
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ResetPassword;
