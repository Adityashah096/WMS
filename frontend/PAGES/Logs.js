import { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const API_URL = "http://localhost:3000/api/v1";

export default function Logs() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterResult, setFilterResult] = useState("ALL");

  const token = localStorage.getItem("token");
  const locationId = localStorage.getItem("location_id");
  const role = localStorage.getItem("role");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const url =
        role === "ADMIN"
          ? `${API_URL}/scan`
          : `${API_URL}/scan?location_id=${locationId}`;

      const res = await axios.get(url, { headers });
      setData(res.data);
    } catch (err) {
      setError("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  const handleExcelDownload = () => {
    const exportData = filteredData.map((item) => ({
      "Scan Time": new Date(item.scanned_at).toLocaleString(),
      "Serial Number": item.serial_number,
      "Robot Type": item.robot_type || "N/A",
      Color: item.color || "N/A",
      Condition: item.condition || "N/A",
      Action: item.scan_result,
      Location: item.location,
      "Scanned By": item.scanned_by_name,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Scan Logs");
    XLSX.writeFile(wb, `logs_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const filteredData = data.filter((item) => {
    const matchSearch =
      search === "" ||
      item.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.scanned_by_name?.toLowerCase().includes(search.toLowerCase());

    const matchResult =
      filterResult === "ALL" || item.scan_result === filterResult;

    return matchSearch && matchResult;
  });

  if (loading) return <div style={{ padding: "20px" }}>Loading logs...</div>;
  if (error) return <div style={{ padding: "20px", color: "red" }}>{error}</div>;

  return (
    <div style={{ padding: "20px", backgroundColor: "#f3f4f6", minHeight: "100vh" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: 0, color: "#1e3a5f" }}>
          Activity Logs ({filteredData.length} records)
        </h2>
        <button
          onClick={handleExcelDownload}
          style={{
            padding: "10px 20px",
            backgroundColor: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          📥 Download Excel
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <input
          placeholder="Search serial or user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            minWidth: "220px",
          }}
        />
        <select
          value={filterResult}
          onChange={(e) => setFilterResult(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
          }}
        >
          <option value="ALL">All Actions</option>
          <option value="RECEIVED">IN (RECEIVED)</option>
          <option value="DISPATCHED">OUT (DISPATCHED)</option>
          <option value="FORCE_RECEIVED">FORCE RECEIVED</option>
          <option value="SILENT_REJECT">SILENT REJECT</option>
        </select>
        <button
          onClick={fetchLogs}
          style={{
            padding: "8px 16px",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          overflow: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#2563eb", color: "white" }}>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>Serial Number</th>
              <th style={thStyle}>Product</th>
              <th style={thStyle}>Color</th>
              <th style={thStyle}>Action</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Scanned By</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#6b7280",
                  }}
                >
                  No logs found
                </td>
              </tr>
            )}
            {filteredData.map((item, i) => (
              <tr
                key={i}
                style={{ backgroundColor: i % 2 === 0 ? "white" : "#f9fafb" }}
              >
                <td style={tdStyle}>
                  {new Date(item.scanned_at).toLocaleString()}
                </td>
                <td style={tdStyle}>{item.serial_number}</td>
                <td style={tdStyle}>{item.robot_type || "N/A"}</td>
                <td style={tdStyle}>{item.color || "N/A"}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: "4px",
                      fontWeight: "bold",
                      backgroundColor:
                        item.scan_result === "RECEIVED"
                          ? "#dcfce7"
                          : item.scan_result === "DISPATCHED"
                          ? "#fee2e2"
                          : "#fef3c7",
                      color:
                        item.scan_result === "RECEIVED"
                          ? "#16a34a"
                          : item.scan_result === "DISPATCHED"
                          ? "#dc2626"
                          : "#d97706",
                    }}
                  >
                    {item.scan_result === "RECEIVED"
                      ? "✅ IN"
                      : item.scan_result === "DISPATCHED"
                      ? "🚚 OUT"
                      : item.scan_result}
                  </span>
                </td>
                <td style={tdStyle}>{item.location}</td>
                <td style={tdStyle}>{item.scanned_by_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  padding: "12px 16px",
  textAlign: "left",
  fontWeight: "bold",
  fontSize: "14px",
};

const tdStyle = {
  padding: "10px 16px",
  fontSize: "14px",
  borderBottom: "1px solid #f3f4f6",
};
