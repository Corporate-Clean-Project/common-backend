/**
 * Cloudflare Worker entry point  (ES Module format)
 * ──────────────────────────────────────────────────
 * Built with esbuild platform:'node' for correct CJS→ESM interop.
 * Node.js built-ins are resolved at runtime by nodejs_compat.
 */

import { Readable, Writable } from 'node:stream';
import { Buffer } from 'node:buffer';
import { createApp } from './app';
// import { connectDB } from './config/db';

// Cache the Express app across invocations within the same isolate
let app;

/**
 * Inject Cloudflare Worker `env` bindings into `process.env` so that
 * all existing `process.env.XXX` references keep working.
 */
function injectEnv(env) {
  const keys = [
    'NODE_ENV',
    'CORS_ORIGINS',
    'MONGODB_URI',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'JWT_ACCESS_EXPIRES_IN',
    'JWT_REFRESH_EXPIRES_IN',
    'WEB_FRONTEND_URL',
    'ADMIN_FRONTEND_URL',
    'MAIL_FROM',
    'EMAILJS_SERVICE_ID',
    'EMAILJS_INVITE_TEMPLATE_ID',
    'EMAILJS_PUBLIC_KEY',
    'EMAILJS_PRIVATE_KEY',
    'EMAILJS_MAIL_TEMPLATE_ID',
  ];

  for (const key of keys) {
    if (env[key] !== undefined) {
      process.env[key] = env[key];
    }
  }
}

/**
 * Convert a Worker `Request` → Node-style req/res,
 * invoke Express, and return a Worker `Response`.
 */
async function handleRequest(request, env) {
  // 1. Populate process.env from Worker env bindings
  injectEnv(env);

  // 2. Ensure DB is connected (connection is cached)
  // await connectDB();

  // 3. Lazy-init the Express app
  if (!app) {
    app = createApp();
  }

  // 4. Parse the incoming Worker Request
  const url = new URL(request.url);
  const body = ['GET', 'HEAD'].includes(request.method)
    ? undefined
    : Buffer.from(await request.arrayBuffer());

  // 5. Build Node-style headers object
  const headers = {};
  for (const [key, value] of request.headers.entries()) {
    headers[key] = value;
  }

  // 6. Create a promise that resolves when Express finishes responding
  return new Promise((resolve, reject) => {
    // Minimal mock of Node http.IncomingMessage
    const req = new Readable({ read() { } });
    if (body) {
      req.push(body);
    }
    req.push(null);

    req.method = request.method;
    req.url = url.pathname + url.search;
    req.headers = headers;
    req.connection = { remoteAddress: headers['cf-connecting-ip'] || '127.0.0.1' };
    req.socket = { encrypted: url.protocol === 'https:' };

    // Minimal mock of Node http.ServerResponse
    const chunks = [];
    let statusCode = 200;
    const resHeaders = {};

    const res = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
        callback();
      },
    });

    res.statusCode = 200;
    res.setHeader = (name, value) => { resHeaders[name.toLowerCase()] = value; };
    res.getHeader = (name) => resHeaders[name.toLowerCase()];
    res.removeHeader = (name) => { delete resHeaders[name.toLowerCase()]; };
    res.writeHead = (code, reasonOrHeaders, maybeHeaders) => {
      statusCode = code;
      const h = typeof reasonOrHeaders === 'object' ? reasonOrHeaders : maybeHeaders;
      if (h) {
        for (const [k, v] of Object.entries(h)) {
          resHeaders[k.toLowerCase()] = v;
        }
      }
    };

    Object.defineProperty(res, 'statusCode', {
      get: () => statusCode,
      set: (v) => { statusCode = v; },
    });

    res.end = (data, encoding) => {
      if (data) {
        chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data, encoding || 'utf-8'));
      }
      const responseBody = Buffer.concat(chunks);
      resolve(new Response(responseBody.length > 0 ? responseBody : null, {
        status: statusCode,
        headers: resHeaders,
      }));
    };

    try {
      app(req, res);
    } catch (err) {
      reject(err);
    }
  });
}

// ── ES Module default export (required by Wrangler + nodejs_compat) ──
export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env);
    } catch (err) {
      return new Response(JSON.stringify({ success: false, message: err.message }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
  },
};
