export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (window.location.port === "5173"
    ? `http://${window.location.hostname}:5000`
    : window.location.origin);
