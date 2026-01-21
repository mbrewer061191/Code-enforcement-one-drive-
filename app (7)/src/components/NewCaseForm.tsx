import React, { useState, useEffect, useRef } from 'react';
import { Case, PhotoWithMeta, EvidencePhoto, Property } from '../types';
import { initialAddressState, initialOwnerState, initialViolationState, VIOLATIONS_LIST, COMPLIANCE_DAYS } from '../constants';

import CameraView from './CameraView';

interface NewCaseFormProps {
    onSave: (draftCase: (Partial<Case> & { _tempPhotos?: PhotoWithMeta[] })) => void;
    onCancel: () => void;
    properties: Property[];
    draftCase: (Partial<Case> & { _tempPhotos?: PhotoWithMeta[] }) | null;
    onUpdateDraft: (draft: (Partial<Case> & { _tempPhotos?: PhotoWithMeta[] }) | null) => void;
}

const NewCaseForm: React.FC<NewCaseFormProps> = ({ onSave, onCancel, properties, draftCase, onUpdateDraft }) => {
    // UI-specific state
    const [showCamera, setShowCamera] = useState(false);
    const [isSaving, setIsSaving] = useState(false); // Used for brief double-click prevention
    const [lookupMessage, setLookupMessage] = useState('');


    // Derive form values from the draft prop
    const caseId = draftCase?.caseId || '';
    const address = draftCase?.address || initialAddressState;
    const owner = draftCase?.ownerInfo || initialOwnerState;
    const ownerUnknown = draftCase?.ownerInfoStatus === 'UNKNOWN';
    const violation = draftCase?.violation || initialViolationState;
    const isVacant = draftCase?.isVacant || false;
    const photos = draftCase?._tempPhotos || [];
    const violationManual = (violation.type === 'Other (Manual Entry)' && draftCase?.violation) || initialViolationState;

    const updateDraft = (updates: Partial<Case> & { _tempPhotos?: PhotoWithMeta[] }) => {
        onUpdateDraft({ ...draftCase!, ...updates });
    };

    const handleAddressLookup = () => {
        const trimmedAddress = address.street.trim();
        if (!trimmedAddress) {
            setLookupMessage('Please enter an address to look up.');
            return;
        }
        const foundProperty = properties.find(p => p.streetAddress.toLowerCase() === trimmedAddress.toLowerCase());

        if (foundProperty) {
            updateDraft({
                ownerInfo: { ...initialOwnerState, ...foundProperty.ownerInfo },
                isVacant: foundProperty.isVacant,
                ownerInfoStatus: 'KNOWN'
            });
            setLookupMessage('Success: Owner and property info have been pre-filled from the directory.');
        } else {
            setLookupMessage('Info: No existing property found for this address.');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!draftCase) return;
        setIsSaving(true); // Prevent double-clicks

        const finalViolation = violation.type === 'Other (Manual Entry)' ? violationManual : violation;
        const isOwnerInfoValid = ownerUnknown || (owner.name && owner.mailingAddress);

        if (!draftCase.caseId || !address.street || finalViolation.type === 'Select a Violation...' || !isOwnerInfoValid) {
            alert("Please fill in Case Number, Address, select a Violation, and provide Owner Info (or mark as unknown).");
            setIsSaving(false); // Re-enable button on validation failure
            return;
        }

        // This is now a synchronous call. The parent component handles the async work.
        onSave(draftCase);
        // The component will unmount, so no need to `setIsSaving(false)` on success.
    };

    const handleViolationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = VIOLATIONS_LIST.find(v => v.type === e.target.value) || initialViolationState;
        updateDraft({ violation: selected });
    };



    return (
        <>
            {showCamera && <CameraView
                mode="single-case"
                onDone={(p) => {
                    updateDraft({ _tempPhotos: [...photos, ...p] });
                    setShowCamera(false);
                }}
                onCancel={() => setShowCamera(false)}
            />}
            <form onSubmit={handleSubmit} className="tab-content">
                <div className="card">
                    <h2>Property & Photos</h2>
                    <div className="form-group">
                        <label>Case Number (Firm-Specific ID)</label>
                        <input type="text" value={caseId} onChange={e => updateDraft({ caseId: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label>Street Address</label>
                        <div className="input-with-button">
                            <input type="text" value={address.street} onChange={e => { updateDraft({ address: { ...address, street: e.target.value } }); setLookupMessage(''); }} required />
                            <button type="button" className="button" onClick={handleAddressLookup}>Look up</button>
                        </div>
                        {lookupMessage && <p className={`helper-text ${lookupMessage.startsWith('Success') ? 'success-message' : 'info-box'}`} style={{ padding: '0.5rem', marginTop: '0.5rem' }}>{lookupMessage}</p>}
                    </div>
                    <div className="form-group"><label><input type="checkbox" checked={isVacant} onChange={e => updateDraft({ isVacant: e.target.checked })} /> Mark as vacant</label></div>
                    <h4>Evidence Photos ({photos.length})</h4>
                    <div className="photo-gallery">{photos.map((p, i) => <div key={i} className="photo-thumbnail"><img src={p.dataUrl} alt={`Evidence photo ${i + 1}`} /></div>)}</div>
                    <div className="button-group" style={{ marginTop: '1rem' }}>
                        <button type="button" className="button" onClick={() => setShowCamera(true)}>Take Photos</button>

                    </div>
                    <div className="card">
                        <h2>Owner Information</h2>
                        <div className="form-group"><label><input type="checkbox" checked={ownerUnknown} onChange={e => updateDraft({ ownerInfoStatus: e.target.checked ? 'UNKNOWN' : 'KNOWN' })} /> Owner information is unknown</label></div>
                        <div className="form-group"><label>Owner Name</label><input type="text" value={owner.name} onChange={e => updateDraft({ ownerInfo: { ...owner, name: e.target.value } })} required={!ownerUnknown} disabled={ownerUnknown} /></div>
                        <div className="form-group">
                            <label>Mailing Address</label>
                            <textarea value={owner.mailingAddress} onChange={e => updateDraft({ ownerInfo: { ...owner, mailingAddress: e.target.value } })} required={!ownerUnknown} disabled={ownerUnknown}></textarea>
                            <p className="helper-text">For multi-line addresses on envelopes, use the Enter/Return key for line breaks.</p>
                        </div>
                    </div>
                    <div className="card">
                        <h2>Violation Details</h2>
                        <div className="form-group"><label>Violation Type</label><select value={violation.type} onChange={handleViolationChange} required><option disabled>Select a Violation...</option>{VIOLATIONS_LIST.map(v => <option key={v.type} value={v.type}>{v.type}</option>)}</select></div>
                        {violation.type === 'Other (Manual Entry)' ? (
                            <>
                                <div className="form-group"><label>Ordinance</label><input type="text" value={violationManual.ordinance} onChange={e => updateDraft({ violation: { ...violationManual, ordinance: e.target.value } })} /></div>
                                <div className="form-group"><label>Description</label><textarea value={violationManual.description} onChange={e => updateDraft({ violation: { ...violationManual, description: e.target.value } })} /></div>
                            </>
                        ) : (
                            <>
                                <div className="form-group readonly"><label>Ordinance</label><div className="form-value">{violation.ordinance || 'N/A'}</div></div>
                                <div className="form-group readonly"><label>Description</label><div className="form-value">{violation.description || 'N/A'}</div></div>
                            </>
                        )}
                    </div>
                    <div className="button-group" style={{ justifyContent: 'flex-end' }}><button type="button" className="button secondary-action" onClick={onCancel} disabled={isSaving}>Cancel</button>
                        <button type="submit" className="button primary-action" disabled={isSaving}>
                            {isSaving ? <span className="loader" /> : 'Save Case'}
                        </button>
                    </div>
            </form>
        </>
    );
};

export default NewCaseForm;
