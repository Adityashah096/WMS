import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import StockDashboardView from "../components/StockDashboardView";
import API_URL from "../config/api";

export default function DemoSample() {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const name = localStorage.getItem("name");

  const fetchDemoUnits = useCallback(async () => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setLoading(true);
      setError("");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const res = await axios.get(
        `${API_URL}/requests/demo-units`,
        { headers }
      );

      const units = Array.isArray(res.data) ? res.data : [];

      const dashboardData = [];

      units.forEach((unit) => {
        dashboardData.push({
          product: unit.bot_name || "Unknown",
          color: unit.color || "No Color",

          // Required by StockDashboardView
          condition: "NEW",
          current_status: "AVAILABLE",

          // Extra fields retained
          request_id: unit.request_id,
          serial_number: unit.serial_number,
          recipient_name: unit.recipient_name,
          recipient_email: unit.recipient_email,
          recipient_phone: unit.recipient_phone,
          dispatched_at: unit.dispatched_at,
        });
      });

      setData(dashboardData);
    } catch (err) {
      console.error("Demo dashboard error", err);

      if (err.response?.status === 401) {
        setError("Unauthorized. Please log in again.");
        window.location.href = "/login";
      } else {
        setError(
          err.response?.data?.message ||
            "Failed to load Demo/Sample dashboard"
        );
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDemoUnits();
  }, [fetchDemoUnits]);

  const handleFilterClick = (
    product = "ALL",
    color = "ALL",
    condition = "ALL",
    status = "ALL"
  ) => {
    navigate("/inventory", {
      state: {
        product,
        color,
        condition,
        status,
        locationId: 5,
        locationName: "DEMO / SAMPLE",
      },
    });
  };

  return (
    <StockDashboardView
      data={data}
      loading={loading}
      error={error}
      heroTitle="DEMO / SAMPLE STOCK DASHBOARD"
      heroDescription="Overview of all dispatched demo units sent to vendors, influencers, employees, buyers, and other recipients."
      badgeLabel="DEMO / SAMPLE"
      secondaryBadgeLabel={`Viewing as ${name}`}
      headerAction={
        <Link
          to="/warehouses"
          style={{
            textDecoration: "none",
            backgroundColor: "white",
            color: "#1d4ed8",
            padding: "10px 16px",
            borderRadius: "999px",
            border: "1px solid rgba(37, 99, 235, 0.2)",
            fontWeight: "700",
          }}
        >
          Back to Warehouses
        </Link>
      }
      onFilterClick={handleFilterClick}
    />
  );
}