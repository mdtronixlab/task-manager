import { Router } from 'express';
import { ROLES, ADMIN_ROLES } from '../config.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { success } from '../lib/response.js';
import { getUsers, getCurrentUser, createUser, updateUser, sendTestWhatsApp } from '../services/userService.js';
import { getAllAdminVisibility, setAdminVisibility } from '../services/adminVisibilityService.js';

const router = Router();

router.use(authenticate);

router.get('/me', async (req, res, next) => {
  try {
    res.json(success(await getCurrentUser(req.user)));
  } catch (err) {
    next(err);
  }
});

// Read-only for both elevated roles — Admin needs the roster to populate
// Tasks/Reports' staff filter and the "Assign to" picker, even though
// actually managing users (below) stays Super Admin only.
router.get('/', requireRole(ADMIN_ROLES), async (req, res, next) => {
  try {
    res.json(success(await getUsers()));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    res.status(201).json(success(await createUser(req.user, req.body)));
  } catch (err) {
    next(err);
  }
});

router.patch('/:userId', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    res.json(success(await updateUser(req.user, req.params.userId, req.body), 'User updated.'));
  } catch (err) {
    next(err);
  }
});

// Every Admin's granted-visible-Admins, keyed by viewer userId — Settings >
// Visibility's table. Super Admin only.
router.get('/admin-visibility', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    res.json(success(await getAllAdminVisibility()));
  } catch (err) {
    next(err);
  }
});

// Replaces one Admin's full set of granted-visible-Admins. Super Admin only.
router.put('/:userId/admin-visibility', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    res.json(
      success(
        await setAdminVisibility(req.user, req.params.userId, req.body?.visibleAdminIds),
        'Task visibility updated.',
      ),
    );
  } catch (err) {
    next(err);
  }
});

// Manual "does this number actually work" check — sends a real WhatsApp
// message to the given user right now (whatsappService.js).
router.post('/:userId/test-whatsapp', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    res.json(success(await sendTestWhatsApp(req.params.userId), 'Test WhatsApp message sent.'));
  } catch (err) {
    next(err);
  }
});

export default router;
