import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Programmes from './pages/Programmes';
import PartenairesNew from './pages/PartenairesNew';
import TestsSite from './pages/TestsSite';
import TestsLigne from './pages/TestsLigne';
import Alertes from './pages/Alertes';
import Messagerie from './pages/Messagerie';
import BilanPartenaire from './pages/BilanPartenaire';
import Login from './pages/Login';
import Parametres from './pages/Parametres';
import Statistiques from './pages/Statistiques';
import ConnectionLogs from './pages/ConnectionLogs';
import Identifiants from './pages/Identifiants';
import Layout from './components/Layout';

// Protected Route component
const ProtectedRoute = ({ children, adminOnly = false, superAdminOnly = false }) => {
  const { isAuthenticated, isAdmin, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (superAdminOnly && user?.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !isAdmin() && user?.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="programmes" element={<Programmes />} />
        <Route path="partenaires" element={<PartenairesNew />} />
        <Route path="identifiants" element={<Identifiants />} />
        <Route path="tests-site" element={<TestsSite />} />
        <Route path="tests-ligne" element={<TestsLigne />} />
        <Route
          path="alertes"
          element={
            <ProtectedRoute adminOnly>
              <Alertes />
            </ProtectedRoute>
          }
        />
        <Route
          path="messagerie"
          element={
            <ProtectedRoute adminOnly>
              <Messagerie />
            </ProtectedRoute>
          }
        />
        <Route path="bilan-partenaire" element={<BilanPartenaire />} />
        <Route
          path="parametres"
          element={
            <ProtectedRoute adminOnly>
              <Parametres />
            </ProtectedRoute>
          }
        />
        <Route
          path="statistiques"
          element={
            <ProtectedRoute adminOnly>
              <Statistiques />
            </ProtectedRoute>
          }
        />
        <Route
          path="connection-logs"
          element={
            <ProtectedRoute superAdminOnly>
              <ConnectionLogs />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;