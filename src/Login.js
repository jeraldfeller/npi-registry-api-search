// src/Login.js

import React, { useState } from 'react';

function Login({ onLogin }) {
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
        credentials: 'include', // Include cookies
      });

      if (response.ok) {
        onLogin(); // Callback to update authentication state
      } else {
        const data = await response.json();
        setError(data.error || 'Authentication failed.');
      }
    } catch (error) {
      setError('An error occurred during authentication.');
    }
  };

  return (
    <div className="container">
      <h2>Please Log In</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            className="form-control"
            id="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            required
          />
        </div>
        {error && <div className="text-danger mb-2">{error}</div>}
        <button type="submit" className="btn btn-primary">
          Log In
        </button>
      </form>
    </div>
  );
}

export default Login;
