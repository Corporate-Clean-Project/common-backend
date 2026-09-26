const express = require('express');
const { protect } = require('../middleware/auth');
const { getContent, listContent, upsertContent } = require('../controllers/contentController');

const router = express.Router();

// Public: read CMS-managed content for the marketing site
router.get('/:page', getContent);

// Admin: manage CMS content
router.get('/', protect, listContent);
router.put('/:page', protect, upsertContent);

module.exports = router;
