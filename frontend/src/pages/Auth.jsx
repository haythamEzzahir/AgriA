import React, { useState } from 'react';
import LoginForm from '../components/Auth/LoginForm';
import RegisterForm from '../components/Auth/RegisterForm';

export default function Auth() {
  const [mode, setMode] = useState('login');

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white p-8 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>

        {mode === 'login' ? <LoginForm /> : <RegisterForm />}

        <p className="text-center mt-4 text-sm text-gray-600">
          {mode === 'login' ? (
            <>Don't have an account?{' '}<button onClick={() => setMode('register')} className="text-primary-600 hover:underline">Sign up</button></>
          ) : (
            <>Already have an account?{' '}<button onClick={() => setMode('login')} className="text-primary-600 hover:underline">Sign in</button></>
          )}
        </p>
      </div>
    </div>
  );
}
