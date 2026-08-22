import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useCollectionStore from './store/useCollectionStore';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import RecordsPage from './pages/RecordsPage';
import HistoryPage from './pages/HistoryPage';
import UsersPage from './pages/UsersPage';

/** Wrapper that protects routes behind authentication */
function ProtectedLayout() {
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
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="records" element={<RecordsPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="users" element={<UsersPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
