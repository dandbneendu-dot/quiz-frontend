// Central configuration for the application API URL
// In development/testing, it defaults to localhost:3001/api.
// In production or live deployment, set VITE_API_URL in .env or your hosting environment (e.g. Vercel, Render, Netlify).

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export default API_URL;
