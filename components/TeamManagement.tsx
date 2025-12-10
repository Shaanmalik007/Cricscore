
import React, { useState } from 'react';
import { useScoring } from '../context/ScoringContext';
import { Player, Team, PlayerRole } from '../types';
import { Plus, Trash2, User, Shield, Edit2 } from 'lucide-react';

export const TeamManagement = () => {
  const { state, dispatch } = useScoring();
  const [isCreating, setCreating] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  
  // Form State
  const [teamName, setTeamName] = useState('');
  const [shortName, setShortName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<PlayerRole>('ALL_ROUNDER');

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const player: Player = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name: newPlayerName,
      role: newPlayerRole
    };
    setPlayers([...players, player]);
    setNewPlayerName('');
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const handleEdit = (e: React.MouseEvent, team: Team) => {
    e.preventDefault();
    e.stopPropagation();
    setTeamName(team.name);
    setShortName(team.shortName);
    setPlayers(team.players);
    setEditingTeamId(team.id);
    setCreating(true);
  };

  const deleteEditingTeam = () => {
    if (window.confirm("Are you sure you want to delete this team? This action cannot be undone.")) {
      if (editingTeamId) {
        dispatch({ type: 'DELETE_TEAM', payload: { teamId: editingTeamId } });
        setCreating(false);
        setEditingTeamId(null);
        // Reset form
        setTeamName('');
        setShortName('');
        setPlayers([]);
      }
    }
  };

  const saveTeam = () => {
    if (!teamName || !shortName || players.length === 0) {
      alert("Please fill all details and add at least one player.");
      return;
    }

    const teamData: Team = {
      id: editingTeamId || Date.now().toString(),
      name: teamName,
      shortName: shortName.toUpperCase(),
      players: players,
      logoColor: 'bg-emerald-500' // Default
    };

    if (editingTeamId) {
      dispatch({ type: 'UPDATE_TEAM', payload: teamData });
    } else {
      dispatch({ type: 'CREATE_TEAM', payload: teamData });
    }

    setCreating(false);
    setEditingTeamId(null);
    // Reset form
    setTeamName('');
    setShortName('');
    setPlayers([]);
  };

  const cancelCreate = () => {
    setCreating(false);
    setEditingTeamId(null);
    setTeamName('');
    setShortName('');
    setPlayers([]);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-8">
        <div className="border-2 border-blue-400 px-6 py-4 rounded-lg bg-white shadow-sm flex-1 md:flex-none">
           <h2 className="text-xl md:text-2xl font-bold text-gray-900">Team Management</h2>
        </div>
        {!isCreating && (
          <button 
            type="button"
            onClick={() => setCreating(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-bold shadow transition-colors"
          >
            <Plus size={20} /> Create Team
          </button>
        )}
      </div>

      {isCreating ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 md:p-8 animate-fade-in max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-6 text-gray-800 border-b pb-4">{editingTeamId ? 'Edit Team' : 'New Team Details'}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Team Name</label>
              <input 
                type="text" 
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="e.g. Mumbai Indians"
                className="w-full bg-gray-50 text-gray-900 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Short Code (3 chars)</label>
              <input 
                type="text" 
                value={shortName}
                onChange={e => setShortName(e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="e.g. MI"
                className="w-full bg-gray-50 text-gray-900 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none uppercase font-mono"
              />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Squad</h3>
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <input 
                type="text" 
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
                placeholder="Player Name"
                className="flex-1 bg-white text-gray-900 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
              />
              <select 
                value={newPlayerRole}
                onChange={(e) => setNewPlayerRole(e.target.value as PlayerRole)}
                className="border border-gray-300 rounded-lg p-3 bg-white text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="BATSMAN">Batsman</option>
                <option value="BOWLER">Bowler</option>
                <option value="ALL_ROUNDER">All Rounder</option>
                <option value="WICKET_KEEPER">Wicket Keeper</option>
              </select>
              <button 
                type="button"
                onClick={addPlayer}
                className="bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-900 font-bold"
              >
                Add
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-[150px]">
              {players.length === 0 ? (
                <p className="text-gray-400 text-center italic py-4">No players added yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {players.map(player => (
                    <div key={player.id} className="flex justify-between items-center bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <User size={14} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{player.name}</p>
                          <p className="text-xs text-gray-500 uppercase">{player.role.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removePlayer(player.id)} 
                        className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse md:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-100 mt-6">
            {editingTeamId ? (
                <button 
                    type="button"
                    onClick={deleteEditingTeam}
                    className="w-full md:w-auto flex items-center justify-center gap-2 text-red-500 hover:text-white hover:bg-red-500 px-4 py-3 md:py-2 rounded-lg transition-colors font-bold border border-red-200 hover:border-red-500 bg-red-50/50"
                >
                    <Trash2 size={18} /> Delete Team
                </button>
            ) : (
                <div className="hidden md:block" />
            )}
            
            <div className="flex gap-3 w-full md:w-auto">
                <button 
                  type="button"
                  onClick={cancelCreate}
                  className="flex-1 md:flex-none px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium border border-gray-200 text-center"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={saveTeam}
                  className="flex-1 md:flex-none px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow transition-colors font-bold text-center"
                >
                  {editingTeamId ? 'Update Team' : 'Save Team'}
                </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {state.teams.map((team, index) => {
            const colors = [
              { bg: 'bg-emerald-100', text: 'text-emerald-700' },
              { bg: 'bg-blue-100', text: 'text-blue-700' },
              { bg: 'bg-purple-100', text: 'text-purple-700' },
              { bg: 'bg-orange-100', text: 'text-orange-700' }
            ];
            const color = colors[index % colors.length];
            
            return (
              <div key={team.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
                
                {/* Watermark */}
                <div className="absolute top-4 right-4 text-7xl font-black text-gray-50 opacity-50 select-none pointer-events-none z-0">
                  {team.shortName}
                </div>

                <div className="flex items-start gap-4 mb-6 relative z-10 pr-20">
                  <div className={`w-14 h-14 rounded-full ${color.bg} ${color.text} flex items-center justify-center text-xl font-bold shrink-0`}>
                    {team.shortName[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 leading-tight mb-1">{team.name}</h3>
                    <p className="text-gray-500 text-sm font-medium">{team.players.length} Players</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-100 pt-4 relative z-10">
                   <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Key Players</h4>
                   <div className="flex flex-wrap gap-2">
                     {team.players.slice(0, 3).map(p => (
                       <span key={p.id} className="text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md">
                         {p.name}
                       </span>
                     ))}
                     {team.players.length > 3 && (
                       <span className="text-xs font-medium text-gray-400 px-2 py-1.5">
                         +{team.players.length - 3} more
                       </span>
                     )}
                   </div>
                </div>

                {/* Edit Action - Visible on Hover */}
                <div className="absolute top-4 right-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                   <button 
                    type="button"
                    onClick={(e) => handleEdit(e, team)}
                    className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm cursor-pointer"
                    title="Edit Team"
                   >
                     <Edit2 size={16} />
                   </button>
                </div>

              </div>
            );
          })}
          
          {state.teams.length === 0 && (
            <div className="col-span-full text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
              <Shield size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">No teams found. Create your first team to get started!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
