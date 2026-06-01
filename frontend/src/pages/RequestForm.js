import React, { useMemo, useRef, useState } from "react";
import axios from "axios";
import APIURL from "../config/api";
import { getWarehouseDisplayName } from "../constants/warehouses";
import { getStoredUser } from "../utils/auth";

const PRODUCT_OPTIONS = {
  GKS: [],
  "Miko 3": ["Red", "Blue"],
  "Miko Mini": ["Blue", "Purple"],
  Sparky: ["Blue", "Red"],
};

const TEAM_OPTIONS = [
  "Sales",
  "Marketing",
  "Operations",
  "Finance",
  "HR",
  "Tech",
  "Customer Success",
  "Partnerships",
];

const countWords = (value = "") => {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};

const getToday = () => new Date().toISOString().slice(0, 10);

const createEmptyProductRow = () => ({
  id:
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  product: "GKS",
  color: "",
  quantity: "1",
});

const shellStyle = {
  minHeight: "calc(100vh - 68px)",
  background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
  padding: "32px 20px 48px",
};

const cardStyle = {
  maxWidth: 980,
  margin: "0 auto",
  background: "#ffffff",
  borderRadius: 20,
  padding: 32,
  boxShadow: "0 18px 50px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e2e8f0",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 18,
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  color: "#334155",
  marginBottom: 8,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const inputStyle = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  padding: "13px 14px",
  fontSize: 15,
  color: "#0f172a",
  outline: "none",
  boxSizing: "border-box",
};

const helperTextStyle = {
  marginTop: 7,
  fontSize: 12,
  color: "#64748b",
};

const sectionDividerStyle = {
  border: "none",
  borderTop: "1px solid #e2e8f0",
  margin: "28px 0",
};

const sectionTitleStyle = {
  fontSize: 16,
  fontWeight: 700,
  color: "#0f172a",
  marginBottom: 16,
};

const radioGroupStyle = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 4,
};

const radioLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  fontSize: 15,
  color: "#0f172a",
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  transition: "all 0.15s ease",
  userSelect: "none",
};

const radioLabelActiveStyle = {
  ...radioLabelStyle,
  borderColor: "#2563eb",
  background: "#eff6ff",
  color: "#1d4ed8",
  fontWeight: 600,
};

function RadioGroup({ name, options, value, onChange }) {
  return (
    <div style={radioGroupStyle}>
      {options.map((opt) => (
        <label
          key={opt}
          style={value === opt ? radioLabelActiveStyle : radioLabelStyle}
        >
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            style={{ accentColor: "#2563eb" }}
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

function ProductRow({ row, total, onChange, onRemove }) {
  const availableColors = PRODUCT_OPTIONS[row.product] || [];

  const update = (field) => (e) => {
    onChange(row.id, field, e.target.value);
  };

  return (
    <div
      style={{
        background: "#f8fafc",
        borderRadius: 14,
        padding: 18,
        border: "1px solid #e2e8f0",
        position: "relative",
      }}
    >
      {total > 1 && (
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "#fee2e2",
            border: "none",
            borderRadius: 8,
            color: "#dc2626",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            padding: "5px 10px",
          }}
        >
          Remove
        </button>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        <div>
          <label style={labelStyle}>SKU Type</label>
          <select value={row.product} onChange={update("product")} style={inputStyle}>
            {Object.keys(PRODUCT_OPTIONS).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>SKU Color</label>
          {availableColors.length > 0 ? (
            <select value={row.color} onChange={update("color")} style={inputStyle}>
              <option value="">Select color</option>
              {availableColors.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={row.color}
              onChange={update("color")}
              placeholder="NA"
              disabled
              style={{ ...inputStyle, background: "#f1f5f9", color: "#94a3b8" }}
            />
          )}
        </div>

        <div>
          <label style={labelStyle}>Quantity</label>
          <input
            type="number"
            min="1"
            value={row.quantity}
            onChange={update("quantity")}
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  );
}

export default function RequestForm() {
  const user = getStoredUser();
  const warehouseLabel = getWarehouseDisplayName(user?.warehouse);

  const [forWhom, setForWhom] = useState("");
  const [requestType, setRequestType] = useState("");
  const [requestingTeam, setRequestingTeam] = useState("");
  const [approvalFile, setApprovalFile] = useState(null);
  const [reason, setReason] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [productRows, setProductRows] = useState([createEmptyProductRow()]);
  const [email, setEmail] = useState("");
  const [collectionPoint, setCollectionPoint] = useState("");
  const [maxActivation, setMaxActivation] = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [country, setCountry] = useState("");
  const [dutiesPaidBy, setDutiesPaidBy] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [mergeDialog, setMergeDialog] = useState(null);

  const fileInputRef = useRef(null);

  const reasonWordCount = useMemo(() => countWords(reason), [reason]);

  const resetForm = () => {
    setForWhom("");
    setRequestType("");
    setRequestingTeam("");
    setApprovalFile(null);
    setReason("");
    setRecipientName("");
    setManagerName("");
    setProductRows([createEmptyProductRow()]);
    setEmail("");
    setCollectionPoint("");
    setMaxActivation("");
    setMaxDuration("");
    setContactNumber("");
    setDeliveryAddress("");
    setCountry("");
    setDutiesPaidBy("");
    setError("");
    setMergeDialog(null);
  };

  const handleRowChange = (id, field, value) => {
    setProductRows((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, [field]: value } : r));

      if (field === "product" || field === "color") {
        const changed = updated.find((r) => r.id === id);
        if (!changed) return prev;

        const compareProduct = field === "product" ? value : changed.product;
        const compareColor = field === "color" ? value : changed.color;

        const duplicate = updated.find(
          (r) =>
            r.id !== id &&
            r.product === compareProduct &&
            (r.color || "") === (compareColor || "")
        );

        if (duplicate) {
          setMergeDialog({
            incoming: changed,
            existing: duplicate,
          });
          return prev;
        }
      }

      return updated;
    });
  };

  const handleRowRemove = (id) => {
    setProductRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddRow = () => {
    setProductRows((prev) => [...prev, createEmptyProductRow()]);
  };

  const handleMergeAccept = () => {
    if (!mergeDialog) return;

    const { incoming, existing } = mergeDialog;

    setProductRows((prev) =>
      prev
        .filter((r) => r.id !== incoming.id)
        .map((r) =>
          r.id === existing.id
            ? {
                ...r,
                quantity: String(
                  Number(r.quantity || 0) + Number(incoming.quantity || 0)
                ),
              }
            : r
        )
    );

    setMergeDialog(null);
  };

  const handleMergeReject = () => {
    setMergeDialog(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.size > 10 * 1024 * 1024) {
      setError("File must be under 10 MB.");
      return;
    }
    setApprovalFile(file || null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!forWhom) return setError("Please select who this request is for.");
    if (!requestType) return setError("Please select the type of request.");
    if (!requestingTeam) return setError("Please select the requesting team.");
    if (!reason.trim()) return setError("Please provide a reason for the demo requirement.");
    if (!recipientName.trim()) return setError("Please enter the recipient name.");
    if (!managerName.trim()) return setError("Please enter the manager/SPOC name.");
    if (!email.trim()) return setError("Please enter an email address.");
    if (!collectionPoint) return setError("Please select a collection point.");

    const invalidRow = productRows.find(
      (r) => !r.quantity || Number(r.quantity) < 1
    );
    if (invalidRow) {
      return setError("Each product row must have a quantity of at least 1.");
    }

    const token =
      user?.token ||
      user?.accessToken ||
      user?.jwt ||
      user?.access_token ||
      "";

    if (!token) {
      return setError("Authorization token not found. Please login again.");
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("forWhom", forWhom);
      formData.append("requestType", requestType);
      formData.append("requestingTeam", requestingTeam);
      formData.append("reason", reason);
      formData.append("recipientName", recipientName);
      formData.append("managerName", managerName);
      formData.append("email", email);
      formData.append("collectionPoint", collectionPoint);
      formData.append("maxActivation", maxActivation);
      formData.append("maxDuration", maxDuration);
      formData.append("contactNumber", contactNumber);
      formData.append("deliveryAddress", deliveryAddress);
      formData.append("country", country);
      formData.append("dutiesPaidBy", dutiesPaidBy);
      const normalizedProducts = productRows.map(({ id, ...rest }) => ({
        ...rest,
        quantity: Number(rest.quantity),
      }));

      formData.append("products", JSON.stringify(normalizedProducts));
      formData.append("warehouse", user?.warehouse || "");
      formData.append("submittedBy", user?.email || "");
      formData.append("date", getToday());

      if (approvalFile) {
        formData.append("approvalFile", approvalFile);
      }

      console.log("Submitting request with:", {
        forWhom,
        requestType,
        requestingTeam,
        reason,
        recipientName,
        managerName,
        email,
        collectionPoint,
        maxActivation,
        maxDuration,
        contactNumber,
        deliveryAddress,
        country,
        dutiesPaidBy,
        warehouse: user?.warehouse,
        submittedBy: user?.email,
        date: getToday(),
        products: normalizedProducts,
      });

      await axios.post(`${APIURL}/requests`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      setSubmitted(true);
    } catch (err) {
      console.error("Request submission error:", err?.response?.data || err.message);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Submission failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={shellStyle}>
        <div style={{ ...cardStyle, textAlign: "center", padding: "60px 32px" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: 10,
            }}
          >
            Request Submitted!
          </h2>
          <p
            style={{
              color: "#64748b",
              fontSize: 15,
              marginBottom: 28,
            }}
          >
            Your demo requisition has been received and will be reviewed by the
            AAJ admin team.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              resetForm();
            }}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "12px 28px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      {mergeDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 32,
              maxWidth: 440,
              width: "90%",
              boxShadow: "0 32px 64px rgba(15,23,42,0.2)",
            }}
          >
            <h3
              style={{
                fontWeight: 700,
                fontSize: 17,
                marginBottom: 12,
                color: "#0f172a",
              }}
            >
              Duplicate Product Detected
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "#475569",
                marginBottom: 24,
                lineHeight: 1.6,
              }}
            >
              You already have{" "}
              <strong>
                {mergeDialog.existing.product}
                {mergeDialog.existing.color
                  ? ` - ${mergeDialog.existing.color}`
                  : ""}
              </strong>{" "}
              qty <strong>{mergeDialog.existing.quantity}</strong> in your list.
              The new row also has qty{" "}
              <strong>{mergeDialog.incoming.quantity}</strong>. Merge them into
              one row with a total of{" "}
              <strong>
                {Number(mergeDialog.existing.quantity || 0) +
                  Number(mergeDialog.incoming.quantity || 0)}
              </strong>
              ?
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleMergeAccept}
                style={{
                  flex: 1,
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Yes, Merge
              </button>
              <button
                onClick={handleMergeReject}
                style={{
                  flex: 1,
                  background: "#f1f5f9",
                  color: "#334155",
                  border: "none",
                  borderRadius: 10,
                  padding: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Keep Separate
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#0f172a",
              marginBottom: 8,
            }}
          >
            Demo Requisition Form
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            This form is available across all warehouses. Every submission is tagged
            with the location you are currently logged in from ({warehouseLabel})
            and routed to the AAJ admin request center.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitleStyle}>Request Details</div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>For Whom is the Request?</label>
              <RadioGroup
                name="forWhom"
                options={["Vendor/Seller/Buyer", "Influencer", "Employees"]}
                value={forWhom}
                onChange={setForWhom}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Type of Request</label>
              <RadioGroup
                name="requestType"
                options={["New Demo Request", "Replacement Demo Request"]}
                value={requestType}
                onChange={setRequestType}
              />
            </div>

            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Which Team is Requesting Demo Bot?</label>
                <select
                  value={requestingTeam}
                  onChange={(e) => setRequestingTeam(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select team</option>
                  {TEAM_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Approved By Approval Email Screenshot</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    ...inputStyle,
                    cursor: "pointer",
                    background: "#f8fafc",
                    color: approvalFile ? "#0f172a" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 16 }}>📎</span>
                  <span>{approvalFile ? approvalFile.name : "Upload file (max 10 MB)"}</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <p style={helperTextStyle}>Accepted: images, PDF. Max 10 MB.</p>
              </div>
            </div>
          </div>

          <hr style={sectionDividerStyle} />

          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitleStyle}>Reason and Contact</div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Reason of Demo Requirement</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Describe the purpose of this demo request"
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
              <p style={helperTextStyle}>
                {reasonWordCount} word{reasonWordCount !== 1 ? "s" : ""}
              </p>
            </div>

            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>
                  Employees Vendor Store Promoter Influencer Name
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Full name"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Team Managers Sales SPOC KAM Name</label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Manager or SPOC name"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ ...gridStyle, marginTop: 18 }}>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Contact Number</label>
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+91 00000 00000"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <hr style={sectionDividerStyle} />

          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitleStyle}>Product Details</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {productRows.map((row) => (
                <ProductRow
                  key={row.id}
                  row={row}
                  total={productRows.length}
                  onChange={handleRowChange}
                  onRemove={handleRowRemove}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddRow}
              style={{
                marginTop: 14,
                background: "#eff6ff",
                color: "#1d4ed8",
                border: "1px dashed #93c5fd",
                borderRadius: 12,
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
              }}
            >
              Add Another Product
            </button>
          </div>

          <hr style={sectionDividerStyle} />

          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitleStyle}>Collection and Delivery</div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Collection Point</label>
              <RadioGroup
                name="collectionPoint"
                options={["Office Handover", "Delivery to Home"]}
                value={collectionPoint}
                onChange={setCollectionPoint}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Max Activation Required</label>
              <RadioGroup
                name="maxActivation"
                options={["Yes", "No"]}
                value={maxActivation}
                onChange={setMaxActivation}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Max Duration</label>
              <RadioGroup
                name="maxDuration"
                options={["NA", "1 Year", "3 Months"]}
                value={maxDuration}
                onChange={setMaxDuration}
              />
            </div>

            <div style={{ ...gridStyle, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Delivery Address</label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Full delivery address"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Duties Taxes to be Paid By</label>
              <RadioGroup
                name="dutiesPaidBy"
                options={["Miko", "Vendor"]}
                value={dutiesPaidBy}
                onChange={setDutiesPaidBy}
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: 12,
                padding: "14px 18px",
                color: "#dc2626",
                fontSize: 14,
                marginBottom: 20,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              background: submitting ? "#93c5fd" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 14,
              padding: 16,
              fontSize: 16,
              fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
              letterSpacing: "0.02em",
            }}
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
