export const WAREHOUSES = [
  {
    id: 2,
    slug: "palai-plaza",
    name: "Palai Plaza",
    displayName: "PALAI PLAZA",
    email: "palai@wms.com",
  },
  {
    id: 4,
    slug: "takshashela",
    name: "Takshashela",
    displayName: "TAKSHASHELA",
    email: "takshashela@wms.com",
  },
  {
    id: 1,
    slug: "aaj-bhiwandi",
    name: "Aaj Bhiwandi",
    displayName: "AAJ BHIWANDI",
    email: "aaj@wms.com",
  },
  {
    id: 3,
    slug: "repair-bhiwandi",
    name: "Repair Bhiwandi",
    displayName: "REPAIR BHIWANDI",
    email: "repair@wms.com",
  },
  {
    id: 5,
    slug: "demo-sample",
    name: "Demo/Sample",
    displayName: "DEMO / SAMPLE",
  },
];

export const WAREHOUSE_BY_SLUG = Object.fromEntries(
  WAREHOUSES.map((warehouse) => [warehouse.slug, warehouse])
);

export const WAREHOUSE_BY_ID = Object.fromEntries(
  WAREHOUSES.map((warehouse) => [String(warehouse.id), warehouse])
);

export const WAREHOUSE_BY_EMAIL = Object.fromEntries(
  WAREHOUSES.filter((warehouse) => warehouse.email).map((warehouse) => [warehouse.email, warehouse])
);

export const getWarehouseBySlug = (slug) => WAREHOUSE_BY_SLUG[String(slug || "").trim()] || null;

export const getWarehouseById = (locationId) => WAREHOUSE_BY_ID[String(locationId || "").trim()] || null;

export const getWarehouseByEmail = (email) => WAREHOUSE_BY_EMAIL[String(email || "").trim().toLowerCase()] || null;

export const getWarehouseDisplayName = ({ email, locationId } = {}) => {
  const byEmail = getWarehouseByEmail(email);
  if (byEmail) return byEmail.displayName;

  const byId = getWarehouseById(locationId);
  if (byId) return byId.displayName;

  return "UNKNOWN LOCATION";
};
