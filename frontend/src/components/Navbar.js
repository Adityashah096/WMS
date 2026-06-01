import { Link, useLocation, useNavigate } from "react-router-dom";
import { getStoredUser, isAdmin, isLoggedIn, signOut } from "../utils/auth";

const styleId = "wms-premium-nav";
if (!document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    /* ─── ROOT ─── */
    :root {
      --nav-h: 68px;
      --nav-bg: #1a3fb7;
      --nav-glow: rgba(99, 145, 255, 0.55);
      --nav-pill: rgba(255,255,255,0.12);
      --nav-pill-hover: rgba(255,255,255,0.18);
      --nav-text: rgba(255,255,255,0.72);
      --nav-text-active: #ffffff;
      --nav-accent: #ffffff;
      --nav-radius: 10px;
      --nav-font: 'Inter', system-ui, sans-serif;
    }

    /* ─── SHELL ─── */
    .pnav {
      height: var(--nav-h);
      padding: 0 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: linear-gradient(135deg, #1e40af 0%, #1a35a8 50%, #1730a0 100%);
      box-shadow:
        0 1px 0 rgba(255,255,255,0.08) inset,
        0 4px 24px rgba(15,23,80,0.35),
        0 1px 3px rgba(15,23,80,0.5);
      font-family: var(--nav-font);
      position: relative;
      z-index: 200;
    }

    /* top-edge highlight */
    .pnav::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg,
        transparent 0%,
        rgba(255,255,255,0.25) 30%,
        rgba(255,255,255,0.45) 50%,
        rgba(255,255,255,0.25) 70%,
        transparent 100%
      );
    }

    /* ─── BRAND ─── */
    .pnav-brand {
      font-size: 15.5px;
      font-weight: 800;
      letter-spacing: 0.11em;
      color: #fff;
      text-decoration: none;
      text-transform: uppercase;
      white-space: nowrap;
      opacity: 0.95;
      transition: opacity 0.2s ease;
      flex-shrink: 0;
    }
    .pnav-brand:hover { opacity: 1; }

    /* ─── RIGHT GROUP ─── */
    .pnav-group {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    /* ─── NAV ITEM ─── */
    .pnav-item {
      position: relative;
      display: inline-flex;
      align-items: center;
      padding: 8px 16px;
      border-radius: var(--nav-radius);
      font-size: 15px;
      font-weight: 500;
      color: var(--nav-text);
      text-decoration: none;
      letter-spacing: 0.01em;
      cursor: pointer;
      border: none;
      background: transparent;
      font-family: var(--nav-font);
      transition:
        color 0.22s ease,
        background 0.22s ease;
      -webkit-font-smoothing: antialiased;
    }

    /* hover background pill */
    .pnav-item::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: var(--nav-radius);
      background: var(--nav-pill);
      opacity: 0;
      transform: scale(0.92);
      transition:
        opacity 0.22s ease,
        transform 0.28s cubic-bezier(0.34,1.3,0.64,1);
    }
    .pnav-item:hover::before {
      opacity: 1;
      transform: scale(1);
    }
    .pnav-item:hover {
      color: var(--nav-text-active);
    }

    /* luminous dot — appears above text on hover */
    .pnav-item::after {
      content: '';
      position: absolute;
      bottom: 5px;
      left: 50%;
      transform: translateX(-50%) scale(0);
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: rgba(255,255,255,0.9);
      box-shadow: 0 0 6px 2px rgba(180,210,255,0.7);
      transition:
        transform 0.25s cubic-bezier(0.34,1.56,0.64,1),
        opacity 0.2s ease;
      opacity: 0;
    }
    .pnav-item:hover::after {
      transform: translateX(-50%) scale(1);
      opacity: 1;
    }

    /* ─── ACTIVE STATE ─── */
    .pnav-item.pnav-active {
      color: var(--nav-text-active);
      font-weight: 600;
    }
    .pnav-item.pnav-active::before {
      opacity: 1;
      transform: scale(1);
      background: rgba(255,255,255,0.15);
      box-shadow:
        0 0 0 0.5px rgba(255,255,255,0.2),
        0 2px 12px rgba(0,0,0,0.15);
    }
    /* active: glowing underline bar */
    .pnav-item.pnav-active::after {
      content: '';
      position: absolute;
      bottom: 4px;
      left: 50%;
      width: 18px;
      height: 2.5px;
      border-radius: 99px;
      background: rgba(255,255,255,0.95);
      box-shadow: 0 0 8px 2px rgba(180,210,255,0.8);
      transform: translateX(-50%) scale(1);
      opacity: 1;
    }

    .pnav-menu {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .pnav-menu-panel {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      min-width: 210px;
      padding: 8px;
      border-radius: var(--nav-radius);
      background: rgba(255,255,255,0.98);
      border: 1px solid rgba(191,219,254,0.85);
      box-shadow: 0 18px 44px rgba(15,23,42,0.18);
      display: grid;
      gap: 4px;
      opacity: 0;
      transform: translateY(-6px);
      pointer-events: none;
      transition: opacity 0.18s ease, transform 0.18s ease;
    }

    .pnav-menu:hover .pnav-menu-panel,
    .pnav-menu:focus-within .pnav-menu-panel {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .pnav-subitem {
      display: block;
      padding: 10px 12px;
      border-radius: 8px;
      color: #1e3a8a;
      text-decoration: none;
      font-size: 13px;
      font-weight: 800;
      white-space: nowrap;
    }

    .pnav-subitem:hover,
    .pnav-subitem.pnav-subitem-active {
      background: #eff6ff;
      color: #1d4ed8;
    }

    /* ─── DIVIDER ─── */
    .pnav-divider {
      width: 1px;
      height: 18px;
      background: rgba(255,255,255,0.15);
      margin: 0 6px;
      flex-shrink: 0;
    }

    /* ─── USER BADGE ─── */
    .pnav-user {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 5px 12px;
      border-radius: var(--nav-radius);
      background: rgba(255,255,255,0.08);
      border: 0.5px solid rgba(255,255,255,0.16);
      font-size: 14px;
      font-weight: 500;
      color: rgba(255,255,255,0.82);
      font-family: var(--nav-font);
      white-space: nowrap;
      letter-spacing: 0.01em;
    }

    /* avatar circle */
    .pnav-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.15));
      border: 1px solid rgba(255,255,255,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11.5px;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
      letter-spacing: 0;
    }

    /* ─── SIGN OUT — premium ghost button ─── */
    .pnav-signout {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 18px;
      border-radius: var(--nav-radius);
      background: rgba(255,255,255,0.0);
      border: 0.5px solid rgba(255,255,255,0.3);
      font-size: 14.5px;
      font-weight: 600;
      font-family: var(--nav-font);
      color: rgba(255,255,255,0.85);
      cursor: pointer;
      letter-spacing: 0.01em;
      transition:
        background 0.22s ease,
        border-color 0.22s ease,
        color 0.18s ease,
        transform 0.18s ease,
        box-shadow 0.22s ease;
      -webkit-font-smoothing: antialiased;
      position: relative;
      overflow: hidden;
    }

    /* shimmer sweep on hover */
    .pnav-signout::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(105deg,
        transparent 30%,
        rgba(255,255,255,0.12) 50%,
        transparent 70%
      );
      transform: translateX(-100%);
      transition: transform 0.5s ease;
    }
    .pnav-signout:hover::before {
      transform: translateX(100%);
    }
    .pnav-signout:hover {
      background: rgba(255,255,255,0.12);
      border-color: rgba(255,255,255,0.55);
      color: #fff;
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    }
    .pnav-signout:active {
      transform: translateY(0px);
      box-shadow: none;
    }

    /* ─── LOGIN BUTTON ─── */
    .pnav-login {
      display: inline-flex;
      align-items: center;
      padding: 8px 20px;
      border-radius: var(--nav-radius);
      background: rgba(255,255,255,0.95);
      border: none;
      font-size: 15px;
      font-weight: 700;
      font-family: var(--nav-font);
      color: #1a35a8;
      text-decoration: none;
      letter-spacing: 0.01em;
      transition:
        background 0.2s ease,
        transform 0.18s ease,
        box-shadow 0.2s ease;
    }
    .pnav-login:hover {
      background: #fff;
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.18);
    }
    .pnav-login:active { transform: translateY(0); }
  `;
  document.head.appendChild(style);
}

function getInitials(name = "") {
  return name
    .trim()
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
}

// Maps location_id → { route, label } for each non-admin warehouse user
const LOCATION_CENTERS = {
  // Adjust IDs to match your actual DB location_id values
  1: { to: "/request-center",                 label: "AAJ Request Center" },
  2: { to: "/request-center/palai-plaza",     label: "Palai Request Center" },
  3: { to: "/request-center/repair-bhiwandi", label: "Repair Request Center" },
  4: { to: "/request-center/takshashela",     label: "Takshashela Request Center" },
};

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const loggedIn = isLoggedIn();
  const admin = isAdmin();
  const { name, role, locationId } = getStoredUser();

  // Build the Request Center nav entry based on role
  const requestCenterEntry = (() => {
    if (!loggedIn) return null;
    if (admin) {
      // Admin: dropdown with all locations
      return {
        to: "/request-center",
        label: "Request Centers",
        children: [
          { to: "/request-center",                 label: "AAJ Bhiwandi" },
          { to: "/request-center/palai-plaza",     label: "Palai Plaza" },
          { to: "/request-center/takshashela",     label: "Takshashela" },
          { to: "/request-center/repair-bhiwandi", label: "Repair Bhiwandi" },
        ],
      };
    }
    // Location user: direct link to their own center only
    const center = LOCATION_CENTERS[Number(locationId)];
    if (center) {
      return center;
    }
    return null;
  })();

  const links = loggedIn
    ? [
        { to: "/", label: "Dashboard" },
        { to: "/scan", label: "Scan" },
        { to: "/inventory", label: "Inventory" },
        { to: "/request-form", label: "Request Form" },
        { to: "/request-data", label: "Request Data" },
        ...(requestCenterEntry ? [requestCenterEntry] : []),
        { to: "/logs", label: "Logs" },
        ...(admin ? [{ to: "/warehouses", label: "Warehouses" }] : []),
      ]
    : [];

  const handleSignOut = () => {
    signOut();
    navigate("/login", { replace: true });
  };

  const isActiveLink = (to) =>
    location.pathname === to ||
    (to !== "/" && location.pathname.startsWith(`${to}/`));

  return (
    <div className="pnav">
      <Link to={loggedIn ? "/" : "/login"} className="pnav-brand">
        MIKO WMS  Portal
      </Link>

      <div className="pnav-group">
        {links.map((item) =>
          item.children ? (
            <div className="pnav-menu" key={item.to}>
              <Link
                to={item.to}
                className={`pnav-item${isActiveLink(item.to) ? " pnav-active" : ""}`}
              >
                {item.label}
              </Link>
              <div className="pnav-menu-panel">
                {item.children.map((child) => (
                  <Link
                    key={child.to}
                    to={child.to}
                    className={`pnav-subitem${location.pathname === child.to ? " pnav-subitem-active" : ""}`}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <Link
              key={item.to}
              to={item.to}
              className={`pnav-item${isActiveLink(item.to) ? " pnav-active" : ""}`}
            >
              {item.label}
            </Link>
          )
        )}

        {loggedIn && links.length > 0 && <div className="pnav-divider" />}

        {loggedIn ? (
          <>
            <div className="pnav-user">
              <div className="pnav-avatar">{getInitials(name)}</div>
              {name}
              {role ? <span style={{ opacity: 0.6, fontSize: 11 }}>· {role}</span> : null}
            </div>

            <button className="pnav-signout" onClick={handleSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <Link to="/login" className="pnav-login">
            Login
          </Link>
        )}
      </div>
    </div>
  );
}
