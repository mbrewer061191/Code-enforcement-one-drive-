import { Case, DocTemplate, GlobalSettings } from './types';

export const generateNoticeContent = (
    template: DocTemplate,
    caseData: Case,
    globalSettings?: GlobalSettings
): string => {

    // 1. Prepare Defaults if global settings missing
    const settings = {
        cityName: 'City of Commerce',
        departmentName: 'Code Enforcement',
        officerName: 'Code Enforcement Officer',
        contactPhone: '(555) 123-4567',
        contactEmail: '',
        ...globalSettings
    };

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // 2. Variable Map
    const variables: Record<string, string> = {
        '{{Date}}': today,
        '{{CaseNumber}}': caseData.caseId || 'PENDING',
        '{{OwnerName}}': caseData.ownerInfo.name || 'Current Resident',
        '{{MailingAddress}}': (caseData.ownerInfo.mailingAddress || '').replace(/\n/g, '<br/>'),
        '{{PropertyAddress}}': `${caseData.address.street}, ${caseData.address.city}, ${caseData.address.province}`,
        '{{Violations}}': `
            <div style="background: #f1f5f9; padding: 15px; border: 1px solid #e2e8f0; margin: 10px 0;">
                <strong>Violation:</strong> ${caseData.violation.type}<br/>
                <strong>Ordinance:</strong> ${caseData.violation.ordinance}<br/>
                <strong>Description:</strong> ${caseData.violation.description}<br/>
                <em><strong>Action Required:</strong> ${caseData.violation.correctiveAction}</em>
            </div>
        `,
        '{{Deadline}}': caseData.complianceDeadline,
        '{{CityName}}': settings.cityName,
        '{{DepartmentName}}': settings.departmentName,
        '{{OfficerName}}': settings.officerName,
        '{{ContactPhone}}': settings.contactPhone,
        '{{ContactEmail}}': settings.contactEmail,
    };

    // 3. Perform Replacement
    let content = template.content;
    for (const [key, value] of Object.entries(variables)) {
        // Regex to replace globally
        const regex = new RegExp(key, 'g');
        content = content.replace(regex, value);
    }

    // 4. Wrap in HTML shell
    // If it's an envelope, use special size
    const isEnvelope = template.type === 'envelope';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${template.name}</title>
            <style>
                body { 
                    font-family: 'Times New Roman', serif; 
                    margin: ${isEnvelope ? '0' : '40px'}; 
                    padding: ${isEnvelope ? '40px' : '0'};
                    line-height: 1.5; 
                    color: black; 
                }
                ${!isEnvelope ? `
                .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid black; padding-bottom: 20px; }
                .header h1 { margin: 0; text-transform: uppercase; font-size: 24px; }
                .header p { margin: 5px 0; font-size: 14px; }
                .footer { margin-top: 50px; padding-top: 20px; font-size: 10pt; }
                @page { margin: 1in; }
                ` : `
                @page { size: 9.5in 4.125in; margin: 0; } /* #10 Envelope */
                .envelope-return { font-size: 10pt; position: absolute; top: 20px; left: 20px; }
                .envelope-dest { font-size: 14pt; position: absolute; top: 150px; left: 350px; width: 400px; line-height: 1.6; }
                `}
            </style>
        </head>
        <body>
            ${!isEnvelope ? `
            <div class="header">
                <h1>${settings.cityName}</h1>
                <p>${settings.departmentName}</p>
                <p>${settings.contactPhone} ${settings.contactEmail ? '| ' + settings.contactEmail : ''}</p>
            </div>
            ` : ''}

            <div class="content">
                ${content}
            </div>

            <script>
                window.onload = () => { setTimeout(() => window.print(), 500); };
            </script>
        </body>
        </html>
    `;
};
