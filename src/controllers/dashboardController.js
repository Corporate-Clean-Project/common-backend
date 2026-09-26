const asyncHandler = require('express-async-handler');
const Inquiry = require('../models/Inquiry');
const User = require('../models/User');

// @desc  Admin: essential dashboard stats
// @route GET /api/dashboard/stats
const getStats = asyncHandler(async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalInquiries,
    newInquiries,
    quotedInquiries,
    inquiriesToday,
    repliesToday,
    totalTeamMembers,
    recentInquiries,
  ] = await Promise.all([
    Inquiry.countDocuments(),
    Inquiry.countDocuments({ status: 'new' }),
    Inquiry.countDocuments({ status: 'quoted' }),
    Inquiry.countDocuments({ createdAt: { $gte: startOfToday } }),
    Inquiry.countDocuments({ 'replies.sentAt': { $gte: startOfToday } }),
    User.countDocuments({ status: { $ne: 'disabled' } }),
    Inquiry.find().sort({ createdAt: -1 }).limit(5).select('fullName email status type createdAt'),
  ]);

  res.json({
    success: true,
    stats: {
      totalInquiries,
      newInquiries,
      quotedInquiries,
      inquiriesToday,
      repliesToday,
      totalTeamMembers,
    },
    inquiriesRequiringAction: recentInquiries.filter((i) => i.status === 'new'),
    recentInquiries,
  });
});

module.exports = { getStats };
