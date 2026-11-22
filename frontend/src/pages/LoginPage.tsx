import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Gamepad2, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AuthResponse } from '../types/auth';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { data } = await apiClient.post<AuthResponse>('/auth/login', {
        email,
        password,
      });
      login(data.token, data.user);
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-b from-[#4618AC]/30 to-[#1F0A4D] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#2A1163] border border-[#3F1B85] rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#FAD318] text-[#1F0A4D] flex items-center justify-center mx-auto shadow-lg shadow-[#FAD318]/20">
            <Gamepad2 className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Welcome Back</h1>
          <p className="text-sm text-gray-300">
            Sign in to access your digital game keys and instant checkout
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-[#FD5A20]/15 border border-[#FD5A20] flex items-center gap-2.5 text-xs font-bold text-[#FD5A20]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-300">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="gamer@example.com"
                className="w-full bg-[#1F0A4D] border border-[#3F1B85] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FAD318]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-300">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1F0A4D] border border-[#3F1B85] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FAD318]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-5 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] disabled:opacity-50 text-[#1F0A4D] font-black text-sm shadow-lg shadow-[#FAD318]/20 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

        <div className="pt-4 border-t border-[#3F1B85] text-center text-sm text-gray-300">
          Don't have an account?{' '}
          <Link
            to={`/register${redirectTo !== '/' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
            className="font-extrabold text-[#FAD318] hover:underline"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};