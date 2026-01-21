import React, { useState, useMemo } from 'react';
import { Case } from '../types';
import { getCaseTimeStatus, compareStreets } from '../utils';

const getStatusClass = (c: Case): string => {
    if (c.status === 'CLOSED') return 'closed';
    if (c.status === 'PENDING_ABATEMENT') return 'abatement';
    if (c.status === 'CONTINUAL_ABATEMENT') return 'continual-abatement';
    return getCaseTimeStatus(c);
};

interface CaseListProps {
    cases: Case[];
    onSelectCase: (caseId: string) => void;
    onNewCase: () => void;
    listType?: 'all' | 'due' | 'abatement' | 'continual-abatement';
    onGenerateReport?: () => void;
}

const CaseList: React.FC<CaseListProps> = ({ cases, onSelectCase, onNewCase, listType = 'all', onGenerateReport }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('ALL');

    const filterOptions = [
        { value: 'ALL', label: 'All Open & Closed Cases' },
        { value: 'OPEN', label: 'All Open Cases' },
        { value: 'ABATEMENT', label: 'Ready for Abatement' },
        { value: 'VACANT', label: 'Vacant Properties' },
        { value: 'DILAPIDATED', label: 'Dilapidated Structures' },
        { value: 'UNKNOWN_OWNER', label: 'Unknown Owner' },
        { value: 'TALL_GRASS', label: 'Tall Grass / Weeds' },
        { value: 'INOPERABLE_VEHICLE', label: 'Inoperable Vehicles' },
    ];

    const filteredCases = useMemo(() => {
        let intermediateCases = [...cases];

        const filterFunctions: Record<string, (c: Case) => boolean> = {
            'OPEN': c => c.status !== 'CLOSED',
            'ABATEMENT': c => c.status === 'PENDING_ABATEMENT',
            'VACANT': c => c.isVacant,
            'DILAPIDATED': c => c.violation.type === 'Dilapidated Structure',
            'UNKNOWN_OWNER': c => c.ownerInfoStatus === 'UNKNOWN',
            'TALL_GRASS': c => c.violation.type === 'Tall Grass / Weeds',
            'INOPERABLE_VEHICLE': c => c.violation.type === 'Inoperable / Abandoned Vehicle'
        };

        if (filter !== 'ALL' && filterFunctions[filter]) {
            intermediateCases = intermediateCases.filter(filterFunctions[filter]);
        }

        const sortedCases = intermediateCases.sort((a, b) => {
            // Custom sort for abatement list by violation type.
            if (listType === 'abatement') {
                const violationCompare = a.violation.type.localeCompare(b.violation.type);
                if (violationCompare !== 0) return violationCompare;
                return compareStreets(a.address.street, b.address.street); // secondary sort by street
            }

            // Primary sort: keep closed cases at the bottom.
            if (a.status === 'CLOSED' && b.status !== 'CLOSED') return 1;
            if (a.status !== 'CLOSED' && b.status === 'CLOSED') return -1;

            // Secondary sort: use the custom geographical street sorter.
            return compareStreets(a.address.street, b.address.street);
        });

        if (!searchTerm) return sortedCases;
        return sortedCases.filter(c =>
            c.address.street.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.ownerInfo.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [cases, searchTerm, filter, listType]);

    return (
        <div className="tab-content">
            <div className="search-bar">
                <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" placeholder="Search by address, case ID, or owner..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>

            {listType === 'all' && (
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="case-filter" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Filter View</label>
                    <select id="case-filter" value={filter} onChange={e => setFilter(e.target.value)}>
                        {filterOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
            )}

            {listType === 'abatement' && onGenerateReport && (
                <button className="button full-width" onClick={onGenerateReport} style={{ marginBottom: '1rem', backgroundColor: 'var(--abatement-color)' }}>Generate Abatement Report</button>
            )}
            <button className="button primary-action full-width" onClick={onNewCase}>+ Create New Case</button>

            <div style={{ marginTop: '1.5rem' }}>
                {filteredCases.length > 0 ? (
                    filteredCases.map(c => {
                        const statusClass = getStatusClass(c);
                        const statusTextClass = statusClass === 'overdue' || statusClass === 'nearing-due' ? 'warning-text'
                            : statusClass === 'abatement' ? 'abatement-text'
                                : statusClass === 'continual-abatement' ? 'continual-abatement-text' : '';

                        const displayStatus = c.status === 'PENDING_ABATEMENT' ? 'Pending Abatement'
                            : c.status === 'CONTINUAL_ABATEMENT' ? 'Continual Abatement' : c.status;

                        const isContinual = listType === 'continual-abatement';
                        let expiryDateText = '';
                        if (isContinual && c.abatement?.workDate) {
                            const workDate = new Date(c.abatement.workDate.replace(/-/g, '\/'));
                            if (!isNaN(workDate.getTime())) {
                                workDate.setMonth(workDate.getMonth() + 6);
                                expiryDateText = ` | Expires: ${workDate.toLocaleDateString()}`;
                            }
                        }


                        return (
                            <div key={c.id} className={`case-item ${statusClass}`} onClick={() => onSelectCase(c.id)} role="button" tabIndex={0} aria-label={`View case ${c.caseId}`}>
                                <div className="case-info" style={{ width: '100%' }}>
                                    <div className="case-header-with-badge">
                                        <strong>{c.address.street}</strong>
                                        {c.ownerInfoStatus === 'UNKNOWN' && <span className="status-badge unknown-owner">Owner Unknown</span>}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                                        <span>ID: {c.caseId}</span>
                                        <span className={`status-badge ${statusClass}`} style={{ fontSize: '0.65rem', fontWeight: 700, backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border-color)' }}>
                                            <span className={statusTextClass}>{displayStatus}</span>{expiryDateText}
                                        </span>
                                    </div>
                                    <span style={{ marginTop: '0.25rem' }}>Owner: {c.ownerInfo?.name || 'N/A'}</span>
                                </div>
                            </div>
                        );
                    })
                ) : (<div className="card empty-state" style={{ marginTop: '1.5rem' }}><p>No cases found matching the criteria.</p></div>)}
            </div>
        </div>
    );
};

export default CaseList;
