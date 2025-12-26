
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const MemberRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, membership, setShowUpgradeModal } = useAuth();

  useEffect(() => {
    if (!loading && user && membership !== 'member') {
        setShowUpgradeModal(true);
    }
  }, [loading, user, membership, setShowUpgradeModal]);

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-900 flex flex-col items-center justify-center text-white">
        <Loader2 size={48} className="animate-spin text-emerald-400 mb-4" />
        <p className="font-bold">Verifying Membership...</p>
      </div>
    );
  }

  // If user is logged in but not a member, redirect to home (modal will show due to useEffect)
  if (user && membership !== 'member') {
      return <Navigate to="/" replace />;
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
};
