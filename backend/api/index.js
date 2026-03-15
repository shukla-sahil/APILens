const app = require('../src/app');

// Vercel Node functions invoke handlers as (req, res), and an Express app is directly compatible.
module.exports = app;
