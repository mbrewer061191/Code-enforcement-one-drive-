import { Case } from './types';

export const NOTICE_TEMPLATES = [
    { id: 'initial-notice', name: 'Initial Notice' },
    { id: 'final-notice', name: 'Final/Failure Notice' },
];

export const generateNoticeContent = (templateId: string, caseData: Case): string => {
    const today = new Date().toLocaleDateString();

    let title = 'NOTICE OF VIOLATION';
    let body = `<p>This notice is to inform you that the property at <strong>${caseData.address.street}</strong> is in violation of city ordinances.</p>`;

    if (templateId === 'final-notice') {
        title = 'FINAL NOTICE TO ABATE';
        body = `<p>This is a FINAL NOTICE. Previous warnings regarding the property at <strong>${caseData.address.street}</strong> have been ignored.</p>`;
    }

    return `
        <div style="font-family: sans-serif; padding: 20px;">
            <h1 style="text-align: center; border-bottom: 2px solid #333;">${title}</h1>
            <p><strong>Date:</strong> ${today}</p>
            <p><strong>Case ID:</strong> ${caseData.caseId}</p>
            <p><strong>Property Address:</strong> ${caseData.address.street}, ${caseData.address.city}, ${caseData.address.province} ${caseData.address.postalCode}</p>
            <p><strong>Owner:</strong> ${caseData.ownerInfo.name || 'Current Owner'}</p>
            
            <hr />
            
            <h3>VIOLATION DETAILS</h3>
            <p><strong>Violation Type:</strong> ${caseData.violation.type}</p>
            <p><strong>Description:</strong> ${caseData.violation.description}</p>
            <p><strong>Ordinance:</strong> ${caseData.violation.ordinance}</p>
            
            <div style="background: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #cc0000;">
                <p><strong>REQUIRED CORRECTION:</strong> ${caseData.violation.correctiveAction}</p>
            </div>
            
            <p><strong>Compliance Deadline:</strong> ${caseData.complianceDeadline}</p>
            <p>Failure to correct this violation by the deadline may result in the City entering the property to abate the nuisance at the owner's expense.</p>
            
            <br />
            <p>Sincerely,</p>
            <p>Code Enforcement Division<br/>City of Commerce</p>
        </div>
    `;
};
