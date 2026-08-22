import { create } from 'zustand';
import { io } from 'socket.io-client';
import api from '../services/api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');

const useCollectionStore = create((set, get) => ({
  // ── Auth State ──
  token: localStorage.getItem('token') || null,
  username: localStorage.getItem('username') || null,
  role: localStorage.getItem('role') || 'collector',
  adminId: localStorage.getItem('adminId') || null,
  societyName: localStorage.getItem('societyName') || 'GovindaNagar',
  isAuthenticated: !!localStorage.getItem('token'),

  // ── Data State ──
  records: [],
  history: [],
  users: [],
  stats: { total: 0, count: 0 },

  // ── UI State ──
  loading: false,
  searchQuery: '',

  // ── Socket ──
  socket: null,

  // ── Auth Actions ──
  login: (token, username, role = 'collector', adminId = null, societyName = 'GovindaNagar') => {
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    localStorage.setItem('role', role);
    if (adminId) localStorage.setItem('adminId', adminId);
    if (societyName) localStorage.setItem('societyName', societyName);

    set({
      token,
      username,
      role,
      adminId: adminId || get().adminId,
      societyName: societyName || get().societyName,
      isAuthenticated: true,
    });

    get().connectSocket();
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('adminId');
    localStorage.removeItem('societyName');

    const { socket } = get();
    if (socket) socket.disconnect();

    set({
      token: null,
      username: null,
      role: 'collector',
      adminId: null,
      societyName: 'GovindaNagar',
      isAuthenticated: false,
      socket: null,
      records: [],
      history: [],
      users: [],
      stats: { total: 0, count: 0 },
    });
  },

  // ── Socket Actions ──
  connectSocket: () => {
    const { socket, adminId } = get();
    if (socket?.connected) {
      if (adminId) socket.emit('join_space', adminId);
      return;
    }

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected:', newSocket.id);
      const currentAdminId = get().adminId;
      if (currentAdminId) {
        newSocket.emit('join_space', currentAdminId);
      }
    });

    newSocket.on('COLLECTION_MUTATED', (data) => {
      console.log('📡 COLLECTION_MUTATED:', data.action);
      // If event has adminId, ensure it matches our active space
      const myAdminId = get().adminId;
      if (!data.adminId || !myAdminId || String(data.adminId) === String(myAdminId)) {
        set({ stats: data.stats });
        get().fetchRecords(get().searchQuery);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  // ── Data Actions ──
  fetchStats: async () => {
    try {
      const { data } = await api.get('/api/stats/total');
      set({ stats: data });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  },

  fetchRecords: async (params = '') => {
    try {
      set({ loading: true });
      const queryParams = typeof params === 'string' ? { q: params } : params;
      const { data } = await api.get('/api/records', { params: queryParams });
      set({ records: data, loading: false });
    } catch (err) {
      console.error('Failed to fetch records:', err);
      set({ loading: false });
    }
  },

  fetchHistory: async (params = {}) => {
    try {
      set({ loading: true });
      const queryParams = typeof params === 'string' ? { q: params } : params;
      const { data } = await api.get('/api/history', { params: queryParams });
      set({ history: data, loading: false });
    } catch (err) {
      console.error('Failed to fetch history:', err);
      set({ loading: false });
    }
  },

  // ── User Management Actions ──
  fetchUsers: async () => {
    try {
      set({ loading: true });
      const { data } = await api.get('/api/users');
      set({ users: data, loading: false });
    } catch (err) {
      console.error('Failed to fetch users:', err);
      set({ loading: false });
    }
  },

  addUser: async (userData) => {
    const { data } = await api.post('/api/users', userData);
    set((state) => ({ users: [...state.users, data] }));
    return data;
  },

  removeUser: async (id) => {
    await api.delete(`/api/users/${id}`);
    set((state) => ({ users: state.users.filter((u) => u.id !== id) }));
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
}));

export default useCollectionStore;
