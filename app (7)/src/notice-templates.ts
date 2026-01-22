import { Case } from './types';
import { getConfig } from './config';

export const NOTICE_TEMPLATES = [
    { id: 'initial-notice', name: 'Initial Notice' },
    { id: 'final-notice', name: 'Final/Failure Notice' },
];

export const generateNoticeContent = (templateId: string, caseData: Case): string => {
    // We cannot use 'await' here because this function is synchronous in the React component.
    // However, for the simple "Save as Word" feature, we can just use default strings 
    // OR we can read from localStorage directly if we want to be instant.
    // For now, let's try to read from the stored config in localStorage if valid.

    let cityName = 'City of Commerce';
    let deptName = 'Code Enforcement Division';
    let header = 'NOTICE OF VIOLATION';
    let bodyText = `This notice is to inform you that the property at ${caseData.address.street} is in violation of city ordinances.`;
    let warning = 'Failure to correct this violation by the deadline may result in the City entering the property to abate the nuisance at the owner\'s expense.';

    try {
        const stored = localStorage.getItem('app_config');
        if (stored) {
            const cfg = JSON.parse(stored);
            if (cfg.templates) {
                cityName = cfg.templates.cityName || cityName;
                deptName = cfg.templates.departmentName || deptName;
                if (templateId === 'initial-notice') {
                    header = cfg.templates.initialNotice.header || header;
                    bodyText = cfg.templates.initialNotice.body || bodyText;
                    warning = cfg.templates.initialNotice.warning || warning;
                } else if (templateId === 'final-notice') {
                    header = cfg.templates.finalNotice.header || 'FINAL NOTICE TO ABATE';
                    bodyText = cfg.templates.finalNotice.body || 'This is a FINAL NOTICE. Previous warnings have been ignored.';
                    // Keep the same warning or a stricter one
                }
            }
        }
    } catch (e) {
        console.warn("Could not load templates from config", e);
    }

    const today = new Date().toLocaleDateString();

    const photosHtml = caseData.evidence.photos && caseData.evidence.photos.length > 0
        ? `
            <h3>EVIDENCE PHOTOS</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                ${caseData.evidence.photos.map(p => `
                    <div style="width: 200px; border: 1px solid #ccc; padding: 5px;">
                        <img src="${p.dataUrl || p.url}" style="width: 100%; height: auto;" />
                        <p style="font-size: 10px;">${p.caption || ''}</p>
                    </div>
                `).join('')}
            </div>
        `
        : '';

    return `
        <div style="font-family: 'Times New Roman', serif; padding: 40px; color: black;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="margin: 0; text-transform: uppercase;">${cityName}</h2>
                <h3 style="margin: 5px 0; font-weight: normal;">${deptName}</h3>
            </div>

            <h1 style="text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 30px;">${header}</h1>

            <p><strong>Date:</strong> ${today}</p>
            <p><strong>Case #:</strong> ${caseData.caseId}</p>
            <p><strong>Property:</strong> ${caseData.address.street}, ${caseData.address.city}</p>
            <p><strong>Owner:</strong> ${caseData.ownerInfo.name || 'Current Owner'}</p>
            <p><strong>Mailing Address:</strong><br/>${caseData.ownerInfo.mailingAddress ? caseData.ownerInfo.mailingAddress.replace(/\n/g, '<br/>') : 'N/A'}</p>
            
            <hr style="margin: 20px 0;" />
            
            <p>${bodyText}</p>
            
            <h3>VIOLATION DETAILS</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 5px; font-weight: bold; width: 150px;">Violation Type:</td>
                    <td style="padding: 5px;">${caseData.violation.type}</td>
                </tr>
                <tr>
                    <td style="padding: 5px; font-weight: bold;">Ordinance:</td>
                    <td style="padding: 5px;">${caseData.violation.ordinance}</td>
                </tr>
                <tr>
                    <td style="padding: 5px; font-weight: bold;">Description:</td>
                    <td style="padding: 5px;">${caseData.violation.description}</td>
                </tr>
                 <tr>
                    <td style="padding: 5px; font-weight: bold;">Corrective Action:</td>
                    <td style="padding: 5px;">${caseData.violation.correctiveAction}</td>
                </tr>
            </table>

            <div style="border: 2px solid black; padding: 15px; margin: 20px 0; text-align: center; font-weight: bold;">
                <p>CORRECTION DEADLINE: ${caseData.complianceDeadline}</p>
            </div>
            
            <p>${warning}</p>
            
            <br />
            <br />
            
            <p>Sincerely,</p>
            <p><strong>${deptName}</strong><br/>${cityName}</p>

            <br />
            ${photosHtml}
        </div>
    `;
};
