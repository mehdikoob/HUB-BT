import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import Layout from './components/Layout';

// Protected Route component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

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

  if (adminOnly && !isAdmin()) {
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
        <Route path="programmes" element={<Programmes />} />
        <Route path="partenaires" element={<PartenairesNew />} />
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
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;