const mongoose = require('mongoose');

const replySchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentByName: { type: String },
    sentAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const inquirySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['general', 'quote'], default: 'general' },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    scope: { type: String, trim: true }, // e.g. residential / commercial
    projectAddress: { type: String, trim: true },
    serviceType: { type: String, trim: true }, // kitchen, primary-bath, full-estate, millwork, exterior
    projectSize: { type: String, trim: true }, // compact, medium, large, estate
    timeline: { type: String, trim: true }, // rush, standard, flexible, longterm
    estimatedRangeLow: { type: Number },
    estimatedRangeHigh: { type: Number },
    message: { type: String, trim: true },
    status: {
      type: String,
      enum: ['new', 'in_review', 'quoted', 'replied', 'closed'],
      default: 'new',
    },
    replies: [replySchema],
  },
  { timestamps: true }
);

inquirySchema.index({ fullName: 'text', email: 'text', projectAddress: 'text' });

module.exports = mongoose.model('Inquiry', inquirySchema);
