
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
    <div className="space-y-6">
       {/* Search Bar */}
       <form onSubmit={handleSearch} className="relative">
           <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
           <input 
             type="text" 
             placeholder="Enter 6-digit Game ID or Match Name"
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900"
           />
           <button type="submit" className="absolute right-2 top-2 bg-emerald-600 text-white p-1.5 rounded-lg hover:bg-emerald-700">
               {loading ? <Loader2 className="animate-spin" size={20}/> : <ArrowRight size={20} />}
           </button>
       </form>

       {/* Results */}
       {searchResults.length > 0 && (
           <div className="space-y-3 animate-in slide-in-from-bottom-2">
               <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Search Results</h3>
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
        <div onClick={onClick} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all flex justify-between items-center group">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    {isLive && <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"><CircleDot size={8}/> LIVE</span>}
                    <span className="text-xs text-gray-400 font-mono">{match.gameId}</span>
                </div>
                <h4 className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">{match.name}</h4>
                <p className="text-xs text-gray-500">{match.teams[0].shortName} vs {match.teams[1].shortName}</p>
            </div>
            <ArrowRight size={18} className="text-gray-300 group-hover:text-emerald-500" />
        </div>
    )
}
