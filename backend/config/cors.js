// Shared CORS origin policy for the Express HTTP layer and Socket.IO.
//
// CORS_ORIGIN can be a single origin or a comma-separated list, e.g.
//   CORS_ORIGIN=https://raksha-route-odfi.vercel.app,https://preview.vercel.app
// When unset, every origin is allowed (dev convenience).

function getCorsOrigins() {
  const raw = process.env.CORS_ORIGIN || "*";
  const origins = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (origins.length === 0) return "*";
  return origins.includes("*") ? "*" : origins;
}

module.exports = { getCorsOrigins };