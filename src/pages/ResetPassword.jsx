import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/api";

export default function ResetPassword() {
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {

      const res = await api.post("/auth/reset-password", { email, otp, password }, { skipAuth: true });
      setMessage(res.data.message);
      navigate("/login");
    } catch (err) {
      setMessage(err.response?.data?.message || "Error resetting password");
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "100vh" }}
    >
      <div className="card shadow-sm" style={{ width: "100%", maxWidth: "400px" }}>
        <div className="card-body p-4">
          <h2 className="card-title text-center mb-4">Reset Password</h2>

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
              <label htmlFor="otp" className="form-label">
                OTP
              </label>
              <input
                type="text"
                className="form-control"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                New Password
              </label>
              <input
                type="password"
                className="form-control"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>

            <button type="submit" className="btn btn-primary w-100">
              Reset Password
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
