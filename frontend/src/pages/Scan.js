import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import API_URL from "../config/api";

// Dynamically load jsQR for QR image decoding (no npm install needed)
function loadJsQR() {
  return new Promise((resolve) => {
    if (window.jsQR) return resolve(window.jsQR);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
    script.onload = () => resolve(window.jsQR);
    document.head.appendChild(script);
  });
}

export default function Scan() {
  const [barcode, setBarcode] = useState("");
  const [action, setAction] = useState("IN");
  const [condition, setCondition] = useState("NEW");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [locations, setLocations] = useState([]);
  const [destinationId, setDestinationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  // QR upload states
  const [qrPreview, setQrPreview] = useState(null);
  const [qrDecoding, setQrDecoding] = useState(false);
  const [qrError, setQrError] = useState("");
  const [activeTab, setActiveTab] = useState("manual"); // "manual" | "qr"

  const inputRef = useRef();
  const fileInputRef = useRef();
  const dropRef = useRef();

  const token = localStorage.getItem("token");
  const locationId = localStorage.getItem("location_id") || 1;

  const fetchOtherLocations = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/scan/other-locations?current=${locationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLocations(res.data);
      if (res.data.length > 0) setDestinationId(res.data[0].location_id);
    } catch (err) {
      console.error("Failed to load locations", err);
    }
  }, [locationId, token]);

  const validateScan = useCallback(async (serial, currentAction) => {
    if (serial.length < 6) return;
    setValidating(true);
    try {
      const res = await axios.post(`${API_URL}/scan/validate`, {
        serial, action: currentAction, location_id: parseInt(locationId),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setValidationResult(res.data);
    } catch {
      setValidationResult(null);
    } finally {
      setValidating(false);
    }
  }, [locationId, token]);

  useEffect(() => {
    if (activeTab === "manual") inputRef.current?.focus();
  }, [activeTab]);

  useEffect(() => {
    if (action === "OUT") fetchOtherLocations();
    if (barcode.length > 5) validateScan(barcode, action);
  }, [action, barcode, fetchOtherLocations, validateScan]);

  useEffect(() => {
    if (barcode.length < 6) { setValidationResult(null); return; }
    const timer = setTimeout(() => validateScan(barcode, action), 500);
    return () => clearTimeout(timer);
  }, [action, barcode, validateScan]);

  const handleScan = async () => {
    if (!barcode) return;
    if (validationResult && !validationResult.valid) {
      setMessage(validationResult.message);
      setMessageType("error");
      return;
    }
    if (action === "OUT" && !destinationId) {
      setMessage("Please select a destination");
      setMessageType("error");
      return;
    }
    setLoading(true);
    try {
      const payload = { serial: barcode, action, condition, location_id: parseInt(locationId) };
      if (action === "OUT") payload.destination_location_id = parseInt(destinationId);
      const res = await axios.post(`${API_URL}/scan`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setMessage(`✅ ${barcode} | ${res.data.data.series} | ${res.data.data.color} | ${res.data.data.condition} | ${res.data.data.action}`);
        setMessageType("success");
        setValidationResult(null);
      } else {
        setMessage(`❌ ${res.data.message}`);
        setMessageType("error");
      }
    } catch (err) {
      setMessage(err.response?.status === 401 ? "❌ Session expired. Please login again." : "❌ Scan failed. Please try again.");
      setMessageType("error");
    }
    setLoading(false);
    setBarcode("");
    setValidationResult(null);
    setQrPreview(null);
    if (activeTab === "manual") inputRef.current?.focus();
  };

  // Decode QR from image file
  const decodeQRFromFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setQrError("Please upload a valid image file.");
      return;
    }
    setQrError("");
    setQrDecoding(true);
    setBarcode("");
    setValidationResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      setQrPreview(e.target.result);
      try {
        const jsQR = await loadJsQR();
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(imageData.data, imageData.width, imageData.height);
          if (result) {
            setBarcode(result.data);
            setQrError("");
          } else {
            setQrError("No QR code detected. Try a clearer image.");
          }
          setQrDecoding(false);
        };
        img.src = e.target.result;
      } catch {
        setQrError("Failed to load QR decoder.");
        setQrDecoding(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) decodeQRFromFile(file);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dropRef.current?.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) decodeQRFromFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    dropRef.current?.classList.add("drag-over");
  };

  const handleDragLeave = () => {
    dropRef.current?.classList.remove("drag-over");
  };

  const isBlocked = validationResult && !validationResult.valid;

  const inputBorderColor = isBlocked ? "#ef4444"
    : validationResult?.valid ? "#16a34a"
    : barcode.length > 0 ? "#2563eb"
    : "#e2e8f0";

  const inputShadow = isBlocked ? "0 0 0 3px rgba(239,68,68,0.12)"
    : validationResult?.valid ? "0 0 0 3px rgba(22,163,74,0.12)"
    : barcode.length > 0 ? "0 0 0 3px rgba(37,99,235,0.12)"
    : "none";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .scan-wrap { box-sizing: border-box; }
        .scan-wrap * { box-sizing: border-box; }

        .scan-wrap {
          min-height: 100vh;
          background: #f0f4ff;
          background-image:
            radial-gradient(ellipse 70% 40% at 65% 0%, rgba(219,234,254,0.9) 0%, transparent 60%),
            radial-gradient(ellipse 45% 30% at 0% 100%, rgba(220,252,231,0.45) 0%, transparent 55%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          font-family: 'DM Sans', sans-serif;
        }

        .scan-card {
          width: 100%;
          max-width: 510px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 36px 36px 32px;
          box-shadow:
            0 1px 3px rgba(0,0,0,0.05),
            0 8px 24px rgba(37,99,235,0.08),
            0 32px 64px rgba(15,23,42,0.07);
          animation: cardUp 0.45s cubic-bezier(0.22,1,0.36,1) both;
        }

        @keyframes cardUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .scan-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 26px;
          padding-bottom: 22px;
          border-bottom: 1px solid #f1f5f9;
        }

        .scan-icon {
          width: 46px; height: 46px;
          background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
          border-radius: 13px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(37,99,235,0.28);
          flex-shrink: 0;
        }

        .scan-title {
          font-size: 19px; font-weight: 700;
          color: #0f172a; margin: 0;
          letter-spacing: -0.02em;
        }

        .scan-sub {
          font-family: 'DM Mono', monospace;
          font-size: 10px; color: #94a3b8;
          margin: 2px 0 0; letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        /* Tabs */
        .tab-row {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 5px; background: #f1f5f9;
          border-radius: 12px; padding: 4px;
          margin-bottom: 24px;
        }

        .tab-btn {
          padding: 10px; border: none; border-radius: 9px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.18s ease;
          display: flex; align-items: center;
          justify-content: center; gap: 7px;
          color: #64748b; background: transparent;
        }

        .tab-btn.active {
          background: #ffffff; color: #1e40af;
          box-shadow: 0 1px 4px rgba(0,0,0,0.09), 0 0 0 1px rgba(37,99,235,0.09);
        }

        /* Labels */
        .f-label {
          display: block;
          font-family: 'DM Mono', monospace;
          font-size: 10px; font-weight: 500;
          letter-spacing: 0.13em; text-transform: uppercase;
          color: #94a3b8; margin-bottom: 8px;
        }

        /* Barcode input */
        .barcode-input {
          width: 100%; padding: 13px 16px;
          font-family: 'DM Mono', monospace;
          font-size: 14px; font-weight: 500;
          color: #0f172a; background: #f8faff;
          border-radius: 11px; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          letter-spacing: 0.03em;
        }
        .barcode-input::placeholder { color: #cbd5e1; font-weight: 400; }

        /* QR drop zone */
        .qr-drop {
          border: 2px dashed #cbd5e1; border-radius: 14px;
          padding: 26px 20px; text-align: center;
          cursor: pointer; transition: all 0.2s ease;
          background: #f8faff;
        }
        .qr-drop:hover, .qr-drop.drag-over {
          border-color: #3b82f6; background: #eff6ff;
        }
        .qr-drop.drag-over { box-shadow: 0 0 0 3px rgba(59,130,246,0.14); }

        .qr-icon-wrap {
          width: 50px; height: 50px; background: #eff6ff;
          border-radius: 13px; border: 1px solid #bfdbfe;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 11px;
        }

        .qr-drop-title { font-size: 14px; font-weight: 600; color: #1e293b; margin: 0 0 3px; }
        .qr-drop-sub   { font-size: 12px; color: #94a3b8; margin: 0; }

        .qr-browse {
          display: inline-block; margin-top: 12px;
          padding: 8px 18px; background: #2563eb;
          color: white; border-radius: 8px;
          font-size: 12px; font-weight: 600;
          cursor: pointer; transition: background 0.18s;
        }
        .qr-browse:hover { background: #1d4ed8; }

        .qr-preview-wrap {
          margin-top: 12px; border-radius: 12px;
          overflow: hidden; border: 1px solid #e2e8f0;
          position: relative;
        }
        .qr-preview-img {
          width: 100%; max-height: 170px;
          object-fit: contain; background: #f8faff; display: block;
        }
        .qr-clear-btn {
          position: absolute; top: 8px; right: 8px;
          width: 26px; height: 26px; border-radius: 50%;
          background: rgba(15,23,42,0.55); border: none;
          color: white; font-size: 12px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.18s;
        }
        .qr-clear-btn:hover { background: rgba(15,23,42,0.8); }

        .qr-decoded-badge {
          display: flex; align-items: center; gap: 8px;
          margin-top: 10px; padding: 10px 14px;
          background: #f0fdf4; border: 1px solid #bbf7d0;
          border-radius: 10px; font-family: 'DM Mono', monospace;
          font-size: 12px; color: #15803d; font-weight: 500;
          word-break: break-all;
        }

        .qr-status {
          display: flex; align-items: center; gap: 8px;
          margin-top: 10px; padding: 10px 14px;
          border-radius: 10px; font-size: 12.5px; font-weight: 500;
        }
        .qr-status.decoding { background:#eff6ff; border:1px solid #bfdbfe; color:#2563eb; }
        .qr-status.error    { background:#fef2f2; border:1px solid #fecaca; color:#dc2626; }

        /* Validation */
        .v-pill {
          display: flex; align-items: flex-start; gap: 9px;
          margin-top: 9px; padding: 11px 14px; border-radius: 10px;
          font-size: 12.5px; font-family: 'DM Mono', monospace;
          animation: fadeSlide 0.2s ease both; line-height: 1.5;
        }
        @keyframes fadeSlide {
          from { opacity:0; transform:translateY(-4px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .v-pill.valid    { background:#f0fdf4; border:1px solid #bbf7d0; color:#15803d; }
        .v-pill.invalid  { background:#fef2f2; border:1px solid #fecaca; color:#dc2626; }
        .v-pill.checking { background:#f8faff; border:1px solid #e2e8f0; color:#64748b; }
        .v-sub { margin-top:3px; font-size:11px; opacity:0.7; }

        /* Action toggle */
        .action-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:22px; }

        .act-btn {
          padding: 13px; border: 2px solid transparent;
          border-radius: 12px; font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 700; letter-spacing: 0.05em;
          cursor: pointer; transition: all 0.2s ease;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .act-btn.in-on  { background:#f0fdf4; border-color:#16a34a; color:#15803d; box-shadow:0 0 0 3px rgba(22,163,74,0.1); }
        .act-btn.in-off { background:#f8faff; border-color:#e2e8f0; color:#94a3b8; }
        .act-btn.out-on  { background:#fff1f2; border-color:#dc2626; color:#b91c1c; box-shadow:0 0 0 3px rgba(220,38,38,0.1); }
        .act-btn.out-off { background:#f8faff; border-color:#e2e8f0; color:#94a3b8; }
        .act-btn:hover { filter:brightness(0.97); transform:translateY(-1px); }

        /* Select */
        .s-select {
          width: 100%; padding: 12px 14px;
          background: #f8faff; border: 1.5px solid #e2e8f0;
          border-radius: 11px; color: #1e293b;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 500; outline: none;
          cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 14px center;
          padding-right: 36px;
        }
        .s-select:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.1); }

        .divider { height:1px; background:#f1f5f9; margin:24px 0; }

        /* Scan button */
        .scan-btn {
          width:100%; padding:15px; border:none; border-radius:13px;
          font-family:'DM Sans',sans-serif; font-size:15px;
          font-weight:700; letter-spacing:0.06em;
          cursor:pointer; transition:all 0.22s ease;
        }
        .scan-btn.ready {
          background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 60%,#3b82f6 100%);
          color:white;
          box-shadow:0 4px 16px rgba(37,99,235,0.28),0 1px 3px rgba(0,0,0,0.08);
        }
        .scan-btn.ready:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(37,99,235,0.36),0 2px 6px rgba(0,0,0,0.08); }
        .scan-btn.ready:active { transform:translateY(0); }
        .scan-btn.processing { background:#bfdbfe; color:#1d4ed8; cursor:not-allowed; }
        .scan-btn.blocked { background:#f1f5f9; color:#94a3b8; cursor:not-allowed; border:1px solid #e2e8f0; }

        /* Result */
        .result-banner {
          margin-top:14px; padding:13px 16px; border-radius:12px;
          font-family:'DM Mono',monospace; font-size:12.5px;
          font-weight:500; line-height:1.6;
          animation:fadeSlide 0.22s ease both; word-break:break-all;
        }
        .result-banner.success { background:#f0fdf4; border:1px solid #bbf7d0; color:#15803d; }
        .result-banner.error   { background:#fef2f2; border:1px solid #fecaca; color:#dc2626; }

        .f-row { margin-top:20px; }

        .spin {
          display:inline-block; width:12px; height:12px;
          border:2px solid #bfdbfe; border-top-color:#2563eb;
          border-radius:50%; animation:spin 0.7s linear infinite; flex-shrink:0;
        }
        @keyframes spin { to { transform:rotate(360deg); } }

        .pulse-dot {
          width:7px; height:7px; border-radius:50%;
          background:#3b82f6; flex-shrink:0; margin-top:4px;
          animation:pulse 1.3s ease infinite;
        }
        @keyframes pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.35; transform:scale(0.7); }
        }
      `}</style>

      <div className="scan-wrap">
        <div className="scan-card">

          {/* Header */}
          <div className="scan-header">
            <div className="scan-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="7" y1="7" x2="7" y2="17"/>
                <line x1="10" y1="7" x2="10" y2="17"/>
                <line x1="13" y1="7" x2="13" y2="12"/>
                <line x1="16" y1="7" x2="16" y2="17"/>
              </svg>
            </div>
            <div>
              <h2 className="scan-title">Scan Barcode</h2>
              <p className="scan-sub">Warehouse Management System</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="tab-row">
            <button className={`tab-btn ${activeTab === "manual" ? "active" : ""}`} onClick={() => setActiveTab("manual")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="7" y1="7" x2="7" y2="17"/><line x1="10" y1="7" x2="10" y2="17"/>
                <line x1="13" y1="7" x2="13" y2="12"/><line x1="16" y1="7" x2="16" y2="17"/>
              </svg>
              Manual / Scanner
            </button>
            <button className={`tab-btn ${activeTab === "qr" ? "active" : ""}`} onClick={() => setActiveTab("qr")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <line x1="14" y1="14" x2="17" y2="14"/><line x1="21" y1="14" x2="21" y2="14"/>
                <line x1="14" y1="21" x2="21" y2="21"/><line x1="17" y1="14" x2="17" y2="21"/>
              </svg>
              Upload QR Image
            </button>
          </div>

          {/* ── Manual tab ── */}
          {activeTab === "manual" && (
            <div>
              <span className="f-label">Serial / Barcode</span>
              <input
                ref={inputRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                placeholder="Scan or type barcode..."
                className="barcode-input"
                style={{ border: `1.5px solid ${inputBorderColor}`, boxShadow: inputShadow }}
              />
            </div>
          )}

          {/* ── QR upload tab ── */}
          {activeTab === "qr" && (
            <div>
              <span className="f-label">QR Code Image</span>

              <div
                ref={dropRef}
                className="qr-drop"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="qr-icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                    <line x1="14" y1="14" x2="17" y2="14"/><line x1="17" y1="14" x2="17" y2="21"/>
                    <line x1="14" y1="21" x2="21" y2="21"/><line x1="21" y1="14" x2="21" y2="21"/>
                  </svg>
                </div>
                <p className="qr-drop-title">Drop QR image here</p>
                <p className="qr-drop-sub">PNG, JPG, WEBP · drag & drop or browse</p>
                <span className="qr-browse" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  Browse File
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </div>

              {/* Preview */}
              {qrPreview && (
                <div className="qr-preview-wrap">
                  <img src={qrPreview} alt="QR preview" className="qr-preview-img" />
                  <button className="qr-clear-btn" onClick={() => { setQrPreview(null); setBarcode(""); setQrError(""); setValidationResult(null); }}>✕</button>
                </div>
              )}

              {/* Decoding */}
              {qrDecoding && (
                <div className="qr-status decoding">
                  <span className="spin" />
                  Decoding QR code...
                </div>
              )}

              {/* Decoded */}
              {!qrDecoding && barcode && qrPreview && (
                <div className="qr-decoded-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Decoded:&nbsp;<strong>{barcode}</strong>
                </div>
              )}

              {/* Error */}
              {qrError && !qrDecoding && (
                <div className="qr-status error">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {qrError}
                </div>
              )}
            </div>
          )}

          {/* Validation feedback — shared */}
          {validating && barcode.length > 5 && (
            <div className="v-pill checking">
              <span className="pulse-dot" />
              Checking robot status...
            </div>
          )}
          {validationResult && !validating && (
            <div className={`v-pill ${validationResult.valid ? "valid" : "invalid"}`}>
              <span style={{ fontWeight: 700, flexShrink: 0, marginTop: "1px" }}>
                {validationResult.valid ? "✓" : "✕"}
              </span>
              <div>
                <div>{validationResult.message}</div>
                {validationResult.robot && (
                  <div className="v-sub">
                    {validationResult.robot.product} · {validationResult.robot.current_status} · {validationResult.robot.current_location}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action toggle */}
          <div className="f-row">
            <span className="f-label">Action</span>
            <div className="action-grid">
              <button onClick={() => setAction("IN")} className={`act-btn ${action === "IN" ? "in-on" : "in-off"}`}>↓ IN</button>
              <button onClick={() => setAction("OUT")} className={`act-btn ${action === "OUT" ? "out-on" : "out-off"}`}>↑ OUT</button>
            </div>
          </div>

          {/* Condition */}
          <div className="f-row">
            <span className="f-label">Condition</span>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="s-select">
              <option value="NEW">NEW / Sealed</option>
              <option value="OPEN">OPEN / Non-Sealed</option>
            </select>
          </div>

          {/* Destination */}
          {action === "OUT" && (
            <div className="f-row">
              <span className="f-label">Send To</span>
              <select value={destinationId} onChange={(e) => setDestinationId(e.target.value)} className="s-select">
                {locations.map((loc) => (
                  <option key={loc.location_id} value={loc.location_id}>{loc.location_name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="divider" />

          {/* Scan button */}
          <button
            onClick={handleScan}
            disabled={loading || isBlocked}
            className={`scan-btn ${isBlocked ? "blocked" : loading ? "processing" : "ready"}`}
          >
            {loading ? "⟳  Processing..." : isBlocked ? "⛔  Scan Blocked" : "SCAN"}
          </button>

          {/* Result */}
          {message && (
            <div className={`result-banner ${messageType}`}>
              {message}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
