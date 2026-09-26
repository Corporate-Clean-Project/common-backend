const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendMail } = require('../utils/mailer');

// @desc  Admin login
// @route POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || user.status === 'disabled' || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res.json({
    success: true,
    accessToken,
    refreshToken,
    user: user.toSafeObject(),
  });
});

// @desc  Exchange a refresh token for a new access token
// @route POST /api/auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400);
    throw new Error('refreshToken is required');
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.sub);
    if (!user || user.status === 'disabled') {
      res.status(401);
      throw new Error('Invalid refresh token');
    }
    const accessToken = signAccessToken(user);
    res.json({ success: true, accessToken });
  } catch (err) {
    res.status(401);
    throw new Error('Invalid or expired refresh token');
  }
});

// @desc  Get the currently authenticated admin user
// @route GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});

// @desc  Kick off a password reset (always responds success to avoid email enumeration)
// @route POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });

  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.ADMIN_FRONTEND_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(
      user.email
    )}`;

    await sendMail({
      to: user.email,
      subject: 'Reset your Top Pristine admin password',
      html: `<p>Hello ${user.name},</p><p>Click the link below to reset your admin workstation password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });
  }

  res.json({
    success: true,
    message: 'If an account exists for that email, a reset link has been sent.',
  });
});

// @desc  Complete a password reset using the emailed token
// @route POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { email, token, password } = req.body;
  if (!email || !token || !password) {
    res.status(400);
    throw new Error('email, token and password are required');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    email: email.toLowerCase(),
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired password reset token');
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Password updated successfully. Please sign in.' });
});

// @desc  Accept a team invite and set an initial password
// @route POST /api/auth/accept-invite
const acceptInvite = asyncHandler(async (req, res) => {
  const { email, token, name, password } = req.body;
  if (!email || !token || !password) {
    res.status(400);
    throw new Error('email, token and password are required');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    email: email.toLowerCase(),
    inviteToken: hashedToken,
    inviteTokenExpires: { $gt: Date.now() },
  }).select('+inviteToken +inviteTokenExpires');

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired invite token');
  }

  if (name) user.name = name;
  user.password = password;
  user.status = 'active';
  user.inviteToken = undefined;
  user.inviteTokenExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Account activated. Please sign in.' });
});

module.exports = { login, refresh, me, forgotPassword, resetPassword, acceptInvite };
