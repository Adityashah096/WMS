import React from "react";

function formatEventLabel(event, index, total) {
  const action = event.scan_result === "RECEIVED" ? "IN" : "OUT";
  if (index === 0) return `FIRST SCAN (${action})`;
  if (index === total - 1) return `LAST SCAN (${action})`;
  return `SCAN (${action})`;
}

function formatRoute(history) {
  if (!Array.isArray(history) || history.length === 0) return "No route data";
  // Filters unique stops to avoid the "AAJ -> AAJ" clutter
  const path = [];
  history.forEach((event) => {
    if (path[path.length - 1] !== event.location) {
      path.push(event.location);
    }
    if (event.destination && path[path.length - 1] !== event.destination) {
      path.push(event.destination);
    }
  });
  return path.join("  →  ");
}

function RobotHistoryModal({ serial, robotHistory, loading, onClose }) {
  const history = Array.isArray(robotHistory?.history) ? [...robotHistory.history] : [];
  history.sort((a, b) => new Date(a.scanned_at) - new Date(b.scanned_at));

  const robot = robotHistory?.robot || {};

  // FIX: Only show a next destination if the robot is actively IN_TRANSIT.
  // Previously this grabbed the last event with ANY destination (including past
  // completed trips), which caused stale/wrong destinations to appear.
  const isInTransit = robot.current_status === "IN_TRANSIT";
  const nextDestination = isInTransit
    ? history.findLast((e) => e.scan_result === "DISPATCHED" && e.destination)?.destination
    : null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Inter, system-ui, sans-serif"
    }}>
      <div style={{
        backgroundColor: "white", borderRadius: "16px", width: "95%",
        maxWidth: "720px", maxHeight: "90vh", overflow: "hidden",
        display: "flex", flexDirection: "column", position: "relative",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
      }}>
        {/* Close Button */}
        <button onClick={onClose} style={{
          position: "absolute", top: "20px", right: "20px", zIndex: 10,
          backgroundColor: "#f3f4f6", border: "none", borderRadius: "50%",
          width: "32px", height: "32px", cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center"
        }}>✕</button>

        <div style={{ padding: "30px", overflowY: "auto" }}>
          <h2 style={{ margin: "0 0 4px 0", color: "#111827", fontSize: "20px" }}>Journey Log: {serial}</h2>
          <p style={{ margin: "0 0 20px 0", color: "#6b7280", fontSize: "14px" }}>Vehicle Summary</p>

          {loading ? (
            <p style={{ textAlign: "center", padding: "40px" }}>Loading journey details...</p>
          ) : robotHistory && robotHistory.found ? (
            <>
              {/* Top Banner Info */}
              <div style={{ backgroundColor: "#5688b1", borderRadius: "8px 8px 0 0", padding: "12px 20px", display: "flex", gap: "24px", color: "white", fontSize: "12px", fontWeight: "600" }}>
                <span>ROBOT TYPE: <span style={{ fontWeight: "400", marginLeft: "4px" }}>{robot.product || "GKS"}</span></span>
                <span>CURRENT STATUS: <span style={{ fontWeight: "400", marginLeft: "4px" }}>{robot.current_status || "AT_AAJ"}</span></span>
                <span>CURRENT LOCATION: <span style={{ fontWeight: "400", marginLeft: "4px" }}>{robot.current_location || "AAJ"}</span></span>
              </div>

              {/* Route Summary Box */}
              <div style={{ backgroundColor: "#fcfdfe", border: "1px solid #e5e7eb", borderTop: "none", padding: "15px 20px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "15px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#9ca3af", letterSpacing: "0.05em" }}>ROUTE:</span>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                  {formatRoute(history)}
                </div>
              </div>

              {/* At-a-glance Status Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "30px" }}>
                <div style={{ padding: "16px", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ backgroundColor: "#dcfce7", color: "#166534", padding: "4px", borderRadius: "50%", display: "flex" }}>✓</span>
                    <span style={{ fontWeight: "700", fontSize: "15px" }}>Current Stop</span>
                  </div>
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>You are here: <strong>{robot.current_location || "AAJ"}</strong></span>
                </div>

                <div style={{ padding: "16px", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#b91c1c", fontWeight: "bold" }}>→</span>
                      <span style={{ fontWeight: "700", fontSize: "15px" }}>Next Stop</span>
                    </div>
                    <span style={{ fontSize: "11px", backgroundColor: "#f3f4f6", padding: "2px 8px", borderRadius: "10px", color: "#6b7280" }}>Total Stops: {history.length}</span>
                  </div>
                  {/* FIX: Only render destination text when robot is IN_TRANSIT and
                      a destination is known. When parked at a location, this is blank. */}
                  {nextDestination ? (
                    <span style={{ fontSize: "14px", color: "#6b7280" }}>
                      Destination: <strong>{nextDestination}</strong>
                    </span>
                  ) : (
                    <span style={{ fontSize: "14px", color: "#9ca3af", fontStyle: "italic" }}>
                      {isInTransit ? "Destination unknown" : "Not in transit"}
                    </span>
                  )}
                </div>
              </div>

              {/* Timeline Section */}
              <h4 style={{ fontSize: "16px", marginBottom: "16px", color: "#111827" }}>Movement History ({history.length} events)</h4>
              
              <div style={{ position: "relative", paddingLeft: "10px" }}>
                {history.map((event, index) => {
                  const isReceived = event.scan_result === "RECEIVED";
                  return (
                    <div key={index} style={{ display: "flex", gap: "20px", marginBottom: "15px", position: "relative" }}>
                      {/* Vertical Line Connector */}
                      {index !== history.length - 1 && (
                        <div style={{ position: "absolute", left: "19px", top: "40px", bottom: "-15px", width: "2px", backgroundColor: "#e5e7eb" }} />
                      )}
                      
                      {/* Circle Icon */}
                      <div style={{
                        width: "40px", height: "40px", borderRadius: "50%", 
                        backgroundColor: isReceived ? "#16a34a" : "#dc2626",
                        color: "white", display: "flex", alignItems: "center", 
                        justifyContent: "center", fontSize: "11px", fontWeight: "800", zIndex: 2, flexShrink: 0
                      }}>
                        {isReceived ? "IN" : "OUT"}
                      </div>

                      {/* Event Card */}
                      <div style={{
                        flex: 1, padding: "16px", borderRadius: "12px", border: "1px solid #e5e7eb",
                        backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                          <span style={{ fontWeight: "700", fontSize: "14px", color: "#374151" }}>
                            {formatEventLabel(event, index, history.length)}
                            <span style={{ marginLeft: "8px", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: isReceived ? "#dcfce7" : "#fee2e2", color: isReceived ? "#166534" : "#991b1b" }}>
                              {isReceived ? "IN" : "OUT"}
                            </span>
                          </span>
                          <span style={{ fontSize: "12px", color: "#9ca3af" }}>🕒 {new Date(event.scanned_at).toLocaleString()}</span>
                        </div>
                        
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                          <div><span style={{ color: "#9ca3af" }}>Location:</span> <span style={{ fontWeight: "600" }}>{event.location}</span></div>
                          {event.destination && (
                            <div style={{ backgroundColor: "#fef9c3", padding: "2px 4px", borderRadius: "4px" }}>
                              <span style={{ color: "#854d0e" }}>Destination:</span> <span style={{ fontWeight: "600" }}>{event.destination}</span>
                            </div>
                          )}
                          <div style={{ gridColumn: "span 2" }}>
                            <span style={{ color: "#9ca3af" }}>Scanned by:</span> <span style={{ color: "#111827" }}>👤 {event.scanned_by || "System Admin"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p style={{ color: "#dc2626", textAlign: "center", padding: "20px" }}>{robotHistory?.message || "No journey history found."}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default RobotHistoryModal;
