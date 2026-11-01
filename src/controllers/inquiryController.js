const asyncHandler = require('express-async-handler');
const Inquiry = require('../models/Inquiry');
const { sendMail } = require('../utils/mailer');

const INQUIRY_TYPES = ['General Inquiry', 'Partnership', 'Feedback', 'Other'];
const SERVICES = [
  'Commercial Office Cleaning',
  'Janitorial Services',
  'Deep Sanitization & Disinfection',
  'Post-Construction Cleaning',
  'Floor Care',
];
const CLEANING_SCHEDULES = ['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'One-time'];
const BUDGET_RANGES = ['Under $1,000/mo', '$1,000 - $3,000/mo', '$3,000+ / Custom'];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}


const createInquiry = asyncHandler(async (req, res) => {
  const {
    fullName,
    companyName,
    email,
    phone,
    inquiryType,
    message,
  } = req.body || {};
  if (
    !isNonEmptyString(fullName)
    || !isValidEmail(email)
    || !isNonEmptyString(phone)
    || !INQUIRY_TYPES.includes(inquiryType)
    || !isNonEmptyString(message)
  ) {
    res.status(400);
    throw new Error('fullName, valid email, phone, inquiryType and message are required');
  }

  const inquiry = await Inquiry.create({
    type: 'general',
    fullName: fullName.trim(),
    companyName,
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    inquiryType,
    message: message.trim(),
  });

  res.status(201).json({ success: true, inquiry });
});


const createQuoteInquiry = asyncHandler(async (req, res) => {
  const {
    contactName,
    companyName,
    email,
    phone,
    serviceType,
    facilitySize,
    cleaningSchedule,
    startDate,
    budgetRange,
    notes,
  } = req.body || {};
  const parsedFacilitySize = Number(facilitySize);
  const validStartDate = !startDate
    || (
      typeof startDate === 'string'
      && /^\d{4}-\d{2}-\d{2}$/.test(startDate)
      && !Number.isNaN(Date.parse(`${startDate}T00:00:00.000Z`))
      && new Date(`${startDate}T00:00:00.000Z`).toISOString().slice(0, 10) === startDate
    );

  if (
    !isNonEmptyString(contactName)
    || !isValidEmail(email)
    || !isNonEmptyString(phone)
    || !SERVICES.includes(serviceType)
    || !Number.isInteger(parsedFacilitySize)
    || parsedFacilitySize < 1
    || !CLEANING_SCHEDULES.includes(cleaningSchedule)
    || (budgetRange && !BUDGET_RANGES.includes(budgetRange))
    || !validStartDate
  ) {
    res.status(400);
    throw new Error('contactName, valid email, phone, serviceType, positive facilitySize and cleaningSchedule are required; optional fields must be valid');
  }

  const inquiry = await Inquiry.create({
    type: 'quote',
    fullName: contactName.trim(),
    companyName,
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    serviceType,
    facilitySize: parsedFacilitySize,
    cleaningSchedule,
    startDate: startDate || undefined,
    budgetRange: budgetRange || undefined,
    notes,
    message: notes,
  });

  await sendMail({
    to: process.env.MAIL_FROM,
    subject: `New cleaning quote request from ${contactName.trim()}`,
    html: `<p>New cleaning quote request from ${escapeHtml(contactName)} (${escapeHtml(email)}).</p><p>Company: ${escapeHtml(companyName || 'Not provided')}</p><p>Phone: ${escapeHtml(phone)}</p><p>Service: ${escapeHtml(serviceType)}</p><p>Facility size: ${parsedFacilitySize.toLocaleString()} sq ft</p><p>Schedule: ${escapeHtml(cleaningSchedule)}</p><p>Target start date: ${escapeHtml(startDate || 'Not provided')}</p><p>Budget: ${escapeHtml(budgetRange || 'Not provided')}</p><p>Notes: ${escapeHtml(notes || 'None')}</p>`,
  });

  res.status(201).json({ success: true, inquiry });
});


const listInquiries = asyncHandler(async (req, res) => {
  const { status, type, q, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (typeof q === 'string' && q.trim()) {
    const escapedQuery = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { fullName: new RegExp(escapedQuery, 'i') },
      { email: new RegExp(escapedQuery, 'i') },
      { projectAddress: new RegExp(escapedQuery, 'i') },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [inquiries, total] = await Promise.all([
    Inquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Inquiry.countDocuments(filter),
  ]);

  res.json({ success: true, inquiries, total, page: Number(page), limit: Number(limit) });
});


const getInquiry = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) {
    res.status(404);
    throw new Error('Inquiry not found');
  }
  res.json({ success: true, inquiry });
});


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
    subject: `Re: Your inquiry with Pristine Luxury Craft`,
    html: `<p>${escapeHtml(message).replace(/\r?\n/g, '<br/>')}</p><p>— ${escapeHtml(req.user.name)}, Pristine Luxury Craft</p>`,
  });

  res.json({ success: true, inquiry });
});


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
