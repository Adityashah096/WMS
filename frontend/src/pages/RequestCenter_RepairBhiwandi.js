import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_URL from "../config/api";

const LOCATION_ID = 3;
const LOCATION_NAME = "Repair Bhiwandi";

const pageStyle = {
  minHeight: "calc(100vh - 68px)",
  padding: "28px 20px 44px",
  background:
    "radial-gradient(circle at top right, rgba(29,78,216,0.16), transparent 30%), linear-gradient(180deg, #f8fbff 0%, #eef2ff 48%, #f8fafc 100%)",
};
const shellStyle = {
  maxWidth: "1220px",
  margin: "0 auto",
};
const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "#dbeafe",
  color: "#1d4ed8",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};
const statusTone = {
  PENDING: { bg: "#fff7ed", color: "#c2410c", label: "Pending" },
  PACKAGING: { bg: "#dbeafe", color: "#1d4ed8", label: "Package Draft Open" },
  FULFILLED_AT_AAJ: { bg: "#dcfce7", color: "#166534", label: "Completed" },
  TRANSFERRED: { bg: "#ede9fe", color: "#6d28d9", label: "Transferred" },
};
const packageTone = {
  DRAFT: { bg: "#dbeafe", color: "#1d4ed8", label: "Draft" },
  COMPLETED: { bg: "#dcfce7", color: "#166534", label: "Completed" },
};
const cardShadow = "0 18px 46px rgba(15, 23, 42, 0.08)";

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}
function formatDateTime(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}
function padSlots(serials = [], quantity = 0) {
  return Array.from({ length: Number(quantity) || 0 }, (_, index) => serials[index] || "");
}
function compactSlots(slots = [], quantity = 0) {
  const filled = slots.map((slot) => String(slot || "").trim()).filter(Boolean);
  const remaining = Math.max(0, Number(quantity) - filled.length);
  return [...filled, ...Array.from({ length: remaining }, () => "")];
}
function StatusPill({ status, type = "request" }) {
  const toneMap = type === "package" ? packageTone : statusTone;
  const tone = toneMap[status] || { bg: "#e2e8f0", color: "#334155", label: status };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "7px 12px",
        borderRadius: "999px",
        background: tone.bg,
        color: tone.color,
        fontWeight: 800,
        fontSize: "12px",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}
    >
      {tone.label}
    </span>
  );
}
function SummaryChip({ label, value, accent = "#0f172a", bg = "#f8fafc" }) {
  return (
    <div
      style={{
        background: bg,
        border: "1px solid rgba(148, 163, 184, 0.18)",
        borderRadius: "18px",
        padding: "14px 16px",
        minWidth: "180px",
      }}
    >
      <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ marginTop: "6px", fontSize: "24px", color: accent, fontWeight: 800 }}>{value}</div>
    </div>
  );
}
function DetailBox({ label, value }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "14px",
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ marginTop: "6px", color: "#0f172a", fontSize: "15px", fontWeight: 700 }}>
        {value || "N/A"}
      </div>
    </div>
  );
}
function PackageBuilderModal({
  builder,
  actionLoading,
  actionError,
  onClose,
  onStartReplace,
  onAutoReplace,
  onEditChange,
  onApplySerial,
  onRemoveSerial,
  onConfirmPackage,
}) {
  if (!builder.open || !builder.request) {
    return null;
  }
  const quantity = Number(builder.request.quantity) || 0;
  const filledCount = builder.slots.filter((slot) => String(slot || "").trim()).length;
  const eligibleSerialOptions = builder.eligibleSerials || [];
  const serialDatalistId = `package-serial-options-${builder.request.request_id}`;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 400,
      }}
    >
      <div
        style={{
          width: "min(1080px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: "30px",
          background: "#ffffff",
          boxShadow: "0 30px 80px rgba(15,23,42,0.28)",
          padding: "26px",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            border: "none",
            borderRadius: "999px",
            width: "32px",
            height: "32px",
            fontSize: "14px",
            fontWeight: 900,
            background: "#e2e8f0",
            color: "#334155",
            cursor: "pointer",
            lineHeight: 1,
          }}
          aria-label="Close package builder"
        >
          X
        </button>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            gap: "16px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ ...badgeStyle, background: "#e0f2fe", color: "#0369a1" }}>
              {LOCATION_NAME} package builder
            </div>
            <h2 style={{ margin: "14px 0 8px", color: "#0f172a", fontSize: "34px", lineHeight: 1.02 }}>
              Package for Request #{builder.request.request_id}
            </h2>
            <p style={{ margin: 0, color: "#475569", fontSize: "15px", lineHeight: 1.7 }}>
              Auto-filled from {LOCATION_NAME} `NEW` stock. You can remove a serial, replace it with another valid serial,
              and confirm only when the package has the full requested quantity.
            </p>
          </div>
        </div>
        <div
          style={{
            marginTop: "18px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
          }}
        >
          <DetailBox label="Name" value={builder.request.requester_name} />
          <DetailBox label="Product" value={builder.request.product_name} />
          <DetailBox label="Color" value={builder.request.product_color || "Any"} />
          <DetailBox label="Requested Qty" value={builder.request.quantity} />
          <DetailBox label="Date" value={formatDate(builder.request.request_date)} />
          <DetailBox label="From Location" value={builder.request.location_name} />
        </div>
        <div
          style={{
            marginTop: "18px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <SummaryChip label="Package Filled" value={`${filledCount}/${quantity}`} accent={filledCount === quantity ? "#166534" : "#b91c1c"} bg={filledCount === quantity ? "#f0fdf4" : "#fef2f2"} />
          <SummaryChip label={`Eligible ${LOCATION_NAME} Serials`} value={eligibleSerialOptions.length} accent="#1d4ed8" bg="#eff6ff" />
        </div>
        {actionError ? (
          <div
            style={{
              marginTop: "18px",
              padding: "14px 16px",
              borderRadius: "16px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontWeight: 700,
            }}
          >
            {actionError}
          </div>
        ) : null}
        <div
          style={{
            marginTop: "20px",
            borderRadius: "24px",
            border: "1px solid #dbeafe",
            background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
            padding: "20px",
          }}
        >
          <div style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#1d4ed8", fontWeight: 800 }}>
            Package Serials
          </div>
          <datalist id={serialDatalistId}>
            {eligibleSerialOptions.map((serial) => (
              <option key={serial.serial_number} value={serial.serial_number} />
            ))}
          </datalist>
          <div style={{ marginTop: "16px", display: "grid", gap: "12px" }}>
            {builder.slots.map((serial, index) => {
              const isEditing = builder.editingIndex === index || !serial;
              const displayValue = isEditing
                ? builder.editingIndex === index
                  ? builder.editValue
                  : serial
                : serial;
              return (
                <div
                  key={`slot-${index}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "56px 1fr auto",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "999px",
                      background: "#dbeafe",
                      color: "#1d4ed8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                    }}
                  >
                    {index + 1}
                  </div>
                  <input
                    list={serialDatalistId}
                    value={displayValue}
                    readOnly={!isEditing}
                    onFocus={() => {
                      if (!serial) {
                        onStartReplace(index, "");
                      }
                    }}
                    onChange={(event) => onEditChange(index, event.target.value)}
                    placeholder={`Paste or type serial for ${builder.request.product_name}${builder.request.product_color ? ` / ${builder.request.product_color}` : ""}`}
                    style={{
                      borderRadius: "16px",
                      border: isEditing ? "1.5px solid #60a5fa" : "1px solid #cbd5e1",
                      padding: "14px 16px",
                      fontSize: "15px",
                      background: isEditing ? "#ffffff" : "#f8fafc",
                      color: "#0f172a",
                      outline: "none",
                    }}
                  />
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {isEditing ? (
                      <button
                        onClick={() => onApplySerial(index)}
                        disabled={actionLoading}
                        style={{
                          border: "none",
                          borderRadius: "14px",
                          padding: "12px 14px",
                          fontWeight: 800,
                          color: "#ffffff",
                          background: "#1d4ed8",
                          cursor: actionLoading ? "not-allowed" : "pointer",
                        }}
                      >
                        Apply
                      </button>
                    ) : (
                      <button
                        onClick={() => onAutoReplace(index)}
                        disabled={actionLoading}
                        style={{
                          border: "1px solid #bfdbfe",
                          borderRadius: "14px",
                          padding: "12px 14px",
                          fontWeight: 800,
                          color: "#1d4ed8",
                          background: "#eff6ff",
                          cursor: actionLoading ? "not-allowed" : "pointer",
                        }}
                      >
                        Replace
                      </button>
                    )}
                    <button
                      onClick={() => onRemoveSerial(index)}
                      disabled={actionLoading}
                      style={{
                        border: "none",
                        borderRadius: "14px",
                        width: "44px",
                        height: "44px",
                        fontWeight: 900,
                        color: "#ffffff",
                        background: "#ef4444",
                        cursor: actionLoading ? "not-allowed" : "pointer",
                      }}
                    >
                      X
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div
          style={{
            marginTop: "22px",
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ color: "#475569", lineHeight: 1.65, fontSize: "14px" }}>
            Confirm becomes available only when the package has exactly {quantity} valid serials from {LOCATION_NAME} `NEW` stock
            matching {builder.request.product_name}{builder.request.product_color ? ` / ${builder.request.product_color}` : ""}.
          </div>
          <button
            onClick={onConfirmPackage}
            disabled={actionLoading || filledCount !== quantity}
            style={{
              border: "none",
              borderRadius: "18px",
              padding: "16px 30px",
              fontSize: "16px",
              fontWeight: 900,
              color: "#ffffff",
              background:
                filledCount === quantity && !actionLoading
                  ? "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)"
                  : "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)",
              cursor: actionLoading || filledCount !== quantity ? "not-allowed" : "pointer",
              minWidth: "220px",
            }}
          >
            {actionLoading ? "Saving..." : "Confirm Package"}
          </button>
        </div>
      </div>
    </div>
  );
}
function RequestCard({
  request,
  actionLoading,
  transferTarget,
  onTransferTargetChange,
  onOpenPackage,
  onTransfer,
}) {
  const stockSummary = request.stock_summary || {};
  const transferOptions = stockSummary.transfer_options || [];
  const canOpenPackage =
    request.status === "PACKAGING" ||
    request.status === "TRANSFERRED" ||
    (request.status === "PENDING" && stockSummary.can_fulfill_at_location);
  const canTransfer = request.status === "PENDING" && !stockSummary.can_fulfill_at_location && transferOptions.length > 0;
  const selectedTransferTarget = transferTarget || (transferOptions[0] ? String(transferOptions[0].location_id) : "");
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.95)",
        borderRadius: "28px",
        padding: "24px",
        boxShadow: cardShadow,
        border: "1px solid rgba(148, 163, 184, 0.18)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: "13px", color: "#1d4ed8", fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase" }}>
            Request #{request.request_id}
          </div>
          <h2 style={{ margin: "8px 0 0", color: "#0f172a", fontSize: "28px", lineHeight: 1.05 }}>
            {request.product_name}
          </h2>
          {request.product_color ? (
            <div style={{ marginTop: "8px", color: "#475569", fontSize: "15px", fontWeight: 700 }}>
              Color: {request.product_color}
            </div>
          ) : null}
        </div>
        <StatusPill status={request.status} />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "12px",
          marginTop: "18px",
        }}
      >
        <DetailBox label="Name" value={request.requester_name} />
        <DetailBox label="Quantity" value={request.quantity} />
        <DetailBox label="Color" value={request.product_color || "Any"} />
        <DetailBox label="Date" value={formatDate(request.request_date)} />
        <DetailBox label="Requested From" value={request.location_name} />
        <DetailBox label="Email" value={request.requester_email || "Not provided"} />
        <DetailBox label="Created By" value={request.created_by_name || request.requester_name} />
      </div>
      <div
        style={{
          marginTop: "18px",
          display: "grid",
          gridTemplateColumns: "1.25fr 0.95fr",
          gap: "18px",
        }}
      >
        <div
          style={{
            borderRadius: "22px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            padding: "18px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Request Note
          </div>
          <div
            style={{
              marginTop: "12px",
              minHeight: "110px",
              borderRadius: "16px",
              background: "#ffffff",
              border: "1px dashed #cbd5e1",
              padding: "16px",
              color: "#334155",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
            {request.note || "No note added on this request."}
          </div>
        </div>
        <div
          style={{
            borderRadius: "22px",
            background: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)",
            border: "1px solid #bfdbfe",
            padding: "18px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#1d4ed8", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            New Stock Visibility
          </div>
          <div style={{ marginTop: "14px", display: "grid", gap: "10px" }}>
            {(stockSummary.stock_by_location || []).map((stock, index) => (
              <div
                key={`${request.request_id}-${stock.location_id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  background: "#ffffff",
                  border: "1px solid rgba(191, 219, 254, 0.9)",
                }}
              >
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "999px",
                      background: stock.location_id === LOCATION_ID ? "#1d4ed8" : "#dbeafe",
                      color: stock.location_id === LOCATION_ID ? "#ffffff" : "#1d4ed8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "12px",
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div style={{ color: "#0f172a", fontWeight: 700 }}>{stock.location_name}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      Available NEW unused units for {request.product_name}{request.product_color ? ` - ${request.product_color}` : ""}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    minWidth: "52px",
                    textAlign: "center",
                    padding: "6px 10px",
                    borderRadius: "999px",
                    background: Number(stock.available_stock) >= Number(request.quantity) ? "#dcfce7" : "#fee2e2",
                    color: Number(stock.available_stock) >= Number(request.quantity) ? "#166534" : "#b91c1c",
                    fontWeight: 800,
                  }}
                >
                  {stock.available_stock}
                </div>
              </div>
            ))}
          </div>
          {request.package_id ? (
            <div
              style={{
                marginTop: "16px",
                borderRadius: "16px",
                background: "#ffffff",
                border: "1px solid #dbeafe",
                padding: "14px 16px",
                color: "#334155",
                lineHeight: 1.65,
              }}
            >
              <div><strong>Package ID:</strong> #{request.package_id}</div>
              <div><strong>Package Status:</strong> {request.package_status}</div>
              <div><strong>Opened At:</strong> {formatDateTime(request.package_created_at)}</div>
              {request.package_completed_at ? (
                <div><strong>Completed At:</strong> {formatDateTime(request.package_completed_at)}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div
        style={{
          marginTop: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <SummaryChip
            label={`${LOCATION_NAME} new stock`}
            value={stockSummary.available_at_location ?? 0}
            accent={(stockSummary.available_at_location ?? 0) >= request.quantity ? "#166534" : "#b91c1c"}
            bg={(stockSummary.available_at_location ?? 0) >= request.quantity ? "#f0fdf4" : "#fef2f2"}
          />
          <SummaryChip
            label="Needed for request"
            value={request.quantity}
            accent="#1d4ed8"
            bg="#eff6ff"
          />
        </div>
        {(request.status === "PENDING" || request.status === "PACKAGING") ? (
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => onOpenPackage(request.request_id)}
              disabled={!canOpenPackage || actionLoading}
              style={{
                border: "none",
                borderRadius: "16px",
                padding: "14px 26px",
                fontSize: "15px",
                fontWeight: 800,
                color: "#fff",
                background: canOpenPackage ? "linear-gradient(135deg, #15803d 0%, #22c55e 100%)" : "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)",
                cursor: !canOpenPackage || actionLoading ? "not-allowed" : "pointer",
                minWidth: "190px",
              }}
            >
              {actionLoading ? "Working..." : request.status === "PACKAGING" ? "Resume Package" : "OK / Build Package"}
            </button>
            {request.status === "PENDING" && canTransfer ? (
              <>
                <select
                  value={selectedTransferTarget}
                  onChange={(event) => onTransferTargetChange(request.request_id, event.target.value)}
                  style={{
                    borderRadius: "14px",
                    border: "1px solid #cbd5e1",
                    padding: "13px 14px",
                    minWidth: "240px",
                    background: "#ffffff",
                    fontSize: "14px",
                  }}
                >
                  {transferOptions.map((option) => (
                    <option key={option.location_id} value={option.location_id}>
                      {option.location_name} - stock {option.available_stock}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onTransfer(request.request_id, selectedTransferTarget)}
                  disabled={actionLoading || !selectedTransferTarget}
                  style={{
                    border: "1px solid #c7d2fe",
                    borderRadius: "16px",
                    padding: "14px 20px",
                    fontSize: "15px",
                    fontWeight: 800,
                    color: "#4338ca",
                    background: "#eef2ff",
                    cursor: actionLoading || !selectedTransferTarget ? "not-allowed" : "pointer",
                  }}
                >
                  Transfer to other location
                </button>
              </>
            ) : request.status === "PENDING" && !canOpenPackage ? (
              <div
                style={{
                  padding: "13px 16px",
                  borderRadius: "16px",
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  color: "#9a3412",
                  fontWeight: 700,
                }}
              >
                No other location currently has enough stock for transfer.
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ color: "#475569", fontWeight: 700 }}>
            Request already handled for {LOCATION_NAME} completion workflow.
          </div>
        )}
      </div>
    </div>
  );
}
function PackageHistoryCard({ pkg }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.95)",
        borderRadius: "24px",
        padding: "22px",
        boxShadow: cardShadow,
        border: "1px solid rgba(148,163,184,0.18)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "14px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: "13px", color: "#1d4ed8", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Package #{pkg.package_id}
          </div>
          <h3 style={{ margin: "8px 0 0", color: "#0f172a", fontSize: "24px" }}>
            {pkg.product_name}{pkg.product_color ? ` - ${pkg.product_color}` : ""}
          </h3>
        </div>
        <StatusPill status={pkg.status} type="package" />
      </div>
      <div
        style={{
          marginTop: "16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "12px",
        }}
      >
        <DetailBox label="Request ID" value={pkg.request_id} />
        <DetailBox label="Requester" value={pkg.requester_name} />
        <DetailBox label="Quantity" value={`${pkg.selected_count}/${pkg.quantity}`} />
        <DetailBox label="Created By" value={pkg.created_by_name || "Admin"} />
        <DetailBox label="Created At" value={formatDateTime(pkg.created_at)} />
        <DetailBox label="Completed By" value={pkg.completed_by_name || (pkg.status === "COMPLETED" ? "Admin" : "Pending")} />
        <DetailBox label="Completed At" value={pkg.completed_at ? formatDateTime(pkg.completed_at) : "Pending"} />
      </div>
      <div
        style={{
          marginTop: "16px",
          borderRadius: "18px",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          padding: "16px",
        }}
      >
        <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", fontWeight: 800 }}>
          Serial List
        </div>
        <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {pkg.selected_serials?.length ? (
            pkg.selected_serials.map((serial) => (
              <span
                key={`${pkg.package_id}-${serial}`}
                style={{
                  padding: "10px 12px",
                  borderRadius: "999px",
                  background: "#ffffff",
                  border: "1px solid #bfdbfe",
                  color: "#0f172a",
                  fontWeight: 700,
                  fontSize: "13px",
                }}
              >
                {serial}
              </span>
            ))
          ) : (
            <span style={{ color: "#64748b", fontWeight: 600 }}>No serials saved yet.</span>
          )}
        </div>
      </div>
    </div>
  );
}
export default function RequestCenterRepairBhiwandi() {
  const [requests, setRequests] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [transferTargets, setTransferTargets] = useState({});
  const [builder, setBuilder] = useState({
    open: false,
    request: null,
    package: null,
    eligibleSerials: [],
    stockSummary: null,
    slots: [],
    editingIndex: null,
    editValue: "",
  });
  const [builderError, setBuilderError] = useState("");
  const [builderLoading, setBuilderLoading] = useState(false);
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const userLocationId = localStorage.getItem("location_id");
  const applyBuilderPayload = useCallback((payload) => {
    const quantity = Number(payload.request?.quantity) || 0;
    setBuilder({
      open: true,
      request: payload.request,
      package: payload.package,
      eligibleSerials: payload.eligible_serials || [],
      stockSummary: payload.stock_summary || null,
      slots: padSlots(payload.selected_serials || [], quantity),
      editingIndex: null,
      editValue: "",
    });
  }, []);
  const fetchRequests = useCallback(async () => {
    const res = await axios.get(`${API_URL}/requests?location_id=${LOCATION_ID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const nextRequests = (Array.isArray(res.data) ? res.data : []).filter(
      (request) => Number(request.assigned_location_id || 1) === LOCATION_ID
    );
    setRequests(nextRequests);
    setTransferTargets((current) => {
      const next = { ...current };
      nextRequests.forEach((request) => {
        const firstOption = request.stock_summary?.transfer_options?.[0];
        if (firstOption && !next[request.request_id]) {
          next[request.request_id] = String(firstOption.location_id);
        }
      });
      return next;
    });
  }, [token]);
  const fetchPackages = useCallback(async () => {
    const res = await axios.get(`${API_URL}/requests/packages?location_id=${LOCATION_ID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setPackages(Array.isArray(res.data) ? res.data : []);
  }, [token]);
  const fetchPageData = useCallback(async () => {
    if (!token) {
      window.location.href = "/login";
      return;
    }
    try {
      setLoading(true);
      setError("");
      await Promise.all([fetchRequests(), fetchPackages()]);
    } catch (err) {
      console.error("Request center fetch error", err);
      if (err.response?.status === 401) {
        window.location.href = "/login";
        return;
      }
      setError(err.response?.data?.message || "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }, [fetchPackages, fetchRequests, token]);
  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);
  const filteredRequests = useMemo(() => {
    if (statusFilter === "ALL") return requests;
    return requests.filter((request) => request.status === statusFilter);
  }, [requests, statusFilter]);
  const pendingCount = requests.filter((request) => request.status === "PENDING").length;
  const packagingCount = requests.filter((request) => request.status === "PACKAGING").length;
  const completedCount = requests.filter((request) => request.status === "FULFILLED_AT_AAJ").length;
  const transferredCount = requests.filter((request) => request.status === "TRANSFERRED").length;
  const handleOpenPackage = async (requestId) => {
    try {
      setActionLoadingId(requestId);
      setActionMessage("");
      setBuilderError("");
      const res = await axios.post(
        `${API_URL}/requests/${requestId}/approve`,
        { locationId: LOCATION_ID },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      applyBuilderPayload(res.data);
      setActionMessage(`Package builder opened for request #${requestId}.`);
      await Promise.all([fetchRequests(), fetchPackages()]);
    } catch (err) {
      console.error("Open package error", err);
      setError(err.response?.data?.message || "Failed to open package builder.");
    } finally {
      setActionLoadingId(null);
    }
  };
  const persistDraft = async (requestId, nextSlots) => {
    setBuilderLoading(true);
    setBuilderError("");
    try {
      const serialNumbers = nextSlots.map((slot) => String(slot || "").trim()).filter(Boolean);
      const res = await axios.put(
        `${API_URL}/requests/${requestId}/package-draft`,
        { serialNumbers, locationId: LOCATION_ID },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      applyBuilderPayload(res.data);
      await Promise.all([fetchRequests(), fetchPackages()]);
    } catch (err) {
      console.error("Save package draft error", err);
      setBuilderError(err.response?.data?.message || "Failed to save package draft.");
    } finally {
      setBuilderLoading(false);
    }
  };
  const handleTransfer = async (requestId, targetLocationId) => {
    if (!targetLocationId) return;
    try {
      setActionLoadingId(requestId);
      setActionMessage("");
      await axios.post(
        `${API_URL}/requests/${requestId}/transfer`,
        { targetLocationId: Number(targetLocationId) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActionMessage(`Request #${requestId} transferred successfully.`);
      await Promise.all([fetchRequests(), fetchPackages()]);
    } catch (err) {
      console.error("Transfer request error", err);
      setError(err.response?.data?.message || "Failed to transfer request.");
    } finally {
      setActionLoadingId(null);
    }
  };
  const handleTransferTargetChange = (requestId, value) => {
    setTransferTargets((current) => ({ ...current, [requestId]: value }));
  };
  const handleAutoReplace = async (index) => {
    const requestId = builder.request?.request_id;
    if (!requestId) return;
    const currentSerial = String(builder.slots[index] || "").trim();
    if (!currentSerial) {
      setBuilderError("There is no serial in this slot to replace.");
      return;
    }
    const eligibleSerials = (builder.eligibleSerials || []).map((serial) => serial.serial_number);
    const usedElsewhere = new Set(
      builder.slots
        .filter((slot, slotIndex) => slotIndex !== index)
        .map((slot) => String(slot || "").trim())
        .filter(Boolean)
    );
    const currentIndex = eligibleSerials.indexOf(currentSerial);
    const orderedCandidates =
      currentIndex >= 0
        ? [...eligibleSerials.slice(currentIndex + 1), ...eligibleSerials.slice(0, currentIndex)]
        : eligibleSerials;
    const replacementSerial = orderedCandidates.find(
      (serial) => serial !== currentSerial && !usedElsewhere.has(serial)
    );
    if (!replacementSerial) {
      setBuilderError("No alternate eligible serial is available to replace this item.");
      return;
    }
    const nextSlots = [...builder.slots];
    nextSlots[index] = replacementSerial;
    await persistDraft(requestId, nextSlots);
  };
  const handleStartReplace = (index, currentSerial = "") => {
    setBuilder((current) => ({
      ...current,
      editingIndex: index,
      editValue: currentSerial,
    }));
    setBuilderError("");
  };
  const handleEditChange = (index, value) => {
    setBuilder((current) => ({
      ...current,
      editingIndex: index,
      editValue: value,
    }));
  };
  const handleApplySerial = async (index) => {
    const requestId = builder.request?.request_id;
    if (!requestId || builder.editingIndex !== index) {
      return;
    }
    const candidate = String(builder.editValue || "").trim();
    const eligibleSet = new Set((builder.eligibleSerials || []).map((serial) => serial.serial_number));
    if (!candidate) {
      setBuilderError("Please paste or enter a serial number before applying.");
      return;
    }
    if (!eligibleSet.has(candidate)) {
      setBuilderError(
        `Serial ${candidate} is not valid for ${builder.request.product_name}${builder.request.product_color ? ` / ${builder.request.product_color}` : ""} at ${LOCATION_NAME} NEW stock.`
      );
      return;
    }
    const duplicateIndex = builder.slots.findIndex(
      (slot, slotIndex) => slotIndex !== index && String(slot || "").trim() === candidate
    );
    if (duplicateIndex >= 0) {
      setBuilderError(`Serial ${candidate} is already used in this package.`);
      return;
    }
    const nextSlots = [...builder.slots];
    nextSlots[index] = candidate;
    const normalizedSlots = padSlots(nextSlots.filter(Boolean), builder.request.quantity);
    await persistDraft(requestId, normalizedSlots);
  };
  const handleRemoveSerial = async (index) => {
    const requestId = builder.request?.request_id;
    if (!requestId) return;
    const nextSlots = compactSlots(
      builder.slots.filter((_, slotIndex) => slotIndex !== index),
      builder.request.quantity
    );
    await persistDraft(requestId, nextSlots);
  };
  const handleConfirmPackage = async () => {
    const requestId = builder.request?.request_id;
    if (!requestId) return;
    const serialNumbers = builder.slots.map((slot) => String(slot || "").trim()).filter(Boolean);
    if (serialNumbers.length !== Number(builder.request.quantity)) {
      setBuilderError("The package must contain exactly the requested quantity before confirmation.");
      return;
    }
    try {
      setBuilderLoading(true);
      setBuilderError("");
      const res = await axios.post(
        `${API_URL}/requests/${requestId}/package-confirm`,
        { serialNumbers, locationId: LOCATION_ID },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      applyBuilderPayload(res.data);
      setActionMessage(`Package #${res.data.package?.package_id || ""} confirmed for request #${requestId}.`);
      setBuilder((current) => ({ ...current, open: false }));
      await Promise.all([fetchRequests(), fetchPackages()]);
    } catch (err) {
      console.error("Confirm package error", err);
      setBuilderError(err.response?.data?.message || "Failed to confirm package.");
    } finally {
      setBuilderLoading(false);
    }
  };
  if (role !== "ADMIN" && Number(userLocationId) !== LOCATION_ID) {
    return (
      <div style={{ padding: "24px", color: "#b91c1c", fontWeight: 700 }}>
        Only {LOCATION_NAME} users can access the {LOCATION_NAME} request center.
      </div>
    );
  }
  return (
    <div style={pageStyle}>
      <PackageBuilderModal
        builder={builder}
        actionLoading={builderLoading}
        actionError={builderError}
        onClose={() => setBuilder((current) => ({ ...current, open: false, editingIndex: null, editValue: "" }))}
        onStartReplace={handleStartReplace}
        onAutoReplace={handleAutoReplace}
        onEditChange={handleEditChange}
        onApplySerial={handleApplySerial}
        onRemoveSerial={handleRemoveSerial}
        onConfirmPackage={handleConfirmPackage}
      />
      <div style={shellStyle}>
        <div
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #2563eb 100%)",
            color: "#ffffff",
            padding: "28px",
            borderRadius: "30px",
            boxShadow: "0 28px 70px rgba(29, 78, 216, 0.22)",
          }}
        >
          <div style={badgeStyle}>{LOCATION_NAME} request completion portal</div>
          <h1 style={{ margin: "16px 0 10px", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: 1.02 }}>
            All location requests arrive here for {LOCATION_NAME} completion
          </h1>
          <p style={{ margin: 0, maxWidth: "760px", lineHeight: 1.75, color: "rgba(255,255,255,0.82)", fontSize: "16px" }}>
            Press `OK / Build Package` to open a package tab-like builder. It auto-populates matching serials
            from {LOCATION_NAME} `NEW` stock for the requested product, color, and quantity. You can remove, replace, and confirm
            only when the package has the full requested quantity.
          </p>
          <div
            style={{
              marginTop: "24px",
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <SummaryChip label="Pending" value={pendingCount} accent="#fff" bg="rgba(255,255,255,0.12)" />
            <SummaryChip label="Packaging" value={packagingCount} accent="#fff" bg="rgba(255,255,255,0.12)" />
            <SummaryChip label="Completed" value={completedCount} accent="#fff" bg="rgba(255,255,255,0.12)" />
            <SummaryChip label="Transferred" value={transferredCount} accent="#fff" bg="rgba(255,255,255,0.12)" />
          </div>
        </div>
        <div
          style={{
            marginTop: "20px",
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, color: "#334155", letterSpacing: "0.05em", textTransform: "uppercase", fontSize: "12px" }}>
              Filter
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{
                borderRadius: "14px",
                border: "1px solid #cbd5e1",
                padding: "12px 14px",
                background: "#ffffff",
                fontSize: "14px",
              }}
            >
              <option value="ALL">All requests</option>
              <option value="PENDING">Pending</option>
              <option value="PACKAGING">Packaging</option>
              <option value="FULFILLED_AT_AAJ">Completed</option>
              <option value="TRANSFERRED">Transferred</option>
            </select>
          </div>
          {actionMessage ? (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "14px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
                fontWeight: 700,
              }}
            >
              {actionMessage}
            </div>
          ) : null}
        </div>
        {error ? (
          <div
            style={{
              marginTop: "18px",
              padding: "14px 16px",
              borderRadius: "16px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : null}
        <div style={{ marginTop: "24px" }}>
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: "28px" }}>Request Queue</h2>
          <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.7 }}>
            Each request can be packaged at {LOCATION_NAME}, or transferred elsewhere only if {LOCATION_NAME} cannot fulfill it.
          </p>
        </div>
        {loading ? (
          <div style={{ marginTop: "24px", color: "#334155", fontWeight: 700 }}>Loading requests...</div>
        ) : (
          <div style={{ marginTop: "24px", display: "grid", gap: "22px" }}>
            {filteredRequests.length === 0 ? (
              <div
                style={{
                  background: "rgba(255,255,255,0.95)",
                  borderRadius: "24px",
                  padding: "28px",
                  boxShadow: cardShadow,
                  color: "#475569",
                  fontWeight: 700,
                }}
              >
                No requests found for the current filter.
              </div>
            ) : (
              filteredRequests.map((request) => (
                <RequestCard
                  key={request.request_id}
                  request={request}
                  actionLoading={actionLoadingId === request.request_id}
                  transferTarget={transferTargets[request.request_id]}
                  onTransferTargetChange={handleTransferTargetChange}
                  onOpenPackage={handleOpenPackage}
                  onTransfer={handleTransfer}
                />
              ))
            )}
          </div>
        )}
        <div style={{ marginTop: "34px" }}>
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: "28px" }}>Package History</h2>
          <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.7 }}>
            View every draft and completed package, including who created it, who completed it, timestamps, and all serials included.
          </p>
        </div>
        <div style={{ marginTop: "22px", display: "grid", gap: "18px" }}>
          {packages.length === 0 ? (
            <div
              style={{
                background: "rgba(255,255,255,0.95)",
                borderRadius: "24px",
                padding: "28px",
                boxShadow: cardShadow,
                color: "#475569",
                fontWeight: 700,
              }}
            >
              No packages created yet.
            </div>
          ) : (
            packages.map((pkg) => <PackageHistoryCard key={pkg.package_id} pkg={pkg} />)
          )}
        </div>
      </div>
    </div>
  );
}
