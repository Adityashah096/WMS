import { Link } from "react-router-dom";
import { WAREHOUSES } from "../constants/warehouses";

// Import local images
import demoImg from "../assets/images/demo.jpg";
import takImg from "../assets/images/tak.jpg";
import bhiwandiImg from "../assets/images/2.jpg";
import officeImg from "../assets/images/office.jpg";
import repairImg from "../assets/images/repair.jpg";

// Map warehouse slugs/names to their background images and theme colors
// Theme colors are HSL values: "hue saturation% lightness%"
const WAREHOUSE_VISUAL_MAP = {
  // Add slug-based overrides here. Keys should match warehouse.slug values.
  // Fallback logic: if slug not found, falls back to name-based match, then default.
  "takshashela": {
    image: takImg,
    themeColor: "210 70% 20%", // deep navy blue
  },
  "aaj-bhiwandi": {
    image: bhiwandiImg,
    themeColor: "25 80% 25%",  // deep amber/rust
  },
  "palava-plaza": {
    image: officeImg,
    themeColor: "180 50% 20%", // deep teal
  },
  "demo": {
    image: demoImg,
    themeColor: "150 50% 22%", // deep green
  },
};

// Fallback images cycled for warehouses not explicitly mapped
const FALLBACK_IMAGES = [repairImg, demoImg, takImg, bhiwandiImg, officeImg];
const FALLBACK_COLORS = [
  "220 60% 22%",
  "260 50% 28%",
  "15 70% 25%",
  "150 50% 22%",
  "200 65% 22%",
];

function getWarehouseVisual(warehouse, index) {
  // Try slug match first
  const slugKey = warehouse.slug?.toLowerCase();
  if (WAREHOUSE_VISUAL_MAP[slugKey]) {
    return WAREHOUSE_VISUAL_MAP[slugKey];
  }

  // Try partial name match
  const nameLower = warehouse.name?.toLowerCase() || "";
  for (const [key, val] of Object.entries(WAREHOUSE_VISUAL_MAP)) {
    if (nameLower.includes(key) || key.includes(nameLower.split(" ")[0])) {
      return val;
    }
  }

  // Fallback: cycle through available assets
  return {
    image: FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
    themeColor: FALLBACK_COLORS[index % FALLBACK_COLORS.length],
  };
}

export default function Warehouses() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "28px",
        backgroundColor: "#eff6ff",
        backgroundImage: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 48%, #ffffff 100%)",
      }}
    >
      {/* Header — unchanged */}
      <div
        style={{
          marginBottom: "28px",
          padding: "26px 28px",
          borderRadius: "24px",
          backgroundColor: "rgba(59, 130, 246, 0.12)",
          border: "1px solid rgba(59, 130, 246, 0.18)",
        }}
      >
        <h1 style={{ margin: 0, color: "#1e293b", fontSize: "32px", letterSpacing: "0.06em" }}>
          WAREHOUSES
        </h1>
        <p style={{ color: "#334155", margin: "10px 0 0 0", fontSize: "15px", maxWidth: "720px" }}>
          Admin-only location access. Select a warehouse to open its stock dashboard with total stock,
          incoming stock, transit stock, and product-wise breakdown.
        </p>
      </div>

      {/* Cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(0, 1fr))",
          gap: "20px",
        }}
      >
        {WAREHOUSES.map((warehouse, index) => {
          const { image, themeColor } = getWarehouseVisual(warehouse, index);

          return (
            <Link
              key={warehouse.slug}
              to={`/warehouses/${warehouse.slug}`}
              style={{ textDecoration: "none", color: "inherit", display: "block" }}
            >
              {/* Outer group wrapper — enables hover effects on children */}
              <div
                className="warehouse-card-group"
                style={{
                  // CSS custom property for themed glow/gradient
                  "--theme-color": themeColor,
                  width: "100%",
                  height: "420px",
                }}
              >
                {/* Inner card — mimics card-21's <a> element */}
                <div
                  className="warehouse-card-inner"
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    borderRadius: "22px",
                    overflow: "hidden",
                    boxShadow: `0 0 40px -15px hsl(${themeColor} / 0.45), 0 18px 50px rgba(15,23,42,0.15)`,
                    transition: "transform 0.45s ease, box-shadow 0.45s ease",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "scale(1.045)";
                    e.currentTarget.style.boxShadow = `0 0 60px -10px hsl(${themeColor} / 0.65), 0 24px 60px rgba(15,23,42,0.2)`;
                    e.currentTarget.querySelector(".bg-zoom").style.transform = "scale(1.1)";
                    e.currentTarget.querySelector(".explore-btn").style.backgroundColor = `hsl(${themeColor} / 0.45)`;
                    e.currentTarget.querySelector(".explore-btn").style.borderColor = `hsl(${themeColor} / 0.6)`;
                    e.currentTarget.querySelector(".arrow-icon").style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = `0 0 40px -15px hsl(${themeColor} / 0.45), 0 18px 50px rgba(15,23,42,0.15)`;
                    e.currentTarget.querySelector(".bg-zoom").style.transform = "scale(1)";
                    e.currentTarget.querySelector(".explore-btn").style.backgroundColor = `hsl(${themeColor} / 0.18)`;
                    e.currentTarget.querySelector(".explore-btn").style.borderColor = `hsl(${themeColor} / 0.3)`;
                    e.currentTarget.querySelector(".arrow-icon").style.transform = "translateX(0)";
                  }}
                >
                  {/* Background image with zoom transition */}
                  <div
                    className="bg-zoom"
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage: `url(${image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      transition: "transform 0.5s ease",
                    }}
                  />

                  {/* Themed gradient overlay */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `linear-gradient(to top, hsl(${themeColor} / 0.92), hsl(${themeColor} / 0.6) 35%, transparent 65%)`,
                    }}
                  />

                  {/* Content */}
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      height: "100%",
                      padding: "28px 26px",
                      color: "white",
                    }}
                  >
                    {/* Badge */}
                    <div
                      style={{
                        display: "inline-flex",
                        alignSelf: "flex-start",
                        padding: "5px 13px",
                        borderRadius: "999px",
                        backgroundColor: "rgba(255,255,255,0.15)",
                        backdropFilter: "blur(8px)",
                        color: "rgba(255,255,255,0.9)",
                        fontSize: "11px",
                        fontWeight: "700",
                        letterSpacing: "0.12em",
                        marginBottom: "14px",
                      }}
                    >
                      STOCK DASHBOARD
                    </div>

                    {/* Warehouse name */}
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "30px",
                        fontWeight: "800",
                        letterSpacing: "0.01em",
                        lineHeight: 1.15,
                        textShadow: "0 2px 12px rgba(0,0,0,0.4)",
                      }}
                    >
                      {warehouse.name}
                    </h2>

                    {/* Explore button — mimics card-21's button */}
                    <div
                      className="explore-btn"
                      style={{
                        marginTop: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: `hsl(${themeColor} / 0.18)`,
                        backdropFilter: "blur(10px)",
                        border: `1px solid hsl(${themeColor} / 0.3)`,
                        borderRadius: "12px",
                        padding: "13px 18px",
                        transition: "background-color 0.3s ease, border-color 0.3s ease",
                      }}
                    >
                      <span style={{ fontSize: "14px", fontWeight: "700", letterSpacing: "0.05em" }}>
                        Open location view
                      </span>
                      {/* Arrow icon (inline SVG) */}
                      <svg
                        className="arrow-icon"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ transition: "transform 0.3s ease", flexShrink: 0 }}
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}