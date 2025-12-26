
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
    { name: 'Dashboard', path: '/', icon: <HomeIcon size={20} />, restricted: false },
    { name: 'New Match', path: '/new-match', icon: <Activity size={20} />, restricted: true },
    { name: 'Tournaments', path: '/tournaments', icon: <Table2 size={20} />, restricted: false },
    { name: 'Teams', path: '/teams', icon: <Users size={20} />, restricted: false },
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
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      {/* Mobile Header */}
      <div className="md:hidden bg-emerald-900 text-white p-4 flex justify-between items-center shadow-lg z-[60] sticky top-0">
        <h1 className="font-black text-xl flex items-center gap-2 tracking-tight">
          <Trophy className="text-amber-400" /> CricScore
        </h1>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-emerald-800 rounded-lg">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
        w-72 bg-[#064e3b] text-emerald-50 flex flex-col z-[70] shadow-2xl
      `}>
        <div className="p-8 flex justify-between items-center">
          <h1 className="font-black text-2xl flex items-center gap-2 text-white tracking-tighter">
            <Trophy className="text-amber-400" /> CricScore <span className="text-emerald-500 font-bold text-xs uppercase bg-emerald-950 px-2 py-1 rounded-md tracking-widest">Pro</span>
          </h1>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-emerald-300 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isLocked = item.restricted && membership !== 'member';
            const isActive = (location.pathname.startsWith(item.path) && item.path !== '/') || location.pathname === item.path;
            return (
                <Link
                key={item.path}
                to={item.path}
                onClick={(e) => handleNavClick(item.path, item.restricted, e)}
                className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${
                    isActive
                    ? 'bg-emerald-700 text-white font-bold shadow-lg ring-1 ring-emerald-600' 
                    : 'hover:bg-emerald-800/50 hover:text-white font-medium text-emerald-200/70'
                }`}
                >
                <div className="flex items-center gap-4">
                    <span className={isActive ? 'text-amber-400' : 'text-emerald-500'}>{item.icon}</span>
                    {item.name}
                </div>
                {isLocked && <Lock size={14} className="text-emerald-600" />}
                </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout Section */}
        <div className="p-6 space-y-4 border-t border-emerald-800/50 bg-emerald-950/20">
            {membership !== 'member' && (
                <button 
                    onClick={() => setShowUpgradeModal(true)}
                    className="w-full bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-[#064e3b] py-3.5 rounded-2xl font-black shadow-xl flex items-center justify-center gap-2 transition-all transform active:scale-95"
                >
                    <Crown size={18} /> Upgrade to Pro
                </button>
            )}

          <div className="flex items-center justify-between px-2 group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-800 flex items-center justify-center text-emerald-100 overflow-hidden relative shadow-inner">
                <UserIcon size={20} />
                {membership === 'member' && (
                    <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full p-1 border-2 border-emerald-900 shadow-md">
                        <Crown size={10} className="text-emerald-900" />
                    </div>
                )}
                </div>
                <div className="overflow-hidden">
                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">{membership === 'member' ? 'Premium Member' : 'Standard User'}</p>
                <p className="text-sm text-white font-black truncate max-w-[120px]" title={user?.email || ''}>
                    {user?.displayName || user?.email?.split('@')[0] || 'Member'}
                </p>
                </div>
            </div>
            <button 
                onClick={() => {
                    setNewName(user?.displayName || '');
                    setShowEditProfile(true);
                }}
                className="text-emerald-600 hover:text-white p-2 rounded-xl hover:bg-emerald-800 transition-all"
                title="Edit Profile"
            >
                <Edit2 size={16} />
            </button>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 bg-emerald-900/50 hover:bg-red-900/40 text-emerald-400 hover:text-red-200 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-emerald-800/50"
          >
            <LogOut size={14} /> Logout Session
          </button>
        </div>

        <div className="p-4 text-[10px] text-emerald-800 font-bold text-center tracking-widest uppercase opacity-50">
          CricScore Pro v2.0.0
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen bg-slate-50 relative">
        <div className="p-4 md:p-10 lg:p-12">
            {children}
        </div>
      </main>
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-emerald-950/60 z-[65] md:hidden backdrop-blur-md animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-md animate-fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 animate-pop">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Profile Settings</h3>
                      <button onClick={() => setShowEditProfile(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
                  </div>
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                      <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Public Display Name</label>
                          <input 
                              type="text" 
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold"
                              placeholder="Enter your name"
                              autoFocus
                          />
                      </div>
                      <div className="flex gap-3">
                          <button 
                              type="button"
                              onClick={() => setShowEditProfile(false)}
                              className="flex-1 py-4 text-slate-500 hover:bg-slate-50 rounded-2xl font-bold transition-all"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit"
                              disabled={updatingProfile}
                              className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                          >
                              {updatingProfile ? <Loader2 className="animate-spin" size={20} /> : 'Save Profile'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};
