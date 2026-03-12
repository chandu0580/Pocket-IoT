export const API_BASE = "https://pocket-iot.onrender.com";
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? API_BASE;
