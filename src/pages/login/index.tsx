import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { checkKey } from '../../api/catalog';
import { KeyRound, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setApiKey, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      verifyKey();
    }
  }, [isAuthenticated]);

  const verifyKey = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await checkKey();
      if (res.isSuccess && res.data?.flag === 1) {
        navigate('/admin');
      } else {
        setError('Invalid API Key');
        useAuthStore.getState().logout();
      }
    } catch (err) {
      setError('Failed to verify key');
      useAuthStore.getState().logout();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setApiKey(key.trim());
    await verifyKey();
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100">管理员登录</h1>
          <p className="text-zinc-400 mt-2 text-center">请输入您的访问密钥以继续进入控制台。</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="key" className="block text-sm font-medium text-zinc-300 mb-1">
              访问密钥
            </label>
            <input
              id="key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600"
              placeholder="请输入您的密钥"
              required
            />
          </div>

          {error && <p className="text-sm text-red-400">{error === 'Invalid API Key' ? '无效的访问密钥' : '验证密钥失败'}</p>}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-medium hover:bg-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
