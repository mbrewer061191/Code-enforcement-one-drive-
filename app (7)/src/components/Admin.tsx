import React, { useState, useEffect } from 'react';
import { AppConfig, User } from '../types';
import { getConfig, saveConfig } from '../config';

interface AdminViewProps {
    onSetupComplete: () => void;
}

const AdminView: React.FC<AdminViewProps> = () => {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState('');

    // New User Form
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<'admin' | 'officer'>('officer');

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const cfg = await getConfig();
            setConfig(cfg);
            setIsLoading(false);
        };
        load();
    }, []);

    const handleAddUser = async () => {
        if (!config || !newUsername || !newPassword) return;

        // Check duplicate
        if (config.users?.some(u => u.username.toLowerCase() === newUsername.toLowerCase())) {
            alert('Username already exists!');
            return;
        }

        const newUser: User = { username: newUsername, password: newPassword, role: newRole };
        const updatedUsers = [...(config.users || []), newUser];

        const newConfig = { ...config, users: updatedUsers };

        try {
            await saveConfig(newConfig);
            setConfig(newConfig);
            setNewUsername('');
            setNewPassword('');
            setSaveStatus('User added successfully!');
            setTimeout(() => setSaveStatus(''), 3000);
        } catch (e: any) {
            setSaveStatus(`Error: ${e.message}`);
        }
    };

    const handleDeleteUser = async (username: string) => {
        if (!config) return;
        if (!window.confirm(`Delete user "${username}"?`)) return;

        // Prevent deleting the last admin
        const admins = config.users?.filter(u => u.role === 'admin') || [];
        const targetIsAdmin = config.users?.find(u => u.username === username)?.role === 'admin';

        if (targetIsAdmin && admins.length <= 1) {
            alert("Cannot delete the only administrator.");
            return;
        }

        const updatedUsers = config.users?.filter(u => u.username !== username) || [];
        const newConfig = { ...config, users: updatedUsers };

        try {
            await saveConfig(newConfig);
            setConfig(newConfig);
        } catch (e: any) {
            alert(e.message);
        }
    };

    if (isLoading) return <div className="loader"></div>;

    return (
        <div className="tab-content">
            <div className="card">
                <h2>Admin: User Management</h2>
                <p className="helper-text">Manage who can access this application.</p>

                <div className="config-group">
                    <h3>Create New User</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                        <div className="form-group">
                            <label>Username</label>
                            <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password" />
                        </div>
                        <div className="form-group">
                            <label>Role</label>
                            <select value={newRole} onChange={e => setNewRole(e.target.value as any)}>
                                <option value="officer">Officer</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <button className="button primary-action" onClick={handleAddUser} style={{ marginBottom: '15px' }}>Add User</button>
                    </div>
                    {saveStatus && <p className="success-message">{saveStatus}</p>}
                </div>

                <div className="config-group" style={{ marginTop: '2rem' }}>
                    <h3>Current Users</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                                <th style={{ padding: '10px' }}>Username</th>
                                <th style={{ padding: '10px' }}>Role</th>
                                <th style={{ padding: '10px' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {config?.users?.map(u => (
                                <tr key={u.username} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{u.username}</td>
                                    <td style={{ padding: '10px' }}>
                                        <span className={`status-badge ${u.role === 'admin' ? 'status-closed' : 'status-active'}`}>
                                            {u.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        <button
                                            className="button secondary-action"
                                            style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#ef4444', color: 'white', border: 'none' }}
                                            onClick={() => handleDeleteUser(u.username)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {(!config?.users || config.users.length === 0) && (
                                <tr>
                                    <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No users found (System uses default admin).</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminView;