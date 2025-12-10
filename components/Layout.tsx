
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Activity, Users, Home as HomeIcon, Menu, X, Table2 } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <HomeIcon size={20} /> },
    { name: 'New Match', path: '/new-match', icon: <Activity size={20} /> },
    { name: 'Tournaments', path: '/tournaments', icon: <Table2 size={20} /> },
    { name: 'Teams', path: '/teams', icon: <Users size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-emerald-800 text-white p-4 flex justify-between items-center shadow-md z-20 relative">
        <h1 className="font-bold text-xl flex items-center gap-2">
          <Trophy className="text-yellow-400" /> CricScore
        </h1>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 transition duration-200 ease-in-out
        w-64 bg-emerald-900 text-emerald-100 flex flex-col z-50 shadow-xl
      `}>
        <div className="p-4 md:p-6 border-b border-emerald-800 flex justify-between items-center">
          <h1 className="font-bold text-xl md:text-2xl flex items-center gap-2 text-white">
            <Trophy className="text-yellow-400" /> CricScore
          </h1>
          {/* Mobile Close Button inside Sidebar */}
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-emerald-300 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname.startsWith(item.path) && item.path !== '/' || location.pathname === item.path
                  ? 'bg-emerald-700 text-white font-medium shadow-inner' 
                  : 'hover:bg-emerald-800 hover:text-white'
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-emerald-800 text-xs text-emerald-400 text-center">
          v1.1.0 &copy; 2024
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen p-3 md:p-8">
        {children}
      </main>
      
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};
