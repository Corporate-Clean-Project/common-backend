const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { sendInvitationEmail } = require('../utils/emailjs');

const TEMPORARY_PASSWORD_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateTemporaryPassword() {
  return Array.from(
    { length: 6 },
    () => TEMPORARY_PASSWORD_CHARACTERS[crypto.randomInt(TEMPORARY_PASSWORD_CHARACTERS.length)]
  ).join('');
}

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, users: users.map((u) => u.toSafeObject()) });
});


const inviteUser = asyncHandler(async (req, res) => {
  const { email, role = 'admin', name } = req.body || {};
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    res.status(400);
    throw new Error('A valid email is required');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    res.status(409);
    throw new Error('A user with that email already exists');
  }

  const temporaryPassword = generateTemporaryPassword();

  const user = await User.create({
    name: typeof name === 'string' && name.trim() ? name.trim() : normalizedEmail.split('@')[0],
    email: normalizedEmail,
    password: temporaryPassword,
    role,
    status: 'invited',
  });

  try {
    await sendInvitationEmail({
      to: user.email,
      name: user.name,
      role: user.role,
      temporaryPassword,
    });
  } catch (err) {
    await user.deleteOne();
    throw new Error(`Invitation email could not be sent: ${err.message}`);
  }

  res.status(201).json({ success: true, user: user.toSafeObject() });
});


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
