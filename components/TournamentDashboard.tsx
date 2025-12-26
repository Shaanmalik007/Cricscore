import React, { useState, useMemo } from 'react';
import { useScoring } from '../context/ScoringContext';
import { useAuth } from '../context/AuthContext';
import { Tournament, Team, PointsTableEntry, TournamentTeamEntry } from '../types';
import { calculatePointsTable, calculatePlayerStats } from '../services/gameLogic';
import { Plus, Trophy, Calendar, Users, ChevronRight, User, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TournamentDashboard = () => {
    const { state, dispatch } = useScoring();
    const { membership, setShowUpgradeModal } = useAuth();
    const [view, setView] = useState<'LIST' | 'CREATE' | 'DETAIL'>('LIST');
    const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);

    // Create Form State
    const [form, setForm] = useState({ name: '', startDate: '', endDate: '', format: 'T20', overs: 20, groups: 'Group A,Group B' });
    const [selectedTeams, setSelectedTeams] = useState<Record<string, string>>({}); // teamId -> groupName

    const activeTournament = (state.tournaments || []).find(t => t.id === activeTournamentId);
    
    // --- CREATE LOGIC ---
    const handleCreate = () => {
        if (!form.name || !form.startDate) return alert("Required fields missing");
        
        const teamsPayload: TournamentTeamEntry[] = Object.entries(selectedTeams).map(([teamId, groupId]) => ({ 
            teamId, 
            groupId: groupId as string 
        }));
        
        const newT: Tournament = {
            id: Date.now().toString(),
            name: form.name,
            startDate: form.startDate,
            endDate: form.endDate,
            format: form.format as any,
            overs: form.overs,
            groups: form.groups.split(',').map(g => g.trim()).filter(Boolean),
            teams: teamsPayload,
            status: 'UPCOMING'
        };
        dispatch({ type: 'CREATE_TOURNAMENT', payload: newT });
        setView('LIST');
    };

    const toggleTeamSelection = (teamId: string, group: string) => {
        const current = selectedTeams[teamId];
        if (current === group) {
            const next = { ...selectedTeams };
            delete next[teamId];
            setSelectedTeams(next);
        } else {
            setSelectedTeams({ ...selectedTeams, [teamId]: group });
        }
    };

    // --- DETAIL VIEW HELPERS ---
    const tournamentData = useMemo(() => {
        if (!activeTournament) return null;
        const matches = (state.matches || []).filter(m => m.tournamentId === activeTournament.id);
        const pointsTable = calculatePointsTable(activeTournament, matches, state.teams);
        const stats = calculatePlayerStats(matches, state.teams);
        return { matches, pointsTable, stats };
    }, [activeTournament, state.matches, state.teams]);

    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'POINTS' | 'FIXTURES' | 'STATS'>('POINTS');

    const handleCreateClick = () => {
        if (membership === 'member') {
            setView('CREATE');
        } else {
            setShowUpgradeModal(true);
        }
    }

    // --- RENDER ---

    if (view === 'CREATE') {
        return (
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Create Tournament</h2>
                    <button onClick={() => setView('LIST')} className="text-sm text-gray-500 hover:text-gray-800">Cancel</button>
                </div>
                
                <div className="p-8 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tournament Name</label>
                            <input 
                                className="w-full bg-white text-gray-900 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                                value={form.name} 
                                onChange={e => setForm({...form, name: e.target.value})} 
                                placeholder="e.g. Champions League 2024"
                            />
                        </div>
                        <div>
                             <label className="block text-sm font-semibold text-gray-700 mb-1">Format</label>
                             <select 
                                className="w-full bg-white text-gray-900 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                                value={form.format} 
                                onChange={e => setForm({...form, format: e.target.value, overs: e.target.value === 'T20' ? 20 : e.target.value === 'ODI' ? 50 : 10})}
                             >
                                 <option value="T20">T20 (20 Overs)</option>
                                 <option value="ODI">ODI (50 Overs)</option>
                                 <option value="T10">T10 (10 Overs)</option>
                                 <option value="CUSTOM">Custom</option>
                             </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                            <input 
                                type="date" 
                                className="w-full bg-white text-gray-900 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                                value={form.startDate} 
                                onChange={e => setForm({...form, startDate: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Overs Per Inning</label>
                            <input 
                                type="number" 
                                className="w-full bg-white text-gray-900 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                                value={form.overs} 
                                onChange={e => setForm({...form, overs: parseInt(e.target.value)})} 
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Groups (Comma Separated)</label>
                        <input 
                            className="w-full bg-white text-gray-900 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                            value={form.groups} 
                            onChange={e => setForm({...form, groups: e.target.value})} 
                            placeholder="Group A, Group B"
                        />
                    </div>

                    <div className="border-t pt-6">
                        <h3 className="font-bold text-gray-800 mb-4">Add Teams to Groups</h3>
                        <div className="space-y-6">
                            {(form.groups || "").split(',').filter(g => g.trim()).map(group => (
                                <div key={group} className="border border-gray-200 p-4 rounded-lg bg-gray-50/50">
                                    <h4 className="font-bold text-emerald-700 mb-3 text-sm uppercase tracking-wide">{group}</h4>
                                    {(state.teams || []).length === 0 ? (
                                        <p className="text-sm text-gray-400 italic">No teams available. Create teams first.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {state.teams.map(team => {
                                                const isSelectedInThisGroup = selectedTeams[team.id] === group;
                                                const isSelectedElsewhere = selectedTeams[team.id] && !isSelectedInThisGroup;
                                                return (
                                                    <button 
                                                        key={team.id}
                                                        disabled={isSelectedElsewhere}
                                                        onClick={() => toggleTeamSelection(team.id, group)}
                                                        className={`px-4 py-2 rounded-md text-sm font-medium border transition-all ${
                                                            isSelectedInThisGroup ? 'bg-white border-emerald-500 text-emerald-700 shadow-sm ring-1 ring-emerald-500' :
                                                            isSelectedElsewhere ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed' :
                                                            'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                                        }`}
                                                    >
                                                        {team.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4 justify-end">
                        <button onClick={() => setView('LIST')} className="px-6 py-3 text-gray-600 hover:bg-gray-50 rounded-lg font-medium">Cancel</button>
                        <button onClick={handleCreate} className="px-8 py-3 bg-emerald-600 text-white rounded-lg font-bold shadow hover:bg-emerald-700 hover:shadow-lg transition-all">
                            Create Tournament
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'DETAIL' && activeTournament && tournamentData) {
        return (
            <div className="max-w-5xl mx-auto">
                 <button onClick={() => setView('LIST')} className="mb-4 text-gray-600 flex items-center gap-1 hover:text-emerald-600">
                     &larr; Back to Tournaments
                 </button>
                 
                 <div className="bg-white rounded-xl shadow-sm border p-6 mb-6 flex justify-between items-center">
                     <div>
                         <h1 className="text-3xl font-bold text-gray-900">{activeTournament.name}</h1>
                         <p className="text-gray-500">{activeTournament.format} • {new Date(activeTournament.startDate).toLocaleDateString()} - {activeTournament.endDate ? new Date(activeTournament.endDate).toLocaleDateString() : 'Ongoing'}</p>
                     </div>
                     <div className="text-right">
                         <div className="text-2xl font-bold text-emerald-600">{(activeTournament.teams || []).length} Teams</div>
                     </div>
                 </div>

                 {/* Tabs */}
                 <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
                     {['POINTS', 'FIXTURES', 'STATS', 'OVERVIEW'].map(t => (
                         <button 
                             key={t} 
                             onClick={() => setActiveTab(t as any)}
                             className={`px-4 py-2 rounded-md font-bold text-sm ${activeTab === t ? 'bg-white shadow text-emerald-800' : 'text-gray-500 hover:bg-gray-200'}`}
                         >
                             {t}
                         </button>
                     ))}
                 </div>

                 {/* Tab Content */}
                 {activeTab === 'POINTS' && (
                     <div className="grid gap-8">
                         {Object.keys(tournamentData.pointsTable || {}).map(group => (
                             <div key={group} className="bg-white rounded-lg shadow overflow-hidden">
                                 <div className="bg-gray-50 px-4 py-3 border-b font-bold text-gray-700">{group}</div>
                                 <table className="w-full text-sm text-left">
                                     <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
                                         <tr>
                                             <th className="p-3">Team</th>
                                             <th className="p-3 text-center">P</th>
                                             <th className="p-3 text-center">W</th>
                                             <th className="p-3 text-center">L</th>
                                             <th className="p-3 text-center">NR</th>
                                             <th className="p-3 text-center">NRR</th>
                                             <th className="p-3 text-center">Pts</th>
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {tournamentData.pointsTable[group].map((row, i) => (
                                             <tr key={row.teamId} className="border-b last:border-0 hover:bg-gray-50">
                                                 <td className="p-3 font-medium">
                                                     <span className="mr-2 text-gray-400 w-4 inline-block">{i+1}</span>
                                                     {row.teamName}
                                                 </td>
                                                 <td className="p-3 text-center">{row.played}</td>
                                                 <td className="p-3 text-center text-green-600 font-bold">{row.won}</td>
                                                 <td className="p-3 text-center text-red-500">{row.lost}</td>
                                                 <td className="p-3 text-center text-gray-400">{row.tied + row.noResult}</td>
                                                 <td className="p-3 text-center font-mono">{row.nrr > 0 ? '+' : ''}{row.nrr.toFixed(3)}</td>
                                                 <td className="p-3 text-center font-bold text-lg">{row.points}</td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                         ))}
                     </div>
                 )}

                 {activeTab === 'STATS' && (
                     <div className="grid md:grid-cols-2 gap-6">
                         {/* Batsmen */}
                         <div className="bg-white rounded-lg shadow overflow-hidden">
                             <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 font-bold text-orange-800 flex items-center gap-2">
                                 <Trophy size={16}/> Most Runs
                             </div>
                             <div className="divide-y">
                                 {(tournamentData.stats?.batsmen || []).slice(0, 5).map((p, i) => (
                                     <div key={p.playerId} className="p-3 flex justify-between items-center">
                                         <div className="flex items-center gap-3">
                                             <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">{i+1}</div>
                                             <div>
                                                 <div className="font-bold text-gray-800">{p.playerName}</div>
                                                 <div className="text-xs text-gray-500">{p.teamName}</div>
                                             </div>
                                         </div>
                                         <div className="text-right">
                                             <div className="font-bold text-lg">{p.runs}</div>
                                             <div className="text-xs text-gray-500">{p.inningsBat} Inns</div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                         {/* Bowlers */}
                         <div className="bg-white rounded-lg shadow overflow-hidden">
                             <div className="bg-purple-50 px-4 py-3 border-b border-purple-100 font-bold text-purple-800 flex items-center gap-2">
                                 <Trophy size={16}/> Most Wickets
                             </div>
                             <div className="divide-y">
                                 {(tournamentData.stats?.bowlers || []).slice(0, 5).map((p, i) => (
                                     <div key={p.playerId} className="p-3 flex justify-between items-center">
                                         <div className="flex items-center gap-3">
                                             <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">{i+1}</div>
                                             <div>
                                                 <div className="font-bold text-gray-800">{p.playerName}</div>
                                                 <div className="text-xs text-gray-500">{p.teamName}</div>
                                             </div>
                                         </div>
                                         <div className="text-right">
                                             <div className="font-bold text-lg">{p.wickets}</div>
                                             <div className="text-xs text-gray-500">Eco: {p.economy}</div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     </div>
                 )}

                 {activeTab === 'FIXTURES' && (
                     <div className="space-y-3">
                         {(tournamentData.matches || []).length === 0 ? (
                             <div className="p-8 text-center text-gray-500 italic">No matches scheduled yet.</div>
                         ) : (
                             tournamentData.matches.map(m => (
                                 <MatchCard key={m.id} match={m} />
                             ))
                         )}
                     </div>
                 )}
                 
                 {activeTab === 'OVERVIEW' && (
                     <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
                         Tournament configuration and details...
                     </div>
                 )}
            </div>
        )
    }

    // --- LIST VIEW ---
    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Tournaments</h2>
                <button 
                    onClick={handleCreateClick} 
                    className={`${membership === 'member' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-400 hover:bg-gray-500'} text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow transition-colors`}
                >
                    {membership === 'member' ? <Plus size={18}/> : <Lock size={18} />}
                    New Tournament
                </button>
            </div>

            <div className="grid gap-4">
                {(state.tournaments || []).length === 0 ? (
                    <div className="bg-white p-12 rounded-xl text-center text-gray-500 border border-dashed">
                        No tournaments found. Create one to get started!
                    </div>
                ) : (
                    state.tournaments.map(t => (
                        <div key={t.id} className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">{t.name}</h3>
                                <div className="text-sm text-gray-500 flex gap-4 mt-1">
                                    <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(t.startDate).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1"><Users size={14}/> {(t.teams || []).length} Teams</span>
                                    <span className="bg-gray-100 px-2 rounded text-xs font-semibold self-center">{t.format}</span>
                                </div>
                            </div>
                            <button onClick={() => { setActiveTournamentId(t.id); setView('DETAIL'); }} className="text-emerald-600 font-bold flex items-center gap-1 hover:underline">
                                View Details <ChevronRight size={18}/>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const MatchCard: React.FC<{ match: any }> = ({ match }) => {
    const navigate = useNavigate();
    return (
        <div onClick={() => navigate(`/summary/${match.id}`)} className="bg-white p-4 rounded-lg border shadow-sm hover:bg-gray-50 cursor-pointer flex justify-between items-center transition-colors">
            <div>
                <div className="text-xs text-gray-400 font-bold mb-1">{match.groupId || 'Match'} • {new Date(match.date).toLocaleDateString()}</div>
                <div className="font-bold text-gray-800">{match.name}</div>
            </div>
            <div>
                {match.status === 'COMPLETED' ? (
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">Result</span>
                ) : (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Scheduled</span>
                )}
            </div>
        </div>
    )
}