// apps/content-<%= name %>/proxy.conf.js
// All REST is relative and proxied to the team's Java services in dev — no CORS,
// prod-identical relative URLs (06 §4). App code never hardcodes service hosts.
module.exports = {
  '/api/<%= name %>': { target: 'http://localhost:<%= backendPort %>', changeOrigin: true, logLevel: 'debug' },
  '/api/session':     { target: 'http://localhost:8080', changeOrigin: true }, // shared identity service
};
