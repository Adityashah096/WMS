import { useState } from "react";
import axios from "axios";
import API_URL from "../config/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("user_id", res.data.user.user_id);
      localStorage.setItem("name", res.data.user.name);
      localStorage.setItem("email", res.data.user.email);
      localStorage.setItem("role", res.data.user.role);
      localStorage.setItem("location_id", res.data.user.location_id || 1);
      window.location.href = "/";
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Invalid email or password");
      } else {
        setError("Login failed. Please try again.");
      }
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: "#f3f4f6",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        backgroundColor: "white", padding: "40px", borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px",
      }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ color: "#2563eb", fontSize: "28px", fontWeight: "bold", margin: 0 }}>WMS</h1>
          <p style={{ color: "#6b7280", marginTop: "5px" }}>Warehouse Management System</p>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", color: "#374151" }}>Email</label>
          <input
            type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Enter your email"
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "16px", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", color: "#374151" }}>Password</label>
          <input
            type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Enter your password"
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "16px", boxSizing: "border-box" }}
          />
        </div>

        {error && (
          <div style={{ backgroundColor: "#fee2e2", border: "1px solid #dc2626", color: "#dc2626", padding: "10px", borderRadius: "6px", marginBottom: "15px", fontSize: "14px" }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin} disabled={loading}
          style={{ width: "100%", padding: "12px", backgroundColor: loading ? "#93c5fd" : "#2563eb", color: "white", border: "none", borderRadius: "6px", fontSize: "16px", fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#f0f9ff", borderRadius: "6px", fontSize: "13px", color: "#0369a1" }}>
          <strong>Login credentials:</strong><br />
          Admin: admin@robottracking.com / admin@123<br />
          Palai: palai@wms.com / Wms@1234<br />
          Takshashela: takshashela@wms.com / Wms@1234<br />
          AAJ: aaj@wms.com / Wms@1234<br />
          Repair: repair@wms.com / Wms@1234
        </div>
      </div>
    </div>
  );
}
