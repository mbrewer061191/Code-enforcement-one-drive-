import React, { useState } from 'react';
import { User, AppConfig } from '../types';

interface LoginScreenProps {
    config: AppConfig;
    onLogin: (user: User) => void;
    isLoading: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ config, onLogin, isLoading }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!config.users) {
            setError('System Error: No user database found.');
            return;
        }

        const user = config.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

        if (user) {
            onLogin(user);
        } else {
            setError('Invalid username or password.');
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)'
        }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>Officer Login</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

                    <button
                        type="submit"
                        className="button primary-action"
                        style={{ width: '100%', marginTop: '1rem' }}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Verifying...' : 'Login'}
                    </button>
                </form>

                <p style={{ marginTop: '2rem', fontSize: '0.8rem', textAlign: 'center', color: '#64748b' }}>
                    Commerce Code Enforcement
                </p>
            </div>
        </div>
    );
};

export default LoginScreen;
