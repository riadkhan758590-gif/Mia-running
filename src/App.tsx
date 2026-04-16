import React, { useState, useEffect } from 'react';
import Game from './components/Game';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(false);

  useEffect(() => {
    // Hidden route detection
    if (window.location.pathname === '/adminriad') {
      setIsAdminRoute(true);
    } else {
      setIsAdminRoute(false);
    }
  }, []);

  return (
    <div className="min-h-screen">
      {isAdminRoute ? <AdminPanel /> : <Game />}
    </div>
  );
}
