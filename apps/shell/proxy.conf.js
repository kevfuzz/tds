// apps/shell/proxy.conf.js — dev only; keeps every local call same-origin on :4200
module.exports = {
  '/api':      { target: 'http://localhost:8080', changeOrigin: true, logLevel: 'debug' },
  '/registry': { target: 'http://localhost:4290', changeOrigin: true, pathRewrite: { '^/registry': '' } },
};
