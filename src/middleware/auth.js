const asyncHandler = require('express-async-handler');
const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    res.status(401);
    throw new Error('Not authorized - no token provided');
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub);
    if (!user || user.status === 'disabled') {
      res.status(401);
      throw new Error('Not authorized - user not found or disabled');
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401);
    throw new Error('Not authorized - invalid or expired token');
  }
});

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403);
    throw new Error('Forbidden - insufficient permissions');
  }
  next();
};

module.exports = { protect, requireRole };
