import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/forgot-password", { email }, { skipAuth: true });
      setMessage("OTP sent to your email");
      navigate("/reset-password", { state: { email } });
    } catch (err) {
      setMessage(err.response?.data?.message || "Error sending OTP");
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "100vh" }}
    >
      <div className="card shadow-sm" style={{ width: "100%", maxWidth: "400px" }}>
        <div className="card-body p-4">
          <h2 className="card-title text-center mb-4">Forgot Password</h2>

          {message && (
            <div
              className={`alert ${
                message.toLowerCase().includes("success")
                  ? "alert-success"
                  : "alert-danger"
              }`}
              role="alert"
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                type="email"
                className="form-control"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>

            <button type="submit" className="btn btn-primary w-100">
              Send OTP
            </button>
          </form>

          <p className="text-center mt-3">
            Remembered your password? <a href="/login">Login</a>
          </p>
        </div>
      </div>
    </div>
  );
}
