import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import Register from "./pages/Register";
import VerifyOtp from "./pages/VerifyOtp";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import CallManager from "./pages/CallManager";
import api from "./api/api";
import { initSocket } from "./socket";

function App() {
  const callManagerRef = useRef(null);
  const [me, setMe] = useState(null);
  const [token, setToken] = useState(sessionStorage.getItem("token"));

  // 🔹 Watch for token changes (login or OTP verification)
  useEffect(() => {
    const handleStorageChange = () => {
      setToken(sessionStorage.getItem("token"));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // 🔹 Load user profile when token exists
  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      try {
        const res = await api.get("/auth/profile");
        setMe(res.data);
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    };
    loadProfile();
  }, [token]);

  // 🔹 Initialize socket connection only when token exists
  useEffect(() => {
    if (token) {
      initSocket();
    }
  }, [token]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/profile"
          element={<Profile callManagerRef={callManagerRef} me={me} />}
        />
        <Route
          path="/chat/:roomId"
          element={<Chat callManagerRef={callManagerRef} me={me} />}
        />
      </Routes>

      {me && <CallManager ref={callManagerRef} me={me} />}
    </Router>
  );
}

export default App;
