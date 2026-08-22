import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getStats,
  getRecords,
  createRecord,
  updateRecord,
  deleteRecord,
} from '../controllers/collectionController.js';

const router = Router();

// All collection routes are protected by JWT authentication
router.use(authenticate);

router.get('/stats/total', getStats);
router.get('/records', getRecords);
router.post('/records', createRecord);
router.put('/records/:id', updateRecord);
router.delete('/records/:id', deleteRecord);

export default router;
