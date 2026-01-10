import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as FirestoreService from '../services/firestoreService';
import { Match } from '../types';
import { Search, CircleDot, ArrowRight, Loader2 } from 'lucide-react';

export const MatchSearch = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const results = await FirestoreService.searchMatches(searchTerm.trim());
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
       {/* Search Bar */}
       <form onSubmit={handleSearch} className="relative group">
           <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="text-white/40 group-focus-within:text-emerald-400 transition-colors" size={18} />
           </div>
           <input 
             type="text" 
             placeholder="Search Game ID or Name..."
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             className="w-full pl-11 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl shadow-inner focus:ring-1 focus:ring-emerald-500/50 focus:bg-white/10 outline-none text-white placeholder-white/30 text-sm transition-all"
           />
           <button type="submit" className="absolute right-2 top-2 bg-white/10 text-white p-1.5 rounded-lg hover:bg-emerald-600 transition-colors">
               {loading ? <Loader2 className="animate-spin" size={16}/> : <ArrowRight size={16} />}
           </button>
       </form>

       {/* Results */}
       {searchResults.length > 0 && (
           <div className="space-y-2 animate-in slide-in-from-bottom-2">
               <h3 className="text-xs font-bold text-white/40 uppercase tracking-wide px-1">Results</h3>
               {searchResults.map(m => (
                   <MatchResultCard key={m.id} match={m} onClick={() => navigate(`/spectate/${m.gameId || m.id}`)} />
               ))}
           </div>
       )}
    </div>
  );
};

const MatchResultCard: React.FC<{ match: Match; onClick: () => void }> = ({ match, onClick }) => {
    const isLive = match.status === 'LIVE';
    return (
        <div onClick={onClick} className="glass-card rounded-xl p-3 cursor-pointer hover:bg-white/10 transition-all flex justify-between items-center group border-white/5">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    {isLive && <span className="bg-red-500/20 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 border border-red-500/30"><CircleDot size={6}/> LIVE</span>}
                    <span className="text-[10px] text-white/40 font-mono tracking-wider">{match.gameId}</span>
                </div>
                <h4 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">{match.name}</h4>
                <p className="text-xs text-white/50">{match.teams[0].shortName} vs {match.teams[1].shortName}</p>
            </div>
            <ArrowRight size={16} className="text-white/20 group-hover:text-emerald-400 transition-colors -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100" />
        </div>
    )
}