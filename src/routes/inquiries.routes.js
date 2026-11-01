const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
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


router.post('/', createInquiry);
router.post('/quote', createQuoteInquiry);

router.get('/', protect, listInquiries);
router.get('/:id', protect, getInquiry);
router.patch('/:id', protect, requireRole('super_admin', 'admin'), updateInquiry);
router.post('/:id/reply', protect, requireRole('super_admin', 'admin'), replyToInquiry);
router.delete('/:id', protect, requireRole('super_admin', 'admin'), deleteInquiry);

module.exports = router;
