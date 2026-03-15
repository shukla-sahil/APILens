const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  // Keep startup logs compact for local development.
  console.log(`Backend listening on http://localhost:${env.port}`);
});
