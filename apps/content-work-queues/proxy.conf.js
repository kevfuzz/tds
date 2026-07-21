// apps/content-work-queues/proxy.conf.js — relative REST proxied to Java services (06 §4).
module.exports = {
  '/api/work-queues': { target: 'http://localhost:8202', changeOrigin: true, logLevel: 'debug' },
  '/api/session':     { target: 'http://localhost:8080', changeOrigin: true }, // shared identity service
};
