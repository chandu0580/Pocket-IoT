export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "https://pocket-iot.onrender.com";

