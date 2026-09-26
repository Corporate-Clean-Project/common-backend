const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { sendMail } = require('../utils/mailer');

// @desc  List team members
// @route GET /api/users
const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, users: users.map((u) => u.toSafeObject()) });
});

// @desc  Invite a new team member (creates a pending user + emails an invite link)
// @route POST /api/users/invite
const inviteUser = asyncHandler(async (req, res) => {
  const { email, role = 'admin', name } = req.body;
  if (!email) {
    res.status(400);
    throw new Error('email is required');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(409);
    throw new Error('A user with that email already exists');
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const temporaryPassword = crypto.randomBytes(12).toString('hex');

  const user = await User.create({
    name: name || email.split('@')[0],
    email: email.toLowerCase(),
    password: temporaryPassword,
    role,
    status: 'invited',
    inviteToken: crypto.createHash('sha256').update(rawToken).digest('hex'),
    inviteTokenExpires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  const inviteUrl = `${process.env.ADMIN_FRONTEND_URL}/accept-invite?token=${rawToken}&email=${encodeURIComponent(
    user.email
  )}`;

  await sendMail({
    to: user.email,
    subject: "You've been invited to the Top Pristine Admin Workspace",
    html: `<p>You have been invited as <strong>${role}</strong>. Click below to set your password and activate your account (valid 7 days).</p><p><a href="${inviteUrl}">${inviteUrl}</a></p>`,
  });

  res.status(201).json({ success: true, user: user.toSafeObject() });
});

// @desc  Update a user's role or status
// @route PATCH /api/users/:id
const updateUser = asyncHandler(async (req, res) => {
  const { role, status, name } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (role) user.role = role;
  if (status) user.status = status;
  if (name) user.name = name;
  await user.save();
  res.json({ success: true, user: user.toSafeObject() });
});

// @desc  Remove a team member
// @route DELETE /api/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (String(user._id) === String(req.user._id)) {
    res.status(400);
    throw new Error('You cannot remove your own account');
  }
  await user.deleteOne();
  res.json({ success: true, message: 'User removed' });
});

module.exports = { listUsers, inviteUser, updateUser, deleteUser };
