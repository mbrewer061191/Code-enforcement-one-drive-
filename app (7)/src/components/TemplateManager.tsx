import React, { useState, useEffect } from 'react';
import { AppConfig, DocTemplate, GlobalSettings } from '../types';
import { getConfig, saveConfig } from '../config';

const PLACEHOLDERS = [
    { label: 'Current Date', value: '{{Date}}' },
    { label: 'Case Number', value: '{{CaseNumber}}' },
    { label: 'Owner Name', value: '{{OwnerName}}' },
    { label: 'Mailing Address', value: '{{MailingAddress}}' },
    { label: 'Property Address', value: '{{PropertyAddress}}' },
    { label: 'Violation List', value: '{{Violations}}' },
    { label: 'Compliance Deadline', value: '{{Deadline}}' },
    { label: 'City Name', value: '{{CityName}}' },
    { label: 'Department', value: '{{DepartmentName}}' },
    { label: 'Officer Name', value: '{{OfficerName}}' },
];

const DEFAULT_GLOBAL: GlobalSettings = {
    cityName: 'City of Commerce',
    departmentName: 'Code Enforcement Division',
    contactPhone: '(555) 123-4567',
    contactEmail: 'code@commerceok.gov',
    officerName: 'Code Enforcement Officer',
    website: 'www.commerceok.gov'
};

const TemplateManager: React.FC = () => {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'global' | 'templates'>('templates');
    const [saveStatus, setSaveStatus] = useState('');

    // Editor State
    const [editingTemplate, setEditingTemplate] = useState<DocTemplate | null>(null);
    const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const cfg = await getConfig();
            setConfig(cfg);
            if (cfg?.globalSettings) {
                setGlobalSettings(cfg.globalSettings);
            }
            setIsLoading(false);
        };
        load();
    }, []);

    const handleSaveGlobal = async () => {
        if (!config) return;
        const newConfig = { ...config, globalSettings };
        await saveConfig(newConfig);
        setConfig(newConfig);
        showStatus('Global settings saved!');
    };

    const handleSaveTemplate = async () => {
        if (!config || !editingTemplate) return;

        const currentTemplates = config.templates || [];
        const existingIndex = currentTemplates.findIndex(t => t.id === editingTemplate.id);

        let newTemplates = [...currentTemplates];
        if (existingIndex >= 0) {
            newTemplates[existingIndex] = editingTemplate;
        } else {
            newTemplates.push(editingTemplate);
        }

        const newConfig = { ...config, templates: newTemplates };
        await saveConfig(newConfig);
        setConfig(newConfig);
        setEditingTemplate(null); // Close editor
        showStatus('Template saved!');
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!config || !window.confirm('Delete this template?')) return;
        const newTemplates = config.templates?.filter(t => t.id !== id) || [];
        const newConfig = { ...config, templates: newTemplates };
        await saveConfig(newConfig);
        setConfig(newConfig);
    };

    const showStatus = (msg: string) => {
        setSaveStatus(msg);
        setTimeout(() => setSaveStatus(''), 3000);
    };

    const insertPlaceholder = (ph: string) => {
        if (!editingTemplate) return;
        const textarea = document.getElementById('template-editor') as HTMLTextAreaElement;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = editingTemplate.content;
            const newText = text.substring(0, start) + ph + text.substring(end);
            setEditingTemplate({ ...editingTemplate, content: newText });
            // Defer focus restore
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + ph.length, start + ph.length);
            }, 0);
        }
    };

    if (isLoading) return <div className="loader"></div>;

    return (
        <div className="tab-content">
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2>Word Document Templates</h2>
                    <div className="button-group">
                        <button className={`button ${activeTab === 'templates' ? 'primary-action' : 'secondary-action'}`} onClick={() => setActiveTab('templates')}>My Templates</button>
                        <button className={`button ${activeTab === 'global' ? 'primary-action' : 'secondary-action'}`} onClick={() => setActiveTab('global')}>Global Settings</button>
                    </div>
                </div>

                {saveStatus && <div className="status-message ok" style={{ marginBottom: '1rem' }}>{saveStatus}</div>}

                {/* GLOBAL SETTINGS TAB */}
                {activeTab === 'global' && (
                    <div className="config-group">
                        <h3>Letterhead & Contact Info</h3>
                        <p className="helper-text">These details are used across all templates via placeholders.</p>

                        <div className="grid-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>City Name</label>
                                <input value={globalSettings.cityName} onChange={e => setGlobalSettings({ ...globalSettings, cityName: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Department Name</label>
                                <input value={globalSettings.departmentName} onChange={e => setGlobalSettings({ ...globalSettings, departmentName: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Contact Phone</label>
                                <input value={globalSettings.contactPhone} onChange={e => setGlobalSettings({ ...globalSettings, contactPhone: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Contact Email</label>
                                <input value={globalSettings.contactEmail} onChange={e => setGlobalSettings({ ...globalSettings, contactEmail: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Officer Name / Signature</label>
                                <input value={globalSettings.officerName} onChange={e => setGlobalSettings({ ...globalSettings, officerName: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Website</label>
                                <input value={globalSettings.website} onChange={e => setGlobalSettings({ ...globalSettings, website: e.target.value })} />
                            </div>
                        </div>
                        <button className="button primary-action" onClick={handleSaveGlobal} style={{ marginTop: '1rem' }}>Save Settings</button>
                    </div>
                )}

                {/* TEMPLATES LIST */}
                {activeTab === 'templates' && !editingTemplate && (
                    <div>
                        <button className="button" onClick={() => setEditingTemplate({ id: crypto.randomUUID(), name: 'New Template', type: 'notice', content: '' })}>
                            ➕ Create New Template
                        </button>

                        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                            {config?.templates?.map(t => (
                                <div key={t.id} style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px', background: '#f8fafc' }}>
                                    <strong>{t.name}</strong>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>{t.type.toUpperCase()}</div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="button secondary-action" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => setEditingTemplate(t)}>Edit</button>
                                        <button className="button danger-action" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => handleDeleteTemplate(t.id)}>Delete</button>
                                    </div>
                                </div>
                            ))}
                            {(!config?.templates || config.templates.length === 0) && <p style={{ color: '#999', fontStyle: 'italic' }}>No templates found. Create one!</p>}
                        </div>
                    </div>
                )}

                {/* EDITOR */}
                {activeTab === 'templates' && editingTemplate && (
                    <div className="config-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3>Editing: {editingTemplate.name}</h3>
                            <button className="button secondary-action" onClick={() => setEditingTemplate(null)}>Cancel</button>
                        </div>

                        <div className="form-group">
                            <label>Template Name</label>
                            <input value={editingTemplate.name} onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })} />
                        </div>

                        <div className="form-group">
                            <label>Document Type</label>
                            <select value={editingTemplate.type} onChange={e => setEditingTemplate({ ...editingTemplate, type: e.target.value as any })}>
                                <option value="notice">Standard Letter (8.5x11)</option>
                                <option value="envelope">Envelope (#10)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Insert "Magic Variable"</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '0.5rem' }}>
                                {PLACEHOLDERS.map(p => (
                                    <button
                                        key={p.value}
                                        className="button secondary-action"
                                        style={{ fontSize: '0.8rem', padding: '2px 8px' }}
                                        onClick={() => insertPlaceholder(p.value)}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Document Content</label>
                            <textarea
                                id="template-editor"
                                value={editingTemplate.content}
                                onChange={e => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                                style={{ minHeight: '400px', fontFamily: 'monospace', fontSize: '14px' }}
                            />
                        </div>

                        <button className="button primary-action" onClick={handleSaveTemplate}>Save Template</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TemplateManager;