export const VARIABLES_LIST = [
    {
        category: 'Basic Case', items: [
            { label: 'Date Today', value: '{{Date}}' },
            { label: 'Case Number', value: '{{CaseNumber}}' },
            { label: 'Status', value: '{{Status}}' },
        ]
    },
    {
        category: 'Owner', items: [
            { label: 'Name', value: '{{OwnerName}}' },
            { label: 'Mailing Address', value: '{{MailingAddress}}' },
            { label: 'Phone', value: '{{OwnerPhone}}' },
        ]
    },
    {
        category: 'Property', items: [
            { label: 'Street Address', value: '{{PropertyAddress}}' },
            { label: 'Legal Description', value: '{{LegalDescription}}' },
            { label: 'Tad ID', value: '{{TaxID}}' },
            { label: 'Parcel #', value: '{{ParcelNumber}}' },
        ]
    },
    {
        category: 'Violations', items: [
            { label: 'Full Violation Block', value: '{{Violations}}' },
            { label: 'Violation Type', value: '{{ViolationType}}' },
            { label: 'Ordinance', value: '{{Ordinance}}' },
            { label: 'Description', value: '{{ViolationDescription}}' },
            { label: 'Corrective Action', value: '{{CorrectiveAction}}' },
            { label: 'Compliance Deadline', value: '{{Deadline}}' },
        ]
    },
    {
        category: 'Abatement / Costs', items: [
            { label: 'Cost Breakdown', value: '{{CostBreakdown}}' },
            { label: 'Total Cost', value: '{{TotalCost}}' },
            { label: 'Invoice #', value: '{{InvoiceNumber}}' },
            { label: 'Work Date', value: '{{WorkDate}}' },
        ]
    },
    {
        category: 'Office', items: [
            { label: 'City Name', value: '{{CityName}}' },
            { label: 'Department', value: '{{DepartmentName}}' },
            { label: 'Officer Name', value: '{{OfficerName}}' },
            { label: 'Contact Phone', value: '{{ContactPhone}}' },
        ]
    }
];
