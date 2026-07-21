// apps/content-forms/proxy.conf.js — relative REST proxied to Java services (06 §4).
module.exports = {
  '/api/forms':   { target: 'http://localhost:8203', changeOrigin: true, logLevel: 'debug' },
  '/api/session': { target: 'http://localhost:8080', changeOrigin: true }, // shared identity service
};
