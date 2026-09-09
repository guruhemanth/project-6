import { create } from 'zustand';
import { io } from 'socket.io-client';
import api from '../services/api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');

const useCollectionStore = create((set, get) => ({
  // ── Auth & Tenant State ──
  token: localStorage.getItem('token') || null,
  username: localStorage.getItem('username') || null,
  role: localStorage.getItem('role') || 'collector',
  adminId: localStorage.getItem('adminId') || null,
  societyName: localStorage.getItem('societyName') || 'GovindaNagar',
  city: localStorage.getItem('city') || '',
  state: localStorage.getItem('state') || '',
  isAuthenticated: !!localStorage.getItem('token'),

  // ── Core Entities & Stats ──
  records: [],
  history: [],
  users: [],
  expenses: [],
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  stats: {
    total: 0,
    count: 0,
    max: 0,
    avg: 0,
    totalExpenses: 0,
  },
  loading: false,
  error: null,
  socket: null,

  // ── Auth Actions ──
  setAuth: (token, username, role, adminId, societyName, city, state) => {
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    localStorage.setItem('role', role);
    localStorage.setItem('adminId', adminId);
    localStorage.setItem('societyName', societyName || 'GovindaNagar');
    if (city) localStorage.setItem('city', city);
    if (state) localStorage.setItem('state', state);

    set({
      token,
      username,
      role,
      adminId,
      societyName: societyName || 'GovindaNagar',
      city: city || '',
      state: state || '',
      isAuthenticated: true,
      loading: false,
    });

    get().connectSocket();
  },

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/api/auth/login', { username, password });
      const { token, role, username: uName, adminId, societyName, city, state } = res.data;

      get().setAuth(token, uName, role, adminId, societyName, city, state);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed';
      set({ error: msg, loading: false });
      return { success: false, error: msg };
    }
  },

  register: async (username, password, societyName, city, state) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/api/auth/register', { username, password, societyName, city, state });
      const { token, role, username: uName, adminId, societyName: sName, city: cName, state: stName } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('username', uName);
      localStorage.setItem('role', role);
      localStorage.setItem('adminId', adminId);
      localStorage.setItem('societyName', sName || 'GovindaNagar');
      if (cName) localStorage.setItem('city', cName);
      if (stName) localStorage.setItem('state', stName);

      set({
        token,
        username: uName,
        role,
        adminId,
        societyName: sName || 'GovindaNagar',
        city: cName || '',
        state: stName || '',
        isAuthenticated: true,
        loading: false,
      });

      get().connectSocket();
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed';
      set({ error: msg, loading: false });
      return { success: false, error: msg };
    }
  },

  logout: () => {
    const { socket } = get();
    if (socket) socket.disconnect();

    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('adminId');
    localStorage.removeItem('societyName');
    localStorage.removeItem('city');
    localStorage.removeItem('state');

    set({
      token: null,
      username: null,
      role: 'collector',
      adminId: null,
      societyName: 'GovindaNagar',
      city: '',
      state: '',
      isAuthenticated: false,
      records: [],
      expenses: [],
      stats: { total: 0, count: 0, max: 0, avg: 0, totalExpenses: 0 },
      socket: null,
    });
  },

  // ── Delta Updaters (Zero Race Conditions) ──
  applyCollectionDelta: ({ action, record, amountDelta }) => {
    set((state) => {
      let newRecords = [...state.records];
      let newTotal = state.stats.total;
      let newCount = state.stats.count;

      if (action === 'INSERT') {
        if (!newRecords.some((r) => r.id === record.id)) {
          newRecords.unshift(record);
          newTotal += amountDelta;
          newCount += 1;
        }
      } else if (action === 'UPDATE') {
        newRecords = newRecords.map((r) => (r.id === record.id ? record : r));
        newTotal += amountDelta;
      } else if (action === 'DELETE') {
        newRecords = newRecords.filter((r) => r.id !== record.id);
        newTotal += amountDelta;
        newCount = Math.max(0, newCount - 1);
      }

      const newAvg = newCount > 0 ? newTotal / newCount : 0;
      const newMax = newRecords.length > 0 ? Math.max(...newRecords.map((r) => Number(r.amount))) : 0;

      return {
        records: newRecords,
        stats: {
          ...state.stats,
          total: Math.max(0, newTotal),
          count: newCount,
          avg: newAvg,
          max: newMax,
        },
      };
    });
  },

  applyExpenseDelta: ({ action, record, amountDelta }) => {
    set((state) => {
      let newExpenses = [...state.expenses];
      let currentExpTotal = state.stats.totalExpenses || 0;

      if (action === 'INSERT') {
        if (!newExpenses.some((e) => e.id === record.id)) {
          newExpenses.unshift(record);
          currentExpTotal += amountDelta;
        }
      } else if (action === 'DELETE') {
        newExpenses = newExpenses.filter((e) => e.id !== record.id);
        currentExpTotal -= amountDelta;
      }

      return {
        expenses: newExpenses,
        stats: {
          ...state.stats,
          totalExpenses: Math.max(0, currentExpTotal),
        },
      };
    });
  },

  // ── Fetch Operations ──
  fetchRecords: async (params = {}) => {
    set({ loading: true });
    try {
      const res = await api.get('/api/records', { params });
      const recordList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.records)
        ? res.data.records
        : [];
      set({ records: recordList, loading: false });
      return res.data;
    } catch (err) {
      console.error('fetchRecords error:', err);
      set({ records: [], loading: false });
    }
  },

  fetchHistory: async (params = {}) => {
    set({ loading: true });
    try {
      const res = await api.get('/api/history', { params });
      const historyList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.logs)
        ? res.data.logs
        : [];
      set({ history: historyList, loading: false });
      return res.data;
    } catch (err) {
      console.error('fetchHistory error:', err);
      set({ history: [], loading: false });
    }
  },

  fetchUsers: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/api/users');
      const userList = Array.isArray(res.data) ? res.data : [];
      set({ users: userList, loading: false });
      return res.data;
    } catch (err) {
      console.error('fetchUsers error:', err);
      set({ users: [], loading: false });
    }
  },

  addUser: async (userData) => {
    const res = await api.post('/api/users', userData);
    set((state) => ({ users: [...(Array.isArray(state.users) ? state.users : []), res.data] }));
    return res.data;
  },

  removeUser: async (userId) => {
    await api.delete(`/api/users/${userId}`);
    set((state) => ({
      users: (Array.isArray(state.users) ? state.users : []).filter((u) => u.id !== userId),
    }));
  },

  fetchStats: async () => {
    try {
      const res = await api.get('/api/records/stats');
      set((state) => ({
        stats: { ...state.stats, ...(res.data || {}) },
      }));
    } catch (err) {
      console.error('fetchStats error:', err);
    }
  },

  fetchExpenses: async () => {
    try {
      const res = await api.get('/api/expenses');
      const expenseList = Array.isArray(res.data) ? res.data : [];
      const totalExpenses = expenseList.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      set((state) => ({
        expenses: expenseList,
        stats: { ...state.stats, totalExpenses },
      }));
    } catch (err) {
      console.error('fetchExpenses error:', err);
      set((state) => ({ expenses: [] }));
    }
  },

  // ── Socket Connection with Handshake Auth ──
  connectSocket: () => {
    const { token, socket } = get();
    if (socket?.connected || !token) return;

    if (socket) socket.disconnect();

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('📡 Connected to Socket.io with JWT Handshake');
    });

    newSocket.on('COLLECTION_MUTATED', (delta) => {
      get().applyCollectionDelta(delta);
    });

    newSocket.on('EXPENSE_MUTATED', (delta) => {
      get().applyExpenseDelta(delta);
    });

    set({ socket: newSocket });
  },
}));

export default useCollectionStore;
