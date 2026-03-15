const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const projectRoutes = require('./routes/project.routes');
const featureRoutes = require('./routes/feature.routes');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-api-documentation-generator-backend' });
});

app.use('/', projectRoutes);
app.use('/', featureRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
