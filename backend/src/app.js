const express = require('express');
const path = require('path');

const dashboardRoutes = require('./routes/dashboardRoutes');
const healthRoutes = require('./routes/healthRoutes');
const errorHandler = require('./middlewares/errorHandler');

const FRONTEND_PUBLIC = path.join(__dirname, '../../frontend/public');
const FRONTEND_SRC = path.join(__dirname, '../../frontend/src');

function createApp() {
  const app = express();

  app.use(express.json());

  // Serve the dashboard (static HTML/CSS/assets) and its ES-module source
  app.use(express.static(FRONTEND_PUBLIC));
  app.use('/src', express.static(FRONTEND_SRC));

  // API routes
  app.use('/api', dashboardRoutes);
  app.use('/health', healthRoutes);

  app.use(errorHandler);

  return app;
}

module.exports = createApp;
