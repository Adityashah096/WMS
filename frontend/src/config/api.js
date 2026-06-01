const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

const getApiBaseUrl = () => {
  const configuredBaseUrl = process.env.REACT_APP_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return trimTrailingSlash(configuredBaseUrl);
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000/api/v1";
  }

  return "/api/v1";
};

const API_URL = getApiBaseUrl();

export default API_URL;
