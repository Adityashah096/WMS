import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import StockDashboardView from "../components/StockDashboardView";
import { getWarehouseDisplayName } from "../constants/warehouses";
import API_URL from "../config/api";

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const locationId = localStorage.getItem("location_id");
  const role = localStorage.getItem("role");
  const name = localStorage.getItem("name");
  const email = localStorage.getItem("email");
  const locationName =
    role === "ADMIN" ? "ALL LOCATIONS" : getWarehouseDisplayName({ email, locationId });

  const fetchDashboard = useCallback(async () => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setLoading(true);
      setError("");
      const url =
        role === "ADMIN"
          ? `${API_URL}/scan/export`
          : `${API_URL}/scan/export?location_id=${locationId}`;
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(url, { headers });
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Dashboard fetch error", err);
      if (err.response?.status === 401) {
        setError("Unauthorized. Please log in again.");
        window.location.href = "/login";
      } else {
        setError(err.response?.data?.message || "Failed to load dashboard data");
      }
    } finally {
      setLoading(false);
    }
  }, [locationId, role, token]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleFilterClick = (product = "ALL", color = "ALL", condition = "ALL", status = "ALL") => {
    navigate("/inventory", { state: { product, color, condition, status } });
  };

  return (
    <StockDashboardView
      data={data}
      loading={loading}
      error={error}
      heroTitle={`WELCOME TO ${locationName}`}
      heroDescription="Live warehouse numbers from the database, grouped by status, product, condition and color."
      badgeLabel={locationName}
      secondaryBadgeLabel={`Logged in as ${name}`}
      onFilterClick={handleFilterClick}
      isAdmin={role === "ADMIN"}
    />
  );
}
