import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import RecoverPassword from './pages/RecoverPassword';

// Placeholder pages, we'll create them shortly
import InventoryIndex from './pages/InventoryIndex';
import Transactions from './pages/Transactions';
import Statistics from './pages/Statistics';
import Users from './pages/Users';
import NotFound from './pages/NotFound';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) return null; // Or a loader

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) return null;

  if (currentUser) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />

      <Route path="/recuperar" element={
        <PublicRoute>
          <RecoverPassword />
        </PublicRoute>
      } />
      
      <Route path="/" element={
        <PrivateRoute>
          <AppLayout />
        </PrivateRoute>
      }>
        <Route index element={<InventoryIndex />} />
        <Route path="transacciones" element={<Transactions />} />
        <Route path="estadisticas" element={<Statistics />} />
        <Route path="usuarios" element={<Users />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
