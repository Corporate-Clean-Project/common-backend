const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { acquireDB, releaseDB } = require('./config/db'); // adjust path to your db.js

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const inquiriesRoutes = require('./routes/inquiries.routes');
const contentRoutes = require('./routes/content.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const corsOptions = {
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(
      morgan((tokens, req, res) =>
        [
          tokens.method(req, res),
          tokens.url(req, res),
          tokens.status(req, res),
        ].join(' ')
      )
    );
  }

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
      req.headers['cf-connecting-ip'] ||
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      'unknown',
    validate: { ip: false, trustProxy: false, xForwardedForHeader: false },
  });
  app.use('/api', apiLimiter);

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  // Per-request database connection (Workers can't share sockets between requests)
  app.use('/api', async (req, res, next) => {
    try {
      await acquireDB();
      let released = false;
      const release = () => {
        if (!released) {
          released = true;
          releaseDB();
        }
      };
      res.on('finish', release);
      res.on('close', release);
      next();
    } catch (err) {
      next(err);
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/inquiries', inquiriesRoutes);
  app.use('/api/content', contentRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };