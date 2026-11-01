const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { getContent, listContent, upsertContent } = require('../controllers/contentController');

const router = express.Router();

// Public: read CMS-managed content for the marketing site
router.get('/:page', getContent);

// Admin: manage CMS content
router.get('/', protect, listContent);
router.put('/:page', protect, (req, res, next) => {
  const allowedRoles = req.params.page === 'reviews'
    ? ['super_admin', 'admin']
    : ['super_admin', 'admin', 'editor'];
  return requireRole(...allowedRoles)(req, res, next);
}, upsertContent);

module.exports = router;
