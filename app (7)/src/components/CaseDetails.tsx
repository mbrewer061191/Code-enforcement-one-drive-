import React, { useState, useEffect, useRef } from 'react';
import { Case, EvidencePhoto, Notice, Note, AbatementInfo } from '../types';
import { getCaseTimeStatus, getNextBusinessDay } from '../utils';
import React, { useState, useEffect, useRef } from 'react';
import { Case, EvidencePhoto, Notice, Note, AbatementInfo } from '../types';
import { getCaseTimeStatus, getNextBusinessDay } from '../utils';
import { generateNoticeContent, NOTICE_TEMPLATES } from '../notice-templates';
import CameraView from './CameraView';

interface CaseDetailsProps {
    caseData: Case;
    onBack: () => void;
    onUpdate: (updatedCase: Case) => Promise<void>;
    onDelete: (caseId: string) => Promise<void>;
}

const CaseDetails: React.FC<CaseDetailsProps> = ({ caseData, onBack, onUpdate, onDelete }) => {
    const [activeTab, setActiveTab] = useState<'info' | 'evidence' | 'notices' | 'notes' | 'abatement'>('info');
    const [isEditing, setIsEditing] = useState(false);
    const [editedCase, setEditedCase] = useState<Case>(caseData);
    const [isSaving, setIsSaving] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [showNoticePreview, setShowNoticePreview] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(NOTICE_TEMPLATES[0].id);
    const [generatedNoticeHtml, setGeneratedNoticeHtml] = useState('');
    const [newNoteText, setNewNoteText] = useState('');

    // Abatement State
    const [abatementForm, setAbatementForm] = useState<AbatementInfo>(caseData.abatement || { workDate: '', cost: 0, contractor: '', invoiceNumber: '', notes: '' });

    useEffect(() => {
        setEditedCase(caseData);
        setAbatementForm(caseData.abatement || { workDate: '', cost: 0, contractor: '', invoiceNumber: '', notes: '' });
    }, [caseData]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // If status changed to CLOSED, set dateClosed
            if (editedCase.status === 'CLOSED' && caseData.status !== 'CLOSED') {
                editedCase.dateClosed = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            }
            // If status changed from CLOSED to ACTIVE, clear dateClosed
            if (editedCase.status !== 'CLOSED' && caseData.status === 'CLOSED') {
                editedCase.dateClosed = undefined;
            }

            await onUpdate(editedCase);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save:", error);
            alert("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePhotoTaken = async (photo: EvidencePhoto) => {
        const updatedPhotos = [...editedCase.evidence.photos, photo];
        const updatedCase = { ...editedCase, evidence: { ...editedCase.evidence, photos: updatedPhotos } };
        setEditedCase(updatedCase);
        setShowCamera(false);

        // Auto-save when photo is added
        await onUpdate(updatedCase);
    };

    const handleDeletePhoto = async (photoId: string) => {
        if (!window.confirm("Delete this photo?")) return;
        const updatedPhotos = editedCase.evidence.photos.filter(p => p.id !== photoId);
        const updatedCase = { ...editedCase, evidence: { ...editedCase.evidence, photos: updatedPhotos } };
        setEditedCase(updatedCase);
        await onUpdate(updatedCase);
    };

    const handleGenerateNotice = () => {
        const html = generateNoticeContent(selectedTemplateId, editedCase);
        setGeneratedNoticeHtml(html);
        setShowNoticePreview(true);
    };

    const handlePrintNotice = async () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Print Notice</title>
                        <style>
                            body { font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                            @media print { body { padding: 0; } }
                        </style>
                    </head>
                    <body>${generatedNoticeHtml}</body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();

            // Wait for images to load before printing (if any)
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);

            // Record the notice in history
            const newNotice: Notice = {
                id: self.crypto.randomUUID(),
                dateGenerated: new Date().toLocaleDateString(),
                type: NOTICE_TEMPLATES.find(t => t.id === selectedTemplateId)?.name || 'Notice',
                content: 'Generated via template'
            };
            const updatedCase = { ...editedCase, notices: [newNotice, ...editedCase.notices] };
            setEditedCase(updatedCase);
            await onUpdate(updatedCase);
            setShowNoticePreview(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNoteText.trim()) return;
        const newNote: Note = {
            date: new Date().toLocaleDateString(),
            text: newNoteText
        };
        const updatedCase = {
            ...editedCase,
            evidence: {
                ...editedCase.evidence,
                notes: [newNote, ...editedCase.evidence.notes]
            }
        };
        setEditedCase(updatedCase);
        setNewNoteText('');
        await onUpdate(updatedCase);
    };

    const handleSaveAbatement = async () => {
        const updatedCase = { ...editedCase, abatement: abatementForm };
        setEditedCase(updatedCase);
        await onUpdate(updatedCase);
        alert("Abatement info saved.");
    };

    const statusClass = getCaseTimeStatus(caseData);

    if (showCamera) {
        return <CameraView onCapture={handlePhotoTaken} onClose={() => setShowCamera(false)} />;
    }

    return (
        <div className="tab-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <button className="button secondary-action" onClick={onBack} style={{ padding: '0.5rem 1rem' }}>
                    ← Back
                </button>
                <h2 style={{ margin: 0, flexGrow: 1 }}>{caseData.address.street}</h2>
                <span className={`status-badge ${statusClass}`} style={{ fontSize: '0.9rem' }}>
                    {caseData.status}
                </span>
            </div>

            <div className="tab-nav" style={{ marginBottom: '1.5rem' }}>
                <button className={`tab-button ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>Case Info</button>
                <button className={`tab-button ${activeTab === 'evidence' ? 'active' : ''}`} onClick={() => setActiveTab('evidence')}>Evidence & Photos</button>
                <button className={`tab-button ${activeTab === 'notices' ? 'active' : ''}`} onClick={() => setActiveTab('notices')}>Notices</button>
                <button className={`tab-button ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>Notes & History</button>
                {(caseData.status === 'PENDING_ABATEMENT' || caseData.status === 'CONTINUAL_ABATEMENT' || caseData.status === 'CLOSED') && (
                    <button className={`tab-button ${activeTab === 'abatement' ? 'active' : ''}`} onClick={() => setActiveTab('abatement')}>Abatement</button>
                )}
            </div>

            {activeTab === 'info' && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                        <h3>Case Information</h3>
                        {!isEditing ? (
                            <button className="button secondary-action" onClick={() => setIsEditing(true)}>Edit Details</button>
                        ) : (
                            <div className="button-group">
                                <button className="button secondary-action" onClick={() => { setIsEditing(false); setEditedCase(caseData); }}>Cancel</button>
                                <button className="button primary-action" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label>Status</label>
                            <select
                                disabled={!isEditing}
                                value={editedCase.status}
                                onChange={e => setEditedCase({ ...editedCase, status: e.target.value as any })}
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="PENDING_ABATEMENT">Pending Abatement</option>
                                <option value="CONTINUAL_ABATEMENT">Continual Abatement</option>
                                <option value="CLOSED">Closed</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Compliance Deadline</label>
                            <input
                                type="text"
                                disabled={!isEditing}
                                value={editedCase.complianceDeadline}
                                onChange={e => setEditedCase({ ...editedCase, complianceDeadline: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Owner Name</label>
                            <input
                                type="text"
                                disabled={!isEditing}
                                value={editedCase.ownerInfo.name}
                                onChange={e => setEditedCase({ ...editedCase, ownerInfo: { ...editedCase.ownerInfo, name: e.target.value } })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Owner Phone</label>
                            <input
                                type="text"
                                disabled={!isEditing}
                                value={editedCase.ownerInfo.phone}
                                onChange={e => setEditedCase({ ...editedCase, ownerInfo: { ...editedCase.ownerInfo, phone: e.target.value } })}
                            />
                        </div>

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Owner Address</label>
                            <input
                                type="text"
                                disabled={!isEditing}
                                value={editedCase.ownerInfo.mailingAddress}
                                onChange={e => setEditedCase({ ...editedCase, ownerInfo: { ...editedCase.ownerInfo, mailingAddress: e.target.value } })}
                            />
                        </div>

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Violation Type</label>
                            <div className={!isEditing ? "form-value" : ""}>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedCase.violation.type}
                                        onChange={e => setEditedCase({ ...editedCase, violation: { ...editedCase.violation, type: e.target.value } })}
                                    />
                                ) : editedCase.violation.type}
                            </div>
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Violation Description</label>
                            {isEditing ? (
                                <textarea
                                    value={editedCase.violation.description}
                                    onChange={e => setEditedCase({ ...editedCase, violation: { ...editedCase.violation, description: e.target.value } })}
                                />
                            ) : (
                                <div className="form-group readonly"><div className="form-value">{editedCase.violation.description}</div></div>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                        <button className="button danger-action" onClick={async () => {
                            if (window.confirm("Are you sure you want to delete this case? This cannot be undone.")) {
                                await onDelete(caseData.id);
                            }
                        }}>Delete Case</button>
                    </div>
                </div>
            )}

            {activeTab === 'evidence' && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3>Photographic Evidence</h3>
                        <button className="button" onClick={() => setShowCamera(true)}>+ Take Photo</button>
                    </div>

                    {editedCase.evidence.photos.length === 0 ? (
                        <div className="empty-state" style={{ padding: '2rem', textAlign: 'center', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
                            <p>No photos added yet.</p>
                        </div>
                    ) : (
                        <div className="photo-gallery">
                            {editedCase.evidence.photos.map(photo => (
                                <div key={photo.id} className="photo-thumbnail">
                                    <img src={photo.url} alt="Evidence" onClick={() => window.open(photo.url, '_blank')} />
                                    <button className="delete-photo" onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}>×</button>
                                    <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.7rem', padding: '0.25rem', textAlign: 'center' }}>
                                        {photo.date}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'notices' && (
                <div className="card">
                    <h3>Generate Notice</h3>
                    {!showNoticePreview ? (
                        <div style={{ maxWidth: '500px' }}>
                            <div className="form-group">
                                <label>Select Template</label>
                                <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}>
                                    {NOTICE_TEMPLATES.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button className="button full-width" onClick={handleGenerateNotice}>Preview Notice</button>
                        </div>
                    ) : (
                        <div className="notice-preview-container">
                            <div className="button-group" style={{ marginBottom: '1rem' }}>
                                <button className="button secondary-action" onClick={() => setShowNoticePreview(false)}>Cancel</button>
                                <button className="button primary-action" onClick={handlePrintNotice}>Print & Save Record</button>
                            </div>
                            <div className="notice-document" dangerouslySetInnerHTML={{ __html: generatedNoticeHtml }} />
                        </div>
                    )}

                    <h3 style={{ marginTop: '2rem' }}>Notice History</h3>
                    <div className="task-list">
                        {editedCase.notices.length > 0 ? editedCase.notices.map(notice => (
                            <div key={notice.id} className="task-item">
                                <div>
                                    <strong>{notice.type}</strong>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{notice.dateGenerated}</div>
                                </div>
                            </div>
                        )) : <p style={{ color: 'var(--text-secondary)' }}>No notices generated yet.</p>}
                    </div>
                </div>
            )}

            {activeTab === 'notes' && (
                <div className="card">
                    <h3>Case Notes</h3>
                    <div className="form-group">
                        <textarea
                            placeholder="Add a new note..."
                            value={newNoteText}
                            onChange={e => setNewNoteText(e.target.value)}
                            style={{ minHeight: '80px' }}
                        />
                        <button className="button" style={{ marginTop: '0.5rem' }} onClick={handleAddNote} disabled={!newNoteText.trim()}>Add Note</button>
                    </div>

                    <div className="task-list" style={{ marginTop: '1.5rem' }}>
                        {editedCase.evidence.notes.map((note, idx) => (
                            <div key={idx} className="note">
                                <div className="note-date">{note.date}</div>
                                <div>{note.text}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'abatement' && (
                <div className="card">
                    <h3>Abatement Record</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label>Work Date</label>
                            <input type="date" value={abatementForm.workDate} onChange={e => setAbatementForm({ ...abatementForm, workDate: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Cost ($)</label>
                            <input type="number" value={abatementForm.cost} onChange={e => setAbatementForm({ ...abatementForm, cost: parseFloat(e.target.value) })} />
                        </div>
                        <div className="form-group">
                            <label>Contractor</label>
                            <input type="text" value={abatementForm.contractor} onChange={e => setAbatementForm({ ...abatementForm, contractor: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Invoice Number</label>
                            <input type="text" value={abatementForm.invoiceNumber} onChange={e => setAbatementForm({ ...abatementForm, invoiceNumber: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Notes</label>
                            <textarea value={abatementForm.notes} onChange={e => setAbatementForm({ ...abatementForm, notes: e.target.value })} />
                        </div>
                    </div>
                    <button className="button primary-action" onClick={handleSaveAbatement} style={{ marginTop: '1rem' }}>Save Abatement Info</button>
                </div>
            )}
        </div>
    );
};

export default CaseDetails;