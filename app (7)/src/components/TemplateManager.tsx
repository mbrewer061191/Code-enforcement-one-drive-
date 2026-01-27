import React, { useState, useEffect, useRef } from 'react';
import { AppConfig, DocTemplate, GlobalSettings } from '../types';
import { getConfig, saveConfig } from '../config';
import SimpleEditor, { SimpleEditorHandle } from './SimpleEditor';
import { VARIABLES_LIST } from '../variables';
import mammoth from 'mammoth';

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

    const [editingTemplate, setEditingTemplate] = useState<DocTemplate | null>(null);
    const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL);

    // Ref for the Editor to call insertHtml
    const editorRef = useRef<SimpleEditorHandle>(null);

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
        setEditingTemplate(null);
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
        // Use the ref to insert at cursor
        if (editorRef.current) {
            editorRef.current.insertHtml(ph);
        }
    };

    const handleImportWord = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !editingTemplate) return;
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = async (event) => {
            if (event.target?.result) {
                try {
                    const arrayBuffer = event.target.result as ArrayBuffer;
                    const result = await mammoth.convertToHtml({ arrayBuffer });

                    const newContent = editingTemplate.content
                        ? editingTemplate.content + "<br/><br/>" + result.value
                        : result.value;

                    setEditingTemplate({
                        ...editingTemplate,
                        content: newContent
                    });

                    alert("Import successful!");
                } catch (err: any) {
                    console.error(err);
                    alert("Failed to import Word doc.");
                }
            }
        };
        reader.readAsArrayBuffer(file);
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
                        <div className="grid-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group"><label>City Name</label><input value={globalSettings.cityName} onChange={e => setGlobalSettings({ ...globalSettings, cityName: e.target.value })} /></div>
                            <div className="form-group"><label>Department Name</label><input value={globalSettings.departmentName} onChange={e => setGlobalSettings({ ...globalSettings, departmentName: e.target.value })} /></div>
                            <div className="form-group"><label>Contact Phone</label><input value={globalSettings.contactPhone} onChange={e => setGlobalSettings({ ...globalSettings, contactPhone: e.target.value })} /></div>
                            <div className="form-group"><label>Contact Email</label><input value={globalSettings.contactEmail} onChange={e => setGlobalSettings({ ...globalSettings, contactEmail: e.target.value })} /></div>
                            <div className="form-group"><label>Officer Name</label><input value={globalSettings.officerName} onChange={e => setGlobalSettings({ ...globalSettings, officerName: e.target.value })} /></div>
                            <div className="form-group"><label>Website</label><input value={globalSettings.website} onChange={e => setGlobalSettings({ ...globalSettings, website: e.target.value })} /></div>
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
                        <div className="form-group"><label>Template Name</label><input value={editingTemplate.name} onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })} /></div>
                        <div className="form-group"><label>Type</label><select value={editingTemplate.type} onChange={e => setEditingTemplate({ ...editingTemplate, type: e.target.value as any })}><option value="notice">Standard Letter</option><option value="envelope">Envelope</option></select></div>

                        {/* IMPORT WORD - Added BLUE BOX */}
                        <div className="form-group" style={{ background: '#e0f2fe', padding: '10px', borderRadius: '4px', border: '1px solid #bae6fd' }}>
                            <label style={{ color: '#0369a1', fontWeight: 'bold' }}>📤 Import from Word (.docx)</label>
                            <div style={{ marginTop: '5px' }}>
                                <input type="file" accept=".docx" onChange={handleImportWord} />
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#0284c7', margin: '5px 0' }}>It will convert your Word doc to text and paste it below.</p>
                        </div>

                        {/* VARIABLE PICKER */}
                        <div className="variable-picker" style={{ border: '1px solid #e2e8f0', padding: '10px', marginBottom: '1rem', borderRadius: '4px', background: '#f8fafc' }}>
                            <strong>Insert Smart Tag (Click to insert at cursor):</strong>
                            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px', marginTop: '5px' }}>
                                {VARIABLES_LIST.map((cat, idx) => (
                                    <div key={idx} style={{ minWidth: '150px' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '3px' }}>{cat.category}</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {cat.items.map(v => (
                                                <button
                                                    key={v.value}
                                                    className="button secondary-action"
                                                    style={{ fontSize: '0.75rem', padding: '2px 5px', textAlign: 'left' }}
                                                    onClick={() => insertPlaceholder(v.value)} // Updated to use insertPlaceholder
                                                    onMouseDown={(e) => e.preventDefault()} // Critical: Prevents focus loss
                                                >
                                                    + {v.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Content (Visual Editor)</label>
                            {/* Updated to use Ref */}
                            <SimpleEditor
                                ref={editorRef}
                                value={editingTemplate.content}
                                onChange={html => setEditingTemplate({ ...editingTemplate, content: html })}
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