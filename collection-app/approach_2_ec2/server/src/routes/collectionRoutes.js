import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getStats,
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
} from '../controllers/collectionController.js';

const router = Router();

// All collection routes are protected by JWT authentication
router.use(authenticate);

// Support both endpoint naming conventions
router.get('/stats/total', getStats);
router.get('/records/stats', getStats);

router.get('/records', getCollections);
router.post('/records', createCollection);
router.put('/records/:id', updateCollection);
router.delete('/records/:id', deleteCollection);

export default router;
