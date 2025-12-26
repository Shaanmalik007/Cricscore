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
    <div className="max-w-4xl mx-auto space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Team Management</h2>
           <p className="text-slate-500 text-xs mt-1">Organize your squads and players.</p>
        </div>
        {!isCreating && (
          <button 
            type="button"
            onClick={() => {
                if(checkPermission()) setCreating(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-bold shadow-sm transition-all text-sm"
          >
             <Plus size={18} /> 
             <span>Create Team</span>
          </button>
        )}
      </div>

      {isCreating ? (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden animate-pop">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
             <h3 className="text-lg font-bold text-slate-800">{editingTeamId ? 'Edit Team' : 'New Team'}</h3>
             <button onClick={cancelCreate} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Team Name</label>
                <input 
                    type="text" 
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    placeholder="e.g. Royal Challengers"
                    className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-sm"
                />
                </div>
                <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Code (3 chars)</label>
                <input 
                    type="text" 
                    value={shortName}
                    onChange={e => setShortName(e.target.value.toUpperCase())}
                    maxLength={3}
                    placeholder="RCB"
                    className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none uppercase font-mono font-bold tracking-widest text-sm"
                />
                </div>
            </div>

            <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Squad List</h3>
                <div className="flex gap-2 mb-4">
                    <input 
                        type="text" 
                        value={newPlayerName}
                        onChange={e => setNewPlayerName(e.target.value)}
                        placeholder="Player Name"
                        className="flex-1 bg-white text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                    />
                    <select 
                        value={newPlayerRole}
                        onChange={(e) => setNewPlayerRole(e.target.value as PlayerRole)}
                        className="border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold"
                    >
                        <option value="BATSMAN">Batsman</option>
                        <option value="BOWLER">Bowler</option>
                        <option value="ALL_ROUNDER">All Rounder</option>
                        <option value="WICKET_KEEPER">Wicket Keeper</option>
                    </select>
                    <button 
                        type="button"
                        onClick={addPlayer}
                        className="bg-slate-800 text-white px-4 py-2.5 rounded-lg hover:bg-black font-bold text-xs uppercase"
                    >
                        Add
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {(players || []).length === 0 ? (
                    <div className="col-span-full py-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        <p className="text-slate-400 text-sm italic">No players added.</p>
                    </div>
                ) : (
                    players.map(player => (
                        <div key={player.id} className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3 rounded-lg group">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 border border-slate-100">
                               <User size={14} />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm">{player.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{player.role.replace('_', ' ')}</p>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={() => removePlayer(player.id)} 
                            className="text-slate-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-md transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                        </div>
                    ))
                )}
                </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                {editingTeamId ? (
                    <button 
                        type="button"
                        onClick={() => handleDeleteClick(editingTeamId, teamName)}
                        className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-all font-bold text-xs uppercase flex items-center gap-2"
                    >
                        <Trash2 size={14} /> Delete
                    </button>
                ) : (
                    <div />
                )}
                
                <div className="flex gap-3">
                    <button 
                    type="button"
                    onClick={cancelCreate}
                    className="px-6 py-2.5 text-slate-500 hover:bg-slate-50 rounded-lg font-bold text-sm"
                    >
                    Cancel
                    </button>
                    <button 
                    type="button"
                    onClick={saveTeam}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow font-bold text-sm"
                    >
                    {editingTeamId ? 'Update' : 'Save'}
                    </button>
                </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div 
             onClick={() => { if(checkPermission()) setCreating(true); }}
             className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/10 transition-all min-h-[160px]"
          >
             <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3">
                <Plus size={24} />
             </div>
             <h3 className="text-sm font-bold text-slate-700">Add Team</h3>
          </div>

          {(state.teams || []).map((team, index) => {
            const colors = [
              'bg-blue-100 text-blue-700', 
              'bg-purple-100 text-purple-700', 
              'bg-orange-100 text-orange-700', 
              'bg-rose-100 text-rose-700'  
            ];
            const colorClass = colors[index % colors.length];
            
            return (
              <div key={team.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 relative group hover:shadow-md transition-shadow">
                
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-lg ${colorClass} flex items-center justify-center text-sm font-black`}>
                    {team.shortName || (team.name?.substring(0, 3) || '???').toUpperCase()}
                  </div>
                  
                  <div className="flex gap-1">
                      {membership === 'member' ? (
                          <>
                            <button 
                                type="button"
                                onClick={(e) => handleEdit(e, team)}
                                className="w-8 h-8 text-slate-400 hover:bg-slate-100 hover:text-blue-600 rounded-lg flex items-center justify-center transition-colors"
                            >
                                <Edit2 size={14} />
                            </button>
                            <button 
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(team.id, team.name);
                                }}
                                className="w-8 h-8 text-slate-400 hover:bg-slate-100 hover:text-red-600 rounded-lg flex items-center justify-center transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                          </>
                      ) : (
                          <div className="w-8 h-8 text-slate-300 flex items-center justify-center">
                              <Lock size={14} />
                          </div>
                      )}
                  </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-slate-800 truncate mb-1">
                        {team.name || 'Unnamed Team'}
                    </h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        {(team.players || []).length} Players
                    </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteModal.show && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm animate-pop p-6 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Team?</h3>
                <p className="text-slate-500 text-sm mb-6">
                    Permanently remove <span className="font-bold text-slate-800">"{deleteModal.teamName}"</span>?
                </p>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => setDeleteModal({ show: false, teamId: null, teamName: '' })}
                        className="flex-1 py-3 text-slate-500 font-bold bg-slate-50 hover:bg-slate-100 rounded-lg text-xs uppercase"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="flex-1 py-3 text-white font-bold bg-red-600 hover:bg-red-700 rounded-lg shadow text-xs uppercase"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};