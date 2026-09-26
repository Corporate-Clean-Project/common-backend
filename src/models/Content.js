const mongoose = require('mongoose');

/**
 * Generic CMS content document, keyed by a unique `page` slug
 * (e.g. "about-us", "home", "contact-us"). `data` is a flexible
 * JSON blob so the admin CMS manager can evolve fields without
 * requiring a schema migration for every content change.
 */
const contentSchema = new mongoose.Schema(
  {
    page: { type: String, required: true, unique: true, trim: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Content', contentSchema);
