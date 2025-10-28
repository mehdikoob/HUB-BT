import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Dashboard from './pages/Dashboard';
import Programmes from './pages/Programmes';
import PartenairesNew from './pages/PartenairesNew';
import TestsSite from './pages/TestsSite';
import TestsLigne from './pages/TestsLigne';
import Incidents from './pages/Incidents';
import Messagerie from './pages/Messagerie';
import BilanPartenaire from './pages/BilanPartenaire';
import Layout from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="programmes" element={<Programmes />} />
          <Route path="partenaires" element={<PartenairesNew />} />
          <Route path="tests-site" element={<TestsSite />} />
          <Route path="tests-ligne" element={<TestsLigne />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="messagerie" element={<Messagerie />} />
          <Route path="bilan-partenaire" element={<BilanPartenaire />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;