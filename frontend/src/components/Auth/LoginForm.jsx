import React, { useState } from 'react';
import { auth } from '../../services/api';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await auth.login({ email, password });
      localStorage.setItem('session', JSON.stringify(res.session));
      window.location.reload();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
        required
      />
      <button type="submit" className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
        Sign In
      </button>
    </form>
  );
}
