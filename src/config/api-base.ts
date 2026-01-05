// src/config/api-base.ts

// Option 1: via .env (recommandé)
// VITE_API_BASE_URL=http://localhost:5004/api
const fromEnv = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;

// Option 2: fallback si .env absent
export const API_BASE_URL = fromEnv?.trim() || "http://localhost:5004/api";

// Bonus: pour permettre aussi `import API_BASE_URL from ...`
export default API_BASE_URL;
