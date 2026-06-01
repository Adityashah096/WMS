import { useMemo } from "react";

const PRODUCT_ORDER = ["MIKO MINI", "MIKO 3", "SPARKY", "GKS"];

const PRODUCT_LABELS = {
  "MIKO MINI": "Miko Mini",
  "MIKO 3": "Miko 3",
  SPARKY: "Sparky",
  GKS: "GKS",
};

const COLOR_STYLES = {
  blue: { bg: "#dbeafe", border: "#93c5fd", text: "#1d4ed8" },
  purple: { bg: "#ede9fe", border: "#c4b5fd", text: "#6d28d9" },
  red: { bg: "#fee2e2", border: "#fca5a5", text: "#b91c1c" },
  green: { bg: "#dcfce7", border: "#86efac", text: "#166534" },
  yellow: { bg: "#fef9c3", border: "#fde047", text: "#92400e" },
  "no color": { bg: "#f1f5f9", border: "#cbd5e1", text: "#475569" },
  "n/a": { bg: "#f1f5f9", border: "#cbd5e1", text: "#475569" },
};

const normalizeKey = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

const normalizeCondition = (value) => {
  const normalized = normalizeKey(value);

  return normalized === "NEW" || normalized === "OPEN"
    ? normalized
    : "OTHER";
};

const normalizeColor = (value) => {
  const color = String(value || "").trim();
  return color || "No Color";
};

const getColorStyle = (color) =>
  COLOR_STYLES[String(color || "").trim().toLowerCase()] || {
    bg: "#eff6ff",
    border: "#bfdbfe",
    text: "#1e40af",
  };

const countConditions = (items) =>
  items.reduce(
    (counts, item) => {
      const condition = normalizeCondition(item.condition);

      if (condition === "NEW" || condition === "OPEN") {
        counts[condition] += 1;
      }

      return counts;
    },
    { NEW: 0, OPEN: 0 }
  );

function PremiumCard({ children, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "28px",
        padding: "28px",
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(18px)",
        border: "1px solid rgba(255,255,255,0.35)",
        boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
        transition: "all 0.35s ease",
        cursor: onClick ? "pointer" : "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform =
          "translateY(-6px) scale(1.02)";

        e.currentTarget.style.boxShadow =
          "0 25px 80px rgba(37,99,235,0.15), 0 0 40px rgba(255,255,255,0.25)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform =
          "translateY(0px) scale(1)";

        e.currentTarget.style.boxShadow =
          "0 18px 50px rgba(15,23,42,0.08)";
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at top right, rgba(255,255,255,0.5), transparent 45%)",
          pointerEvents: "none",
        }}
      />

      {children}
    </div>
  );
}

function DashboardSummaryCard({
  title,
  count,
  counts,
  onClick,
}) {
  return (
    <PremiumCard onClick={onClick}>
      <div style={{ position: "relative", zIndex: 2 }}>
        <div
          style={{
            textAlign: "center",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              color: "#334155",
              fontSize: "15px",
              fontWeight: "800",
              letterSpacing: "0.12em",
              marginBottom: "10px",
            }}
          >
            {title}
          </div>

          <div
            style={{
              color: "#172554",
              fontSize: "64px",
              fontWeight: "900",
              lineHeight: 1,
            }}
          >
            {count}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(135deg,#dcfce7,#f0fdf4)",
              borderRadius: "20px",
              padding: "20px",
              border:
                "1px solid rgba(34,197,94,0.18)",
            }}
          >
            <div
              style={{
                color: "#15803d",
                fontSize: "12px",
                fontWeight: "800",
                letterSpacing: "0.08em",
                marginBottom: "16px",
              }}
            >
              UNUSED / SEAL
            </div>

            <div
              style={{
                color: "#166534",
                fontSize: "48px",
                fontWeight: "900",
              }}
            >
              {counts.NEW}
            </div>
          </div>

          <div
            style={{
              background:
                "linear-gradient(135deg,#fef3c7,#fffbeb)",
              borderRadius: "20px",
              padding: "20px",
              border:
                "1px solid rgba(245,158,11,0.18)",
            }}
          >
            <div
              style={{
                color: "#d97706",
                fontSize: "12px",
                fontWeight: "800",
                letterSpacing: "0.08em",
                marginBottom: "16px",
              }}
            >
              USED / OPEN
            </div>

            <div
              style={{
                color: "#92400e",
                fontSize: "48px",
                fontWeight: "900",
              }}
            >
              {counts.OPEN}
            </div>
          </div>
        </div>
      </div>
    </PremiumCard>
  );
}

function ConditionPanel({
  title,
  total,
  items,
  emptyLabel,
  onHeaderClick,
  onColorClick,
}) {
  const isNewPanel = title === "UNUSED / SEAL";

  return (
    <div
      style={{
        background: isNewPanel
          ? "linear-gradient(135deg,#dcfce7,#f0fdf4)"
          : "linear-gradient(135deg,#ffffff,#f8fafc)",
        borderRadius: "20px",
        padding: "16px",
        border: "1px solid rgba(255,255,255,0.45)",
      }}
    >
      <div
        onClick={onHeaderClick}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
          paddingBottom: "10px",
          borderBottom:
            "1px solid rgba(148,163,184,0.18)",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            color: isNewPanel
              ? "#15803d"
              : "#1e3a8a",
            fontSize: "12px",
            fontWeight: "800",
            letterSpacing: "0.08em",
          }}
        >
          {title}
        </span>

        <span
          style={{
            color: isNewPanel
              ? "#166534"
              : "#0f172a",
            fontSize: "36px",
            fontWeight: "900",
          }}
        >
          {total}
        </span>
      </div>

      {items.length === 0 ? (
        <div
          style={{
            color: "#64748b",
            textAlign: "center",
            padding: "18px",
          }}
        >
          {emptyLabel}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "10px",
          }}
        >
          {items.map(([color, count]) => {
            const styles = getColorStyle(color);

            return (
              <div
                key={color}
                onClick={() => onColorClick?.(color)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  backgroundColor: styles.bg,
                  border: `1px solid ${styles.border}`,
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                }}
              >
                <span
                  style={{
                    color: styles.text,
                    fontWeight: "700",
                  }}
                >
                  {color}
                </span>

                <span
                  style={{
                    color: styles.text,
                    fontWeight: "800",
                  }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductCard({
  productKey,
  productLabel,
  stats,
  onFilterClick,
}) {
  const newEntries = Object.entries(
    stats.NEW || {}
  );

  const openEntries = Object.entries(
    stats.OPEN || {}
  );

  const newTotal = newEntries.reduce(
    (sum, [, count]) => sum + count,
    0
  );

  const openTotal = openEntries.reduce(
    (sum, [, count]) => sum + count,
    0
  );

  return (
    <PremiumCard>
      <div style={{ position: "relative", zIndex: 2 }}>
        <div
          onClick={() =>
            onFilterClick?.(
              productKey,
              "ALL",
              "ALL",
              "ALL"
            )
          }
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            cursor: "pointer",
          }}
        >
          <h3
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: "32px",
              fontWeight: "900",
            }}
          >
            {productLabel}
          </h3>

          <div
            style={{
              background:
                "linear-gradient(135deg,#2563eb,#1d4ed8)",
              color: "white",
              padding: "10px 16px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: "800",
            }}
          >
            TOTAL: {stats.total}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2,minmax(0,1fr))",
            gap: "16px",
          }}
        >
          <ConditionPanel
            title="UNUSED / SEAL"
            total={newTotal}
            items={newEntries}
            emptyLabel="No sealed stock"
            onHeaderClick={() =>
              onFilterClick?.(
                productKey,
                "ALL",
                "NEW",
                "ALL"
              )
            }
            onColorClick={(color) =>
              onFilterClick?.(
                productKey,
                color,
                "NEW",
                "ALL"
              )
            }
          />

          <ConditionPanel
            title="USED / OPEN"
            total={openTotal}
            items={openEntries}
            emptyLabel="No open stock"
            onHeaderClick={() =>
              onFilterClick?.(
                productKey,
                "ALL",
                "OPEN",
                "ALL"
              )
            }
            onColorClick={(color) =>
              onFilterClick?.(
                productKey,
                color,
                "OPEN",
                "ALL"
              )
            }
          />
        </div>
      </div>
    </PremiumCard>
  );
}

export default function StockDashboardView({
  data,
  loading,
  error,
  heroTitle,
  heroDescription,
  badgeLabel,
  secondaryBadgeLabel,
  headerAction,
  onFilterClick,
  isAdmin = false,
}) {
  const metrics = useMemo(() => {
    const safeData = Array.isArray(data)
      ? data
      : [];

    const stockItems = safeData.filter((item) => {
      const status = normalizeKey(
        item.current_status
      );

      return (
        status !== "INCOMING" &&
        status !== "IN_TRANSIT"
      );
    });

    const incomingItems = safeData.filter(
      (item) =>
        normalizeKey(item.current_status) ===
        "INCOMING"
    );

    const transitItems = safeData.filter(
      (item) =>
        normalizeKey(item.current_status) ===
        "IN_TRANSIT"
    );

    const products = {};

    stockItems.forEach((item) => {
      const productKey =
        normalizeKey(item.product) || "UNKNOWN";

      const color = normalizeColor(item.color);

      const condition = normalizeCondition(
        item.condition
      );

      if (!products[productKey]) {
        products[productKey] = {
          rawProduct: item.product || productKey,
          displayLabel:
            PRODUCT_LABELS[productKey] ||
            item.product ||
            productKey,
          total: 0,
          NEW: {},
          OPEN: {},
        };
      }

      products[productKey].total += 1;

      if (
        condition === "NEW" ||
        condition === "OPEN"
      ) {
        products[productKey][condition][color] =
          (products[productKey][condition][color] ||
            0) + 1;
      }
    });

    const orderedProductKeys =
      PRODUCT_ORDER.filter(
        (key) => products[key]
      ).concat(
        Object.keys(products).filter(
          (key) => !PRODUCT_ORDER.includes(key)
        )
      );

    const totalItems = isAdmin
      ? [...stockItems, ...transitItems]
      : stockItems;

    return {
      summaryCards: [
        {
          title: "TOTAL",
          count: totalItems.length,
          counts: countConditions(totalItems),
          status: "ALL",
        },
        {
          title: "INCOMING",
          count: incomingItems.length,
          counts: countConditions(incomingItems),
          status: "INCOMING",
        },
        {
          title: "TRANSIT",
          count: transitItems.length,
          counts: countConditions(transitItems),
          status: "IN_TRANSIT",
        },
      ],

      orderedProducts: orderedProductKeys.map(
        (key) => ({
          productKey: products[key].rawProduct,
          productLabel:
            products[key].displayLabel,
          stats: products[key],
        })
      ),
    };
  }, [data, isAdmin]);

  if (loading)
    return (
      <div style={{ padding: "20px" }}>
        Loading dashboard...
      </div>
    );

  if (error)
    return (
      <div
        style={{
          padding: "20px",
          color: "red",
        }}
      >
        {error}
      </div>
    );

  return (
    <div
      style={{
        padding: "28px",
        minHeight: "100vh",
        background:
          "linear-gradient(180deg,#eef4ff 0%,#f8fbff 40%,#ffffff 100%)",
      }}
    >
      <div
        style={{
          marginBottom: "26px",
          padding: "22px",
          borderRadius: "26px",
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(18px)",
          border:
            "1px solid rgba(255,255,255,0.4)",
          boxShadow:
            "0 10px 40px rgba(15,23,42,0.06)",
          display: "flex",
          justifyContent: "space-between",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "42px",
              fontWeight: "900",
              color: "#0f172a",
            }}
          >
            {heroTitle}
          </h1>

          <p
            style={{
              marginTop: "10px",
              color: "#475569",
              fontSize: "15px",
              maxWidth: "720px",
              lineHeight: 1.7,
            }}
          >
            {heroDescription}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(135deg,#2563eb,#1d4ed8)",
              color: "white",
              padding: "10px 16px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: "800",
            }}
          >
            {badgeLabel}
          </div>

          {secondaryBadgeLabel ? (
            <div
              style={{
                backgroundColor: "white",
                color: "#334155",
                padding: "10px 16px",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: "700",
              }}
            >
              {secondaryBadgeLabel}
            </div>
          ) : null}

          {headerAction}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: "22px",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(280px,1fr))",
          marginBottom: "24px",
        }}
      >
        {metrics.summaryCards.map((card) => (
          <DashboardSummaryCard
            key={card.title}
            title={card.title}
            count={card.count}
            counts={card.counts}
            onClick={() =>
              onFilterClick?.(
                "ALL",
                "ALL",
                "ALL",
                card.status
              )
            }
          />
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gap: "22px",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(360px,1fr))",
        }}
      >
        {metrics.orderedProducts.map(
          (product) => (
            <ProductCard
              key={product.productLabel}
              productKey={product.productKey}
              productLabel={product.productLabel}
              stats={product.stats}
              onFilterClick={onFilterClick}
            />
          )
        )}
      </div>
    </div>
  );
}