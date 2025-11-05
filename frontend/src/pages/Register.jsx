import React, { useState } from "react";
import axios from "axios";
import "../styles/Auth.css"; // Reuse same styling as Auth
import { useNavigate } from "react-router-dom";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "buyer",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  // 🔐 Validate strong password
  const validatePassword = (password) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!validatePassword(formData.password)) {
      setError(
        "Password must include uppercase, lowercase, number, special character and be at least 8 characters long."
      );
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, formData);
      setSuccess("Registration successful! Redirecting to login...");
      setTimeout(() => navigate("/"), 1500); // Redirect to login
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Registration failed!");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Sign Up</h2>
        {error && <p className="error">{error}</p>}
        {success && <p style={{ color: "lightgreen" }}>{success}</p>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />

          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="role"
                value="artist"
                checked={formData.role === "artist"}
                onChange={handleChange}
              />
              artist
            </label>
            <label>
              <input
                type="radio"
                name="role"
                value="buyer"
                checked={formData.role === "buyer"}
                onChange={handleChange}
              />
              buyer
            </label>
            <label>
              <input
                type="radio"
                name="role"
                value="moderator"
                checked={formData.role === "moderator"}
                onChange={handleChange}
              />
              moderator
            </label>
          </div>

          <button type="submit">Register</button>
        </form>

        <p className="toggle-text">
          Already have an account?{" "}
          <span className="toggle-link" onClick={() => navigate("/")}>
            Login
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register;
