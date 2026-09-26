const asyncHandler = require('express-async-handler');
const Content = require('../models/Content');

// @desc  Public: get CMS content for a page (about-us, home, contact-us, ...)
// @route GET /api/content/:page
const getContent = asyncHandler(async (req, res) => {
  const content = await Content.findOne({ page: req.params.page });
  if (!content) {
    return res.json({ success: true, page: req.params.page, data: {} });
  }
  res.json({ success: true, page: content.page, data: content.data, updatedAt: content.updatedAt });
});

// @desc  Admin: list all CMS content documents
// @route GET /api/content
const listContent = asyncHandler(async (req, res) => {
  const items = await Content.find().sort({ page: 1 });
  res.json({ success: true, items });
});

// @desc  Admin: create or fully replace a page's CMS content (upsert)
// @route PUT /api/content/:page
const upsertContent = asyncHandler(async (req, res) => {
  const { data } = req.body;
  if (typeof data !== 'object' || data === null) {
    res.status(400);
    throw new Error('data (object) is required');
  }

  const content = await Content.findOneAndUpdate(
    { page: req.params.page },
    { data, updatedBy: req.user._id },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json({ success: true, page: content.page, data: content.data, updatedAt: content.updatedAt });
});

module.exports = { getContent, listContent, upsertContent };
