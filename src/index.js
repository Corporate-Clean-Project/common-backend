require('dotenv').config();
const { connectDB } = require('./config/db');
const { createApp } = require('./createApp');

const app = createApp();


if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`[server] common-backend listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
      });
    })
    .catch((err) => {
      console.error('[server] Failed to start:', err.message);
      process.exit(1);
    });
}

module.exports = app;