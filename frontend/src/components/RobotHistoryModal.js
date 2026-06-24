import React from "react";

function formatEventLabel(event, index, total) {
  const action = event.scan_result === "RECEIVED" ? "IN" : "OUT";

  if (index === 0) return `FIRST SCAN (${action})`;
  if (index === total - 1) return `LAST SCAN (${action})`;
  return `SCAN (${action})`;
}

function formatRoute(history) {
  if (!Array.isArray(history) || history.length === 0) return "No route data";

  const path = [];
  history.forEach((event) => {
    if (path[path.length - 1] !== event.location) {
      path.push(event.location);
    }
    if (event.destination && path[path.length - 1] !== event.destination) {
      path.push(event.destination);
    }
  });

  return path.join(" → ");
}

function RobotHistoryModal({ serial, robotHistory, loading, onClose }) {
  const history = Array.isArray(robotHistory?.history) ? [...robotHistory.history] : [];
  history.sort((a, b) => new Date(a.scanned_at) - new Date(b.scanned_at));

  const robot = robotHistory?.robot || {};

  const isInTransit = robot.current_status === "IN_TRANSIT";
  const nextDestination = isInTransit
    ? history.findLast(
        (e) => e.scan_result === "DISPATCHED" && e.destination
      )?.destination
    : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: "1100px",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 5,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "22px", color: "#111827" }}>
              TRAVEL SUMMARY 
            </h2>
            <div style={{ color: "#6b7280", marginTop: "4px", fontSize: "14px" }}>
              Serial: <strong>{serial || robot.serial_number || "N/A"}</strong>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#f3f4f6",
              borderRadius: "8px",
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Close
          </button>
        </div>

        <div style={{ padding: "24px" }}>
          {loading ? (
            <div style={{ color: "#6b7280", fontSize: "15px" }}>
              Loading journey details...
            </div>
          ) : robotHistory && robotHistory.found ? (
            <>
              <div
                style={{
                  marginBottom: "20px",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  fontWeight: 600,
                }}
              >
                {robotHistory?.message || "No journey history found."}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "16px",
                    background: "#fafafa",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                    Current Status
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>
                    {robot.current_status || "N/A"}
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "16px",
                    background: "#fafafa",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                    Current Location
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>
                    {robot.current_location || "N/A"}
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "16px",
                    background: "#fafafa",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                    Next Destination
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>
                    {nextDestination || "—"}
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "16px",
                    background: "#fafafa",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                    Route Summary
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>
                    {formatRoute(history)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "16px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "16px 18px",
                    background: "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  Journey Timeline
                </div>

                {history.length === 0 ? (
                  <div style={{ padding: "20px", color: "#6b7280" }}>
                    No history available.
                  </div>
                ) : (
                  <div style={{ padding: "20px" }}>
                    {history.map((event, index) => {
                      const isReceived = event.scan_result === "RECEIVED";
                          const isDemo =
                            event.scan_result === "DEMO";
                      return (
                        <div
                          key={`${event.scanned_at || "time"}-${index}`}
                          style={{
                            display: "flex",
                            gap: "14px",
                            position: "relative",
                            paddingBottom: index === history.length - 1 ? 0 : "22px",
                          }}
                        >
                          <div
                            style={{
                              position: "relative",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                backgroundColor: isReceived
                                  ? "#16a34a"
                                  : isDemo
                                  ? "#7E22CE"
                                  : "#dc2626",
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                                fontWeight: "800",
                                zIndex: 2,
                                flexShrink: 0,
                              }}
                            >
                              {isReceived ? "IN" : isDemo ? "DEMO" : "OUT"}
                            </div>

                            {index !== history.length - 1 && (
                              <div
                                style={{
                                  width: "2px",
                                  flex: 1,
                                  minHeight: "36px",
                                  backgroundColor: "#d1d5db",
                                  marginTop: "4px",
                                }}
                              />
                            )}
                          </div>

                          <div
                            style={{
                              flex: 1,
                              border: "1px solid #e5e7eb",
                              borderRadius: "14px",
                              padding: "14px 16px",
                              background: "#fff",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "12px",
                                flexWrap: "wrap",
                                marginBottom: "8px",
                              }}
                            >
                              <div style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>
                                {formatEventLabel(event, index, history.length)}
                              </div>
                              <div style={{ fontSize: "13px", color: "#6b7280" }}>
                                {event.scanned_at
                                  ? new Date(event.scanned_at).toLocaleString()
                                  : "N/A"}
                              </div>
                            </div>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                                gap: "10px 16px",
                                fontSize: "14px",
                                color: "#374151",
                              }}
                            >
                              <div>
                                <strong>Location:</strong> {event.location || "N/A"}
                              </div>
                              <div>
                                <strong>Destination:</strong> {event.destination || "N/A"}
                              </div>
                              <div>
                                <strong>Result:</strong> {event.scan_result || "N/A"}
                              </div>
                              <div>
                                <strong>Scanned By:</strong> {event.scanned_by || "N/A"}
                              </div>
                              <div>
                                <strong>Remarks:</strong> {event.remarks || "—"}
                              </div>
                              <div>
                                <strong>Reference:</strong>
                                {isDemo
                                  ? `Request Form #${event.request_id}`
                                    : "—"}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div
              style={{
                padding: "20px",
                borderRadius: "12px",
                background: "#fef2f2",
                color: "#b91c1c",
                fontWeight: 600,
              }}
            >
              No robot history found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RobotHistoryModal;