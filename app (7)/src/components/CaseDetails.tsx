import React, { useState, useEffect } from 'react';
import { Case, DocTemplate, AppConfig, GlobalSettings } from '../types';
import { generateNoticeContent } from '../notice-templates';
import { getConfig } from '../config';

interface CaseDetailsProps {
    caseData: Case;
    onBack: () => void;
    onUpdate: (updatedCase: Case) => void;
    onDelete: (caseId: string) => void;
}

const CaseDetails: React.FC<CaseDetailsProps> = ({ caseData, onBack, onUpdate, onDelete }) => {
    const [templates, setTemplates] = useState<DocTemplate[]>([]);
    const [globalSettings, setGlobalSettings] = useState<GlobalSettings | undefined>(undefined);
    const [configLoaded, setConfigLoaded] = useState(false);
    const [isFetchingInfo, setIsFetchingInfo] = useState(false);

    useEffect(() => {
        const loadConfig = async () => {
            const cfg = await getConfig();
            setTemplates(cfg?.templates || []);
            setGlobalSettings(cfg?.globalSettings);
            setConfigLoaded(true);
        };
        loadConfig();
    }, []);

    const handleGenerateDoc = (template: DocTemplate) => {
        const htmlContent = generateNoticeContent(template, caseData, globalSettings);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();

            // Log this action (Optional: could add to case history)
            // For now, we just print
        } else {
            alert("Pop-up blocked. Please allow pop-ups for this site.");
        }
    };

    const handlePrintMenu = (e: React.MouseEvent) => {
        // Toggle dropdown logic could go here, for now we will just show buttons in the UI
    };

    const handleAddNote = () => {
        const text = prompt("Enter note:");
        if (text) {
            const newNote = { date: new Date().toLocaleDateString(), text };
            onUpdate({
                ...caseData,
                evidence: {
                    ...caseData.evidence,
                    notes: [newNote, ...caseData.evidence.notes]
                }
            });
        }
    };

    const handleUpdateTaxData = async () => {
        setIsFetchingInfo(true);
        try {
            const response = await fetch(`/api/scrapeProperty?address=${encodeURIComponent(caseData.address.street)}`);
            const data = await response.json();

            if (data.success && data.data) {
                const newName = data.data.ownerName;
                const newAddr = data.data.mailingAddress;

                if (newName !== caseData.ownerInfo.name || newAddr !== caseData.ownerInfo.mailingAddress) {
                    if (confirm(`Updates found in Tax Rolls:\n\nNew Name: ${newName}\nNew Mailing: ${newAddr}\n\nCurrent: ${caseData.ownerInfo.name}\n\nUpdate this case?`)) {
                        onUpdate({
                            ...caseData,
                            ownerInfo: {
                                ...caseData.ownerInfo,
                                name: newName,
                                mailingAddress: newAddr
                            }
                        });
                        alert('Case updated with Tax Roll data.');
                    }
                } else {
                    alert('Tax records match current data. No changes needed.');
                }
            } else {
                alert('No record found in tax rolls for this address.');
            }
        } catch (e) {
            console.error(e);
            alert('Error connecting to tax database.');
        } finally {
            setIsFetchingInfo(false);
        }
    };

    if (!caseData) return <div>Case not found</div>;

    return (
        <div className="tab-content" style={{ padding: '0 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <button className="button secondary-action" onClick={onBack}>← Back</button>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="button danger-action" onClick={() => onDelete(caseData.id)}>Delete Case</button>
                </div>
            </div>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <h2 style={{ margin: 0 }}>{caseData.address.street}</h2>
                        <span className={`status-badge status-${caseData.status.toLowerCase().replace('_', '-')}`}>{caseData.status.replace('_', ' ')}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Case #: {caseData.caseId}</div>
                    </div>
                </div>

                {/* VISUAL LAYOUT: Two Columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>

                    {/* LEFT COLUMN: Info */}
                    <div>
                        <div className="detail-section">
                            <div className="detail-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3>Owner Information</h3>
                                    <button className="button" style={{ fontSize: '0.7rem', padding: '2px 8px', height: 'auto' }} onClick={handleUpdateTaxData} disabled={isFetchingInfo}>
                                        {isFetchingInfo ? 'Checking...' : 'Check Tax Roll'}
                                    </button>
                                </div>
                                <p><strong>Name:</strong> {caseData.ownerInfo.name || 'Unknown'}</p>
                                <p><strong>Address:</strong> {caseData.ownerInfo.mailingAddress || 'N/A'}</p>
                                <p><strong>Phone:</strong> {caseData.ownerInfo.phone || 'N/A'}</p>
                            </div>

                            <div className="detail-section" style={{ marginTop: '1.5rem' }}>
                                <h3>Violation Details</h3>
                                <div className="violation-card" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <p style={{ color: '#ef4444', fontWeight: 'bold' }}>{caseData.violation.type}</p>
                                    <p style={{ fontSize: '0.9rem' }}>{caseData.violation.description}</p>
                                    <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />
                                    <p><strong>Ordinance:</strong> {caseData.violation.ordinance}</p>
                                    <p><strong>Action Required:</strong> {caseData.violation.correctiveAction}</p>
                                    <p><strong>Deadline:</strong> {caseData.complianceDeadline}</p>
                                </div>
                            </div>

                            <div className="detail-section" style={{ marginTop: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3>Case Notes</h3>
                                    <button className="button secondary-action" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={handleAddNote}>+ Add Note</button>
                                </div>
                                <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                                    {caseData.evidence.notes.map((note, idx) => (
                                        <div key={idx} style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{note.date}</div>
                                            <div>{note.text}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Actions & Docs */}
                        <div>
                            <div className="card" style={{ background: '#e0f2fe', border: 'none' }}>
                                <h3 style={{ color: '#0369a1', marginTop: 0 }}>📄 Generate Documents</h3>
                                {configLoaded ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {templates.length > 0 ? templates.map(t => (
                                            <button
                                                key={t.id}
                                                className="button"
                                                style={{ background: 'white', color: '#0284c7', border: '1px solid #bfdbfe', justifyContent: 'flex-start' }}
                                                onClick={() => handleGenerateDoc(t)}
                                            >
                                                📄 {t.name}
                                            </button>
                                        )) : (
                                            <p style={{ fontSize: '0.9rem', color: '#666' }}>No templates found. Go to 'Templates' tab to create one.</p>
                                        )}
                                    </div>
                                ) : (
                                    <p>Loading templates...</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            );
};

            export default CaseDetails;