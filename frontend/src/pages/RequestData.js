// RequestData.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import API_URL from "../config/api";
import { getStoredUser } from "../utils/auth";
import { getWarehouseById, WAREHOUSES } from "../constants/warehouses";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Requests" },
  { value: "PENDING", label: "Pending" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "FULFILLED_AT_AAJ", label: "Completed" },
  { value: "TRANSFERRED", label: "Transferred" },
];

const STATUS_TONE = {
  PENDING: { bg: "#fff7ed", color: "#c2410c", label: "Pending" },
  PACKAGING: { bg: "#dbeafe", color: "#1d4ed8", label: "Packaging" },
  FULFILLED_AT_AAJ: { bg: "#dcfce7", color: "#166534", label: "Completed" },
  TRANSFERRED: { bg: "#ede9fe", color: "#6d28d9", label: "Transferred" },
};

const pick = (...values) => values.find((value) => value !== undefined && value !== null);

function normalizeRequest(raw = {}) {
  // Handle multiple products - group them into a single row with concatenated info for display
  const products = Array.isArray(raw.products) ? raw.products : [];
  
  // For table display, we'll show the first product's details
  // but keep full products array for detailed view
  const firstProduct = products[0] || {};
  
  return {
    raw,
    request_id: pick(raw.request_id, raw.requestid, raw.id),
    product_name: firstProduct.product_name || pick(raw.product_name, raw.productname),
    product_color: firstProduct.color_name || pick(raw.product_color, raw.productcolor),
    quantity: Number(firstProduct.quantity || pick(raw.quantity, raw.qty, 0)) || 0,
    status: pick(raw.status, raw.request_status),
    requester_name: pick(raw.requester_name, raw.requestername),
    requester_surname: pick(raw.requester_surname, raw.requestersurname),
    requester_phone: pick(raw.requester_phone, raw.requesterphone),
    requester_email: pick(raw.requester_email, raw.requesteremail),
    location_name: pick(raw.location_name, raw.locationname),
    assigned_location_name: pick(raw.assigned_location_name, raw.assignedlocationname),
    request_date: pick(raw.request_date, raw.requestdate),
    created_at: pick(raw.created_at, raw.createdat),
    note: pick(raw.note, raw.request_note),
    package_id: pick(raw.package_id, raw.packageid),
    package_status: pick(raw.package_status, raw.packagestatus),
    package_completed_at: pick(raw.package_completed_at, raw.packagecompletedat),
    stocksummary: raw.stocksummary || raw.stock_summary || {},
    // Store full products array for detail view
    products: products.map((p) => ({
      id: p.id,
      product_name: p.product_name,
      color_name: p.color_name,
      quantity: Number(p.quantity),
      status: p.status,
      created_at: p.created_at,
    })),
  };
}

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function statusLabel(status) {
  return STATUS_TONE[status]?.label || status || "N/A";
}

function StatusBadge({ status }) {
  const tone = STATUS_TONE[status] || {
    bg: "#e2e8f0",
    color: "#334155",
    label: status || "N/A",
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 9px",
        borderRadius: 4,
        backgroundColor: tone.bg,
        color: tone.color,
        fontSize: "12px",
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {tone.label}
    </span>
  );
}

function DetailField({ label, value }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 12,
        background: "#fff",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          color: "#0f172a",
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {value || "N/A"}
      </div>
    </div>
  );
}

function RequestDetailModal({ request, onClose }) {
  if (!request) return null;

  const stockRows = request.stocksummary?.stockbylocation || request.stocksummary?.stock_by_location || [];
  const productsArray = Array.isArray(request.products) ? request.products : [];
  const productCount = productsArray.length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(980px, 100%)",
          maxHeight: "90vh",
          overflow: "auto",
          background: "#ffffff",
          borderRadius: 14,
          boxShadow: "0 28px 70px rgba(15, 23, 42, 0.28)",
          border: "1px solid rgba(191, 219, 254, 0.9)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            padding: "18px 22px",
            background: "linear-gradient(135deg, #1e40af 0, #2563eb 100%)",
            color: "#fff",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                opacity: 0.86,
              }}
            >
              Request {request.request_id} • {productCount} Product{productCount !== 1 ? "s" : ""}
            </div>
            <h2 style={{ margin: "6px 0 0", fontSize: 26, lineHeight: 1.1 }}>
              {request.product_name}
              {request.product_color ? ` - ${request.product_color}` : ""}
            </h2>
          </div>

          <button
            onClick={onClose}
            style={{
              border: "1px solid rgba(255,255,255,0.45)",
              background: "rgba(255,255,255,0.16)",
              color: "#fff",
              borderRadius: 8,
              width: 36,
              height: 36,
              fontWeight: 900,
              cursor: "pointer",
            }}
            aria-label="Close request details"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 22, background: "#f8fafc" }}>
          {productCount > 1 && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0f172a",
                  marginBottom: 12,
                }}
              >
                Products Requested ({productCount})
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                }}
              >
                {productsArray.map((product, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#64748b",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      Product {idx + 1}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                      {product.product_name}
                    </div>
                    {product.color_name && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          marginTop: 4,
                        }}
                      >
                        Color: {product.color_name}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        marginTop: 4,
                      }}
                    >
                      Qty: {product.quantity}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 12,
            }}
          >
            <DetailField label="Status" value={statusLabel(request.status)} />
            <DetailField
              label="Requester"
              value={`${request.requester_name || ""} ${request.requester_surname || ""}`.trim()}
            />
            <DetailField label="Phone" value={request.requester_phone || "N/A"} />
            <DetailField label="Email" value={request.requester_email || "N/A"} />
            <DetailField label="Quantity" value={request.quantity} />
            <DetailField label="Requested From" value={request.location_name} />
            <DetailField label="Assigned To" value={request.assigned_location_name || "AAJ"} />
            <DetailField label="Request Date" value={formatDate(request.request_date)} />
            <DetailField label="Created At" value={formatDateTime(request.created_at)} />
            <DetailField label="Package ID" value={request.package_id || "N/A"} />
            <DetailField label="Package Status" value={request.package_status || "N/A"} />
            <DetailField
              label="Completed At"
              value={formatDateTime(request.package_completed_at)}
            />
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.1fr) minmax(280px, 0.9fr)",
              gap: 14,
            }}
          >
            <div
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Request Note
              </div>
              <div
                style={{
                  marginTop: 10,
                  color: "#334155",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  fontSize: 14,
                }}
              >
                {request.note || "No note added on this request."}
              </div>
            </div>

            <div
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Stock Visibility
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {stockRows.length ? (
                  stockRows.map((stock) => (
                    <div
                      key={`${request.request_id}-stock-${pick(stock.locationid, stock.location_id)}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "9px 10px",
                        borderRadius: 7,
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <span style={{ color: "#0f172a", fontSize: 13, fontWeight: 700 }}>
                        {pick(stock.locationname, stock.location_name)}
                      </span>
                      <span style={{ color: "#1d4ed8", fontWeight: 900 }}>
                        {pick(stock.availablestock, stock.available_stock, 0)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: "#64748b", fontWeight: 700 }}>
                    No stock summary available.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  padding: "12px 16px",
  textAlign: "left",
  fontWeight: "bold",
  fontSize: 14,
};

const tdStyle = {
  padding: "10px 16px",
  fontSize: 14,
  borderBottom: "1px solid #f3f4f6",
};

export default function RequestData() {
  const routeLocation = useLocation();
  const { token, role, email, locationId } = getStoredUser();

  const isAajMasterAdmin =
    role === "ADMIN" && String(email || "").toLowerCase() === "admin@robottracking.com";

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState(
    isAajMasterAdmin ? "ALL" : String(locationId || "")
  );
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const clearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
  };

  const isDateFiltered = dateFrom || dateTo;
  const scopedWarehouse = locationFilter === "ALL" ? null : getWarehouseById(locationFilter);

  const fetchRequests = useCallback(async () => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setLoading(true);
      setError("");

      const locationQuery =
        locationFilter && locationFilter !== "ALL" ? `?locationid=${locationFilter}` : "";

      const res = await axios.get(`${API_URL}/requests${locationQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRequests(Array.isArray(res.data) ? res.data.map(normalizeRequest) : []);
    } catch (err) {
      console.error("Request data fetch error:", err);
      if (err.response?.status === 401) {
        window.location.href = "/login";
        return;
      }
      setError(err.response?.data?.message || "Failed to load request data.");
    } finally {
      setLoading(false);
    }
  }, [locationFilter, token]);

  useEffect(() => {
    if (!isAajMasterAdmin && !locationFilter && locationId) {
      setLocationFilter(String(locationId));
    }
  }, [isAajMasterAdmin, locationFilter, locationId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (routeLocation.state?.statusFilter) {
      setStatusFilter(routeLocation.state.statusFilter);
    }
  }, [routeLocation.state]);

  const filteredData = useMemo(() => {
    const text = search.trim().toLowerCase();

    const fromTs = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : null;
    const toTs = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : null;

    return requests
      .filter((request) => statusFilter === "ALL" || request.status === statusFilter)
      .filter((request) => {
        if (!text) return true;

        return [
          request.request_id,
          request.requester_name,
          request.requester_surname,
          request.requester_phone,
          request.product_name,
          request.product_color,
          request.location_name,
          request.assigned_location_name,
          request.status,
        ]
          .map((value) => String(value || "").toLowerCase())
          .some((value) => value.includes(text));
      })
      .filter((request) => {
        if (!fromTs && !toTs) return true;

        const reqTs = request.request_date ? new Date(request.request_date).getTime() : null;
        if (!reqTs) return false;
        if (fromTs && reqTs < fromTs) return false;
        if (toTs && reqTs > toTs) return false;
        return true;
      })
      .sort((a, b) => Number(b.request_id) - Number(a.request_id));
  }, [requests, search, statusFilter, dateFrom, dateTo]);

  const counts = useMemo(() => {
    return requests.reduce(
      (acc, request) => {
        acc.ALL += 1;
        acc[request.status] = (acc[request.status] || 0) + 1;
        return acc;
      },
      {
        ALL: 0,
        PENDING: 0,
        PACKAGING: 0,
        FULFILLED_AT_AAJ: 0,
        TRANSFERRED: 0,
      }
    );
  }, [requests]);

  if (!isAajMasterAdmin && !locationId) {
    return (
      <div style={{ padding: 20, color: "#b91c1c", fontWeight: 800 }}>
        No location is assigned to this user.
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 20,
        backgroundColor: "#f3f4f6",
        minHeight: "calc(100vh - 68px)",
      }}
    >
      <style>{`
        .request-data-table tbody tr {
          transition: all 0.15s ease;
          cursor: pointer;
        }
        .request-data-table tbody tr:hover {
          background-color: #dbeafe !important;
          box-shadow: inset 0 0 0 1px #3b82f6;
        }
        .request-data-table tbody tr:active {
          transform: scale(0.995);
          background-color: #bfdbfe !important;
        }
        .request-data-table th,
        .request-data-table td {
          white-space: nowrap;
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
      `}</style>

      <RequestDetailModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "#1e3a5f" }}>Request Data ({filteredData.length} items)</h2>
          <p style={{ margin: "6px 0 0", color: "#475569", fontSize: 14 }}>
            {isAajMasterAdmin && locationFilter === "ALL"
              ? "Showing request data for all locations"
              : `Scoped to ${scopedWarehouse?.displayName || "your assigned location"}`}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {STATUS_OPTIONS.slice(1).map((option) => (
            <span
              key={option.value}
              style={{
                padding: "7px 10px",
                borderRadius: 6,
                background: "#ffffff",
                border: "1px solid #dbeafe",
                color: "#1e3a8a",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {option.label}: {counts[option.value] || 0}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          placeholder="Search request, product, name, phone..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 14,
            minWidth: 260,
            height: 38,
          }}
        />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 14,
            cursor: "pointer",
            height: 38,
          }}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {isAajMasterAdmin ? (
          <select
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              cursor: "pointer",
              height: 38,
            }}
          >
            <option value="ALL">All Locations</option>
            {WAREHOUSES.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.displayName}
              </option>
            ))}
          </select>
        ) : null}

        <div className="date-filter-wrapper">
          <span className="date-filter-label">Date</span>

          <input
            type="date"
            className="date-filter-input"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            title="Filter from date"
            aria-label="Filter from date"
          />

          <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>to</span>

          <input
            type="date"
            className="date-filter-input"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => setDateTo(event.target.value)}
            title="Filter to date"
            aria-label="Filter to date"
          />

          {isDateFiltered ? (
            <button
              className="date-filter-clear"
              onClick={clearDateFilter}
              title="Clear date filter"
              aria-label="Clear date filter"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginBottom: 16,
            color: "#b91c1c",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: 12,
            fontWeight: 800,
          }}
        >
          {error}
        </div>
      ) : null}

      {isDateFiltered ? (
        <div
          style={{
            marginBottom: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 12px",
            background: "#dbeafe",
            border: "1px solid #93c5fd",
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 700,
            color: "#1e40af",
          }}
        >
          <span>Filtered</span>
          <span>{dateFrom ? `From ${new Date(dateFrom).toLocaleDateString()}` : "Any start"}</span>
          <span>•</span>
          <span>{dateTo ? `To ${new Date(dateTo).toLocaleDateString()}` : "Any end"}</span>
        </div>
      ) : null}

      <div
        style={{
          backgroundColor: "white",
          borderRadius: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          overflow: "auto",
        }}
      >
        <table
          className="request-data-table"
          style={{ width: "100%", borderCollapse: "collapse" }}
        >
          <thead>
            <tr style={{ backgroundColor: "#2563eb", color: "white" }}>
              <th style={thStyle}>Request ID</th>
              <th style={thStyle}>Product</th>
              <th style={thStyle}>Color</th>
              <th style={thStyle}>Qty</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Requester</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Requested From</th>
              <th style={thStyle}>Assigned To</th>
              <th style={thStyle}>Request Date</th>
              <th style={thStyle}>Created At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: 20, color: "#6b7280", fontWeight: 700 }}>
                  Loading request data...
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: 20, color: "#6b7280", fontWeight: 700 }}>
                  No request data found
                </td>
              </tr>
            ) : (
              filteredData.map((request, index) => (
                <tr
                  key={request.request_id}
                  onClick={() => setSelectedRequest(request)}
                  style={{ backgroundColor: index % 2 === 0 ? "white" : "#f9fafb" }}
                >
                  <td style={tdStyle}>
                    <span style={{ color: "#2563eb", fontWeight: 900 }}>{request.request_id}</span>
                  </td>
                  <td style={tdStyle}>{request.product_name}</td>
                  <td style={tdStyle}>{request.product_color || "N/A"}</td>
                  <td style={tdStyle}>{request.quantity}</td>
                  <td style={tdStyle}>
                    <StatusBadge status={request.status} />
                  </td>
                  <td style={tdStyle}>
                    {`${request.requester_name || ""} ${request.requester_surname || ""}`.trim() || "N/A"}
                  </td>
                  <td style={tdStyle}>{request.requester_phone || "N/A"}</td>
                  <td style={tdStyle}>{request.location_name || "N/A"}</td>
                  <td style={tdStyle}>{request.assigned_location_name || "AAJ"}</td>
                  <td style={tdStyle}>{formatDate(request.request_date)}</td>
                  <td style={tdStyle}>{formatDateTime(request.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p style={{ color: "#6b7280", fontSize: 13, marginTop: 8 }}>
        Click any request row to open full request details.
      </p>
    </div>
  );
}