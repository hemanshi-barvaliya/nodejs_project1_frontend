import { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [image, setImage] = useState(null); // ✅ image file state
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.password) {
      setMessage("All fields are required");
      return;
    }

    try {
      const formData = new FormData(); // ✅ use FormData for text + file
      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("password", form.password);
      if (image) formData.append("image", image); // ✅ include image if selected

      const res = await api.post("/auth/register", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        skipAuth: true,
      });

      setMessage(res.data.message);
      navigate("/verify-otp", { state: { email: form.email } });
    } catch (err) {
      console.error("Register error:", err);
      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Error registering";
      setMessage(backendMessage);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "100vh" }}
    >
      <div className="card shadow-sm" style={{ width: "100%", maxWidth: "400px" }}>
        <div className="card-body p-4">
          <h2 className="card-title text-center mb-4">Register</h2>

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
            {/* Name */}
            <div className="mb-3">
              <label htmlFor="name" className="form-label">
                Name
              </label>
              <input
                type="text"
                className="form-control"
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter your name"
              />
            </div>

            {/* Email */}
            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                type="email"
                className="form-control"
                id="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email"
              />
            </div>

            {/* Password */}
            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                type="password"
                className="form-control"
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
              />
            </div>

            {/* ✅ Image Upload */}
            <div className="mb-3">
              <label htmlFor="image" className="form-label">
                Profile Image
              </label>
              <input
                type="file"
                className="form-control"
                id="image"
                name="image"
                accept="image/*"
                onChange={(e) => setImage(e.target.files[0])}
              />
              {image && (
                <div className="mt-2 text-center">
                  <img
                    src={URL.createObjectURL(image)}
                    alt="preview"
                    style={{
                      width: "100px",
                      height: "100px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid #ccc",
                    }}
                  />
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary w-100">
              Register
            </button>
          </form>

          <p className="text-center mt-3">
            Already have an account? <a href="/login">Login</a>
          </p>
        </div>
      </div>
    </div>
  );
}
