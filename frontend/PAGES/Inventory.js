import { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const API_URL = "/api/v1";

export default function Inventory() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterColor, setFilterColor] = useState("ALL");
  const [filterCondition, setFilterCondition] = useState("ALL");
  const [selectedRobot, setSelectedRobot] = useState(null);
  const [robotHistory, setRobotHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const token = localStorage.getItem("token");
  const locationId = localStorage.getItem("location_id");
  const role = localStorage.getItem("role");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const url =
        role === "ADMIN"
          ? `${API_URL}/scan/export`
          : `${API_URL}/scan/export?location_id=${locationId}`;
      const res = await axios.get(url, { headers });
      setData(res.data);
    } catch (err) {
      setError("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const fetchRobotHistory = async (serial) => {
    setSelectedRobot(serial);
    setHistoryLoading(true);
    setRobotHistory(null);
    try {
      const res = await axios.get(`${API_URL}/scan/robot/${serial}`, { headers });
      setRobotHistory(res.data);
    } catch (err) {
      setRobotHistory({ found: false, message: "Failed to load history" });
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedRobot(null);
    setRobotHistory(null);
  };

  const handleExcelDownload = () => {
    const exportData = filteredData.map((item) => ({
      "Serial Number": item.serial_number,
      Product: item.product,
      Color: item.color || "N/A",
      Condition: item.condition,
      Status: item.current_status,
      Location: item.current_location,
      "First Scanned": item.first_scanned_at
        ? new Date(item.first_scanned_at).toLocaleString()
        : "N/A",
      "Scanned By": item.first_scanned_by || "N/A",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const filteredData = data.filter((item) => {
    const matchSearch =
      search === "" ||
      item.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.product?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "ALL" || item.product === filterType;
    const matchColor = filterColor === "ALL" || (item.color || "N/A") === filterColor;
    const matchCondition = filterCondition === "ALL" || item.condition === filterCondition;
    return matchSearch && matchType && matchColor && matchCondition;
  });

  const productTypes = ["ALL", ...new Set(data.map((d) => d.product))];
  const colors = ["ALL", ...new Set(data.map((d) => d.color || "N/A"))];

  if (loading) return <div style={{ padding: "20px" }}>Loading inventory...</div>;
  if (error) return <div style={{ padding: "20px", color: "red" }}>{error}</div>;

  return (
    <div style={{ padding: "20px", backgroundColor: "#f3f4f6", minHeight: "100vh" }}>

      {/* Robot Journey Modal */}
      {selectedRobot && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            backgroundColor: "white", borderRadius: "12px",
            width: "90%", maxWidth: "600px", maxHeight: "80vh",
            overflow: "auto", padding: "30px", position: "relative",
          }}>
            {/* Close Button */}
            <button onClick={closeModal} style={{
              position: "absolute", top: "15px", right: "15px",
              backgroundColor: "#f3f4f6", border: "none", borderRadius: "50%",
              width: "32px", height: "32px", cursor: "pointer",
              fontSize: "16px", fontWeight: "bold",
            }}>✕</button>

            <h3 style={{ margin: "0 0 5px 0", color: "#1e3a5f" }}>Robot Journey</h3>
            <p style={{ margin: "0 0 20px 0", color: "#6b7280", fontSize: "14px" }}>
              {selectedRobot}
            </p>

            {historyLoading && <p>Loading journey...</p>}

            {robotHistory && !robotHistory.found && (
              <p style={{ color: "red" }}>{robotHistory.message}</p>
            )}

            {robotHistory && robotHistory.found && (
              <>
                {/* Robot Info Card */}
                <div style={{
                  backgroundColor: "#f0f9ff", borderRadius: "8px",
                  padding: "16px", marginBottom: "24px",
                  border: "1px solid #bae6fd",
                }}>
                  <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                    <div>
                      <span style={{ color: "#6b7280", fontSize: "12px" }}>PRODUCT</span>
                      <p style={{ margin: "2px 0", fontWeight: "bold", color: "#1e3a5f" }}>
                        {robotHistory.robot.product}
                      </p>
                    </div>
                    <div>
                      <span style={{ color: "#6b7280", fontSize: "12px" }}>COLOR</span>
                      <p style={{ margin: "2px 0", fontWeight: "bold", color: "#1e3a5f" }}>
                        {robotHistory.robot.color || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span style={{ color: "#6b7280", fontSize: "12px" }}>CONDITION</span>
                      <p style={{ margin: "2px 0", fontWeight: "bold", color: "#1e3a5f" }}>
                        {robotHistory.robot.condition}
                      </p>
                    </div>
                    <div>
                      <span style={{ color: "#6b7280", fontSize: "12px" }}>CURRENT STATUS</span>
                      <p style={{ margin: "2px 0", fontWeight: "bold", color: "#1e3a5f" }}>
                        {robotHistory.robot.current_status}
                      </p>
                    </div>
                    <div>
                      <span style={{ color: "#6b7280", fontSize: "12px" }}>CURRENT LOCATION</span>
                      <p style={{ margin: "2px 0", fontWeight: "bold", color: "#1e3a5f" }}>
                        {robotHistory.robot.current_location}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <h4 style={{ margin: "0 0 16px 0", color: "#374151" }}>
                  Movement History ({robotHistory.history.length} events)
                </h4>

                {robotHistory.history.length === 0 && (
                  <p style={{ color: "#6b7280" }}>No movement history found.</p>
                )}

                <div style={{ position: "relative" }}>
                  {robotHistory.history.map((event, i) => (
                    <div key={i} style={{ display: "flex", gap: "16px", marginBottom: "0" }}>
                      {/* Timeline line and dot */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{
                          width: "40px", height: "40px", borderRadius: "50%",
                          backgroundColor: event.scan_result === "RECEIVED" ? "#16a34a" : "#dc2626",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "white", fontWeight: "bold", fontSize: "14px",
                          flexShrink: 0,
                        }}>
                          {event.scan_result === "RECEIVED" ? "IN" : "OUT"}
                        </div>
                        {i < robotHistory.history.length - 1 && (
                          <div style={{
                            width: "2px", backgroundColor: "#e5e7eb",
                            flex: 1, minHeight: "40px",
                          }} />
                        )}
                      </div>

                      {/* Event Details */}
                      <div style={{
                        backgroundColor: event.scan_result === "RECEIVED" ? "#f0fdf4" : "#fef2f2",
                        border: `1px solid ${event.scan_result === "RECEIVED" ? "#bbf7d0" : "#fecaca"}`,
                        borderRadius: "8px", padding: "12px 16px",
                        marginBottom: "12px", flex: 1,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
                          <span style={{
                            fontWeight: "bold",
                            color: event.scan_result === "RECEIVED" ? "#16a34a" : "#dc2626",
                            fontSize: "15px",
                          }}>
                            {event.scan_result === "RECEIVED" ? "✅ IN" : "🚚 OUT"}
                            {" — "}
                            {event.location}
                            {event.scan_result === "DISPATCHED" && event.destination
                              ? ` → ${event.destination}` : ""}
                          </span>
                          <span style={{ color: "#6b7280", fontSize: "13px" }}>
                            {new Date(event.scanned_at).toLocaleString()}
                          </span>
                        </div>
                        <p style={{ margin: "4px 0 0 0", color: "#374151", fontSize: "13px" }}>
                          👤 Scanned by: <strong>{event.scanned_by}</strong>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: "20px",
      }}>
        <h2 style={{ margin: 0, color: "#1e3a5f" }}>
          Inventory ({filteredData.length} items)
        </h2>
        <button onClick={handleExcelDownload} style={{
          padding: "10px 20px", backgroundColor: "#16a34a",
          color: "white", border: "none", borderRadius: "6px",
          cursor: "pointer", fontWeight: "bold",
        }}>
          📥 Download Excel
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          placeholder="Search serial or product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", minWidth: "220px" }}
        />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px" }}>
          {productTypes.map((t, i) => (
            <option key={i} value={t}>{t === "ALL" ? "All Products" : t}</option>
          ))}
        </select>
        <select value={filterColor} onChange={(e) => setFilterColor(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px" }}>
          {colors.map((c, i) => (
            <option key={i} value={c}>{c === "ALL" ? "All Colors" : c}</option>
          ))}
        </select>
        <select value={filterCondition} onChange={(e) => setFilterCondition(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px" }}>
          <option value="ALL">All Conditions</option>
          <option value="NEW">NEW / Sealed</option>
          <option value="OPEN">OPEN / Non-Sealed</option>
        </select>
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: "white", borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "auto",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#2563eb", color: "white" }}>
              <th style={thStyle}>Serial Number</th>
              <th style={thStyle}>Product</th>
              <th style={thStyle}>Color</th>
              <th style={thStyle}>Condition</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>First Scanned</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
                  No inventory found
                </td>
              </tr>
            )}
            {filteredData.map((item, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "white" : "#f9fafb" }}>
                <td style={tdStyle}>
                  <span
                    onClick={() => fetchRobotHistory(item.serial_number)}
                    style={{
                      color: "#2563eb", cursor: "pointer",
                      textDecoration: "underline", fontWeight: "bold",
                    }}
                  >
                    {item.serial_number}
                  </span>
                </td>
                <td style={tdStyle}>{item.product}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: "2px 8px", borderRadius: "4px",
                    backgroundColor: item.color === "Blue" ? "#dbeafe" : item.color === "Red" ? "#fee2e2" : item.color === "Purple" ? "#ede9fe" : "#f3f4f6",
                    color: item.color === "Blue" ? "#1d4ed8" : item.color === "Red" ? "#dc2626" : item.color === "Purple" ? "#7c3aed" : "#374151",
                  }}>
                    {item.color || "N/A"}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{
                    padding: "2px 8px", borderRadius: "4px",
                    backgroundColor: item.condition === "NEW" ? "#dcfce7" : "#fef3c7",
                    color: item.condition === "NEW" ? "#16a34a" : "#d97706",
                  }}>
                    {item.condition}
                  </span>
                </td>
                <td style={tdStyle}>{item.current_status}</td>
                <td style={tdStyle}>{item.current_location}</td>
                <td style={tdStyle}>
                  {item.first_scanned_at
                    ? new Date(item.first_scanned_at).toLocaleString()
                    : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "8px" }}>
        💡 Click on any serial number to view its full journey history
      </p>
    </div>
  );
}

const thStyle = { padding: "12px 16px", textAlign: "left", fontWeight: "bold", fontSize: "14px" };
const tdStyle = { padding: "10px 16px", fontSize: "14px", borderBottom: "1px solid #f3f4f6" };
