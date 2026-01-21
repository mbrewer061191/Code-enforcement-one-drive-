import React, { useState, useRef } from 'react';
import { Case, PhotoWithMeta, AbatementDetails, EvidencePhoto } from '../types';
import { Case, PhotoWithMeta, AbatementDetails, EvidencePhoto } from '../types';
import CameraView from './CameraView';

const AbatementManager: React.FC<{ caseData: Case; onUpdate: (updatedCase: Case) => void; }> = ({ caseData, onUpdate }) => {

    const [details, setDetails] = useState<AbatementDetails>(caseData.abatement || {});
    const [tempBeforePhotos, setTempBeforePhotos] = useState<PhotoWithMeta[]>([]);
    const [tempAfterPhotos, setTempAfterPhotos] = useState<PhotoWithMeta[]>([]);
    const [showCamera, setShowCamera] = useState<'before' | 'after' | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const beforeUploadRef = useRef<HTMLInputElement>(null);
    const afterUploadRef = useRef<HTMLInputElement>(null);

    const updateDetails = (updates: Partial<AbatementDetails>) => {
        const newDetails = { ...details, ...updates };
        setDetails(newDetails);
        onUpdate({ ...caseData, abatement: newDetails });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
        if (!e.target.files) return;
        const files: File[] = Array.from(e.target.files);
        const photosPromises = files.map((f: File) => new Promise<PhotoWithMeta>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ file: f, dataUrl: reader.result as string });
            reader.readAsDataURL(f);
        }));
        const photos = await Promise.all(photosPromises);
        if (type === 'before') setTempBeforePhotos(p => [...p, ...photos]);
        else setTempAfterPhotos(p => [...p, ...photos]);
    };

    const savePhotos = async (type: 'before' | 'after') => {
        const photosToUpload = type === 'before' ? tempBeforePhotos : tempAfterPhotos;
        if (photosToUpload.length === 0) return;

        setIsSaving(true);
        setError('');
        try {
            // Local saving: Convert temp photos to EvidencePhotos (Base64)
            const newPhotos: EvidencePhoto[] = photosToUpload.map(p => ({
                id: self.crypto.randomUUID(),
                url: p.dataUrl || '',
                date: new Date().toLocaleDateString(),
                notes: ''
            }));

            const existing = details.photos?.[type] || [];
            updateDetails({ photos: { ...details.photos, [type]: [...existing, ...newPhotos] } });

            if (type === 'before') setTempBeforePhotos([]);
            else setTempAfterPhotos([]);
            alert("Photos saved locally.");
        } catch (e: any) {
            setError(`Failed to save ${type} photos: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveLienInfo = () => {
        onUpdate({ ...caseData, abatement: details });
        setMessage('Lien information saved successfully.');
        setTimeout(() => setMessage(''), 4000);
    };

    const handleGenerateDoc = async (docType: 'statement' | 'lien' | 'certificate') => {
        alert("Document generation is temporarily disabled in Local Mode. Please use the Print feature of your browser for now.");
        // Placeholder for future local PDF generation
    };

    const isLienInfoComplete = details.propertyInfo?.legalDescription && details.propertyInfo?.taxId && details.propertyInfo?.parcelNumber;

    return (
        <div className="card" style={{ borderColor: 'var(--abatement-color)' }}>
            {showCamera && <CameraView
                mode="single-case"
                onCancel={() => setShowCamera(null)}
                onDone={(photos) => {
                    if (showCamera === 'before') setTempBeforePhotos(p => [...p, ...photos]);
                    else setTempAfterPhotos(p => [...p, ...photos]);
                    setShowCamera(null);
                }}
            />}
            <input type="file" accept="image/*" multiple ref={beforeUploadRef} onChange={e => handleFileUpload(e, 'before')} style={{ display: 'none' }} />
            <input type="file" accept="image/*" multiple ref={afterUploadRef} onChange={e => handleFileUpload(e, 'after')} style={{ display: 'none' }} />

            <h2>Abatement Process</h2>
            {message && <div className="success-message">{message}</div>}
            {error && <div className="error-message">{error}</div>}

            {/* --- Section 1: Work & Photos --- */}
            <div className="config-group">
                <h4>1. Record Work & Photos</h4>
                <div className="form-group">
                    <label>Date Work Performed</label>
                    <input type="date" value={details.workDate?.split('T')[0] || ''} onChange={e => updateDetails({ workDate: e.target.value })} />
                </div>
                <div>
                    <h5>Before Photos</h5>
                    <div className="photo-gallery">
                        {details.photos?.before?.map(p => <div key={p.id} className="photo-thumbnail"><img src={p.url} alt="Before abatement" /></div>)}
                        {tempBeforePhotos.map(p => <div key={p.dataUrl} className="photo-thumbnail"><img src={p.dataUrl} alt="Before abatement capture" /></div>)}
                    </div>
                    <div className="button-group" style={{ marginTop: '1rem' }}>
                        <button className="button" onClick={() => setShowCamera('before')}>Take</button>
                        <button className="button secondary-action" onClick={() => beforeUploadRef.current?.click()}>Upload</button>
                        <button className="button primary-action" onClick={() => savePhotos('before')} disabled={isSaving || tempBeforePhotos.length === 0}>Save Photos</button>
                    </div>
                </div>
                <div style={{ marginTop: '1.5rem' }}>
                    <h5>After Photos</h5>
                    <div className="photo-gallery">
                        {details.photos?.after?.map(p => <div key={p.id} className="photo-thumbnail"><img src={p.url} alt="After abatement" /></div>)}
                        {tempAfterPhotos.map(p => <div key={p.dataUrl} className="photo-thumbnail"><img src={p.dataUrl} alt="After abatement capture" /></div>)}
                    </div>
                    <div className="button-group" style={{ marginTop: '1rem' }}>
                        <button className="button" onClick={() => setShowCamera('after')}>Take</button>
                        <button className="button secondary-action" onClick={() => afterUploadRef.current?.click()}>Upload</button>
                        <button className="button primary-action" onClick={() => savePhotos('after')} disabled={isSaving || tempAfterPhotos.length === 0}>Save Photos</button>
                    </div>
                </div>
            </div>

            {/* --- Section 2: Statement of Cost --- */}
            <div className="config-group">
                <h4>2. Generate Statement of Cost (Mowing)</h4>
                <div className="form-group">
                    <label>Number of Employees</label>
                    <input type="number" min="0" value={details.costDetails?.employees || ''} onChange={e => updateDetails({ costDetails: { type: 'mowing', employees: +e.target.value, hours: details.costDetails?.hours || 0, rate: details.costDetails?.rate || 0, adminFee: details.costDetails?.adminFee || 0, total: details.costDetails?.total || 0 } })} />
                </div>
                <div className="form-group">
                    <label>Hours Worked</label>
                    <input type="number" min="0" step="0.25" value={details.costDetails?.hours || ''} onChange={e => updateDetails({ costDetails: { type: 'mowing', hours: +e.target.value, employees: details.costDetails?.employees || 0, rate: details.costDetails?.rate || 0, adminFee: details.costDetails?.adminFee || 0, total: details.costDetails?.total || 0 } })} />
                </div>
                <div className="info-box">
                    <p><strong>Admin Fee:</strong> $50.00</p>
                    <p><strong>Rate:</strong> $25.00 / hour / employee</p>
                    <p><strong>Total Cost:</strong> ${(((details.costDetails?.hours || 0) * (details.costDetails?.employees || 0) * 25) + 50).toFixed(2)}</p>
                </div>
                <button className="button" onClick={() => handleGenerateDoc('statement')} disabled={isSaving || !details.workDate || !details.costDetails?.hours || !details.costDetails?.employees}>Generate & Save Statement</button>
                {details.statementOfCostDocUrl && <p className="success-message" style={{ marginTop: '0.5rem' }}>Statement generated on {details.statementOfCostDate}. <a href={details.statementOfCostDocUrl} target="_blank" rel="noopener noreferrer">View Document</a></p>}
            </div>

            {/* --- Section 3: Lien Info --- */}
            <div className="config-group">
                <h4>3. Add Lien Information</h4>
                <div className="form-group">
                    <label>Legal Description of Property</label>
                    <textarea value={details.propertyInfo?.legalDescription || ''} onChange={e => updateDetails({ propertyInfo: { ...details.propertyInfo, legalDescription: e.target.value } })} />
                </div>
                <div className="form-group">
                    <label>Tax ID</label>
                    <input type="text" value={details.propertyInfo?.taxId || ''} onChange={e => updateDetails({ propertyInfo: { ...details.propertyInfo, taxId: e.target.value } })} />
                </div>
                <div className="form-group">
                    <label>Parcel Number</label>
                    <input type="text" value={details.propertyInfo?.parcelNumber || ''} onChange={e => updateDetails({ propertyInfo: { ...details.propertyInfo, parcelNumber: e.target.value } })} />
                </div>
                <button className="button" onClick={handleSaveLienInfo} disabled={!details.propertyInfo?.legalDescription}>Save Lien Info</button>
            </div>

            {/* --- Section 4: Generate Lien Docs --- */}
            <div className="config-group">
                <h4>4. Generate Lien Documents</h4>
                <div className="button-group" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <button className="button" onClick={() => handleGenerateDoc('lien')} disabled={isSaving || !details.costDetails?.hours || !details.costDetails?.employees || !isLienInfoComplete}>Generate Notice of Lien</button>
                    {details.noticeOfLienDocUrl && <p className="success-message">Lien notice generated. <a href={details.noticeOfLienDocUrl} target="_blank" rel="noopener noreferrer">View Document</a></p>}

                    <button className="button" onClick={() => handleGenerateDoc('certificate')} disabled={isSaving || !details.statementOfCostDocUrl || !isLienInfoComplete} style={{ marginTop: '1rem' }}>Generate Certificate of Lien</button>
                    <p className="helper-text">To be used 30 days after non-payment.</p>
                    {details.certificateOfLienDocUrl && <p className="success-message">Certificate generated. <a href={details.certificateOfLienDocUrl} target="_blank" rel="noopener noreferrer">View Document</a></p>}
                </div>
            </div>
        </div>
    );
};

export default AbatementManager;
