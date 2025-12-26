import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Trophy, Activity, Users, Home as HomeIcon, Menu, X, Table2, LogOut, User as UserIcon, Crown, Lock, Edit2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from "firebase/auth";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, membership, setShowUpgradeModal } = useAuth();
  
  // Edit Profile State
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Broadcast View should be full screen without layout
  if (location.pathname.startsWith('/broadcast/')) {
      return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <HomeIcon size={18} />, restricted: false },
    { name: 'New Match', path: '/new-match', icon: <Activity size={18} />, restricted: true },
    { name: 'Tournaments', path: '/tournaments', icon: <Table2 size={18} />, restricted: false },
    { name: 'Teams', path: '/teams', icon: <Users size={18} />, restricted: false },
  ];

  const handleNavClick = (path: string, restricted: boolean, e: React.MouseEvent) => {
      if (restricted && membership !== 'member') {
          e.preventDefault();
          setShowUpgradeModal(true);
          setSidebarOpen(false);
      } else {
          setSidebarOpen(false);
      }
  };
  
  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !newName.trim()) return;
      
      setUpdatingProfile(true);
      try {
          await updateProfile(user, { displayName: newName });
          setShowEditProfile(false);
      } catch (error) {
          console.error("Error updating profile", error);
      } finally {
          setUpdatingProfile(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 text-sm">
      {/* Mobile Header */}
      <div className="md:hidden bg-emerald-900 text-white p-3 flex justify-between items-center shadow-lg z-[60] sticky top-0">
        <h1 className="font-bold text-lg flex items-center gap-2 tracking-tight">
          <Trophy className="text-amber-400" size={18} /> CricScore
        </h1>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-1.5 hover:bg-emerald-800 rounded-md">
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
        w-64 bg-[#064e3b] text-emerald-50 flex flex-col z-[70] shadow-xl border-r border-emerald-800
      `}>
        <div className="p-5 flex justify-between items-center border-b border-emerald-800/50">
          <h1 className="font-bold text-xl flex items-center gap-2 text-white tracking-tight">
            <Trophy className="text-amber-400" size={20} /> CricScore <span className="text-emerald-500 font-bold text-[10px] uppercase bg-emerald-950 px-1.5 py-0.5 rounded tracking-widest">Pro</span>
          </h1>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-emerald-300 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isLocked = item.restricted && membership !== 'member';
            const isActive = (location.pathname.startsWith(item.path) && item.path !== '/') || location.pathname === item.path;
            return (
                <Link
                key={item.path}
                to={item.path}
                onClick={(e) => handleNavClick(item.path, item.restricted, e)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-sm ${
                    isActive
                    ? 'bg-emerald-700 text-white font-semibold shadow-sm ring-1 ring-emerald-600' 
                    : 'hover:bg-emerald-800/50 hover:text-white font-medium text-emerald-200/80'
                }`}
                >
                <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-amber-400' : 'text-emerald-500'}>{item.icon}</span>
                    {item.name}
                </div>
                {isLocked && <Lock size={12} className="text-emerald-600" />}
                </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout Section */}
        <div className="p-4 space-y-3 border-t border-emerald-800/50 bg-emerald-950/20">
            {membership !== 'member' && (
                <button 
                    onClick={() => setShowUpgradeModal(true)}
                    className="w-full bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-[#064e3b] py-2.5 rounded-lg font-bold shadow-md flex items-center justify-center gap-2 transition-all text-xs"
                >
                    <Crown size={14} /> Upgrade to Pro
                </button>
            )}

          <div className="flex items-center justify-between px-1 group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-800 flex items-center justify-center text-emerald-100 overflow-hidden relative shadow-inner">
                <UserIcon size={16} />
                {membership === 'member' && (
                    <div className="absolute -top-0.5 -right-0.5 bg-amber-400 rounded-full p-0.5 border border-emerald-900 shadow-sm">
                        <Crown size={8} className="text-emerald-900" />
                    </div>
                )}
                </div>
                <div className="overflow-hidden">
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">{membership === 'member' ? 'Premium' : 'Free'}</p>
                <p className="text-xs text-white font-bold truncate max-w-[100px]" title={user?.email || ''}>
                    {user?.displayName || user?.email?.split('@')[0] || 'Member'}
                </p>
                </div>
            </div>
            <button 
                onClick={() => {
                    setNewName(user?.displayName || '');
                    setShowEditProfile(true);
                }}
                className="text-emerald-500 hover:text-white p-1.5 rounded-md hover:bg-emerald-800 transition-all"
                title="Edit Profile"
            >
                <Edit2 size={14} />
            </button>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-emerald-900/50 hover:bg-red-900/40 text-emerald-400 hover:text-red-200 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-emerald-800/50"
          >
            <LogOut size={12} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-56px)] md:h-screen bg-slate-100 relative">
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
            {children}
        </div>
      </main>
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-emerald-950/60 z-[65] md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-pop">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-slate-900">Profile Settings</h3>
                      <button onClick={() => setShowEditProfile(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
                  </div>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Display Name</label>
                          <input 
                              type="text" 
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-sm"
                              placeholder="Enter your name"
                              autoFocus
                          />
                      </div>
                      <div className="flex gap-2">
                          <button 
                              type="button"
                              onClick={() => setShowEditProfile(false)}
                              className="flex-1 py-2.5 text-slate-500 hover:bg-slate-50 rounded-lg font-bold text-sm transition-all"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit"
                              disabled={updatingProfile}
                              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-bold shadow-md hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 text-sm"
                          >
                              {updatingProfile ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};