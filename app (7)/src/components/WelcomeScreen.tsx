import React, { useState } from 'react';

interface WelcomeScreenProps {
    onOpen: () => Promise<void>;
    onCreate: () => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onOpen, onCreate, isLoading, error }) => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            padding: '2rem'
        }}>
            <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '3rem', textAlign: 'center' }}>
                <h1 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Code Enforcement App</h1>
                <p style={{ marginBottom: '2.5rem', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                    To get started, please open your database file from <strong>OneDrive</strong> or create a new one.
                </p>

                {error && (
                    <div className="error-banner" style={{ marginBottom: '2rem' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button
                        className="button primary-action"
                        onClick={onOpen}
                        disabled={isLoading}
                        style={{ justifyContent: 'center', fontSize: '1.1rem', padding: '1rem' }}
                    >
                        {isLoading ? 'Loading...' : '📂 Open Existing Database'}
                    </button>

                    <button
                        className="button secondary-action"
                        onClick={onCreate}
                        disabled={isLoading}
                        style={{ justifyContent: 'center', padding: '1rem' }}
                    >
                        ➕ Create New Database
                    </button>
                </div>

                <div className="info-box" style={{ marginTop: '3rem', textAlign: 'left' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>💡 How to use OneDrive</h4>
                    <p style={{ fontSize: '0.9rem' }}>When creating a new database, save the file (e.g., <code>enforcement-data.json</code>) directly into your <strong>OneDrive</strong> folder. This ensures your data is backed up and accessible from the cloud.</p>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;
