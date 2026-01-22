import { Case, DocTemplate, GlobalSettings } from './types';

export const generateNoticeContent = (
    template: DocTemplate,
    caseData: Case,
    globalSettings?: GlobalSettings
): string => {

    // 1. Prepare Defaults
    const settings = {
        cityName: 'City of Commerce',
        departmentName: 'Code Enforcement',
        officerName: 'Code Enforcement Officer',
        contactPhone: '(555) 123-4567',
        contactEmail: '',
        website: '',
        ...globalSettings
    };

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // 2. Comprehensive Variable Map
    const variables: Record<string, string> = {
        // Basic Case
        '{{Date}}': today,
        '{{CaseNumber}}': caseData.caseId || 'PENDING',
        '{{Status}}': caseData.status.replace('_', ' '),

        // Owner
        '{{OwnerName}}': caseData.ownerInfo.name || 'Current Resident',
        '{{MailingAddress}}': (caseData.ownerInfo.mailingAddress || '').replace(/\n/g, '<br/>'),
        '{{OwnerPhone}}': caseData.ownerInfo.phone || 'N/A',

        // Property
        '{{PropertyAddress}}': `${caseData.address.street}, ${caseData.address.city}, ${caseData.address.province}`,
        '{{LegalDescription}}': caseData.abatement?.propertyInfo?.legalDescription || 'N/A',
        '{{TaxID}}': caseData.abatement?.propertyInfo?.taxId || 'N/A',
        '{{ParcelNumber}}': caseData.abatement?.propertyInfo?.parcelNumber || 'N/A',

        // Violations
        '{{Violations}}': `
            <div style="background: #f1f5f9; padding: 15px; border: 1px solid #e2e8f0; margin: 10px 0;">
                <p><strong>Violation:</strong> ${caseData.violation.type}</p>
                <p><strong>Ordinance:</strong> ${caseData.violation.ordinance}</p>
                <p><strong>Description:</strong> ${caseData.violation.description}</p>
                <p><em><strong>Action Required:</strong> ${caseData.violation.correctiveAction}</em></p>
            </div>
        `,
        '{{ViolationType}}': caseData.violation.type,
        '{{Ordinance}}': caseData.violation.ordinance,
        '{{ViolationDescription}}': caseData.violation.description,
        '{{CorrectiveAction}}': caseData.violation.correctiveAction,
        '{{Deadline}}': caseData.complianceDeadline,

        // Abatement / Costs
        '{{TotalCost}}': caseData.abatement?.costDetails?.total ? `$${caseData.abatement.costDetails.total.toFixed(2)}` : '$0.00',
        '{{InvoiceNumber}}': caseData.abatement?.statementOfCostDocUrl || 'N/A', // Using simple field for now
        '{{WorkDate}}': caseData.abatement?.workDate || 'N/A',
        '{{CostBreakdown}}': caseData.abatement?.costDetails ? `
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr><td style="border-bottom: 1px solid #ddd; padding: 5px;">Rate</td><td style="border-bottom: 1px solid #ddd; padding: 5px; text-align: right;">$${caseData.abatement.costDetails.rate}/hr</td></tr>
                <tr><td style="border-bottom: 1px solid #ddd; padding: 5px;">Hours</td><td style="border-bottom: 1px solid #ddd; padding: 5px; text-align: right;">${caseData.abatement.costDetails.hours}</td></tr>
                <tr><td style="border-bottom: 1px solid #ddd; padding: 5px;">Employees</td><td style="border-bottom: 1px solid #ddd; padding: 5px; text-align: right;">${caseData.abatement.costDetails.employees}</td></tr>
                <tr><td style="border-bottom: 1px solid #ddd; padding: 5px;"><strong>Subtotal</strong></td><td style="border-bottom: 1px solid #ddd; padding: 5px; text-align: right;">$${(caseData.abatement.costDetails.rate * caseData.abatement.costDetails.hours * caseData.abatement.costDetails.employees).toFixed(2)}</td></tr>
                <tr><td style="border-bottom: 1px solid #ddd; padding: 5px;">Admin Fee</td><td style="border-bottom: 1px solid #ddd; padding: 5px; text-align: right;">$${caseData.abatement.costDetails.adminFee.toFixed(2)}</td></tr>
                <tr><td style="padding: 5px;"><strong>TOTAL DUE</strong></td><td style="padding: 5px; text-align: right;"><strong>$${caseData.abatement.costDetails.total.toFixed(2)}</strong></td></tr>
            </table>
        ` : 'No cost details recorded.',

        // Office
        '{{CityName}}': settings.cityName,
        '{{DepartmentName}}': settings.departmentName,
        '{{OfficerName}}': settings.officerName,
        '{{ContactPhone}}': settings.contactPhone,
        '{{ContactEmail}}': settings.contactEmail,
    };

    // 3. Perform Replacement
    let content = template.content;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(key, 'g');
        content = content.replace(regex, value);
    }

    // 4. Wrap HTML
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
                @page { size: 9.5in 4.125in; margin: 0; }
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
