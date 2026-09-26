const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createInquiry,
  createQuoteInquiry,
  listInquiries,
  getInquiry,
  updateInquiry,
  replyToInquiry,
  deleteInquiry,
} = require('../controllers/inquiryController');

const router = express.Router();

// Public endpoints (from web-frontend)
router.post('/', createInquiry);
router.post('/quote', createQuoteInquiry);

// Admin endpoints (from admin-frontend)
router.get('/', protect, listInquiries);
router.get('/:id', protect, getInquiry);
router.patch('/:id', protect, updateInquiry);
router.post('/:id/reply', protect, replyToInquiry);
router.delete('/:id', protect, deleteInquiry);

module.exports = router;
