import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_URL from "../config/api";

const pageStyle = {
  minHeight: "calc(100vh - 68px)",
  padding: "28px 20px 44px",
  background:
    "radial-gradient(circle at top right, rgba(29,78,216,0.10), transparent 28%), linear-gradient(180deg, #f8fbff 0%, #eef4ff 48%, #f8fafc 100%)",
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
  PENDING: { bg: "#fff7ed", color: "#c2410c", label: "Pending at AAJ" },
  PACKAGING: { bg: "#dbeafe", color: "#1d4ed8", label: "Package Draft Open" },
  FULFILLED_AT_AAJ: {
    bg: "#dcfce7",
    color: "#166534",
    label: "Completed by AAJ",
  },
  FULFILLEDATAAJ: {
    bg: "#dcfce7",
    color: "#166534",
    label: "Completed by AAJ",
  },
  TRANSFERRED: { bg: "#ede9fe", color: "#6d28d9", label: "Transferred out" },
  REJECTED: { bg: "#fef2f2", color: "#b91c1c", label: "Rejected" },
};

const packageTone = {
  DRAFT: { bg: "#dbeafe", color: "#1d4ed8", label: "Draft" },
  COMPLETED: { bg: "#dcfce7", color: "#166534", label: "Completed" },
};

const cardShadow = "0 18px 46px rgba(15, 23, 42, 0.08)";

const pick = (...values) =>
  values.find((value) => value !== undefined && value !== null);

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  localStorage.getItem("authToken") ||
  "";

const getRole = () =>
  localStorage.getItem("role") ||
  localStorage.getItem("userRole") ||
  localStorage.getItem("user_role") ||
  "";

const getStockSummary = (raw = {}) => raw?.stocksummary || raw?.stock_summary || {};

const getTransferOptions = (stockSummary = {}) =>
  stockSummary.transferoptions ||
  stockSummary.transfer_options ||
  stockSummary.transferOptions ||
  [];

const getStockByLocation = (stockSummary = {}) =>
  stockSummary.stockbylocation ||
  stockSummary.stock_by_location ||
  stockSummary.stockByLocation ||
  [];

const getAvailableAtAAJ = (stockSummary = {}) =>
  Number(
    pick(
      stockSummary.availableataaj,
      stockSummary.available_at_aaj,
      stockSummary.availableAtAaj,
      0
    )
  ) || 0;

const getCanFulfillAtAAJ = (stockSummary = {}) =>
  Boolean(
    pick(
      stockSummary.canfulfillataaj,
      stockSummary.can_fulfill_at_aaj,
      stockSummary.canFulfillAtAaj,
      false
    )
  );

function normalizeStatus(status) {
  if (!status) return "PENDING";
  if (status === "FULFILLEDATAAJ") return "FULFILLED_AT_AAJ";
  return status;
}

function normalizeRequest(raw = {}) {
  // Handle multiple products - keep all product data for detail view
  const products = Array.isArray(raw.products) ? raw.products : [];
  const firstProduct = products[0] || {};
  
  return {
    raw,
    requestId: pick(raw.requestid, raw.request_id, raw.id),
    productName: firstProduct.product_name || pick(raw.productname, raw.product_name),
    productColor: firstProduct.color_name || pick(raw.productcolor, raw.product_color),
    quantity: products.reduce(
  (sum, p) => sum + Number(p.quantity || 0),
  0
),
    requesterName: pick(raw.requestername, raw.requester_name),
    requesterSurname: pick(raw.requestersurname, raw.requester_surname),
    requesterPhone: pick(raw.requesterphone, raw.requester_phone),
    requesterEmail: pick(raw.requesteremail, raw.requester_email),
    locationName: pick(raw.locationname, raw.location_name),
    assignedLocationName: pick(raw.assignedlocationname, raw.assigned_location_name),
    requestDate: pick(raw.requestdate, raw.request_date),
    createdAt: pick(raw.createdat, raw.created_at),
    createdByName: pick(raw.createdbyname, raw.created_by_name),
    note: pick(raw.note, raw.request_note),
    status: normalizeStatus(pick(raw.status, raw.request_status)),
    packageId: pick(raw.packageid, raw.package_id),
    packageStatus: pick(raw.packagestatus, raw.package_status),
    packageCreatedAt: pick(raw.packagecreatedat, raw.package_created_at),
    packageCompletedAt: pick(raw.packagecompletedat, raw.package_completed_at),
    stockSummary: getStockSummary(raw),
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

function normalizePackage(raw = {}) {
  return {
    raw,
    packageId: pick(raw.packageid, raw.package_id),
    requestId: pick(raw.requestid, raw.request_id),
    productName: pick(raw.productname, raw.product_name),
    productColor: pick(raw.productcolor, raw.product_color),
    requesterName: pick(raw.requestername, raw.requester_name),
    requesterSurname: pick(raw.requestersurname, raw.requester_surname),
    quantity: Number(pick(raw.quantity, 0)) || 0,
    selectedCount: Number(pick(raw.selectedcount, raw.selected_count, 0)) || 0,
    createdByName: pick(raw.createdbyname, raw.created_by_name),
    createdAt: pick(raw.createdat, raw.created_at),
    completedByName: pick(raw.completedbyname, raw.completed_by_name),
    completedAt: pick(raw.completedat, raw.completed_at),
    status: pick(raw.status, raw.package_status),
    selectedSerials: pick(raw.selectedserials, raw.selected_serials, []),
  };
}

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
}

function extractDeliveryDate(note) {
  if (!note) return null;

  const singleMatch = note.match(/WANTED DELIVERY DATE:\s*([^\n\r]+)/i);
  if (singleMatch?.[1]) {
    const parsed = Date.parse(singleMatch[1].trim());
    if (!Number.isNaN(parsed)) return new Date(parsed);
  }

  const rangeMatch = note.match(/WANTED DELIVERY RANGE:\s*([^\n\r]+)/i);
  if (rangeMatch?.[1]) {
    const parsed = Date.parse(rangeMatch[1].trim());
    if (!Number.isNaN(parsed)) return new Date(parsed);
  }

  return null;
}

function padSlots(serials = [], quantity = 0) {
  return Array.from({ length: Number(quantity) || 0 }, (_, index) => serials[index] || "");
}

function StatusPill({ status, type = "request" }) {
  const normalized = normalizeStatus(status);
  const toneMap = type === "package" ? packageTone : statusTone;
  const tone = toneMap[normalized] || {
    bg: "#e2e8f0",
    color: "#334155",
    label: normalized || "N/A",
  };

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
        fontSize: 12,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}
    >
      {tone.label}
    </span>
  );
}

function SummaryChip({
  label,
  value,
  accent = "#0f172a",
  bg = "#f8fafc",
  labelColor = "#64748b",
  borderColor = "#dbeafe",
  onClick,
  isClickable = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 20,
        padding: "16px 20px",
        minWidth: 180,
        textAlign: "left",
        boxShadow: isClickable ? "0 8px 20px rgba(15, 23, 42, 0.10)" : "none",
        cursor: isClickable ? "pointer" : "default",
      }}
    >
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: labelColor,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 28,
          color: accent,
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {isClickable ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: labelColor,
            fontWeight: 700,
            letterSpacing: "0.05em",
          }}
        >
          VIEW ALL
        </div>
      ) : null}
    </button>
  );
}

function DetailBox({ label, value }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "#64748b",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          color: "#0f172a",
          fontSize: 15,
          fontWeight: 700,
          wordBreak: "break-word",
        }}
      >
        {value || "N/A"}
      </div>
    </div>
  );
}

function SerialComboBox({
  value,
  options,
  usedElsewhere,
  productName,
  productColor,
  onChange,
}) {
  const [search, setSearch] = useState(value || "");
  const [open, setOpen] = useState(false);

  const filtered = (options || []).filter((opt) =>
    String(opt.serialnumber || opt.serial_number || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const placeholder = `Search serial for ${productName || "product"}${
    productColor ? ` / ${productColor}` : ""
  }`;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        placeholder={placeholder}
        style={{
          borderRadius: 16,
          border: "1.5px solid #60a5fa",
          padding: "14px 16px",
          fontSize: 15,
          background: "#ffffff",
          color: "#0f172a",
          outline: "none",
          width: "100%",
          boxSizing: "border-box",
        }}
      />

      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#ffffff",
            border: "1.5px solid #60a5fa",
            borderRadius: 14,
            boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
            zIndex: 500,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: "12px 16px", color: "#94a3b8", fontSize: 14 }}>
              No matching serials
            </div>
          ) : (
            filtered.map((opt) => {
              const serial = String(opt.serialnumber || opt.serial_number || "");
              const isUsed = usedElsewhere.has(serial);

              return (
                <div
                  key={serial}
                  onMouseDown={() => {
                    if (isUsed) return;
                    setSearch(serial);
                    onChange(serial);
                    setOpen(false);
                  }}
                  style={{
                    padding: "12px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                    color: isUsed ? "#94a3b8" : "#0f172a",
                    background: isUsed ? "#f8fafc" : "#ffffff",
                    cursor: isUsed ? "not-allowed" : "pointer",
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{serial}</span>
                  {isUsed ? (
                    <span
                      style={{
                        fontSize: 11,
                        color: "#94a3b8",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                      }}
                    >
                      ALREADY SELECTED
                    </span>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}
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
  if (!builder.open || !builder.request) return null;

  const quantity = Number(builder.request.quantity || 0);
  const filledCount = builder.slots.filter((slot) => String(slot || "").trim().length).length;
  const eligibleSerialOptions = builder.eligibleSerials || [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 400,
      }}
    >
      <div
        style={{
          width: "min(1080px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: 30,
          background: "#ffffff",
          boxShadow: "0 30px 80px rgba(15,23,42,0.28)",
          padding: 26,
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            border: "none",
            borderRadius: "999px",
            width: 32,
            height: 32,
            fontSize: 14,
            fontWeight: 900,
            background: "#e2e8f0",
            color: "#334155",
            cursor: "pointer",
            lineHeight: 1,
          }}
          aria-label="Close package builder"
        >
          ×
        </button>

        <div style={{ ...badgeStyle, background: "#e0f2fe", color: "#0369a1" }}>
          AAJ package builder
        </div>

        <h2
          style={{
            margin: "14px 0 8px",
            color: "#0f172a",
            fontSize: 34,
            lineHeight: 1.02,
          }}
        >
          Package for Request #{builder.request.requestId}
        </h2>

        <p style={{ margin: 0, color: "#475569", fontSize: 15, lineHeight: 1.7 }}>
          Auto-filled from AAJ NEW stock. You can remove a serial, replace it with another
          valid serial, and confirm only when the package count matches the request quantity.
        </p>

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          <DetailBox
            label="Name"
            value={
              builder.request.requesterSurname
                ? `${builder.request.requesterName} ${builder.request.requesterSurname}`
                : builder.request.requesterName
            }
          />
          <DetailBox label="Phone" value={builder.request.requesterPhone} />
          <div style={{ gridColumn: "1 / -1" }}>
  {builder.request.products.map((product, index) => (
    <div key={index}>
      {index + 1}. {product.product_name}
      {product.color_name
        ? ` - ${product.color_name}`

        : ""}
      (Qty {product.quantity})
    </div>
  ))}
</div>
          
          
          <DetailBox label="Date" value={formatDate(builder.request.requestDate)} />
          <DetailBox label="From Location" value={builder.request.locationName} />
        </div>

        <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <SummaryChip
            label="Package Filled"
            value={`${filledCount}/${quantity}`}
            accent={filledCount === quantity ? "#166534" : "#b91c1c"}
            bg={filledCount === quantity ? "#f0fdf4" : "#fef2f2"}
            labelColor={filledCount === quantity ? "#166534" : "#b91c1c"}
            borderColor={filledCount === quantity ? "#bbf7d0" : "#fecaca"}
          />
          <SummaryChip
            label="Eligible AAJ Serials"
            value={eligibleSerialOptions.length}
            accent="#1d4ed8"
            bg="#eff6ff"
            labelColor="#1d4ed8"
            borderColor="#bfdbfe"
          />
        </div>

        {actionError ? (
          <div
            style={{
              marginTop: 18,
              padding: "14px 16px",
              borderRadius: 16,
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
            marginTop: 20,
            borderRadius: 24,
            border: "1px solid #dbeafe",
            background: "linear-gradient(180deg, #f8fbff 0, #ffffff 100%)",
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#1d4ed8",
              fontWeight: 800,
            }}
          >
            Package Serials
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {builder.slots.map((serial, index) => {
              const productGroup = builder.eligibleSerialGroups?.[index];

const productName =
  productGroup?.product_name ||
  builder.request.productName;

const productColor =
  productGroup?.color_name ||
  builder.request.productColor;

const serialOptions =
  productGroup?.serials ||
  eligibleSerialOptions;
            
              const isEditing = builder.editingIndex === index || !serial;
              const displayValue =
                isEditing && builder.editingIndex === index ? builder.editValue : serial || "";

              const usedElsewhere = new Set(
                builder.slots
                  .filter((_, slotIndex) => slotIndex !== index)
                  .map((slot) => String(slot || "").trim())
                  .filter(Boolean)
              );

              return (
                <div
                  key={`slot-${index}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "56px 1fr auto",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
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

                  {isEditing ? (
                    <SerialComboBox
                      value={displayValue}
                      options={serialOptions}
                      usedElsewhere={usedElsewhere}
                      productName={productName}
                      productColor={productColor}
                      onChange={(val) => {
                        if (builder.editingIndex !== index) {
                          onStartReplace(index, val);
                        }
                        onEditChange(index, val);
                      }}
                    />
                  ) : (
                    <input
                      value={displayValue}
                      readOnly
                      style={{
                        borderRadius: 16,
                        border: "1px solid #cbd5e1",
                        padding: "14px 16px",
                        fontSize: 15,
                        background: "#f8fafc",
                        color: "#0f172a",
                        outline: "none",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                  )}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => onApplySerial(index)}
                          disabled={actionLoading}
                          style={{
                            border: "none",
                            borderRadius: 14,
                            padding: "12px 14px",
                            fontWeight: 800,
                            color: "#ffffff",
                            background: "#1d4ed8",
                            cursor: actionLoading ? "not-allowed" : "pointer",
                          }}
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => onAutoReplace(index)}
                          disabled={actionLoading}
                          style={{
                            border: "1px solid #bfdbfe",
                            borderRadius: 14,
                            padding: "12px 14px",
                            fontWeight: 800,
                            color: "#1d4ed8",
                            background: "#eff6ff",
                            cursor: actionLoading ? "not-allowed" : "pointer",
                          }}
                        >
                          Replace
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onStartReplace(index, serial)}
                        disabled={actionLoading}
                        style={{
                          border: "1px solid #bfdbfe",
                          borderRadius: 14,
                          padding: "12px 14px",
                          fontWeight: 800,
                          color: "#1d4ed8",
                          background: "#eff6ff",
                          cursor: actionLoading ? "not-allowed" : "pointer",
                        }}
                      >
                        Edit
                      </button>
                    )}

                    <button
                      onClick={() => onRemoveSerial(index)}
                      disabled={actionLoading}
                      style={{
                        border: "none",
                        borderRadius: 14,
                        width: 44,
                        height: 44,
                        fontWeight: 900,
                        color: "#ffffff",
                        background: "#ef4444",
                        cursor: actionLoading ? "not-allowed" : "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 22,
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ color: "#475569", lineHeight: 1.65, fontSize: 14 }}>
              Confirm becomes available only when the package has exactly {quantity} valid serials
              from AAJ NEW stock matching {builder.request.productName}
              {builder.request.productColor ? ` / ${builder.request.productColor}` : ""}.
            </div>

            <button
              onClick={onConfirmPackage}
              disabled={actionLoading || filledCount !== quantity}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                border: "none",
                borderRadius: 12,
                padding: "14px 32px",
                fontSize: 15,
                fontWeight: 500,
                color: filledCount === quantity && !actionLoading ? "#E1F5EE" : "#94a3b8",
                background: filledCount === quantity && !actionLoading ? "#1D9E75" : "#e2e8f0",
                cursor: actionLoading || filledCount !== quantity ? "not-allowed" : "pointer",
                minWidth: 220,
                transition: "opacity 0.15s",
              }}
            ><>
              <i className="ti ti-circle-check" style={{ fontSize: 18 }} aria-hidden="true" />
              {actionLoading ? "Saving..." : "Confirm Package"}
            </>
            </button>
          </div>
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
  const stockSummary = request.stockSummary || request.raw?.stock_summary || request.raw?.stocksummary || {};
  const transferOptions = getTransferOptions(stockSummary);
  const stockByLocation = getStockByLocation(stockSummary);
 console.log('canOpenPackage debug:', request.status, getCanFulfillAtAAJ(stockSummary), stockSummary);
 const canOpenPackage =
  (request.status === "PACKAGING" || request.status === "PENDING") &&
  (getCanFulfillAtAAJ(stockSummary) || request.status === "PACKAGING");

  const canTransfer = request.status === "PENDING" && transferOptions.length > 0;
  const [transferPickerOpen, setTransferPickerOpen] = useState(false);

  const selectedTransferTarget =
    transferTarget || (transferOptions[0] ? String(transferOptions[0].location_id) : "");

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.95)",
        borderRadius: 28,
        padding: 24,
        boxShadow: cardShadow,
        border: "1px solid rgba(148, 163, 184, 0.18)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              color: "#1d4ed8",
              fontWeight: 800,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            Request #{request.requestId}
          </div>
          <h2 style={{ margin: "8px 0 0", color: "#0f172a", fontSize: 28, lineHeight: 1.05 }}>
            {request.productName}
          </h2>
          {request.productColor ? (
            <div style={{ marginTop: 8, color: "#475569", fontSize: 15, fontWeight: 700 }}>
              Color: {request.productColor}
            </div>
          ) : null}
        </div>

        <StatusPill status={request.status} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
          marginTop: 18,
        }}

      >
        <DetailBox label="Name" value={request.requesterName} />
        <DetailBox label="Surname" value={request.requesterSurname} />
        <DetailBox label="Phone" value={request.requesterPhone} />
        <DetailBox label="Quantity" value={request.quantity} />
        <DetailBox label="Color" value={request.productColor || "Any"} />
        <DetailBox label="Date" value={formatDate(request.requestDate)} />
        <DetailBox
          label="Wanted Delivery Date"
          value={extractDeliveryDate(request.note)?.toLocaleDateString() || "Flexible / Anytime"}
        />
        <DetailBox label="Requested From" value={request.locationName} />
        <DetailBox label="Email" value={request.requesterEmail || "Not provided"} />
        <DetailBox label="Created By" value={request.createdByName || request.requesterName} />
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "0.95fr 1.25fr",
          gap: 18,
        }}
      >
        <div
          style={{
            borderRadius: 22,
            background: "linear-gradient(180deg, #eff6ff 0, #ffffff 100)",
            border: "1px solid #bfdbfe",
            padding: 18,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#1d4ed8",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            New Stock Visibility
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {stockByLocation.length === 0 ? (
              <div style={{ color: "#64748b", fontWeight: 700 }}>No stock data found.</div>
            ) : (
              stockByLocation.map((stock, index) => {
                const locationId = pick(stock.locationid, stock.location_id);
                const locationName = pick(stock.locationname, stock.location_name);
                const availableStock =
                  Number(pick(stock.availablestock, stock.available_stock, 0)) || 0;

                return (
                  <div
                    key={`${request.requestId}-${locationId}-${index}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 14,
                      background: "#ffffff",
                      border: "1px solid rgba(191, 219, 254, 0.9)",
                    }}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "999px",
                          background: Number(locationId) === 1 ? "#1d4ed8" : "#dbeafe",
                          color: Number(locationId) === 1 ? "#ffffff" : "#1d4ed8",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        {index + 1}
                        
                      </div>
                      <div>
                        <div style={{ color: "#0f172a", fontWeight: 700 }}>{locationName}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          Available NEW unused units for {request.productName}
                          {request.productColor ? ` - ${request.productColor}` : ""}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        minWidth: 52,
                        textAlign: "center",
                        padding: "6px 10px",
                        borderRadius: "999px",
                        background:
                          availableStock >= Number(request.quantity) ? "#dcfce7" : "#fee2e2",
                        color:
                          availableStock >= Number(request.quantity) ? "#166534" : "#b91c1c",
                        fontWeight: 800,
                      }}
                    >
                      {availableStock}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {request.packageId ? (
            <div
              style={{
                marginTop: 16,
                borderRadius: 16,
                background: "#ffffff",
                border: "1px solid #dbeafe",
                padding: "14px 16px",
                color: "#334155",
                lineHeight: 1.65,
              }}
            >
              <div>
                <strong>Package ID:</strong> {request.packageId}
              </div>
              <div>
                <strong>Package Status:</strong> {request.packageStatus || "N/A"}
              </div>
              <div>
                <strong>Opened At:</strong> {formatDateTime(request.packageCreatedAt)}
              </div>
              {request.packageCompletedAt ? (
                <div>
                  <strong>Completed At:</strong> {formatDateTime(request.packageCompletedAt)}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          style={{
            borderRadius: 22,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            padding: 18,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Request Note
          </div>

          <div
            style={{
              marginTop: 10,
              borderRadius: 16,
              background: "#ffffff",
              border: "1px dashed #cbd5e1",
              padding: "12px 14px",
              color: "#334155",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              fontSize: 14,
            }}
          >
            {request.note || "No note added on this request."}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <SummaryChip
            label="AAJ new stock"
            value={getAvailableAtAAJ(stockSummary)}
            accent={
              getAvailableAtAAJ(stockSummary) >= request.quantity ? "#166534" : "#b91c1c"
            }
            bg={
              getAvailableAtAAJ(stockSummary) >= request.quantity ? "#f0fdf4" : "#fef2f2"
            }
            labelColor={
              getAvailableAtAAJ(stockSummary) >= request.quantity ? "#166534" : "#b91c1c"
            }
            borderColor={
              getAvailableAtAAJ(stockSummary) >= request.quantity ? "#bbf7d0" : "#fecaca"
            }
          />
          <SummaryChip
            label="Needed for request"
            value={request.quantity}
            accent="#1d4ed8"
            bg="#eff6ff"
            labelColor="#1d4ed8"
            borderColor="#bfdbfe"
          />
        </div>

        {request.status === "PENDING" || request.status === "PACKAGING" ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {!transferPickerOpen ? (
              <button
                onClick={() => setTransferPickerOpen(true)}
                disabled={actionLoading || !canTransfer}
                style={{
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  border: "1.5px solid #B5D4F4",
  borderRadius: 12,
  padding: "12px 20px",
  fontSize: 14,
  fontWeight: 500,
  color: canTransfer ? "#185FA5" : "#94a3b8",
  background: "transparent",
  cursor: actionLoading || !canTransfer ? "not-allowed" : "pointer",
}}
              >
                Transfer
              </button>
            ) : (
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <select
                  value={selectedTransferTarget}
                  onChange={(event) =>
                    onTransferTargetChange(request.requestId, event.target.value)
                  }
                  style={{
                    borderRadius: 14,
                    border: "1.5px solid #a5b4fc",
                    padding: "13px 14px",
                    minWidth: 240,
                    background: "#ffffff",
                    fontSize: 14,
                    outline: "none",
                  }}
                >
                  <option value="">-- Select location --</option>
                  {transferOptions.map((option) => {
                    const locationId = pick(option.locationid, option.location_id);
                    const locationName = pick(option.locationname, option.location_name);
                    const availableStock = pick(
                      option.availablestock,
                      option.available_stock,
                      0
                    );

                    return (
                      <option key={locationId} value={locationId}>
                        {locationName} (stock: {availableStock})
                      </option>
                    );
                  })}
                </select>

                <button
                  onClick={() => {
                    onTransfer(request.requestId, selectedTransferTarget);
                    setTransferPickerOpen(false);
                  }}
                  disabled={actionLoading || !selectedTransferTarget}
                  style={{
                    border: "none",
                    borderRadius: 16,
                    padding: "14px 20px",
                    fontSize: 15,
                    fontWeight: 800,
                    color: "#fff",
                    background: selectedTransferTarget
                      ? "linear-gradient(135deg, #4338ca 0, #6366f1 100)"
                      : "#cbd5e1",
                    cursor: actionLoading || !selectedTransferTarget ? "not-allowed" : "pointer",
                  }}
                >
                  {actionLoading ? "Sending..." : "Confirm Transfer"}
                </button>

                <button
                  onClick={() => setTransferPickerOpen(false)}
                  disabled={actionLoading}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 16,
                    padding: "14px 16px",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#64748b",
                    background: "#f8fafc",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            <button
              onClick={() => onOpenPackage(request.requestId)}
              disabled={!canOpenPackage || actionLoading}
              style={{
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  border: "none",
  borderRadius: 12,
  padding: "12px 24px",
  fontSize: 14,
  fontWeight: 500,
  color: canOpenPackage ? "#E1F5EE" : "#94a3b8",
  background: canOpenPackage ? "#1D9E75" : "#e2e8f0",
  cursor: !canOpenPackage || actionLoading ? "not-allowed" : "pointer",
  minWidth: 190,
  justifyContent: "center",
}}
            >
              {actionLoading ? "Working..." : request.status === "PACKAGING" ? "Resume Package" : "OK / Build Package"}
            </button>
          </div>
        ) : (
          <div style={{ color: "#475569", fontWeight: 700 }}>
            Request already handled for AAJ completion workflow.
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
        borderRadius: 24,
        padding: 22,
        boxShadow: cardShadow,
        border: "1px solid rgba(148,163,184,0.18)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              color: "#1d4ed8",
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Package #{pkg.packageId}
          </div>
          <h3 style={{ margin: "8px 0 0", color: "#0f172a", fontSize: 24 }}>
            {pkg.productName}
            {pkg.productColor ? ` - ${pkg.productColor}` : ""}
          </h3>
        </div>

        <StatusPill status={pkg.status} type="package" />
      </div>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
        }}
      >
        <DetailBox label="Request ID" value={pkg.requestId} />
        <DetailBox
          label="Requester"
          value={
            pkg.requesterSurname
              ? `${pkg.requesterName} ${pkg.requesterSurname}`
              : pkg.requesterName
          }
        />
        <DetailBox label="Quantity" value={`${pkg.selectedCount}/${pkg.quantity}`} />
        <DetailBox label="Created By" value={pkg.createdByName || "Admin"} />
        <DetailBox label="Created At" value={formatDateTime(pkg.createdAt)} />
        <DetailBox
          label="Completed By"
          value={pkg.completedByName || (pkg.status === "COMPLETED" ? "Admin" : "Pending")}
        />
        <DetailBox
          label="Completed At"
          value={pkg.completedAt ? formatDateTime(pkg.completedAt) : "Pending"}
        />
      </div>

      <div
        style={{
          marginTop: 16,
          borderRadius: 18,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          padding: 16,
        }}
      >
        <div
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#64748b",
            fontWeight: 800,
          }}
        >
          Serial List
        </div>

        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
          {pkg.selectedSerials?.length ? (
            pkg.selectedSerials.map((serial) => (
              <span
                key={`${pkg.packageId}-${serial}`}
                style={{
                  padding: "10px 12px",
                  borderRadius: "999px",
                  background: "#ffffff",
                  border: "1px solid #bfdbfe",
                  color: "#0f172a",
                  fontWeight: 700,
                  fontSize: 13,
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

export default function RequestCenter() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [sortBy, setSortBy] = useState("DELIVERYDATE");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [transferTargets, setTransferTargets] = useState({});
  const [builder, setBuilder] = useState({
    open: false,
    request: null,
    package: null,
    eligibleSerials: [],
    eligibleSerialGroups: [],
  
    stockSummary: null,
    
    slots: [],
    editingIndex: null,
    editValue: "",
  });
  const [builderError, setBuilderError] = useState("");
  const [builderLoading, setBuilderLoading] = useState(false);

  const token = getToken();
  const role = getRole();

  const authHeaders = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token]
  );

  const applyBuilderPayload = useCallback((payload) => {
    const normalizedRequest = normalizeRequest(payload?.request || {});
    const quantity =
  normalizedRequest?.products?.reduce(
    (sum, p) => sum + Number(p.quantity || 0),
    0
  ) || Number(normalizedRequest?.quantity || 0);

setBuilder({
  open: true,
  request: normalizedRequest,
  package: payload?.package || null,

  eligibleSerials:
    payload?.eligible_serials || payload?.eligibleserials || [],

  eligibleSerialGroups:
    payload?.eligible_serial_groups || [],

  stockSummary:
    payload?.stock_summary || payload?.stocksummary || null,

  slots: padSlots(
    payload?.selected_serials || payload?.selectedserials || [],
    quantity
  ),

  editingIndex: null,
  editValue: "",
});
  }, []);

  const fetchRequests = useCallback(async () => {
    const res = await axios.get(`${API_URL}/requests`, authHeaders);
    const list = Array.isArray(res.data) ? res.data.map(normalizeRequest) : [];
    setRequests(list);

    setTransferTargets((current) => {
      const next = { ...current };
      list.forEach((request) => {
        const options = getTransferOptions(request.stockSummary);
        const firstOption = options?.[0];
        const firstLocationId = pick(firstOption?.locationid, firstOption?.location_id);
        if (firstLocationId && !next[request.requestId]) {
          next[request.requestId] = String(firstLocationId);
        }
      });
      return next;
    });

    return list;
  }, [authHeaders]);

  const fetchPackages = useCallback(async () => {
    const res = await axios.get(`${API_URL}/requests/packages`, authHeaders);
    const list = Array.isArray(res.data) ? res.data.map(normalizePackage) : [];
    setPackages(list);
    return list;
  }, [authHeaders]);

  const fetchPageData = useCallback(async () => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setLoading(true);
      setError("");
      setActionMessage("");

      let requestError = "";
      let packageError = "";

      try {
        await fetchRequests();
      } catch (err) {
        console.error("Request center requests fetch error:", err);
        requestError =
          err?.response?.data?.message || "Failed to load requests.";
      }

      try {
        await fetchPackages();
      } catch (err) {
        console.error("Request center packages fetch error:", err);
        packageError =
          err?.response?.data?.message || "Failed to load packages.";
      }

      if (requestError && packageError) {
        setError(`${requestError} Also: ${packageError}`);
      } else if (requestError) {
        setError(requestError);
      } else if (packageError) {
        setError(packageError);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchPackages, fetchRequests, token]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const filteredRequests = useMemo(() => {
    let list = [...requests];

    if (statusFilter === "PENDING") {
  list = list.filter((request) =>
    ["PENDING", "PACKAGING"].includes(normalizeStatus(request.status))
  );
} else if (statusFilter !== "ALL") {
  list = list.filter(
    (request) => normalizeStatus(request.status) === statusFilter
  );
}
    if (sortBy === "DELIVERYDATE") {
      list.sort((a, b) => {
        const dateA = extractDeliveryDate(a.note);
        const dateB = extractDeliveryDate(b.note);
        if (dateA && dateB) return dateA.getTime() - dateB.getTime();
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        return Number(b.requestId || 0) - Number(a.requestId || 0);
      });
    } else if (sortBy === "REQUESTID") {
      list.sort((a, b) => Number(a.requestId || 0) - Number(b.requestId || 0));
    }

    return list;
  }, [requests, statusFilter, sortBy]);

  const pendingCount = requests.filter((r) => normalizeStatus(r.status) === "PENDING").length;
  const packagingCount = requests.filter((r) => normalizeStatus(r.status) === "PACKAGING").length;
  const completedCount = requests.filter(
    (r) => normalizeStatus(r.status) === "FULFILLED_AT_AAJ"
  ).length;
  const transferredCount = requests.filter(
    (r) => normalizeStatus(r.status) === "TRANSFERRED"
  ).length;
  const rejectedCount = requests.filter((r) => normalizeStatus(r.status) === "REJECTED").length;

  const handleStatusCardClick = (filter) => {
    navigate("/request-data", { state: { statusFilter: filter } });
  };

  const handleOpenPackage = async (requestId) => {
    try {
      setActionLoadingId(requestId);
      setActionMessage("");
      setBuilderError("");

      const res = await axios.post(
        `${API_URL}/requests/${requestId}/approve`,
        {},
        authHeaders
      );

      applyBuilderPayload(res.data);
      setActionMessage(`Package builder opened for request ${requestId}.`);

      await fetchPageData();
    } catch (err) {
      console.error("Open package error:", err);
      setError(err?.response?.data?.message || "Failed to open package builder.");
    } finally {
  setActionLoadingId(null);  // ← must be here
}
  };

  const persistDraft = async (requestId, nextSlots) => {
    setBuilderLoading(true);
    setBuilderError("");

    try {
      const serialNumbers = nextSlots.map((slot) => String(slot || "").trim()).filter(Boolean);

      const res = await axios.put(
        `${API_URL}/requests/${requestId}/package-draft`,
        { serialNumbers },
        authHeaders
      );

      applyBuilderPayload(res.data);
      await fetchPageData();
    } catch (err) {
      console.error("Save package draft error:", err);
      setBuilderError(err?.response?.data?.message || "Failed to save package draft.");
    } finally {
      setBuilderLoading(false);
    }
  };

  const handleTransfer = async (requestId, targetLocationId) => {
    if (!targetLocationId) return;

    try {
      setActionLoadingId(requestId);
      setActionMessage("");
      setError("");

      await axios.post(
        `${API_URL}/requests/${requestId}/transfer`,
        { targetLocationId: Number(targetLocationId) },
        authHeaders
      );

      setActionMessage(`Request ${requestId} transferred successfully.`);
      await fetchPageData();
    } catch (err) {
      console.error("Transfer request error:", err);
      setError(err?.response?.data?.message || "Failed to transfer request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTransferTargetChange = (requestId, value) => {
    setTransferTargets((current) => ({
      ...current,
      [requestId]: value,
    }));
  };

  const handleAutoReplace = async (index) => {
    const requestId = builder.request?.requestId;
    if (!requestId) return;

    const currentSerial = String(builder.slots[index] || "").trim();
    if (!currentSerial) {
      setBuilderError("There is no serial in this slot to replace.");
      return;
    }

    const eligibleSerials = builder.eligibleSerials.map((serial) =>
      String(serial.serialnumber || serial.serial_number || "").trim()
    );

    const usedElsewhere = new Set(
      builder.slots
        .filter((_, slotIndex) => slotIndex !== index)
        .map((slot) => String(slot || "").trim())
        .filter(Boolean)
    );

    const currentIndex = eligibleSerials.indexOf(currentSerial);
    const orderedCandidates =
      currentIndex >= 0
        ? [...eligibleSerials.slice(currentIndex + 1), ...eligibleSerials.slice(0, currentIndex)]
        : eligibleSerials;

    const replacementSerial = orderedCandidates.find(
      (serial) => serial && serial !== currentSerial && !usedElsewhere.has(serial)
    );

    if (!replacementSerial) {
      setBuilderError("No alternate eligible AAJ serial is available to replace this item.");
      return;
    }

    const nextSlots = [...builder.slots];
    nextSlots[index] = replacementSerial;
    await persistDraft(requestId, nextSlots);
  };

  const handleStartReplace = (index, currentSerial) => {
    setBuilder((current) => ({
      ...current,
      editingIndex: index,
      editValue: currentSerial || "",
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
    const requestId = builder.request?.requestId;
    if (!requestId || builder.editingIndex !== index) return;

    const candidate = String(builder.editValue || "").trim();
    const productGroup = builder.eligibleSerialGroups?.[index];

const eligibleSet = new Set(
  (productGroup?.serials || []).map((serial) =>
    String(serial.serialnumber || serial.serial_number || "").trim()
  )
);

    if (!candidate) {
      setBuilderError("Please paste or enter a serial number before applying.");
      return;
    }

    if (!eligibleSet.has(candidate)) {
    setBuilderError(
  `Serial ${candidate} is not valid for ${productGroup?.product_name}${
    productGroup?.color_name
      ? ` / ${productGroup.color_name}`
      : ""
  } at AAJ NEW stock.`
);
      return;
    }

    const duplicateIndex = builder.slots.findIndex(
      (slot, slotIndex) =>
        slotIndex !== index && String(slot || "").trim() === candidate
    );

    if (duplicateIndex >= 0) {
      setBuilderError(`Serial ${candidate} is already used in this package.`);
      return;
    }

    const nextSlots = [...builder.slots];
    nextSlots[index] = candidate;
    await persistDraft(requestId, nextSlots);
  };
const handleRemoveSerial = (index) => {
  setBuilder((current) => {
    const nextSlots = [...current.slots];

    nextSlots[index] = "";

    return {
      ...current,
      slots: nextSlots,
      editingIndex: index,
      editValue: "",
    };
  });

  setBuilderError("");
};

  const handleConfirmPackage = async () => {
    const requestId = builder.request?.requestId;
    if (!requestId) return;

    const serialNumbers = builder.slots
      .map((slot) => String(slot || "").trim())
      .filter(Boolean);

    if (serialNumbers.length !== Number(builder.request.quantity)) {
      setBuilderError("The package must contain exactly the requested quantity before confirmation.");
      return;
    }

    try {
      setBuilderLoading(true);
      setBuilderError("");

      const res = await axios.post(
        `${API_URL}/requests/${requestId}/package-confirm`,
        { serialNumbers },
        authHeaders
      );

      applyBuilderPayload(res.data);
      setActionMessage(`Package confirmed for request ${requestId}.`);
      setBuilder((current) => ({ ...current, open: false }));
      await fetchPageData();
    } catch (err) {
      console.error("Confirm package error:", err);
      setBuilderError(err?.response?.data?.message || "Failed to confirm package.");
    } finally {
      setBuilderLoading(false);
    }
  };

  if (role && role !== "ADMIN") {
    return (
      <div style={{ padding: 24, color: "#b91c1c", fontWeight: 700 }}>
        Only admin can access the AAJ request center.
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <PackageBuilderModal
        builder={builder}
        actionLoading={builderLoading}
        actionError={builderError}
        onClose={() =>
          setBuilder((current) => ({
            ...current,
            open: false,
            editingIndex: null,
            editValue: "",
          }))
        }
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
            background: "linear-gradient(135deg, #0f172a 0, #1d4ed8 55%, #2563eb 100%)",
            color: "#ffffff",
            padding: 28,
            borderRadius: 30,
            boxShadow: "0 28px 70px rgba(29, 78, 216, 0.22)",
          }}
        >
          <div style={badgeStyle}>AAJ admin request completion portal</div>

          <h1
            style={{
              margin: "16px 0 10px",
              fontSize: "clamp(30px, 4vw, 46px)",
              lineHeight: 1.02,
            }}
          >
            All location requests arrive here for AAJ completion
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: 760,
              lineHeight: 1.75,
              color: "rgba(255,255,255,0.82)",
              fontSize: 16,
            }}
          >
            Press OK / Build Package to open an AAJ package tab-like builder. It auto-populates
            matching serials from AAJ NEW stock for the requested product, color, and quantity.
            You can remove, replace, and confirm only when the package has the full requested
            quantity.
          </p>

          <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 12 }}>
            <SummaryChip
              label="Pending"
              value={pendingCount}
              accent="#ffffff"
              bg="rgba(255,255,255,0.12)"
              labelColor="rgba(255,255,255,0.72)"
              borderColor="rgba(255,255,255,0.22)"
              onClick={() => handleStatusCardClick("PENDING")}
              isClickable
            />
            <SummaryChip
              label="Packaging"
              value={packagingCount}
              accent="#ffffff"
              bg="rgba(255,255,255,0.12)"
              labelColor="rgba(255,255,255,0.72)"
              borderColor="rgba(255,255,255,0.22)"
              onClick={() => handleStatusCardClick("PACKAGING")}
              isClickable
            />
            <SummaryChip
              label="Completed"
              value={completedCount}
              accent="#ffffff"
              bg="rgba(255,255,255,0.12)"
              labelColor="rgba(255,255,255,0.72)"
              borderColor="rgba(255,255,255,0.22)"
              onClick={() => handleStatusCardClick("FULFILLED_AT_AAJ")}
              isClickable
            />
            <SummaryChip
              label="Transferred"
              value={transferredCount}
              accent="#ffffff"
              bg="rgba(255,255,255,0.12)"
              labelColor="rgba(255,255,255,0.72)"
              borderColor="rgba(255,255,255,0.22)"
              onClick={() => handleStatusCardClick("TRANSFERRED")}
              isClickable
            />
            <SummaryChip
              label="Rejected"
              value={rejectedCount}
              accent="#ffffff"
              bg="rgba(255,255,255,0.12)"
              labelColor="rgba(255,255,255,0.72)"
              borderColor="rgba(255,255,255,0.22)"
              onClick={() => handleStatusCardClick("REJECTED")}
              isClickable
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span
              style={{
                fontWeight: 800,
                color: "#334155",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                fontSize: 12,
              }}
            >
              Filter
            </span>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{
                borderRadius: 14,
                border: "1px solid #cbd5e1",
                padding: "12px 14px",
                background: "#ffffff",
                fontSize: 14,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="ALL">All requests</option>
              <option value="PENDING">Pending</option>
              <option value="PACKAGING">Packaging</option>
              <option value="FULFILLED_AT_AAJ">Completed by AAJ</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <span
              style={{
                fontWeight: 800,
                color: "#334155",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                fontSize: 12,
                marginLeft: 14,
              }}
            >
              Sort By
            </span>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              style={{
                borderRadius: 14,
                border: "1px solid #cbd5e1",
                padding: "12px 14px",
                background: "#ffffff",
                fontSize: 14,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="DELIVERYDATE">Delivery Date Earliest First</option>
              <option value="REQUESTID">Request ID Serial Number Wise</option>
            </select>
          </div>
        </div>

        {actionMessage ? (
          <div
            style={{
              marginTop: 18,
              padding: "12px 16px",
              borderRadius: 14,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1d4ed8",
              fontWeight: 700,
            }}
          >
            {actionMessage}
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              marginTop: 18,
              padding: "14px 16px",
              borderRadius: 16,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ marginTop: 24 }}>
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: 28 }}>Request Queue</h2>
          <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.7 }}>
            Each request can be packaged at AAJ, or transferred elsewhere only if AAJ cannot fulfill it.
          </p>
        </div>

        {loading ? (
          <div style={{ marginTop: 24, color: "#334155", fontWeight: 700 }}>
            Loading requests...
          </div>
        ) : (
          <div style={{ marginTop: 24, display: "grid", gap: 22 }}>
            {filteredRequests.length === 0 ? (
              <div
                style={{
                  background: "rgba(255,255,255,0.95)",
                  borderRadius: 24,
                  padding: 28,
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
                  key={request.requestId}
                  request={request}
                  actionLoading={actionLoadingId === request.requestId}
                  transferTarget={transferTargets[request.requestId]}
                  onTransferTargetChange={handleTransferTargetChange}
                  onOpenPackage={handleOpenPackage}
                  onTransfer={handleTransfer}
                />
              ))
            )}
          </div>
        )}

        <div style={{ marginTop: 34 }}>
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: 28 }}>Package History</h2>
          <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.7 }}>
            View every draft and completed package, including who created it, who completed it,
            timestamps, and all serials included.
          </p>
        </div>

        <div style={{ marginTop: 22, display: "grid", gap: 18 }}>
          {packages.length === 0 ? (
            <div
              style={{
                background: "rgba(255,255,255,0.95)",
                borderRadius: 24,
                padding: 28,
                boxShadow: cardShadow,
                color: "#475569",
                fontWeight: 700,
              }}
            >
              No packages created yet.
            </div>
          ) : (
            packages.map((pkg) => <PackageHistoryCard key={pkg.packageId} pkg={pkg} />)
          )}
        </div>
      </div>
    </div>
  );
}



