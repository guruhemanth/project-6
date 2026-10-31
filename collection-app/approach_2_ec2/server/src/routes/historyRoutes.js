import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getHistory } from '../controllers/historyController.js';

const router = Router();

router.use(authenticate);
router.get('/history', getHistory);

export default router;
