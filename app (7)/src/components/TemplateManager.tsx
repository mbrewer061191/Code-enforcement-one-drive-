import React, { useState, useEffect } from 'react';
import { AppConfig } from '../types';
import { getConfig, saveConfig } from '../config';

const TemplateManager: React.FC = () => {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [initialUrl, setInitialUrl] = useState('');
    const [failureUrl, setFailureUrl] = useState('');
    const [envelopeTemplateUrl, setEnvelopeTemplateUrl] = useState('');
    const [certificateOfMailUrl, setCertificateOfMailUrl] = useState('');
    const [statementOfCostUrl, setStatementOfCostUrl] = useState('');
    const [noticeOfLienUrl, setNoticeOfLienUrl] = useState('');
    const [certificateOfLienUrl, setCertificateOfLienUrl] = useState('');
    const [saveStatus, setSaveStatus] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadTemplateConfig = async () => {
            setIsLoading(true);
            const cfg = await getConfig();
            setConfig(cfg);
            setInitialUrl(cfg?.google?.templateUrls?.INITIAL || '');
            setFailureUrl(cfg?.google?.templateUrls?.FAILURE || '');
            setEnvelopeTemplateUrl(cfg?.google?.envelopeTemplateUrl || '');
            setCertificateOfMailUrl(cfg?.google?.certificateOfMailTemplateUrl || '');
            setStatementOfCostUrl(cfg?.google?.statementOfCostTemplateUrl || '');
            setNoticeOfLienUrl(cfg?.google?.noticeOfLienTemplateUrl || '');
            setCertificateOfLienUrl(cfg?.google?.certificateOfLienTemplateUrl || '');
            setIsLoading(false);
        };
        loadTemplateConfig();
    }, []);

    const handleSave = async () => {
        if (!config) return;
        const newConfig: AppConfig = {
            ...config,
            google: {
                ...config.google!,
                templateUrls: {
                    INITIAL: initialUrl.trim(),
                    FAILURE: failureUrl.trim(),
                },
                envelopeTemplateUrl: envelopeTemplateUrl.trim(),
                certificateOfMailTemplateUrl: certificateOfMailUrl.trim(),
                statementOfCostTemplateUrl: statementOfCostUrl.trim(),
                noticeOfLienTemplateUrl: noticeOfLienUrl.trim(),
                certificateOfLienTemplateUrl: certificateOfLienUrl.trim(),
            }
        };
        
        try {
            await saveConfig(newConfig);
            setConfig(newConfig);
            setSaveStatus('Templates saved successfully!');
            setTimeout(() => setSaveStatus(''), 3000);
        } catch(e: any) {
            setSaveStatus(`Error saving templates: ${e.message}`);
        }
    };

    const NOTICE_PLACEHOLDERS = [
        "DATE_TODAY", "OWNER_NAME", "OWNER_MAILING", "CASE_ID", "ADDRESS",
        "CITY", "STATE", "ZIP", "NOTES", "DUE_DATE", "STATUS", "DATE_CREATED",
        "VIOLATION", "SECTION", "VIOLATION_DESCRIPTION",
        "VIOLATION_CORRECTIVE_ACTION", "VIOLATION_NOTICE_CLAUSE", 
        "PHOTO_EVIDENCE_LINK", "PHOTO_EVIDENCE_BLOCK"
    ];

    const ENVELOPE_PLACEHOLDERS = [ "OWNER_NAME", "MAILING_ADDRESS" ];
    
    const ABATEMENT_COST_PLACEHOLDERS = [
        "LEGAL_DESCRIPTION", "ABATEMENT_WORK_DATE", "ABATEMENT_HOURS", "ABATEMENT_EMPLOYEES", "ABATEMENT_RATE",
        "ABATEMENT_LABOR_COST", "ABATEMENT_ADMIN_FEE", "ABATEMENT_TOTAL_COST"
    ];
    
    const LIEN_PLACEHOLDERS = [
        "STATEMENT_OF_COST_DATE", "LEGAL_DESCRIPTION", "TAX_ID", "PARCEL_NUMBER"
    ];


    if (isLoading) {
        return <div className="card"><div className="loader" style={{margin: 'auto', borderTopColor: 'var(--primary-color)', borderLeftColor: 'var(--primary-color)'}}></div></div>;
    }

    return (
        <div className="tab-content">
            <div className="card">
                <h2>Manage Templates</h2>
                
                <h4>Document Templates (Google Docs)</h4>
                <p className="helper-text">Create your templates in Google Docs. Use the placeholders below, then paste the full document URL here.</p>
                
                <div className="config-group">
                    <h5>Violation Notices</h5>
                    <div className="form-group" style={{marginTop: '1rem'}}>
                        <label>Initial Notice Template URL</label>
                        <input type="url" value={initialUrl} onChange={e => setInitialUrl(e.target.value)} placeholder="https://docs.google.com/document/d/.../edit" />
                    </div>
                    <div className="form-group">
                        <label>Failure to Comply Template URL</label>
                        <input type="url" value={failureUrl} onChange={e => setFailureUrl(e.target.value)} placeholder="https://docs.google.com/document/d/.../edit" />
                    </div>
                </div>

                <div className="config-group">
                    <h5>Mailing</h5>
                    <div className="form-group" style={{marginTop: '1rem'}}>
                        <label>Envelope Template URL</label>
                        <input type="url" value={envelopeTemplateUrl} onChange={e => setEnvelopeTemplateUrl(e.target.value)} placeholder="https://docs.google.com/document/d/.../edit" />
                    </div>
                     <div className="form-group">
                        <label>Certificate of Mail Template URL</label>
                        <input type="url" value={certificateOfMailUrl} onChange={e => setCertificateOfMailUrl(e.target.value)} placeholder="https://docs.google.com/document/d/.../edit" />
                    </div>
                </div>

                <div className="config-group">
                    <h5>Abatement & Liens</h5>
                    <div className="form-group" style={{marginTop: '1rem'}}>
                        <label>Statement of Cost (Bill) Template URL</label>
                        <input type="url" value={statementOfCostUrl} onChange={e => setStatementOfCostUrl(e.target.value)} placeholder="https://docs.google.com/document/d/.../edit" />
                    </div>
                    <div className="form-group">
                        <label>Notice of Lien Template URL</label>
                        <input type="url" value={noticeOfLienUrl} onChange={e => setNoticeOfLienUrl(e.target.value)} placeholder="https://docs.google.com/document/d/.../edit" />
                    </div>
                    <div className="form-group">
                        <label>Certificate of Lien Template URL</label>
                        <input type="url" value={certificateOfLienUrl} onChange={e => setCertificateOfLienUrl(e.target.value)} placeholder="https://docs.google.com/document/d/.../edit" />
                    </div>
                </div>
                
                <button className="button primary-action" onClick={handleSave} style={{marginTop: '1.5rem'}}>Save All Templates</button>
                {saveStatus && <div className={saveStatus.startsWith('Error') ? "error-message" : "success-message"} style={{marginTop: '1rem'}}>{saveStatus}</div>}
            </div>

            <div className="card">
                <h3>Available Placeholders</h3>
                <p className="helper-text">In addition to the case-specific placeholders below, all notice placeholders (like <code>{"{{OWNER_NAME}}"}</code> and <code>{"{{ADDRESS}}"}</code>) are available in all templates.</p>
                
                <h4 style={{marginTop: '1rem'}}>For Notices</h4>
                <p className="helper-text">Use these in your Initial Notice and Failure to Comply templates.</p>
                <ul className="placeholder-list">
                    {NOTICE_PLACEHOLDERS.map(p => <li key={p}><code>{`{{${p}}}`}</code></li>)}
                </ul>
                <div className="info-box" style={{marginTop: '1rem'}}>
                    <p><strong>Photo Tip:</strong> Use <code>{"{{PHOTO_EVIDENCE_BLOCK}}"}</code> to embed photos directly into the document.</p>
                </div>
                
                <h4 style={{marginTop: '2rem'}}>For Envelopes</h4>
                <p className="helper-text">The app will correctly handle multi-line addresses entered for the owner.</p>
                <ul className="placeholder-list">
                    {ENVELOPE_PLACEHOLDERS.map(p => <li key={p}><code>{`{{${p}}}`}</code></li>)}
                </ul>

                <h4 style={{marginTop: '2rem'}}>For Certificate of Mail</h4>
                <p className="helper-text">This template can have up to 6 sets of placeholders for case details.</p>
                <ul className="placeholder-list">
                    <li><code>{`{{DATE_TODAY}}`}</code></li>
                    {[...Array(6)].map((_, i) => (
                        <React.Fragment key={i}>
                            <li><code>{`{{OWNER_NAME_${i + 1}}}`}</code></li>
                            <li><code>{`{{MAILING_ADDRESS_${i + 1}}}`}</code></li>
                            <li><code>{`{{CASE_ID_${i + 1}}}`}</code></li>
                        </React.Fragment>
                    ))}
                </ul>

                <h4 style={{marginTop: '2rem'}}>For Statement of Cost</h4>
                <p className="helper-text">These are calculated from the abatement form.</p>
                <ul className="placeholder-list">
                    {ABATEMENT_COST_PLACEHOLDERS.map(p => <li key={p}><code>{`{{${p}}}`}</code></li>)}
                </ul>
                
                <h4 style={{marginTop: '2rem'}}>For Liens</h4>
                 <p className="helper-text">These are used in both the Notice of Lien and Certificate of Lien templates.</p>
                <ul className="placeholder-list">
                    {LIEN_PLACEHOLDERS.map(p => <li key={p}><code>{`{{${p}}}`}</code></li>)}
                </ul>


                <div className="warning-box" style={{marginTop: '1.5rem'}}>
                    <strong>Important:</strong> Make sure your Google Doc templates are either public or shared with the same Google account you use to sign into this app.
                </div>
            </div>
        </div>
    );
};

export default TemplateManager;