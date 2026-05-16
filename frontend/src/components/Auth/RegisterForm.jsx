import React, { useState } from 'react';

export default function RegisterForm() {
  const [email, setEmail] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    localStorage.setItem('demo_user_email', email);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        type="email"
        placeholder="Email"
        className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        required
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        required
      />
      <button type="submit" className="w-full rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700">
        Create Account
      </button>
    </form>
  );
}
