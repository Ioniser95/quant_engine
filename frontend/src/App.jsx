import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Layout from './components/Layout';
import Portfolio from './pages/Portfolio';
// We will add these two files in the next steps!
import RoboAdvisor from './pages/RoboAdvisor';
import Market from './pages/Market';
import Account from './pages/Account';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('quant_token'));

  return (
    <BrowserRouter>
      <Routes>
        {/* The Auth Route */}
        <Route 
          path="/" 
          element={!isAuthenticated ? <Login onLogin={() => setIsAuthenticated(true)} /> : <Navigate to="/portfolio" />} 
        />
        
        {/* The Protected Routes (Wrapped in the Layout) */}
        {isAuthenticated && (
          <Route element={<Layout />}>
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/market" element={<Market />} />
            <Route path="/advisor" element={<RoboAdvisor />} />
            <Route path="/account" element={<Account />} />
          </Route>
        )}

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}