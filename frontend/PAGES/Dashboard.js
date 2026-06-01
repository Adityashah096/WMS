import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = "/api/v1";

const locationMap = {
  "palai@wms.com": "PALAI PLAZZA",
  "takshashela@wms.com": "TAKSHASHELA",
  "aaj@wms.com": "AAJ BHIWANDI",
  "repair@wms.com": "REPAIR BHIWANDI",
};

const PRODUCT_KEYS = ["MIKO MINI", "MIKO 3", "SPARKY", "GKS"];

const displayProductName = {
  "MIKO MINI": "Miko Mini",
  "MIKO 3": "Miko 3",
  "SPARKY": "Sparky",
  "GKS": "GKS",
};

const normalizeProductName = (product) => {
  if (!product || typeof product !== "string") return "UNKNOWN";
  return product.trim().toUpperCase().replace(/\s+/g, " ");
};
const colorStyles = {
  Blue: { bg: "#dbeafe", border: "#3b82f6", text: "#1d4ed8" },
  Purple: { bg: "#ede9fe", border: "#7c3aed", text: "#5b21b6" },
  Red: { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" },
  Green: { bg: "#dcfce7", border: "#22c55e", text: "#166534" },
  Yellow: { bg: "#fef9c3", border: "#eab308", text: "#92400e" },
  "No Color": { bg: "#f3f4f6", border: "#d1d5db", text: "#475569" },
  "N/A": { bg: "#f3f4f6", border: "#d1d5db", text: "#475569" },
};

const getColorStyle = (color) => colorStyles[color] || { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" };
function KPICard({ title, value, color, icon, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "22px",
        borderRadius: "14px",
        boxShadow: hovered ? "0 8px 18px rgba(0,0,0,0.12)" : "0 3px 12px rgba(0,0,0,0.08)",
        minWidth: "170px",
        textAlign: "center",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.25s ease",
        transform: hovered ? "scale(1.03)" : "scale(1)",
        border: `2px solid ${color}`,
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ fontSize: "32px", marginBottom: "8px" }}>{icon}</div>
      <div style={{ fontSize: "38px", fontWeight: "bold", color, marginBottom: "4px" }}>{value}</div>
      <div style={{ color: "#64748b", fontSize: "14px", fontWeight: "500" }}>{title}</div>
    </div>
  );
}

function ProductCard({ product, stats, onFilterClick }) {
  const newEntries = Object.entries(stats.NEW || {});
  const openEntries = Object.entries(stats.OPEN || {});
  const newTotal = newEntries.reduce((sum, [, count]) => sum + count, 0);
  const openTotal = openEntries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div style={{
      backgroundColor: "white",
      borderRadius: "16px",
      boxShadow: "0 14px 40px rgba(15, 23, 42, 0.08)",
      overflow: "hidden",
      border: "1px solid rgba(148, 163, 184, 0.18)",
      minHeight: "300px",
    }}>
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #111827 100%)",
          color: "white",
          padding: "16px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          cursor: "pointer",
        }}
        onClick={() => onFilterClick(product, "ALL", "ALL")}
      >
        <div style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "0.02em", textDecoration: "underline" }}>{product.toUpperCase()}</div>
        <div style={{ fontSize: "18px", fontWeight: "700", color: "#cbd5e1", letterSpacing: "0.02em" }}>TOTAL: {stats.total || 0}</div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "220px", padding: "16px", borderRight: "1px solid #e2e8f0" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            borderBottom: "1px solid rgba(148, 163, 184, 0.22)",
            paddingBottom: "8px",
            cursor: "pointer",
          }}
          onClick={() => onFilterClick(product, "ALL", "NEW")}
          >
            <h3 style={{ margin: 0, color: "#059669", textAlign: "left", fontSize: "14px", letterSpacing: "0.08em", fontWeight: "800", textDecoration: "underline" }}>
              UNUSED / SEALED
            </h3>
            <span style={{ color: "#0f766e", fontWeight: "900", fontSize: "18px" }}>{newTotal}</span>
          </div>
          {newEntries.length === 0 && (
            <div style={{ color: "#475569", textAlign: "center", padding: "24px 0" }}>No sealed stock</div>
          )}
          {newEntries.map(([color, count]) => {
            const styles = getColorStyle(color);
            return (
              <div
                key={color}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  marginBottom: "8px",
                  backgroundColor: styles.bg,
                  border: `1px solid ${styles.border}`,
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onClick={() => onFilterClick(product, color, "NEW")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 10px 20px rgba(15, 23, 42, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span style={{ fontWeight: "700", color: styles.text, fontSize: "15px" }}>{color}</span>
                <span style={{ fontWeight: "700", color: styles.text, fontSize: "15px" }}>{count}</span>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, minWidth: "220px", padding: "16px" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            borderBottom: "1px solid rgba(148, 163, 184, 0.22)",
            paddingBottom: "8px",
            cursor: "pointer",
          }}
          onClick={() => onFilterClick(product, "ALL", "OPEN")}
        >
            <h3 style={{ margin: 0, color: "#dc2626", textAlign: "left", fontSize: "14px", letterSpacing: "0.08em", fontWeight: "800", textDecoration: "underline" }}>
              USED / OPEN
            </h3>
            <span style={{ color: "#991b1b", fontWeight: "900", fontSize: "18px" }}>{openTotal}</span>
          </div>
          {openEntries.length === 0 && (
            <div style={{ color: "#475569", textAlign: "center", padding: "24px 0" }}>No open stock</div>
          )}
          {openEntries.map(([color, count]) => {
            const styles = getColorStyle(color);
            return (
              <div
                key={color}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  marginBottom: "8px",
                  backgroundColor: styles.bg,
                  border: `1px solid ${styles.border}`,
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onClick={() => onFilterClick(product, color, "OPEN")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 10px 20px rgba(15, 23, 42, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span style={{ fontWeight: "700", color: styles.text, fontSize: "15px" }}>{color}</span>
                <span style={{ fontWeight: "700", color: styles.text, fontSize: "15px" }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
  const locationName = locationMap[email] || "Unknown Location";
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    const handleInventoryUpdated = (event) => {
      if (
        role !== "ADMIN" &&
        event?.detail?.action === "OUT" &&
        event.detail.serial &&
        parseInt(locationId) === event.detail.locationId
      ) {
        setData((prev) => prev.filter((item) => item.serial_number !== event.detail.serial));
        // Don't refetch immediately for OUT - the local removal is sufficient
        // Refetch after 2 seconds to sync with server
        setTimeout(() => fetchDashboard(), 2000);
      } else {
        // For IN operations or admin view, refetch immediately
        fetchDashboard();
      }
    };

    window.addEventListener("inventory-updated", handleInventoryUpdated);
    return () => window.removeEventListener("inventory-updated", handleInventoryUpdated);
  }, [locationId, role]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const url =
        role === "ADMIN"
          ? `${API_URL}/scan/export`
          : `${API_URL}/scan/export?location_id=${locationId}`;
      const res = await axios.get(url, { headers });
      setData(res.data);
    } catch (err) {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const totalStock = data.length;
  const incoming = data.filter(d => d.current_status === 'INCOMING').length;
  const inTransit = data.filter(d => d.current_status === 'IN_TRANSIT').length;

  const productStats = {};
  data.forEach(item => {
    const prodKey = normalizeProductName(item.product);
    const cond = item.condition || "UNKNOWN";
    const col = item.color || "No Color";
    if (!productStats[prodKey]) productStats[prodKey] = { NEW: {}, OPEN: {}, total: 0 };
    productStats[prodKey].total += 1;
    if (!productStats[prodKey][cond]) productStats[prodKey][cond] = {};
    productStats[prodKey][cond][col] = (productStats[prodKey][cond][col] || 0) + 1;
  });

  const productsToRender = PRODUCT_KEYS.filter((key) => productStats[key]).concat(
    Object.keys(productStats).filter((key) => !PRODUCT_KEYS.includes(key))
  );

  const handleFilterClick = (product, color, condition, status) => {
    navigate('/inventory', { state: { product, color, condition, status } });
  };

  if (loading) return <div style={{ padding: "20px", textAlign: "center" }}>Loading dashboard...</div>;
  if (error) return <div style={{ padding: "20px", color: "red", textAlign: "center" }}>{error}</div>;

  return (
    <div style={{ padding: "20px", backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: "30px", textAlign: "center" }}>
        <h1 style={{ margin: 0, color: "#1e293b", fontSize: "36px", fontWeight: "bold" }}>WELCOME {name.toUpperCase()}</h1>
        <p style={{ margin: "10px 0", color: "#475569", fontSize: "18px", fontWeight: "bold" }}>LOCATION = {locationName}</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center", marginBottom: "40px" }}>
        <KPICard
          title="Total Stock"
          value={totalStock}
          color="#3b82f6"
          icon="📦"
          onClick={() => handleFilterClick("ALL", "ALL", "ALL", "ALL")}
        />
        <KPICard
          title="Incoming"
          value={incoming}
          color="#10b981"
          icon="⬇️"
          onClick={() => handleFilterClick("ALL", "ALL", "ALL", "INCOMING")}
        />
        <KPICard
          title="In Transit"
          value={inTransit}
          color="#f59e0b"
          icon="🚚"
          onClick={() => handleFilterClick("ALL", "ALL", "ALL", "IN_TRANSIT")}
        />
      </div>

      {/* Product Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "18px" }}>
        {productsToRender.map((prod) => (
          <ProductCard
            key={prod}
            product={displayProductName[prod] || prod}
            stats={productStats[prod] || { NEW: {}, OPEN: {}, total: 0 }}
            onFilterClick={handleFilterClick}
          />
        ))}
      </div>
    </div>
  );
}