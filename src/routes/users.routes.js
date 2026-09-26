const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { listUsers, inviteUser, updateUser, deleteUser } = require('../controllers/userController');

const router = express.Router();

router.use(protect);
router.get('/', listUsers);
router.post('/invite', requireRole('super_admin', 'admin'), inviteUser);
router.patch('/:id', requireRole('super_admin', 'admin'), updateUser);
router.delete('/:id', requireRole('super_admin', 'admin'), deleteUser);

module.exports = router;
