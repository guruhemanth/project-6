import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Global Error Boundary to display meaningful error alerts instead of blank screens
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Rendering Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617', color: '#f8fafc', padding: '1.5rem', fontFamily: 'sans-serif' }}>
          <div style={{ maxWidth: '28rem', width: '100%', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '1.5rem', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171', marginBottom: '0.5rem' }}>Application Render Notice</h2>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1rem' }}>{this.state.error?.message || 'A client-side initialization error occurred.'}</p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              style={{ width: '100%', backgroundColor: '#f97316', color: '#ffffff', fontWeight: 700, padding: '0.75rem 1rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer' }}
            >
              Reset Session & Go to Login
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
