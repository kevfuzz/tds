// apps/content-customer-records/proxy.conf.js
// All REST calls in dev go through this app's own origin and are proxied to the
// Java services — no CORS, and prod-identical relative URLs (06 §4).
module.exports = {
  '/api/customer-records': { target: 'http://localhost:8081', changeOrigin: true, logLevel: 'debug' },
  '/api/session':          { target: 'http://localhost:8080', changeOrigin: true }, // shared identity service
};
