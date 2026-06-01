import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import RobotHistoryModal from "../components/RobotHistoryModal";
import API_URL from "../config/api";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "../components/ui/pagination";

const PAGE_SIZE_OPTIONS = [100, 200, 500, "All"];

export default function Logs() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterResult, setFilterResult] = useState("ALL");
  const [selectedRobot, setSelectedRobot] = useState(null);
  const [robotHistory, setRobotHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);


  const clearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
  };

  const isDateFiltered = dateFrom !== "" || dateTo !== "";

  const fetchLogs = useCallback(async () => {
    const token = localStorage.getItem("token");
    const locationId = localStorage.getItem("location_id");
    const role = localStorage.getItem("role");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setLoading(true);
      setError("");

      const headers = { Authorization: `Bearer ${token}` };
      const url =
        role === "ADMIN"
          ? `${API_URL}/scan`
          : `${API_URL}/scan?location_id=${locationId}`;

      const res = await axios.get(url, { headers });
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Logs fetch error", err);

      if (err.response?.status === 401) {
        setError("Unauthorized. Please log in again.");
        window.location.href = "/login";
      } else {
        setError(err.response?.data?.message || "Failed to load logs");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const fetchRobotHistory = async (serial) => {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setSelectedRobot(serial);
    setHistoryLoading(true);
    setRobotHistory(null);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/scan/robot/${serial}`, {
        headers,
      });
      setRobotHistory(res.data);
    } catch (err) {
      console.error("Robot history fetch error", err);
      setRobotHistory({
        found: false,
        message: err.response?.data?.message || "Failed to load history",
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedRobot(null);
    setRobotHistory(null);
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchSearch =
        search === "" ||
        item.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
        item.scanned_by_name?.toLowerCase().includes(search.toLowerCase());

      const matchResult =
        filterResult === "ALL" || item.scan_result === filterResult;

      let matchDate = true;

      if (dateFrom || dateTo) {
        const scanTs = item.scanned_at
          ? new Date(item.scanned_at).getTime()
          : null;

        if (!scanTs) {
          matchDate = false;
        } else {
          if (dateFrom) {
            const fromTs = new Date(dateFrom).setHours(0, 0, 0, 0);
            if (scanTs < fromTs) matchDate = false;
          }

          if (dateTo) {
            const toTs = new Date(dateTo).setHours(23, 59, 59, 999);
            if (scanTs > toTs) matchDate = false;
          }
        }
      }

      return matchSearch && matchResult && matchDate;
    });
  }, [data, search, filterResult, dateFrom, dateTo]);

  // Reset to page 1 whenever filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterResult, dateFrom, dateTo, rowsPerPage]);

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

  const handleExcelDownload = () => {
    const exportData = filteredData.map((item) => ({
      "Scan Time": item.scanned_at
        ? new Date(item.scanned_at).toLocaleString()
        : "N/A",
      "Serial Number": item.serial_number || "N/A",
      "Robot Type": item.robot_type || "N/A",
      Color: item.color || "N/A",
      Condition: item.condition || "N/A",
      Action: item.scan_result || "N/A",
      Location: item.location || "N/A",
      "Scanned By": item.scanned_by_name || "N/A",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Scan Logs");
    XLSX.writeFile(wb, `logs_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading logs...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "20px", color: "red" }}>
        {error}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#f3f4f6",
        minHeight: "100vh",
      }}
    >
      <style>{`
        .logs-table tbody tr {
          transition: all 0.15s ease;
          cursor: pointer;
        }

        .logs-table tbody tr:hover {
          background-color: #dbeafe !important;
          box-shadow: inset 0 0 0 1px #3b82f6;
        }

        .logs-table tbody tr:active {
          transform: scale(0.995);
          background-color: #bfdbfe !important;
        }

        .date-filter-input {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          background: #ffffff;
          color: #374151;
          height: 38px;
        }

        .date-filter-input:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 1px;
          border-color: #3b82f6;
        }

        .date-filter-clear {
          padding: 0 10px;
          height: 38px;
          border: 1px solid #fca5a5;
          background: #fef2f2;
          color: #b91c1c;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s;
        }

        .date-filter-clear:hover {
          background: #fee2e2;
        }

        .date-filter-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          background: #eff6ff;
        }

        .date-filter-label {
          font-size: 12px;
          font-weight: 800;
          color: #1e40af;
          white-space: nowrap;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .pagination-btn {
          min-width: 40px;
          height: 38px;
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

        .pagination-ellipsis {
          min-width: 24px;
          text-align: center;
          color: #6b7280;
          font-weight: 700;
        }

        .rows-per-page-select {
          padding: 6px 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          background: #ffffff;
          cursor: pointer;
          height: 34px;
        }

        .rows-per-page-select:focus {
          outline: 2px solid #3b82f6;
          border-color: #3b82f6;
        }
      `}</style>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          gap: "12px",
          flexWrap: "wrap",
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

      <div
        style={{
          marginBottom: "12px",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          background: "#ecfeff",
          border: "1px solid #a5f3fc",
          borderRadius: "20px",
          fontSize: "13px",
          fontWeight: 700,
          color: "#0f766e",
        }}
      >
        <span>Total from API: {data.length}</span>
        <span>•</span>
        <span>Visible after filter: {filteredData.length}</span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "16px",
          flexWrap: "wrap",
          alignItems: "center",
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
            height: "38px",
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
            height: "38px",
          }}
        >
          <option value="ALL">All Actions</option>
          <option value="RECEIVED">IN (RECEIVED)</option>
          <option value="DISPATCHED">OUT (DISPATCHED)</option>
          <option value="FORCE_RECEIVED">FORCE RECEIVED</option>
          <option value="SILENT_REJECT">SILENT REJECT</option>
        </select>

        <div className="date-filter-wrapper">
          <span className="date-filter-label">📅 Date</span>

          <input
            type="date"
            className="date-filter-input"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="Filter from date"
            aria-label="Filter logs from date"
          />

          <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 700 }}>
            →
          </span>

          <input
            type="date"
            className="date-filter-input"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            title="Filter to date"
            aria-label="Filter logs to date"
          />

          {isDateFiltered && (
            <button
              className="date-filter-clear"
              onClick={clearDateFilter}
              title="Clear date filter"
              aria-label="Clear date filter"
            >
              ✕ Clear
            </button>
          )}
        </div>

        <button
          onClick={fetchLogs}
          style={{
            padding: "8px 16px",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            height: "38px",
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {isDateFiltered && (
        <div
          style={{
            marginBottom: "12px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "5px 12px",
            background: "#dbeafe",
            border: "1px solid #93c5fd",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: 700,
            color: "#1e40af",
          }}
        >
          <span>📅 Filtered:</span>
          <span>
            {dateFrom ? `From ${new Date(dateFrom).toLocaleDateString()}` : "Any start"}
          </span>
          <span>—</span>
          <span>
            {dateTo ? `To ${new Date(dateTo).toLocaleDateString()}` : "Any end"}
          </span>
        </div>
      )}

      {selectedRobot && (
        <RobotHistoryModal
          serial={selectedRobot}
          robotHistory={robotHistory}
          loading={historyLoading}
          onClose={closeModal}
        />
      )}

      <div
        style={{
          backgroundColor: "white",
          borderRadius: "10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          overflow: "auto",
        }}
      >
        <table
          className="logs-table"
          style={{ width: "100%", borderCollapse: "collapse" }}
        >
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
            {filteredData.length === 0 ? (
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
            ) : (
              paginatedData.map((item, i) => {
                const rowIndex = (currentPage - 1) * (isAllRows ? 0 : rowsPerPage) + i;

                return (
                  <tr
                    key={`${item.serial_number || "row"}-${item.scanned_at || rowIndex}-${rowIndex}`}
                    style={{
                      backgroundColor: rowIndex % 2 === 0 ? "white" : "#f9fafb",
                    }}
                  >
                    <td style={tdStyle}>
                      {item.scanned_at
                        ? new Date(item.scanned_at).toLocaleString()
                        : "N/A"}
                    </td>

                    <td style={tdStyle}>
                      <span
                        onClick={() => fetchRobotHistory(item.serial_number)}
                        style={{
                          color: "#2563eb",
                          cursor: "pointer",
                          textDecoration: "underline",
                          fontWeight: "bold",
                        }}
                      >
                        {item.serial_number || "N/A"}
                      </span>
                    </td>

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
                          : item.scan_result || "N/A"}
                      </span>
                    </td>

                    <td style={tdStyle}>{item.location || "N/A"}</td>
                    <td style={tdStyle}>{item.scanned_by_name || "N/A"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {filteredData.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              padding: "14px 16px",
              borderTop: "1px solid #e5e7eb",
              flexWrap: "wrap",
            }}
          >
            {/* Left: record count + rows-per-page */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "14px", color: "#6b7280", fontWeight: 600 }}>
                Showing {startRecord}–{endRecord} of {filteredData.length} records
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: 600 }}>Rows:</span>
                <select
                  className="rows-per-page-select"
                  value={rowsPerPage}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRowsPerPage(val === "All" ? "All" : Number(val));
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right: pagination buttons (hidden when showing All) */}
            {!isAllRows && totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      ‹ Prev
                    </button>
                  </PaginationItem>

                  {visiblePages[0] > 1 && (
                    <>
                      <PaginationItem>
                        <button className="pagination-btn" onClick={() => setCurrentPage(1)}>1</button>
                      </PaginationItem>
                      {visiblePages[0] > 2 && (
                        <PaginationItem><PaginationEllipsis /></PaginationItem>
                      )}
                    </>
                  )}

                  {visiblePages.map((page) => (
                    <PaginationItem key={page}>
                      <button
                        className={`pagination-btn ${currentPage === page ? "active" : ""}`}
                        onClick={() => setCurrentPage(page)}
                      >
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
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next ›
                    </button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
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