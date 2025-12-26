import React, { useState } from 'react';
import { useScoring } from '../context/ScoringContext';
import { useAuth } from '../context/AuthContext';
import { Player, Team, PlayerRole } from '../types';
import { Plus, Trash2, User, Shield, Edit2, Lock, X } from 'lucide-react';

export const TeamManagement = () => {
  const { state, dispatch } = useScoring();
  const { membership, setShowUpgradeModal } = useAuth();
  const [isCreating, setCreating] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  
  // Form State
  const [teamName, setTeamName] = useState('');
  const [shortName, setShortName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<PlayerRole>('ALL_ROUNDER');

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ show: boolean, teamId: string | null, teamName: string }>({
    show: false, teamId: null, teamName: ''
  });

  const checkPermission = () => {
      if (membership !== 'member') {
          setShowUpgradeModal(true);
          return false;
      }
      return true;
  }

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const player: Player = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name: newPlayerName,
      role: newPlayerRole
    };
    setPlayers(prev => [...(prev || []), player]);
    setNewPlayerName('');
  };

  const removePlayer = (id: string) => {
    setPlayers(prev => (prev || []).filter(p => p.id !== id));
  };

  const handleEdit = (e: React.MouseEvent, team: Team) => {
    e.preventDefault();
    e.stopPropagation();
    if (!checkPermission()) return;

    setTeamName(team.name);
    setShortName(team.shortName);
    setPlayers(team.players || []);
    setEditingTeamId(team.id);
    setCreating(true);
  };

  const handleDeleteClick = (teamId: string, name: string) => {
    if (!checkPermission()) return;
    setDeleteModal({ show: true, teamId, teamName: name });
  };

  const confirmDelete = () => {
      if (deleteModal.teamId) {
        dispatch({ type: 'DELETE_TEAM', payload: { teamId: deleteModal.teamId } });
        if (editingTeamId === deleteModal.teamId) {
            cancelCreate();
        }
        setDeleteModal({ show: false, teamId: null, teamName: '' });
      }
  };

  const saveTeam = () => {
    if (!teamName || !shortName || (players || []).length === 0) {
      alert("Please fill all details and add at least one player.");
      return;
    }

    const teamData: Team = {
      id: editingTeamId || Date.now().toString(),
      name: teamName,
      shortName: shortName.toUpperCase(),
      players: players,
      logoColor: 'bg-emerald-500' 
    };

    if (editingTeamId) {
      dispatch({ type: 'UPDATE_TEAM', payload: teamData });
    } else {
      dispatch({ type: 'CREATE_TEAM', payload: teamData });
    }

    cancelCreate();
  };

  const cancelCreate = () => {
    setCreating(false);
    setEditingTeamId(null);
    setTeamName('');
    setShortName('');
    setPlayers([]);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 animate-slide-up">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
           <h2 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight">Team Management</h2>
           <p className="text-slate-400 font-medium text-lg mt-1">Organize your squads and players.</p>
        </div>
        {!isCreating && (
          <button 
            type="button"
            onClick={() => {
                if(checkPermission()) setCreating(true);
            }}
            className="bg-[#A7D1C4] hover:bg-[#96c2b4] text-[#064e3b] px-10 py-4 rounded-[1.25rem] flex items-center justify-center gap-3 font-black shadow-lg transition-all transform active:scale-95"
          >
             <Plus size={24} strokeWidth={3} /> 
             <span className="text-lg">Create New Team</span>
          </button>
        )}
      </div>

      {isCreating ? (
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-pop max-w-3xl mx-auto">
          <div className="bg-slate-50 px-10 py-8 border-b border-slate-100 flex justify-between items-center">
             <h3 className="text-2xl font-black text-slate-800">{editingTeamId ? 'Edit Team Details' : 'Create New Team'}</h3>
             <button onClick={cancelCreate} className="p-3 hover:bg-slate-200 rounded-full transition-colors"><X size={28} className="text-slate-500" /></button>
          </div>
          
          <div className="p-10 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Full Team Name</label>
                <input 
                    type="text" 
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    placeholder="e.g. Royal Challengers"
                    className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl p-5 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-lg"
                />
                </div>
                <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Short Code (3 chars)</label>
                <input 
                    type="text" 
                    value={shortName}
                    onChange={e => setShortName(e.target.value.toUpperCase())}
                    maxLength={3}
                    placeholder="RCB"
                    className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl p-5 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none uppercase font-mono font-bold tracking-[0.2em] text-lg"
                />
                </div>
            </div>

            <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Squad List</h3>
                <div className="flex flex-col md:flex-row gap-5 mb-10 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    <input 
                        type="text" 
                        value={newPlayerName}
                        onChange={e => setNewPlayerName(e.target.value)}
                        placeholder="Player Name"
                        className="flex-1 bg-white text-slate-900 border border-slate-200 rounded-2xl p-5 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-lg"
                        onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                    />
                    <select 
                        value={newPlayerRole}
                        onChange={(e) => setNewPlayerRole(e.target.value as PlayerRole)}
                        className="border border-slate-200 rounded-2xl p-5 bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none font-black text-sm uppercase tracking-wide"
                    >
                        <option value="BATSMAN">Batsman</option>
                        <option value="BOWLER">Bowler</option>
                        <option value="ALL_ROUNDER">All Rounder</option>
                        <option value="WICKET_KEEPER">Wicket Keeper</option>
                    </select>
                    <button 
                        type="button"
                        onClick={addPlayer}
                        className="bg-slate-900 text-white px-12 py-5 rounded-2xl hover:bg-black font-black transition-all shadow-xl active:scale-95 text-sm uppercase tracking-widest"
                    >
                        Add Player
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                {(players || []).length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                        <p className="text-slate-400 text-lg font-bold italic">No players added to the squad yet.</p>
                    </div>
                ) : (
                    players.map(player => (
                        <div key={player.id} className="flex justify-between items-center bg-white border border-slate-100 p-6 rounded-[1.5rem] shadow-sm hover:border-emerald-500 transition-all group">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                            <User size={26} />
                            </div>
                            <div>
                            <p className="font-black text-slate-800 text-lg">{player.name}</p>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-0.5">{player.role.replace('_', ' ')}</p>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={() => removePlayer(player.id)} 
                            className="text-slate-300 hover:text-red-500 p-3.5 hover:bg-red-50 rounded-xl transition-all"
                        >
                            <Trash2 size={24} />
                        </button>
                        </div>
                    ))
                )}
                </div>
            </div>

            <div className="flex flex-col-reverse md:flex-row justify-between items-center gap-5 pt-12 border-t border-slate-100">
                {editingTeamId ? (
                    <button 
                        type="button"
                        onClick={() => handleDeleteClick(editingTeamId, teamName)}
                        className="w-full md:w-auto flex items-center justify-center gap-3 text-red-500 hover:bg-red-50 px-10 py-5 rounded-2xl transition-all font-black uppercase tracking-widest text-sm"
                    >
                        <Trash2 size={22} /> Delete Team
                    </button>
                ) : (
                    <div />
                )}
                
                <div className="flex gap-5 w-full md:w-auto">
                    <button 
                    type="button"
                    onClick={cancelCreate}
                    className="flex-1 md:flex-none px-12 py-5 text-slate-500 hover:bg-slate-50 rounded-2xl font-black uppercase tracking-widest text-sm transition-all"
                    >
                    Cancel
                    </button>
                    <button 
                    type="button"
                    onClick={saveTeam}
                    className="flex-1 md:flex-none px-16 py-5 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 shadow-2xl transition-all font-black uppercase tracking-widest text-sm transform active:scale-95"
                    >
                    {editingTeamId ? 'Update Changes' : 'Save Team'}
                    </button>
                </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {/* "Add team" logic: Render the + card first if no teams, or as first item */}
          <div 
             onClick={() => { if(checkPermission()) setCreating(true); }}
             className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition-all duration-300 min-h-[300px]"
          >
             <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-all mb-6">
                <Plus size={40} />
             </div>
             <h3 className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-emerald-900 transition-colors">Add team</h3>
             <p className="text-slate-400 font-bold mt-2 text-sm">Tap to create your squad</p>
          </div>

          {(state.teams || []).map((team, index) => {
            const colors = [
              'bg-[#ADC4F0]', 
              'bg-[#E9ADF0]', 
              'bg-[#F0C9AD]', 
              'bg-[#F0ADAD]'  
            ];
            const color = colors[index % colors.length];
            
            return (
              <div key={team.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 relative overflow-hidden group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
                
                <div className="flex items-start justify-between mb-10">
                  <div className={`w-20 h-20 rounded-[1.5rem] ${color} flex items-center justify-center text-2xl font-black text-slate-700 shadow-inner transform transition-transform group-hover:scale-110 duration-500`}>
                    {team.shortName || (team.name?.substring(0, 3) || '???').toUpperCase()}
                  </div>
                  
                  <div className="flex gap-3">
                      {membership === 'member' ? (
                          <>
                            <button 
                                type="button"
                                onClick={(e) => handleEdit(e, team)}
                                className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm"
                                title="Edit Team"
                            >
                                <Edit2 size={20} />
                            </button>
                            <button 
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(team.id, team.name);
                                }}
                                className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all shadow-sm"
                                title="Delete Team"
                            >
                                <Trash2 size={20} />
                            </button>
                          </>
                      ) : (
                          <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center" title="Premium Feature">
                              <Lock size={20} />
                          </div>
                      )}
                  </div>
                </div>

                <div>
                    <h3 className="text-3xl font-black text-slate-800 leading-tight mb-2 truncate group-hover:text-emerald-900 transition-colors">
                        {team.name || 'Unnamed Team'}
                    </h3>
                    <p className="text-slate-400 text-sm font-black uppercase tracking-widest">
                        {(team.players || []).length} PLAYERS IN SQUAD
                    </p>
                </div>
                
                <div className="mt-10 pt-8 border-t border-slate-50">
                   <div className="flex flex-wrap gap-2.5">
                     {(team.players || []).slice(0, 4).map(p => (
                       <span key={p.id} className="text-xs font-black bg-slate-50 text-slate-500 px-4 py-2 rounded-xl border border-slate-100 group-hover:bg-white transition-colors uppercase tracking-wider">
                         {p.name?.split(' ')[0]}
                       </span>
                     ))}
                     {(team.players || []).length > 4 && (
                       <span className="text-xs font-black text-slate-300 px-2 py-2">
                         +{(team.players || []).length - 4} MORE
                       </span>
                     )}
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteModal.show && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-md animate-pop p-14 text-center">
                <div className="w-28 h-28 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-10">
                    <Trash2 size={56} />
                </div>
                <h3 className="text-4xl font-black text-slate-900 mb-5 tracking-tight">Delete {deleteModal.teamName}?</h3>
                <p className="text-slate-400 font-bold mb-12 text-lg leading-relaxed">
                    This will remove the team and its squad history permanently. This action cannot be undone.
                </p>
                
                <div className="flex flex-col gap-4">
                    <button 
                        onClick={confirmDelete}
                        className="w-full py-6 text-white font-black bg-red-600 hover:bg-red-700 rounded-[1.5rem] shadow-2xl transition-all transform active:scale-95 uppercase tracking-widest text-sm"
                    >
                        Delete Team Permanently
                    </button>
                    <button 
                        onClick={() => setDeleteModal({ show: false, teamId: null, teamName: '' })}
                        className="w-full py-6 text-slate-400 font-black bg-slate-50 hover:bg-slate-100 rounded-[1.5rem] transition-all uppercase tracking-widest text-sm"
                    >
                        No, Keep it
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};