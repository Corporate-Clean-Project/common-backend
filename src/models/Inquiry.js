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
    companyName: { type: String, trim: true },
    inquiryType: {
      type: String,
      enum: ['General Inquiry', 'Partnership', 'Feedback', 'Other'],
    },
    scope: { type: String, trim: true },
    projectAddress: { type: String, trim: true },
    serviceType: { type: String, trim: true },
    facilitySize: { type: Number, min: 1 },
    cleaningSchedule: {
      type: String,
      enum: ['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'One-time'],
    },
    startDate: { type: Date },
    budgetRange: { type: String, enum: ['Under $1,000/mo', '$1,000 - $3,000/mo', '$3,000+ / Custom'] },
    notes: { type: String, trim: true },
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
