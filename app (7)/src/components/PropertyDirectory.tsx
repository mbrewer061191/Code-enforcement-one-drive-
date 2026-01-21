import React, { useState, useEffect, useMemo } from 'react';
import { Property, Case } from '../types';
import { compareStreets } from '../utils';

const PropertyEditor: React.FC<{
    property: Property;
    onSave: (property: Property) => void;
    onCancel: () => void;
}> = ({ property, onSave, onCancel }) => {
    const [editState, setEditState] = useState(property);

    const handleSave = () => {
        // Basic validation
        if (!editState.streetAddress.trim()) {
            alert("Street address cannot be empty.");
            return;
        }
        onSave(editState);
    };

    return (
        <div className="card" style={{borderColor: 'var(--secondary-color)', marginTop: '1rem'}}>
            <h3>Editing: {property.streetAddress}</h3>
            <div className="form-group">
                <label>Street Address</label>
                <input type="text" value={editState.streetAddress} onChange={e => setEditState({...editState, streetAddress: e.target.value})} />
            </div>
            <h4>Owner Info</h4>
            <div className="form-group">
                <label>Owner Name</label>
                <input type="text" value={editState.ownerInfo.name} onChange={e => setEditState({...editState, ownerInfo: {...editState.ownerInfo, name: e.target.value}})} />
            </div>
            <div className="form-group">
                <label>Mailing Address</label>
                <textarea value={editState.ownerInfo.mailingAddress} onChange={e => setEditState({...editState, ownerInfo: {...editState.ownerInfo, mailingAddress: e.target.value}})} />
            </div>
             <div className="form-group">
                <label>Owner Phone</label>
                <input type="tel" value={editState.ownerInfo.phone} onChange={e => setEditState({...editState, ownerInfo: {...editState.ownerInfo, phone: e.target.value}})} />
            </div>

            <h4>Resident Info</h4>
            <div className="form-group">
                <label>Resident Name</label>
                <input type="text" value={editState.residentInfo.name} onChange={e => setEditState({...editState, residentInfo: {...editState.residentInfo, name: e.target.value}})} />
            </div>
             <div className="form-group">
                <label>Resident Phone</label>
                <input type="tel" value={editState.residentInfo.phone} onChange={e => setEditState({...editState, residentInfo: {...editState.residentInfo, phone: e.target.value}})} />
            </div>

            <h4>Property Status</h4>
            <div className="form-group">
                <label>Dilapidation Notes</label>
                <textarea value={editState.dilapidationNotes} onChange={e => setEditState({...editState, dilapidationNotes: e.target.value})} />
            </div>
            <div className="form-group">
                <label>
                    <input type="checkbox" checked={editState.isVacant} onChange={e => setEditState({...editState, isVacant: e.target.checked})} />
                     Is Vacant
                </label>
            </div>
            <div className="button-group" style={{justifyContent: 'flex-end'}}>
                <button className="button secondary-action" onClick={onCancel}>Cancel</button>
                <button className="button primary-action" onClick={handleSave}>Save Changes</button>
            </div>
        </div>
    );
};


const PropertyDirectory: React.FC<{
    cases: Case[];
    properties: Property[];
    onSaveProperties: (properties: Property[]) => void;
    onSelectCase: (caseId: string) => void;
}> = ({ cases, properties, onSaveProperties, onSelectCase }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);

    // One-time migration from cases to properties if properties list is empty
    useEffect(() => {
        if (properties.length === 0 && cases.length > 0) {
            console.log("Performing one-time migration of cases to properties...");
            
            const addressToPropertyMap = new Map<string, Property>();
            const sortedCases = [...cases].sort((a, b) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime());

            for (const c of sortedCases) {
                const street = c.address.street.trim();
                if (!street) continue;

                // Always use the latest case's info for the property
                const newPropData: Property = {
                    id: addressToPropertyMap.get(street)?.id || self.crypto.randomUUID(),
                    streetAddress: street,
                    ownerInfo: c.ownerInfo,
                    isVacant: c.isVacant,
                    residentInfo: { name: '', phone: '' },
                    dilapidationNotes: '',
                };
                addressToPropertyMap.set(street.toLowerCase(), newPropData);
            }
            
            const newProperties = Array.from(addressToPropertyMap.values());
            onSaveProperties(newProperties);
        }
    }, [cases, properties.length, onSaveProperties]);

    const filteredProperties = useMemo(() => {
        const sorted = [...properties].sort((a, b) => compareStreets(a.streetAddress, b.streetAddress));
        if (!searchTerm) return sorted;
        const lowerSearch = searchTerm.toLowerCase();
        return sorted.filter(p =>
            p.streetAddress.toLowerCase().includes(lowerSearch) ||
            p.ownerInfo.name?.toLowerCase().includes(lowerSearch)
        );
    }, [properties, searchTerm]);
    
    const handleSave = (prop: Property) => {
        const updatedProperties = properties.map(p => p.id === prop.id ? prop : p);
        onSaveProperties(updatedProperties);
        setEditingPropertyId(null);
    };

    const handleDelete = (propId: string) => {
        if (window.confirm("Are you sure you want to delete this property record? This will not delete any associated cases.")) {
            const updatedProperties = properties.filter(p => p.id !== propId);
            onSaveProperties(updatedProperties);
        }
    };
    
    const editingProperty = properties.find(p => p.id === editingPropertyId);

    return (
        <div className="tab-content">
            <div className="search-bar">
                <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" placeholder="Search by address or owner..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            
            {editingPropertyId && editingProperty ? (
                <PropertyEditor property={editingProperty} onSave={handleSave} onCancel={() => setEditingPropertyId(null)} />
            ) : null}

            {filteredProperties.length > 0 ? (
                filteredProperties.map(prop => {
                    const linkedCases = cases.filter(c => c.address.street.toLowerCase() === prop.streetAddress.toLowerCase());
                    return (
                        <div key={prop.id} className="card" style={{marginTop: '1.5rem'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <div>
                                    <h3 style={{marginTop: 0, marginBottom: '0.25rem'}}>{prop.streetAddress}</h3>
                                    <span style={{color: 'var(--dark-gray)'}}>Owner: {prop.ownerInfo.name || 'N/A'}</span>
                                </div>
                                <div className="button-group">
                                    <button className="button" onClick={() => setEditingPropertyId(prop.id)}>Edit</button>
                                </div>
                            </div>
                            <div className="note" style={{marginTop: '1rem'}}>
                                <p><strong>Mailing Address:</strong> {prop.ownerInfo.mailingAddress || 'N/A'}</p>
                                <p><strong>Owner Phone:</strong> {prop.ownerInfo.phone || 'N/A'}</p>
                                <p><strong>Resident:</strong> {prop.residentInfo.name || 'N/A'} ({prop.residentInfo.phone || 'N/A'})</p>
                                <p><strong>Status:</strong> {prop.isVacant ? 'Vacant' : 'Occupied'}</p>
                                {prop.dilapidationNotes && <p><strong>Dilapidation Notes:</strong> {prop.dilapidationNotes}</p>}
                            </div>
                            
                            {linkedCases.length > 0 && (
                                <>
                                    <h4 style={{marginTop: '1.5rem'}}>Linked Cases ({linkedCases.length})</h4>
                                    {linkedCases.map(c => (
                                        <div key={c.id} className="report-case-item" onClick={() => onSelectCase(c.id)} style={{cursor: 'pointer'}}>
                                            <div className="info"><strong>{c.caseId}:</strong> {c.violation.type}</div>
                                            <div className="details">
                                                <span><strong>Created:</strong> {c.dateCreated}</span>
                                                <span><strong>Status:</strong> {c.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                             <button className="button danger-action" onClick={() => handleDelete(prop.id)} style={{marginTop: '1rem', float: 'right'}}>Delete Property</button>
                        </div>
                    );
                })
            ) : (
                <div className="card empty-state" style={{marginTop: '1.5rem'}}>
                    <p>{searchTerm ? 'No properties match your search.' : 'No properties found. Create a case to add a property.'}</p>
                </div>
            )}
        </div>
    );
};

export default PropertyDirectory;
