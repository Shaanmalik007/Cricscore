
import React, { useState } from 'react';
import { auth } from '../../lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Mail, Lock, AlertCircle, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // LOGIN | FORGOT | SUCCESS
  const [view, setView] = useState<'LOGIN' | 'FORGOT' | 'SUCCESS'>('LOGIN');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      // Handle Firebase Auth errors gracefully
      const errorCode = err.code;
      
      if (
        errorCode === 'auth/invalid-credential' || 
        errorCode === 'auth/user-not-found' || 
        errorCode === 'auth/wrong-password' ||
        errorCode === 'auth/invalid-email'
      ) {
        setError("Password or Email Incorrect");
      } else if (errorCode === 'auth/too-many-requests') {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError("Failed to sign in. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      await sendPasswordResetEmail(auth, email);
      setView('SUCCESS');
    } catch (err: any) {
       if (err.code === 'auth/user-not-found') {
          setError("No account found with this email.");
       } else if (err.code === 'auth/invalid-email') {
          setError("Please enter a valid email address.");
       } else {
          setError("Failed to send reset email. Please try again.");
       }
    } finally {
      setLoading(false);
    }
  };

  const resetView = () => {
      setView('LOGIN');
      setError(null);
  }

  return (
    <div className="min-h-screen bg-emerald-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-pop">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${view === 'SUCCESS' ? 'bg-green-100 text-green-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {view === 'SUCCESS' ? <CheckCircle size={24} /> : <Trophy size={24} />}
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900">
                {view === 'LOGIN' && 'Welcome Back'}
                {view === 'FORGOT' && 'Reset Password'}
                {view === 'SUCCESS' && 'Check your inbox'}
            </h2>
            
            <p className="text-gray-500 text-sm mt-1">
                {view === 'LOGIN' && 'Sign in to CricScore Pro'}
                {view === 'FORGOT' && 'Enter your email to get a reset link'}
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* LOGIN VIEW */}
          {view === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button 
                  type="button" 
                  onClick={() => { setView('FORGOT'); setError(null); }}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD VIEW */}
          {view === 'FORGOT' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? <Loader2 className="animate-spin" /> : 'Get Reset Link'}
                </button>
                
                <button 
                  type="button" 
                  onClick={resetView}
                  className="w-full text-gray-500 hover:text-gray-700 text-sm font-medium py-2 flex items-center justify-center gap-1"
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </button>
              </form>
          )}

          {/* SUCCESS VIEW */}
          {view === 'SUCCESS' && (
              <div className="text-center space-y-6">
                <p className="text-gray-600">
                  We sent you a password change link to <br/>
                  <span className="font-bold text-gray-900">{email}</span>
                </p>
                
                <button 
                   type="button"
                   onClick={resetView}
                   className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                   Sign In
                </button>
              </div>
          )}

          {view === 'LOGIN' && (
            <p className="mt-8 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-emerald-600 font-bold hover:underline">
                Sign up
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
