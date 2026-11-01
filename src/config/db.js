// const mongoose = require('mongoose');

// let isConnected = false;

// async function connectDB() {
//   if (isConnected) return mongoose.connection;

//   const uri = process.env.MONGODB_URI;
//   if (!uri) {
//     throw new Error('MONGODB_URI is not defined in environment variables');
//   }

//   mongoose.set('strictQuery', true);

//   await mongoose.connect(uri, {
//     serverSelectionTimeoutMS: 10000,
//   });

//   isConnected = true;
//   console.log(`[db] MongoDB connected -> ${mongoose.connection.host}`);

//   mongoose.connection.on('disconnected', () => {
//     console.warn('[db] MongoDB disconnected');
//     isConnected = false;
//   });

//   return mongoose.connection;
// }

// module.exports = { connectDB };



const mongoose = require('mongoose');

let activeRequests = 0;
let connecting = null;

async function acquireDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined in environment variables');

  activeRequests++;
  try {
    if (!connecting) {
      mongoose.set('strictQuery', true);
      connecting = mongoose
        .connect(uri, { maxPoolSize: 1, serverSelectionTimeoutMS: 8000 })
        .then(() => console.log('[db] connected'))
        .catch((err) => { connecting = null; throw err; });
    }
    await connecting;
  } catch (err) {
    activeRequests--;
    throw err;
  }
}

async function releaseDB() {
  activeRequests--;
  if (activeRequests <= 0) {
    activeRequests = 0;
    connecting = null;
    try { await mongoose.disconnect(); } catch (_) { }
  }
}

module.exports = { acquireDB, releaseDB, connectDB: acquireDB };
