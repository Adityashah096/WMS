import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import API_URL from "../config/api";
import { getStoredUser } from "../utils/auth";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "ALL",              label: "All statuses" },
  { value: "PENDING",          label: "Pending" },
  { value: "PACKAGING",        label: "Packaging" },
  { value: "FULFILLED_AT_AAJ", label: "Completed" },
  { value: "TRANSFERRED",      label: "Transferred" },
  { value: "REJECTED",         label: "Rejected" },
];

const PRODUCT_OPTIONS = ["ALL", "GKS", "Miko 3", "Miko Mini", "Sparky"];

const STATUS_TONE = {
  PENDING:          { bg: "#fff7ed", color: "#c2410c", label: "Pending" },
  PACKAGING:        { bg: "#dbeafe", color: "#1d4ed8", label: "Packaging" },
  FULFILLED_AT_AAJ: { bg: "#dcfce7", color: "#166534", label: "Completed" },
  TRANSFERRED:      { bg: "#ede9fe", color: "#6d28d9", label: "Transferred" },
  REJECTED:         { bg: "#fef2f2", color: "#b91c1c", label: "Rejected" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (v) => (v ? new Date(v).toLocaleDateString() : "N/A");
const formatDateTime = (v) => (v ? new Date(v).toLocaleString() : "N/A");

// ─── Styles ───────────────────────────────────────────────────────────────────

const pageStyle = {
  padding: "20px",
  backgroundColor: "#f3f4f6",
  minHeight: "100vh",
};

const headerCardStyle = {
  background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #2563eb 100%)",
  color: "#ffffff",
  padding: "28px",
  borderRadius: "16px",
  marginBottom: "20px",
  boxShadow: "0 28px 70px rgba(29,78,216,0.22)",
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 14px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.15)",
  color: "#fff",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "14px",
};

const chipStyle = {
  background: "rgba(255,255,255,0.12)",
  borderRadius: "14px",
  padding: "14px 18px",
  minWidth: "110px",
};

const filterBarStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: "14px",
};

const filterInputStyle = {
  padding: "9px 13px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "13px",
  background: "#fff",
  color: "#0f172a",
};

const tableWrapStyle = {
  background: "#fff",
  borderRadius: "10px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  overflow: "auto",
};

const thStyle = {
  padding: "11px 14px",
  textAlign: "left",
  fontWeight: 700,
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "10px 14px",
  fontSize: "13px",
  borderBottom: "1px solid #f3f4f6",
  verticalAlign: "middle",
  color: "#0f172a",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const tone = STATUS_TONE[status] || { bg: "#e2e8f0", color: "#334155", label: status };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "4px 10px", borderRadius: "999px",
      background: tone.bg, color: tone.color,
      fontSize: "11px", fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.05em",
      whiteSpace: "nowrap",
    }}>
      {tone.label}
    </span>
  );
}

function SummaryChip({ label, value }) {
  return (
    <div style={chipStyle}>
      <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(255,255,255,0.65)", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: "22px", fontWeight: 800, color: "#fff", marginTop: "4px" }}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function DetailBox({ label, value }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0",
      borderRadius: "10px", padding: "10px 13px",
    }}>
      <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ marginTop: "5px", color: "#0f172a", fontSize: "14px", fontWeight: 700 }}>
        {value || "N/A"}
      </div>
    </div>
  );
}

function ExpandedRow({ request }) {
  return (
    <tr>
      <td colSpan={10} style={{ padding: 0, borderBottom: "1px solid #e2e8f0" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "10px",
          padding: "16px 14px",
          background: "#f8fafc",
        }}>
          <DetailBox label="Phone" value={request.requester_phone} />
          <DetailBox label="Email" value={request.requester_email} />
          <DetailBox label="From location" value={request.location_name} />
          <DetailBox label="Assigned to" value={request.assigned_location_name} />
          <DetailBox label="Processed by" value={request.processed_by_name} />
          <DetailBox label="Processed at" value={formatDateTime(request.processed_at)} />
          {request.decision_note && (
            <DetailBox label="Decision note" value={request.decision_note} />
          )}
          {request.rejection_reason && (
            <DetailBox label="Rejection reason" value={request.rejection_reason} />
          )}
          {request.note && (
            <div style={{
              gridColumn: "1 / -1",
              background: "#fff", border: "1px solid #e2e8f0",
              borderRadius: "10px", padding: "10px 13px",
            }}>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", fontWeight: 700, marginBottom: "5px" }}>
                Request note
              </div>
              <div style={{ color: "#334155", fontSize: "13px", lineHeight: 1.65 }}>
                {request.note}
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function RequestRow({ request, isExpanded, onToggle }) {
  const fullName = [request.requester_name, request.requester_surname].filter(Boolean).join(" ");
  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          cursor: "pointer",
          background: isExpanded ? "#eff6ff" : "white",
          transition: "background 0.12s",
        }}
        onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = "#f0f9ff"; }}
        onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = "white"; }}
      >
        <td style={{ ...tdStyle, color: "#94a3b8", fontSize: "12px" }}>#{request.request_id}</td>
        <td style={tdStyle}>
          <span style={{ fontWeight: 700 }}>{fullName}</span>
        </td>
        <td style={tdStyle}>{request.product_name}</td>
        <td style={tdStyle}>{request.product_color || <span style={{ color: "#94a3b8" }}>—</span>}</td>
        <td style={{ ...tdStyle, fontWeight: 700 }}>{request.quantity}</td>
        <td style={tdStyle}><StatusPill status={request.status} /></td>
        <td style={tdStyle}>{request.location_name}</td>
        <td style={{ ...tdStyle, fontSize: "12px", color: "#64748b" }}>{formatDate(request.request_date)}</td>
        <td style={{ ...tdStyle, fontSize: "12px", color: "#64748b" }}>{request.processed_by_name || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
        <td style={{ ...tdStyle, fontSize: "12px", color: "#64748b" }}>{formatDateTime(request.processed_at)}</td>
      </tr>
      {isExpanded && <ExpandedRow request={request} />}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RequestList() {
  const { token, role } = getStoredUser();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterProduct, setFilterProduct] = useState("ALL");
  const [filterLocation, setFilterLocation] = useState("ALL");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const fetchRequests = useCallback(async () => {
    if (!token) { window.location.href = "/login"; return; }
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API_URL}/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Request list fetch error", err);
      if (err.response?.status === 401) {
        window.location.href = "/login";
      } else {
        setError(err.response?.data?.message || "Failed to load requests.");
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Counts for header chips (always from full list, not filtered)
  const counts = {
    PENDING:          requests.filter((r) => r.status === "PENDING").length,
    PACKAGING:        requests.filter((r) => r.status === "PACKAGING").length,
    FULFILLED_AT_AAJ: requests.filter((r) => r.status === "FULFILLED_AT_AAJ").length,
    TRANSFERRED:      requests.filter((r) => r.status === "TRANSFERRED").length,
    REJECTED:         requests.filter((r) => r.status === "REJECTED").length,
  };

  // Unique locations for location filter dropdown
  const locationOptions = ["ALL", ...new Set(requests.map((r) => r.location_name).filter(Boolean))].sort();

  // Apply filters
  const filtered = requests.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (r.requester_name + " " + (r.requester_surname || "")).toLowerCase().includes(q) ||
      (r.product_name || "").toLowerCase().includes(q) ||
      (r.requester_email || "").toLowerCase().includes(q) ||
      String(r.request_id).includes(q);
    const matchStatus   = filterStatus === "ALL"   || r.status === filterStatus;
    const matchProduct  = filterProduct === "ALL"  || r.product_name === filterProduct;
    const matchLocation = filterLocation === "ALL" || r.location_name === filterLocation;
    const matchFrom     = !filterDateFrom || r.request_date >= filterDateFrom;
    const matchTo       = !filterDateTo   || r.request_date <= filterDateTo;
    return matchSearch && matchStatus && matchProduct && matchLocation && matchFrom && matchTo;
  });

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  if (role !== "ADMIN") {
    return (
      <div style={{ padding: "24px", color: "#b91c1c", fontWeight: 700 }}>
        Only admins can view the request list.
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <style>{`
        .req-row:hover { background: #f0f9ff !important; }
        .req-row:active { transform: scale(0.998); }
      `}</style>

      {/* ── Header ── */}
      <div style={headerCardStyle}>
        <div style={badgeStyle}>AAJ request list</div>
        <h1 style={{ margin: "0 0 8px", fontSize: "clamp(22px,3.5vw,34px)", fontWeight: 800, lineHeight: 1.05 }}>
          All requests
        </h1>
        <p style={{ margin: "0 0 22px", color: "rgba(255,255,255,0.78)", fontSize: "15px", lineHeight: 1.7, maxWidth: "680px" }}>
          View and filter every request across all locations — pending, packaging, completed, transferred, and rejected.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          <SummaryChip label="Pending"     value={counts.PENDING} />
          <SummaryChip label="Packaging"   value={counts.PACKAGING} />
          <SummaryChip label="Completed"   value={counts.FULFILLED_AT_AAJ} />
          <SummaryChip label="Transferred" value={counts.TRANSFERRED} />
          <SummaryChip label="Rejected"    value={counts.REJECTED} />
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div style={filterBarStyle}>
        <input
          style={{ ...filterInputStyle, minWidth: "220px" }}
          placeholder="Search name, product, ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={filterInputStyle} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select style={filterInputStyle} value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
          {PRODUCT_OPTIONS.map((p) => <option key={p} value={p}>{p === "ALL" ? "All products" : p}</option>)}
        </select>
        <select style={filterInputStyle} value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
          {locationOptions.map((l) => <option key={l} value={l}>{l === "ALL" ? "All locations" : l}</option>)}
        </select>
        <input
          style={{ ...filterInputStyle, minWidth: "140px" }}
          type="date" value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          title="From date"
        />
        <input
          style={{ ...filterInputStyle, minWidth: "140px" }}
          type="date" value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          title="To date"
        />
        {(search || filterStatus !== "ALL" || filterProduct !== "ALL" || filterLocation !== "ALL" || filterDateFrom || filterDateTo) && (
          <button
            onClick={() => { setSearch(""); setFilterStatus("ALL"); setFilterProduct("ALL"); setFilterLocation("ALL"); setFilterDateFrom(""); setFilterDateTo(""); }}
            style={{
              padding: "9px 14px", border: "1px solid #fecaca", borderRadius: "8px",
              background: "#fef2f2", color: "#b91c1c", fontSize: "13px", fontWeight: 700, cursor: "pointer",
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Count label ── */}
      <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "10px" }}>
        Showing <strong style={{ color: "#0f172a" }}>{filtered.length}</strong> of {requests.length} requests
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          marginBottom: "16px", padding: "14px 16px", borderRadius: "12px",
          background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontWeight: 700,
        }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div style={{ padding: "24px", color: "#334155", fontWeight: 700 }}>Loading requests…</div>
      ) : (
        <div style={tableWrapStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#2563eb", color: "#fff" }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Requester</th>
                <th style={thStyle}>Product</th>
                <th style={thStyle}>Color</th>
                <th style={thStyle}>Qty</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Processed by</th>
                <th style={thStyle}>Processed at</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "32px", color: "#6b7280" }}>
                    No requests match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <RequestRow
                    key={r.request_id}
                    request={r}
                    isExpanded={expandedId === r.request_id}
                    onToggle={() => toggleExpand(r.request_id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "10px" }}>
        💡 Click any row to expand full request details.
      </p>
    </div>
  );
}