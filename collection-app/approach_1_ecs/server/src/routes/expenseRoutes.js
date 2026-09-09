import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getExpenses, createExpense, deleteExpense } from '../controllers/expenseController.js';

const router = Router();

router.use(authenticate);

router.get('/expenses', getExpenses);
router.post('/expenses', createExpense);
router.delete('/expenses/:id', requireAdmin, deleteExpense);

export default router;
