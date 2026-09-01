import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import useCollectionStore from './store/useCollectionStore';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import RecordsPage from './pages/RecordsPage';
import HistoryPage from './pages/HistoryPage';
import UsersPage from './pages/UsersPage';
import ExpensesPage from './pages/ExpensesPage';
import DoorstepCollector from './pages/DoorstepCollector';

/** Layout for authenticated user routes */
function AppLayout() {
  const { isAuthenticated, connectSocket } = useCollectionStore();

  useEffect(() => {
    if (isAuthenticated) {
      connectSocket();
    }
  }, [isAuthenticated, connectSocket]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-orange-50">
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  );
}

/** Route wrapper for login page */
function LoginRoute() {
  const { isAuthenticated } = useCollectionStore();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <LoginPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        
        {/* Protected nested layout using standard React Router Outlet */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/doorstep" element={<DoorstepCollector />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
