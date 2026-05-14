import React, { useState } from 'react';
import { useLanguage } from '../i18n/context';
import { auth } from '../services/api';

function LoginForm() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await auth.login({ email, password });
      localStorage.setItem('session', JSON.stringify(res.session));
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <input type="email" placeholder={t('auth.email')} value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none bg-gray-50 text-sm" required />
      <input type="password" placeholder={t('auth.password')} value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none bg-gray-50 text-sm" required />
      <button type="submit" disabled={loading}
        className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition">
        {loading ? t('auth.loggingIn') : t('auth.signIn')}
      </button>
    </form>
  );
}

function RegisterForm() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await auth.signup(form);
      localStorage.setItem('session', JSON.stringify(res.session));
      window.location.href = '/register';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <input placeholder={t('auth.name')} value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none bg-gray-50 text-sm" required />
      <input type="email" placeholder={t('auth.email')} value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none bg-gray-50 text-sm" required />
      <input type="password" placeholder={t('auth.password')} value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none bg-gray-50 text-sm" required />
      <button type="submit" disabled={loading}
        className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition">
        {loading ? t('auth.creating') : t('auth.signUp')}
      </button>
    </form>
  );
}

export default function Auth() {
  const { t, lang, setLang, languages } = useLanguage();
  const [mode, setMode] = useState('login');

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-farm-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🌾</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">AgriCopilot</h1>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-0.5 bg-gray-50 rounded-lg p-0.5">
              {languages.map((l) => (
                <button key={l.code} onClick={() => setLang(l.code)}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
                    lang === l.code ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}>
                  {l.code === 'ar' ? 'ع' : l.code.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-2 text-sm">
              <button onClick={() => setMode('login')}
                className={`font-medium ${mode === 'login' ? 'text-gray-900' : 'text-gray-400'}`}>
                {t('auth.signIn')}
              </button>
              <span className="text-gray-300">|</span>
              <button onClick={() => setMode('register')}
                className={`font-medium ${mode === 'register' ? 'text-gray-900' : 'text-gray-400'}`}>
                {t('auth.signUp')}
              </button>
            </div>
          </div>

          {mode === 'login' ? <LoginForm /> : <RegisterForm />}

          <p className="text-center mt-4 text-xs text-gray-400">
            {mode === 'login'
              ? <>{t('auth.noAccount')} <button onClick={() => setMode('register')} className="text-gray-900 hover:underline font-medium">{t('auth.signUpLink')}</button></>
              : <>{t('auth.haveAccount')} <button onClick={() => setMode('login')} className="text-gray-900 hover:underline font-medium">{t('auth.signInLink')}</button></>
            }
          </p>
        </div>
      </div>
    </div>
  );
}
