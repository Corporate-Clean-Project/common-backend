const express = require('express');
const { protect } = require('../middleware/auth');
const {
  login,
  refresh,
  me,
  forgotPassword,
  resetPassword,
  acceptInvite,
} = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/accept-invite', acceptInvite);
router.get('/me', protect, me);

module.exports = router;
