import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Trophy, Activity, Users, Home as HomeIcon, Menu, X, Table2, LogOut, User as UserIcon, Crown, Lock, Edit2, Loader2, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen relative font-sans text-white overflow-hidden bg-slate-950">
      
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full blur-3xl bg-slate-800/20"></div>
          <div className="absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full blur-3xl bg-indigo-900/20"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[40rem] w-[40rem] rounded-full blur-3xl bg-emerald-900/10"></div>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row h-screen">
        
        {/* Mobile Header */}
        <div className="md:hidden glass-panel flex justify-between items-center p-4 z-50">
            <h1 className="font-bold text-lg flex items-center gap-2 tracking-tight text-white">
            <Trophy className="text-yellow-400" size={18} /> CricScore
            </h1>
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-full text-white/80 transition">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
        </div>

        {/* Sidebar */}
        <aside className={`
            fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
            w-72 glass-panel flex flex-col z-[60] md:m-4 md:rounded-[2rem] md:h-[calc(100vh-2rem)]
        `}>
            <div className="p-6 flex justify-between items-center border-b border-white/5">
                <h1 className="font-bold text-xl flex items-center gap-2 text-white tracking-tight">
                    <div className="bg-gradient-to-br from-yellow-400 to-amber-600 p-1.5 rounded-lg text-slate-900">
                        <Trophy size={16} />
                    </div> 
                    CricScore
                </h1>
                <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white/60 hover:text-white">
                    <X size={20} />
                </button>
            </div>
            
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto no-scrollbar">
            {navItems.map((item) => {
                const isLocked = item.restricted && membership !== 'member';
                const isActive = (location.pathname.startsWith(item.path) && item.path !== '/') || location.pathname === item.path;
                return (
                    <Link
                    key={item.path}
                    to={item.path}
                    onClick={(e) => handleNavClick(item.path, item.restricted, e)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                        isActive
                        ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                    >
                    <div className="flex items-center gap-3">
                        <span className={isActive ? 'text-emerald-400' : 'text-white/40'}>{item.icon}</span>
                        {item.name}
                    </div>
                    {isLocked && <Lock size={12} className="text-white/20" />}
                    </Link>
                );
            })}
            </nav>

            {/* User Profile & Logout Section */}
            <div className="p-4 m-4 rounded-2xl bg-white/5 border border-white/5">
                {membership !== 'member' && (
                    <button 
                        onClick={() => setShowUpgradeModal(true)}
                        className="w-full mb-4 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 py-2.5 rounded-lg font-bold shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] text-xs"
                    >
                        <Sparkles size={14} /> Upgrade Pro
                    </button>
                )}

            <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white/80 ring-1 ring-white/10">
                    <UserIcon size={16} />
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{membership === 'member' ? 'Pro Member' : 'Free Plan'}</p>
                        <p className="text-xs text-white font-bold truncate max-w-[100px]">
                            {user?.displayName || 'User'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button 
                        onClick={() => {
                            setNewName(user?.displayName || '');
                            setShowEditProfile(true);
                        }}
                        className="text-white/40 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-all"
                    >
                        <Edit2 size={14} />
                    </button>
                    <button 
                        onClick={handleLogout}
                        className="text-white/40 hover:text-red-400 p-1.5 rounded-md hover:bg-white/10 transition-all"
                    >
                        <LogOut size={14} />
                    </button>
                </div>
            </div>
            </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto h-[calc(100vh-56px)] md:h-screen relative no-scrollbar">
            <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
                {children}
            </div>
        </main>
        
        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
            <div 
            className="fixed inset-0 bg-slate-950/80 z-[55] md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            ></div>
        )}

        {/* Edit Profile Modal */}
        {showEditProfile && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                <div className="glass-panel rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-pop">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">Edit Profile</h3>
                        <button onClick={() => setShowEditProfile(false)} className="p-1 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"><X size={18} /></button>
                    </div>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Display Name</label>
                            <input 
                                type="text" 
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-medium text-sm text-white placeholder-white/20"
                                placeholder="Enter your name"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button 
                                type="button"
                                onClick={() => setShowEditProfile(false)}
                                className="flex-1 py-2.5 text-white/60 hover:bg-white/5 rounded-xl font-bold text-sm transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={updatingProfile}
                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                {updatingProfile ? <Loader2 className="animate-spin" size={16} /> : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};