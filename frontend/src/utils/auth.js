const AUTH_STORAGE_KEYS = ["token", "user_id", "name", "email", "role", "location_id"];

export const isLoggedIn = () => Boolean(localStorage.getItem("token"));

export const isAdmin = () => localStorage.getItem("role") === "ADMIN";

export const getStoredUser = () => ({
  token: localStorage.getItem("token"),
  userId: localStorage.getItem("user_id"),
  name: localStorage.getItem("name"),
  email: localStorage.getItem("email"),
  role: localStorage.getItem("role"),
  locationId: localStorage.getItem("location_id"),
});

export const signOut = () => {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
};
