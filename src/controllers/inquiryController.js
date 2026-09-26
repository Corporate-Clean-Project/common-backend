const asyncHandler = require('express-async-handler');
const Inquiry = require('../models/Inquiry');
const { sendMail } = require('../utils/mailer');

// Rough, purely illustrative estimate ranges for the public "instant quote" tool.
const SIZE_MULTIPLIER = { compact: 1, medium: 2.4, large: 4.8, estate: 8 };
const SERVICE_BASE = {
  kitchen: [45000, 120000],
  'primary-bath': [35000, 95000],
  'full-estate': [250000, 900000],
  millwork: [20000, 80000],
  exterior: [60000, 220000],
};

function estimateRange(serviceType, projectSize) {
  const base = SERVICE_BASE[serviceType] || [30000, 100000];
  const multiplier = SIZE_MULTIPLIER[projectSize] || 1;
  return {
    low: Math.round((base[0] * multiplier) / 1000) * 1000,
    high: Math.round((base[1] * multiplier) / 1000) * 1000,
  };
}

// @desc  Public: submit a general contact/inquiry form
// @route POST /api/inquiries
const createInquiry = asyncHandler(async (req, res) => {
  const { fullName, email, phone, scope, projectAddress, message } = req.body;
  if (!fullName || !email || !message) {
    res.status(400);
    throw new Error('fullName, email and message are required');
  }

  const inquiry = await Inquiry.create({
    type: 'general',
    fullName,
    email,
    phone,
    scope,
    projectAddress,
    message,
  });

  await sendMail({
    to: process.env.MAIL_FROM,
    subject: `New inquiry from ${fullName}`,
    html: `<p>New general inquiry received from ${fullName} (${email}).</p><p>${message}</p>`,
  });

  res.status(201).json({ success: true, inquiry });
});

// @desc  Public: submit an instant quote / project quote request
// @route POST /api/inquiries/quote
const createQuoteInquiry = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    phone,
    serviceType,
    projectSize,
    timeline,
    projectAddress,
    message,
  } = req.body;

  if (!fullName || !email || !serviceType || !projectSize) {
    res.status(400);
    throw new Error('fullName, email, serviceType and projectSize are required');
  }

  const { low, high } = estimateRange(serviceType, projectSize);

  const inquiry = await Inquiry.create({
    type: 'quote',
    fullName,
    email,
    phone,
    projectAddress,
    serviceType,
    projectSize,
    timeline,
    message,
    estimatedRangeLow: low,
    estimatedRangeHigh: high,
    status: 'quoted',
  });

  await sendMail({
    to: process.env.MAIL_FROM,
    subject: `New quote request from ${fullName}`,
    html: `<p>New quote request from ${fullName} (${email}) - estimate $${low.toLocaleString()} - $${high.toLocaleString()}.</p>`,
  });

  res.status(201).json({
    success: true,
    inquiry,
    estimate: { low, high, currency: 'USD' },
  });
});

// @desc  Admin: list inquiries with optional filtering/search
// @route GET /api/inquiries
const listInquiries = asyncHandler(async (req, res) => {
  const { status, type, q, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (q) {
    filter.$or = [
      { fullName: new RegExp(q, 'i') },
      { email: new RegExp(q, 'i') },
      { projectAddress: new RegExp(q, 'i') },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [inquiries, total] = await Promise.all([
    Inquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Inquiry.countDocuments(filter),
  ]);

  res.json({ success: true, inquiries, total, page: Number(page), limit: Number(limit) });
});

// @desc  Admin: get single inquiry
// @route GET /api/inquiries/:id
const getInquiry = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) {
    res.status(404);
    throw new Error('Inquiry not found');
  }
  res.json({ success: true, inquiry });
});

// @desc  Admin: update inquiry status
// @route PATCH /api/inquiries/:id
const updateInquiry = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) {
    res.status(404);
    throw new Error('Inquiry not found');
  }
  if (status) inquiry.status = status;
  await inquiry.save();
  res.json({ success: true, inquiry });
});

// @desc  Admin: reply to an inquiry by email (also stored on the record)
// @route POST /api/inquiries/:id/reply
const replyToInquiry = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message) {
    res.status(400);
    throw new Error('message is required');
  }

  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) {
    res.status(404);
    throw new Error('Inquiry not found');
  }

  inquiry.replies.push({
    message,
    sentBy: req.user._id,
    sentByName: req.user.name,
  });
  inquiry.status = 'replied';
  await inquiry.save();

  await sendMail({
    to: inquiry.email,
    subject: `Re: Your inquiry with Top Pristine Luxury Craft`,
    html: `<p>${message.replace(/\n/g, '<br/>')}</p><p>— ${req.user.name}, Top Pristine Luxury Craft</p>`,
  });

  res.json({ success: true, inquiry });
});

// @desc  Admin: delete an inquiry
// @route DELETE /api/inquiries/:id
const deleteInquiry = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) {
    res.status(404);
    throw new Error('Inquiry not found');
  }
  await inquiry.deleteOne();
  res.json({ success: true, message: 'Inquiry deleted' });
});

module.exports = {
  createInquiry,
  createQuoteInquiry,
  listInquiries,
  getInquiry,
  updateInquiry,
  replyToInquiry,
  deleteInquiry,
};
