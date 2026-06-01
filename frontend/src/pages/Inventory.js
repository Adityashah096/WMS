import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { useLocation, useSearchParams } from "react-router-dom";
import RobotHistoryModal from "../components/RobotHistoryModal";
import { getWarehouseById } from "../constants/warehouses";
import API_URL from "../config/api";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "../components/ui/pagination";

const PAGE_SIZE_OPTIONS = [100, 200, 500, "All"];

const normalizeStatus = (value) => String(value || "").trim().toUpperCase();

// Product → allowed colors map. Products not listed here have no color filter.
const PRODUCT_COLORS = {
  "Miko 3":    ["Red", "Blue"],
  "Miko Mini": ["Blue", "Purple"],
  "Sparky":    ["Blue", "Red"],
  // GKS intentionally omitted — no color options
};

export default function Inventory() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterColor, setFilterColor] = useState("ALL");
  const [filterCondition, setFilterCondition] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedRobot, setSelectedRobot] = useState(null);
  const [robotHistory, setRobotHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [copiedSerial, setCopiedSerial] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);

  const token = localStorage.getItem("token");
  const locationId = localStorage.getItem("location_id");
  const role = localStorage.getItem("role");
  const scopedLocationId =
    role === "ADMIN"
      ? searchParams.get("location_id") || location.state?.locationId || ""
      : locationId;
  const scopedWarehouse = getWarehouseById(scopedLocationId);

  const fetchInventory = useCallback(async () => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setLoading(true);
      const url =
        role === "ADMIN" && !scopedLocationId
          ? `${API_URL}/scan/export`
          : `${API_URL}/scan/export?location_id=${scopedLocationId}`;
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(url, { headers });
      setData(res.data);
    } catch (err) {
      console.error("Inventory fetch error", err);
      if (err.response?.status === 401) {
        setError("Unauthorized. Please log in again.");
        window.location.href = "/login";
      } else {
        setError(err.response?.data?.message || "Failed to load inventory");
      }
    } finally {
      setLoading(false);
    }
  }, [role, scopedLocationId, token]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    if (!location.state) return;

    setFilterType(location.state.product || "ALL");
    setFilterColor(location.state.color || "ALL");
    setFilterCondition(location.state.condition || "ALL");
    setFilterStatus(location.state.status || "ALL");
  }, [location.state]);

  // Reset color filter to "ALL" whenever the product type changes,
  // so a previously-selected color from another product does not linger.
  useEffect(() => {
    setFilterColor("ALL");
  }, [filterType]);

  const fetchRobotHistory = async (serial) => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setSelectedRobot(serial);
    setHistoryLoading(true);
    setRobotHistory(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/scan/robot/${serial}`, { headers });
      setRobotHistory(res.data);
    } catch (err) {
      console.error("Robot history fetch error", err);
      setRobotHistory({
        found: false,
        message:
          err.response?.data?.message || "Failed to load history",
      });
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
    const normalizedStatus = normalizeStatus(item.current_status);
    const matchSearch =
      search === "" ||
      item.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.product?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "ALL" || item.product === filterType;
    const matchColor = filterColor === "ALL" || (item.color || "N/A") === filterColor;
    const matchCondition = filterCondition === "ALL" || item.condition === filterCondition;
    const matchStatus =
      filterStatus === "ALL"
        ? normalizedStatus !== "INCOMING" && normalizedStatus !== "IN_TRANSIT"
        : normalizedStatus === normalizeStatus(filterStatus);
    return matchSearch && matchType && matchColor && matchCondition && matchStatus;
  });

  const productTypes = ["ALL", ...new Set(data.map((d) => d.product))];

  const availableColors =
    filterType === "ALL"
      ? ["ALL", ...new Set(data.map((d) => d.color || "N/A"))]
      : PRODUCT_COLORS[filterType]
      ? ["ALL", ...PRODUCT_COLORS[filterType]]
      : null;

  const statuses = ["ALL", ...new Set(data.map((d) => d.current_status || "N/A"))];

  // Reset to page 1 when any filter/page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType, filterColor, filterCondition, filterStatus, rowsPerPage]);

  const isAllRows = rowsPerPage === "All";
  const totalPages = isAllRows ? 1 : Math.max(1, Math.ceil(filteredData.length / rowsPerPage));

  const paginatedData = useMemo(() => {
    if (isAllRows) return filteredData;
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage, isAllRows]);

  const getVisiblePages = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, 5];
    if (currentPage >= totalPages - 2)
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  };

  const visiblePages = getVisiblePages();
  const startRecord = filteredData.length === 0 ? 0 : isAllRows ? 1 : (currentPage - 1) * rowsPerPage + 1;
  const endRecord = isAllRows ? filteredData.length : Math.min(currentPage * rowsPerPage, filteredData.length);

  if (loading) return <div style={{ padding: "20px" }}>Loading inventory...</div>;
  if (error) return <div style={{ padding: "20px", color: "red" }}>{error}</div>;

  return (
    <div style={{ padding: "20px", backgroundColor: "#f3f4f6", minHeight: "100vh" }}>
      {/* Hover/Press Effect Styles */}
      <style>{`
        .inventory-table tbody tr {
          transition: all 0.15s ease;
          cursor: pointer;
        }
        .inventory-table tbody tr:hover {
          background-color: #dbeafe !important;
          box-shadow: inset 0 0 0 1px #3b82f6;
        }
        .inventory-table tbody tr:active {
          transform: scale(0.995);
          background-color: #bfdbfe !important;
        }
        .serial-cell {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .serial-cell .copy-chip {
          position: absolute;
          top: -28px;
          left: 50%;
          transform: translateX(-50%);
          background: #1e40af;
          color: white;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 5px;
          white-space: nowrap;
          pointer-events: none;
          animation: fadeInUp 0.15s ease;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .serial-text:hover {
          text-decoration: none;
        }
        .pagination-btn {
          min-width: 40px;
          height: 36px;
          padding: 0 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #ffffff;
          color: #111827;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.15s ease;
        }
        .pagination-btn:hover:not(:disabled) {
          background: #eff6ff;
          border-color: #60a5fa;
        }
        .pagination-btn:disabled {
          background: #f3f4f6;
          color: #9ca3af;
          cursor: not-allowed;
        }
        .pagination-btn.active {
          background: #2563eb;
          border-color: #2563eb;
          color: #ffffff;
        }
      `}</style>

      {selectedRobot && (
        <RobotHistoryModal
          serial={selectedRobot}
          robotHistory={robotHistory}
          loading={historyLoading}
          onClose={closeModal}
        />
      )}

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: "20px",
        gap: "16px", flexWrap: "wrap",
      }}>
        <div>
          <h2 style={{ margin: 0, color: "#1e3a5f" }}>
            Inventory ({filteredData.length} items)
          </h2>
          {scopedWarehouse ? (
            <p style={{ margin: "6px 0 0 0", color: "#475569", fontSize: "14px" }}>
              Scoped to {scopedWarehouse.displayName}
            </p>
          ) : null}
        </div>
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
        {availableColors && (
          <select value={filterColor} onChange={(e) => setFilterColor(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px" }}>
            {availableColors.map((c, i) => (
              <option key={i} value={c}>{c === "ALL" ? "All Colors" : c}</option>
            ))}
          </select>
        )}
        <select value={filterCondition} onChange={(e) => setFilterCondition(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px" }}>
          <option value="ALL">All Conditions</option>
          <option value="NEW">NEW / Sealed</option>
          <option value="OPEN">OPEN / Non-Sealed</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px" }}>
          {statuses.map((status, i) => (
            <option key={i} value={status}>{status === "ALL" ? "All Statuses" : status}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: "white", borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "auto",
      }}>
        <table className="inventory-table" style={{ width: "100%", borderCollapse: "collapse" }}>
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
            {paginatedData.map((item, i) => (
              <tr key={i} className="inventory-table-row" onClick={() => fetchRobotHistory(item.serial_number)} style={{ backgroundColor: i % 2 === 0 ? "white" : "#f9fafb" }}>
                <td style={tdStyle}>
                  <span className="serial-cell">
                    {copiedSerial === item.serial_number && (
                      <span className="copy-chip">✓ Copied!</span>
                    )}
                    <span
                      className="serial-text"
                      style={{ color: "#2563eb", fontWeight: "bold", cursor: "copy" }}
                      onClick={(e) => {
                        e.stopPropagation(); // don't open robot history modal
                        navigator.clipboard.writeText(item.serial_number).then(() => {
                          setCopiedSerial(item.serial_number);
                          setTimeout(() => setCopiedSerial(null), 1500);
                        });
                      }}
                    >
                      {item.serial_number}
                    </span>
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

        {filteredData.length > 0 && (
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", gap: "12px", padding: "14px 16px",
            borderTop: "1px solid #e5e7eb", flexWrap: "wrap",
          }}>
            {/* Left: count + rows selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "14px", color: "#6b7280", fontWeight: 600 }}>
                Showing {startRecord}–{endRecord} of {filteredData.length} records
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: 600 }}>Rows:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRowsPerPage(val === "All" ? "All" : Number(val));
                  }}
                  style={{
                    padding: "6px 10px", border: "1px solid #d1d5db",
                    borderRadius: "6px", fontSize: "13px", fontWeight: 600,
                    color: "#374151", background: "#fff", cursor: "pointer", height: "34px",
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right: page buttons */}
            {!isAllRows && totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <button className="pagination-btn"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}>
                      ‹ Prev
                    </button>
                  </PaginationItem>

                  {visiblePages[0] > 1 && (
                    <>
                      <PaginationItem>
                        <button className="pagination-btn" onClick={() => setCurrentPage(1)}>1</button>
                      </PaginationItem>
                      {visiblePages[0] > 2 && <PaginationItem><PaginationEllipsis /></PaginationItem>}
                    </>
                  )}

                  {visiblePages.map((page) => (
                    <PaginationItem key={page}>
                      <button
                        className={`pagination-btn ${currentPage === page ? "active" : ""}`}
                        onClick={() => setCurrentPage(page)}>
                        {page}
                      </button>
                    </PaginationItem>
                  ))}

                  {visiblePages[visiblePages.length - 1] < totalPages && (
                    <>
                      {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                        <PaginationItem><PaginationEllipsis /></PaginationItem>
                      )}
                      <PaginationItem>
                        <button className="pagination-btn" onClick={() => setCurrentPage(totalPages)}>
                          {totalPages}
                        </button>
                      </PaginationItem>
                    </>
                  )}

                  <PaginationItem>
                    <button className="pagination-btn"
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}>
                      Next ›
                    </button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
      </div>
      <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "8px" }}>
        💡 Click on any serial number to view its full journey history
      </p>
    </div>
  );
}

const thStyle = { padding: "12px 16px", textAlign: "left", fontWeight: "bold", fontSize: "14px" };
const tdStyle = { padding: "10px 16px", fontSize: "14px", borderBottom: "1px solid #f3f4f6" };
