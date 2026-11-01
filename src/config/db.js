const mongoose = require('mongoose');

// Survives between requests on a warm Vercel instance
const cache = globalThis.__mongoose || (globalThis.__mongoose = { promise: null });

async function connectDB() {
  // Already connected: reuse it
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  // First caller starts the connection; concurrent callers wait on the same promise
  if (!cache.promise) {
    mongoose.set('strictQuery', true);
    cache.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 5,
      })
      .then(() => {
        console.log(`[db] MongoDB connected -> ${mongoose.connection.host}`);
      })
      .catch((err) => {
        cache.promise = null; // allow a retry on the next request
        throw err;
      });
  }

  await cache.promise;
  return mongoose.connection;
}

// If the connection drops, clear the cache so the next request reconnects
mongoose.connection.on('disconnected', () => {
  console.warn('[db] MongoDB disconnected');
  cache.promise = null;
});

module.exports = { connectDB };