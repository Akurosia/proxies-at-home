/// <reference types="vite/client" />
const fromEnv = import.meta.env.VITE_API_BASE;

export const API_BASE =
  (fromEnv && fromEnv.replace(/\/$/, "")) || (import.meta.env.DEV ? "" : "");

// Helper to safely prefix with API_BASE (or keep relative)
export const apiUrl = (path: string) => {
  const base = API_BASE?.replace(/\/+$/, "") || "";
  const cleanPath = path.replace(/^\/+/, "");
  return base ? `${base}/${cleanPath}` : `/${cleanPath}`;
};
