import { Router } from 'express';
import { login, register, getUsers, createUser, deleteUser } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public auth endpoints
router.post('/auth/login', login);
router.post('/auth/register', register);

// User Management (Protected)
router.get('/users', authenticate, getUsers);
router.post('/users', authenticate, createUser);
router.delete('/users/:id', authenticate, deleteUser);

export default router;
