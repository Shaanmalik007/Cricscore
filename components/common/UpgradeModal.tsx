
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Crown, Check, X, Loader2 } from 'lucide-react';

export const UpgradeModal = () => {
  const { showUpgradeModal, setShowUpgradeModal, upgradeAccount } = useAuth();
  const [processing, setProcessing] = useState(false);

  if (!showUpgradeModal) return null;

  const handleUpgrade = async () => {
    setProcessing(true);
    // Simulate network delay for "payment processing"
    setTimeout(async () => {
        await upgradeAccount();
        setProcessing(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-black/60 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-pop relative">
        <button 
            onClick={() => setShowUpgradeModal(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
            <X size={24} />
        </button>

        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white p-8 text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/20">
                <Crown className="text-yellow-400" size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Upgrade to Premium</h2>
            <p className="text-indigo-200 text-sm">Unlock the full potential of CricScore Pro</p>
        </div>

        <div className="p-8">
            <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-gray-700">
                    <div className="bg-green-100 text-green-600 p-1 rounded-full"><Check size={14} /></div>
                    <span className="font-medium">Create unlimited matches</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                    <div className="bg-green-100 text-green-600 p-1 rounded-full"><Check size={14} /></div>
                    <span className="font-medium">Manage Teams & Players</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                    <div className="bg-green-100 text-green-600 p-1 rounded-full"><Check size={14} /></div>
                    <span className="font-medium">Run Tournaments</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                    <div className="bg-green-100 text-green-600 p-1 rounded-full"><Check size={14} /></div>
                    <span className="font-medium">Advanced Scoring Tools</span>
                </div>
            </div>

            <button
                onClick={handleUpgrade}
                disabled={processing}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl shadow-lg transform transition-all active:scale-95 flex items-center justify-center gap-2"
            >
                {processing ? (
                    <>
                        <Loader2 className="animate-spin" size={20} /> Processing...
                    </>
                ) : (
                    <>
                        Unlock Premium Access
                    </>
                )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">No credit card required for demo.</p>
        </div>
      </div>
    </div>
  );
};
