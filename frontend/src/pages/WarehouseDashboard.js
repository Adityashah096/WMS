import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import StockDashboardView from "../components/StockDashboardView";
import { getWarehouseBySlug } from "../constants/warehouses";
import API_URL from "../config/api";

export default function WarehouseDashboard() {
  const { warehouseSlug } = useParams();
  const navigate = useNavigate();
  const warehouse = getWarehouseBySlug(warehouseSlug);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const name = localStorage.getItem("name");

  const fetchWarehouseData = useCallback(async () => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!warehouse) {
      setError("Warehouse not found.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/scan/export?location_id=${warehouse.id}`, { headers });
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Warehouse dashboard fetch error", err);
      if (err.response?.status === 401) {
        setError("Unauthorized. Please log in again.");
        window.location.href = "/login";
      } else if (err.response?.status === 403) {
        setError("You are not allowed to access this warehouse.");
      } else {
        setError(err.response?.data?.message || "Failed to load warehouse dashboard");
      }
    } finally {
      setLoading(false);
    }
  }, [token, warehouse]);

  useEffect(() => {
    fetchWarehouseData();
  }, [fetchWarehouseData]);

  const handleFilterClick = (product = "ALL", color = "ALL", condition = "ALL", status = "ALL") => {
    if (!warehouse) return;

    navigate(`/inventory?location_id=${warehouse.id}`, {
      state: {
        product,
        color,
        condition,
        status,
        locationId: warehouse.id,
        locationName: warehouse.displayName,
      },
    });
  };

  return (
    <StockDashboardView
      data={data}
      loading={loading}
      error={error}
      heroTitle={`${warehouse?.displayName || "WAREHOUSE"} STOCK DASHBOARD`}
      heroDescription="Admin-only stock overview for this location with total stock, incoming stock, transit stock, and product-wise split."
      badgeLabel={warehouse?.displayName || "WAREHOUSE"}
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
