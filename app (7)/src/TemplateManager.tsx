import React, { useState, useEffect } from 'react';
import { AppConfig } from '../types';
import { getConfig, saveConfig } from '../config';

const TemplateManager: React.FC = () => {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState('');

    // Form State
    const [cityName, setCityName] = useState('');
    const [departmentName, setDepartmentName] = useState('');

    // Initial Notice
    const [initialHeader, setInitialHeader] = useState('');
    const [initialBody, setInitialBody] = useState('');
    const [initialWarning, setInitialWarning] = useState('');

    // Final Notice
    const [finalHeader, setFinalHeader] = useState('');
    const [finalBody, setFinalBody] = useState('');

    useEffect(() => {
        const loadTemplateConfig = async () => {
            setIsLoading(true);
            const cfg = await getConfig();
            setConfig(cfg);

            // Load Values or Defaults
            setCityName(cfg?.templates?.cityName || 'City of Commerce');
            setDepartmentName(cfg?.templates?.departmentName || 'Code Enforcement Division');

            setInitialHeader(cfg?.templates?.initialNotice?.header || 'NOTICE OF VIOLATION');
            setInitialBody(cfg?.templates?.initialNotice?.body || 'This notice is to inform you that the property listed below is in violation of city ordinances.');
            setInitialWarning(cfg?.templates?.initialNotice?.warning || 'Failure to correct this violation by the deadline may result in the City entering the property to abate the nuisance at the owner\'s expense.');

            setFinalHeader(cfg?.templates?.finalNotice?.header || 'FINAL NOTICE TO ABATE');
            setFinalBody(cfg?.templates?.finalNotice?.body || 'This is a FINAL NOTICE. Previous warnings regarding this property have been ignored. Immediate action is required.');

            setIsLoading(false);
        };
        loadTemplateConfig();
    }, []);

    const handleSave = async () => {
        if (!config) return;

        const newConfig: AppConfig = {
            ...config,
            templates: {
                cityName,
                departmentName,
                initialNotice: { header: initialHeader, body: initialBody, warning: initialWarning },
                finalNotice: { header: finalHeader, body: finalBody }
            }
        };

        try {
            await saveConfig(newConfig);
            setConfig(newConfig);
            setSaveStatus('Templates saved successfully!');
            setTimeout(() => setSaveStatus(''), 3000);
        } catch (e: any) {
            setSaveStatus(`Error saving templates: ${e.message}`);
        }
    };

    if (isLoading) return <div className="loader"></div>;

    return (
        <div className="tab-content">
            <div className="card">
                <h2>Manage Templates (Word Generator)</h2>
                <p className="helper-text">Customize the text that appears on your generated Word documents.</p>

                <div className="config-group">
                    <h3>General Settings</h3>
                    <div className="form-group">
                        <label>City Name</label>
                        <input type="text" value={cityName} onChange={e => setCityName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Department Name</label>
                        <input type="text" value={departmentName} onChange={e => setDepartmentName(e.target.value)} />
                    </div>
                </div>

                <div className="config-group" style={{ marginTop: '2rem' }}>
                    <h3>Initial Notice Template</h3>
                    <div className="form-group">
                        <label>Header / Title</label>
                        <input type="text" value={initialHeader} onChange={e => setInitialHeader(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Intro Body Text</label>
                        <textarea value={initialBody} onChange={e => setInitialBody(e.target.value)} style={{ minHeight: '100px' }} />
                    </div>
                    <div className="form-group">
                        <label>Warning Clause (Bottom)</label>
                        <textarea value={initialWarning} onChange={e => setInitialWarning(e.target.value)} />
                    </div>
                </div>

                <div className="config-group" style={{ marginTop: '2rem' }}>
                    <h3>Final / Failure Notice Template</h3>
                    <div className="form-group">
                        <label>Header / Title</label>
                        <input type="text" value={finalHeader} onChange={e => setFinalHeader(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Intro Body Text</label>
                        <textarea value={finalBody} onChange={e => setFinalBody(e.target.value)} style={{ minHeight: '100px' }} />
                    </div>
                </div>

                <button className="button primary-action" onClick={handleSave} style={{ marginTop: '2rem' }}>Save Templates</button>
                {saveStatus && <p className="success-message" style={{ marginTop: '1rem' }}>{saveStatus}</p>}
            </div>
        </div>
    );
};

export default TemplateManager;