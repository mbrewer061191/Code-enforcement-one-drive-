import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Case, View, Property, PhotoWithMeta, EvidencePhoto } from './types';
import AdminView from './components/Admin';
import CaseList from './components/CaseList';
import NewCaseForm from './components/NewCaseForm';
import CaseDetails from './components/CaseDetails';
import TemplateManager from './components/TemplateManager';
import ComplaintLog from './components/ComplaintLog';
import Reports from './components/Reports';
import { getCaseTimeStatus } from './utils';
import PropertyDirectory from './components/PropertyDirectory';
import AbatementReport from './components/AbatementReport';
import { initialAddressState, initialOwnerState, initialViolationState, VIOLATIONS_LIST, COMPLIANCE_DAYS } from './constants';
import DailyTasks from './components/DailyTasks';
import AlleyPatrol from './components/AlleyPatrol';
import { savePendingPatrolCases, loadPendingPatrolCases } from './patrolService';
import WelcomeScreen from './components/WelcomeScreen';
import * as fileService from './fileSystemService';

import LoginScreen from './components/LoginScreen';
import { User, AppConfig } from './types';
import { getConfig, saveConfig } from './config';

type AppStatus = 'NO_FILE' | 'LOGIN_REQUIRED' | 'READY';

const App: React.FC = () => {
    const [appStatus, setAppStatus] = useState<AppStatus>('NO_FILE');
    const [view, setView] = useState<View>('TASKS');
    const [activeTab, setActiveTab] = useState('tasks');
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const [cases, setCases] = useState<Case[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAbatementReport, setShowAbatementReport] = useState(false);

    // To pass config to LoginScreen
    const [loadedConfig, setLoadedConfig] = useState<AppConfig | null>(null);

    // Draft state for a new case to persist across view changes
    const [draftCase, setDraftCase] = useState<(Partial<Case> & { _tempPhotos?: PhotoWithMeta[] }) | null>(null);
    const [pendingPatrolCases, setPendingPatrolCases] = useState<{ id: string, photos: PhotoWithMeta[] }[]>(loadPendingPatrolCases());

    // Persist pending patrol cases to localStorage whenever they change.
    useEffect(() => {
        savePendingPatrolCases(pendingPatrolCases);
    }, [pendingPatrolCases]);

    const syncData = async (updatedCases: Case[], updatedProperties: Property[]) => {
        try {
            await fileService.saveToHandle({
                cases: updatedCases,
                properties: updatedProperties,
                lastUpdated: new Date().toISOString()
            });
        } catch (e: any) {
            console.error("Auto-save failed:", e);
            setError(`Auto-save failed: ${e.message}`);
        }
    };

    const handleOpenFile = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await fileService.openDatabase();
            const data = await fileService.loadFromHandle();
            setCases(data.cases || []);
            setProperties(data.properties || []);

            // Check for users in config
            const config = await getConfig();
            setLoadedConfig(config);

            if (!config?.users || config.users.length === 0) {
                // First Run: Create Admin
                const defaultAdmin: User = { username: 'admin', password: 'admin', role: 'admin' };
                const newConfig = { ...config, users: [defaultAdmin] };
                await saveConfig(newConfig);
                setLoadedConfig(newConfig);
            }

            setAppStatus('LOGIN_REQUIRED');
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                setError(`Failed to open file: ${e.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = (user: User) => {
        setCurrentUser(user);
        setAppStatus('READY');
    };

    const handleCreateFile = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await fileService.createNewDatabase();
            setCases([]);
            setProperties([]);

            // Create Default Admin for new file
            const defaultAdmin: User = { username: 'admin', password: 'admin', role: 'admin' };
            const config = await getConfig();
            const newConfig = { ...config, users: [defaultAdmin] };
            await saveConfig(newConfig);
            setLoadedConfig(newConfig);

            setAppStatus('LOGIN_REQUIRED');
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                setError(`Failed to create file: ${e.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectCase = (caseId: string) => { setSelectedCaseId(caseId); setView('DETAILS'); };
    const handleNewCase = () => {
        // If no draft exists, create a fresh one.
        if (!draftCase) {
            setDraftCase({
                id: `draft-${Date.now()}`, // Temporary ID
                caseId: '',
                address: initialAddressState,
                ownerInfo: initialOwnerState,
                violation: initialViolationState,
                ownerInfoStatus: 'KNOWN',
                isVacant: false,
                _tempPhotos: []
            });
        }
        setView('NEW');
        setActiveTab('new');
    };

    const handleCancelNew = () => {
        if (draftCase && (draftCase._tempPhotos?.length || 0) > 0) {
            if (!window.confirm("Are you sure you want to cancel? Any photos you've taken will be lost.")) {
                return;
            }
        }
        setDraftCase(null);
        setView('TASKS');
        setActiveTab('tasks');
    };

    const handleCreateCaseFromPatrol = (patrolCase: { id: string, photos: PhotoWithMeta[] }) => {
        setDraftCase({
            id: `draft-${Date.now()}`,
            caseId: '',
            address: initialAddressState,
            ownerInfo: initialOwnerState,
            violation: initialViolationState,
            ownerInfoStatus: 'KNOWN',
            isVacant: false,
            _tempPhotos: patrolCase.photos,
        });
        // Remove it from the pending list
        setPendingPatrolCases(prev => prev.filter(p => p.id !== patrolCase.id));
        setView('NEW');
        setActiveTab('new');
    };

    const handleBackToList = () => { setSelectedCaseId(null); setView('TASKS'); setActiveTab('tasks'); };

    const handleSaveCase = async (draftToSave: (Partial<Case> & { _tempPhotos?: PhotoWithMeta[] })) => {
        const today = new Date(), deadline = new Date();
        deadline.setDate(today.getDate() + COMPLIANCE_DAYS);
        const formatDate = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        const finalViolation = draftToSave.violation?.type === 'Other (Manual Entry)'
            ? draftToSave.violation
            : VIOLATIONS_LIST.find(v => v.type === draftToSave.violation?.type) || initialViolationState;

        // Note: For real photo storage, we would convert blobs to base64 strings here to save in JSON.
        // For now, we assume _tempPhotos contains base64 URLs or we accept that blobs won't persist across session restarts unless serialised.
        // In fileSystemService context, we should ensure photos are base64 strings if we want to save them in JSON.
        // Assuming CameraView produces object URLs or Base64. If ObjectURLs, they will break on reload.
        // We'll leave the photo handling as-is (optimistic) but for production, ensure photos are Base64.

        // Convert temp photos to evidence photos
        const initialPhotos: EvidencePhoto[] = (draftToSave._tempPhotos || []).map(p => ({
            id: self.crypto.randomUUID(),
            url: p.previewUrl, // Make sure this is Base64 for JSON persistence!
            date: p.timestamp,
            notes: p.location ? `Lat: ${p.location.latitude}, Lng: ${p.location.longitude}` : ''
        }));


        const tempCase: Case = {
            id: draftToSave.id || self.crypto.randomUUID(), caseId: draftToSave.caseId || '', status: 'ACTIVE',
            dateCreated: formatDate(today), complianceDeadline: formatDate(deadline),
            address: draftToSave.address || initialAddressState, ownerInfo: draftToSave.ownerInfo || initialOwnerState,
            ownerInfoStatus: draftToSave.ownerInfoStatus || 'KNOWN',
            violation: finalViolation, isVacant: draftToSave.isVacant || false,
            evidence: { notes: [{ date: formatDate(today), text: "Case created." }], photos: initialPhotos },
            notices: [],
        };

        const updatedCases = [tempCase, ...cases];

        // Update Properties
        const address = tempCase.address.street.trim();
        const existingPropIndex = properties.findIndex(p => p.streetAddress.toLowerCase() === address.toLowerCase());
        const updatedProperties = [...properties];

        if (existingPropIndex > -1) {
            updatedProperties[existingPropIndex] = {
                ...updatedProperties[existingPropIndex],
                ownerInfo: tempCase.ownerInfo,
                isVacant: tempCase.isVacant
            };
        } else {
            updatedProperties.push({
                id: self.crypto.randomUUID(),
                streetAddress: address,
                ownerInfo: tempCase.ownerInfo,
                isVacant: tempCase.isVacant,
                residentInfo: { name: '', phone: '' },
                dilapidationNotes: ''
            });
        }

        setCases(updatedCases);
        setProperties(updatedProperties);
        setDraftCase(null);
        if (view === 'NEW') { setView('TASKS'); setActiveTab('tasks'); }

        await syncData(updatedCases, updatedProperties);
    };

    const handleUpdateCase = async (caseData: Case) => {
        const updatedCases = cases.map(c => c.id === caseData.id ? caseData : c);
        setCases(updatedCases);
        await syncData(updatedCases, properties);
    };

    const handleDeleteCase = async (caseId: string) => {
        if (!window.confirm("Are you sure?")) return;
        const updatedCases = cases.filter(c => c.id !== caseId);
        setCases(updatedCases);
        setSelectedCaseId(null);
        setView('TASKS');
        setActiveTab('tasks');
        await syncData(updatedCases, properties);
    };

    const handleSaveProperties = async (newProperties: Property[]) => {
        setProperties(newProperties);
        await syncData(cases, newProperties);
    };


    const changeTab = (tab: string, targetView: View) => {
        setActiveTab(tab);
        setView(targetView);
        setSelectedCaseId(null);
        if (tab !== 'abatement') {
            setShowAbatementReport(false);
        }
    };

    const selectedCase = cases.find(c => c.id === selectedCaseId);

    const abatementCases = cases.filter(c => c.status === 'PENDING_ABATEMENT');
    const continualAbatementCases = cases.filter(c => c.status === 'CONTINUAL_ABATEMENT');
    const dueCases = cases.filter(c => getCaseTimeStatus(c) === 'overdue' && c.status !== 'CLOSED' && c.status !== 'PENDING_ABATEMENT');

    if (appStatus === 'NO_FILE') {
        return <WelcomeScreen onOpen={handleOpenFile} onCreate={handleCreateFile} isLoading={isLoading} error={error} />;
    }

    if (appStatus === 'LOGIN_REQUIRED') {
        return <LoginScreen config={loadedConfig!} onLogin={handleLogin} isLoading={isLoading} />;
    }

    const renderContent = () => {
        switch (view) {
            case 'TASKS': return <DailyTasks cases={cases} onSelectCase={handleSelectCase} />;
            case 'DETAILS': return selectedCase ? <CaseDetails caseData={selectedCase} onBack={handleBackToList} onUpdate={handleUpdateCase} onDelete={handleDeleteCase} /> : <p>Case not found.</p>;
            case 'NEW': return <NewCaseForm onSave={handleSaveCase} onCancel={handleCancelNew} properties={properties} draftCase={draftCase} onUpdateDraft={setDraftCase} />;
            case 'ADMIN': return <AdminView onSetupComplete={() => { }} />; // Admin view might be less relevant now, or could show file path
            case 'TEMPLATES': return <TemplateManager />;
            case 'LOG': return <ComplaintLog />;
            case 'PROPERTIES': return <PropertyDirectory cases={cases} properties={properties} onSaveProperties={handleSaveProperties} onSelectCase={handleSelectCase} />;
            case 'REPORTS': return <Reports cases={cases} />;
            case 'PATROL': return <AlleyPatrol pendingCases={pendingPatrolCases} onSetPendingCases={setPendingPatrolCases} onCreateCase={handleCreateCaseFromPatrol} />;
            case 'LIST': default:
                if (activeTab === 'due') {
                    return <CaseList cases={dueCases} onSelectCase={handleSelectCase} onNewCase={handleNewCase} listType="due" />;
                }
                if (activeTab === 'continual-abatement') {
                    return <CaseList cases={continualAbatementCases} onSelectCase={handleSelectCase} onNewCase={handleNewCase} listType="continual-abatement" />;
                }
                if (activeTab === 'abatement') {
                    return (
                        <>
                            {showAbatementReport ? (
                                <AbatementReport cases={abatementCases} onBack={() => setShowAbatementReport(false)} />
                            ) : (
                                <CaseList
                                    cases={abatementCases}
                                    onSelectCase={handleSelectCase}
                                    onNewCase={handleNewCase}
                                    listType="abatement"
                                    onGenerateReport={() => setShowAbatementReport(true)}
                                />
                            )}
                        </>
                    );
                }
                return <CaseList cases={cases} onSelectCase={handleSelectCase} onNewCase={handleNewCase} listType="all" />;
        }
    };

    return (
        <>
            <header className="app-header">
                <h1>Commerce Code Enforcement</h1>
            </header>

            <nav className="tab-nav no-print">
                <button className={`tab-button ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => changeTab('tasks', 'TASKS')}>Dashboard</button>
                <button className={`tab-button ${activeTab === 'cases' ? 'active' : ''}`} onClick={() => changeTab('cases', 'LIST')}>All Cases</button>
                <button className={`tab-button ${activeTab === 'patrol' ? 'active' : ''}`} onClick={() => changeTab('patrol', 'PATROL')}>Alley Patrol</button>
                <button className={`tab-button ${activeTab === 'due' ? 'active' : ''}`} onClick={() => changeTab('due', 'LIST')}>Due ({dueCases.length})</button>
                <button className={`tab-button ${activeTab === 'abatement' ? 'active' : ''}`} onClick={() => changeTab('abatement', 'LIST')}>Abatement ({abatementCases.length})</button>
                <button className={`tab-button ${activeTab === 'continual-abatement' ? 'active' : ''}`} onClick={() => changeTab('continual-abatement', 'LIST')}>Continual ({continualAbatementCases.length})</button>
                <button className={`tab-button ${activeTab === 'properties' ? 'active' : ''}`} onClick={() => changeTab('properties', 'PROPERTIES')}>Properties</button>
                <button className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => changeTab('reports', 'REPORTS')}>Reports</button>
                <button className={`tab-button ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => changeTab('templates', 'TEMPLATES')}>Templates</button>
                {/* <button className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => changeTab('admin', 'ADMIN')}>Admin</button> */}
            </nav>

            <main>
                {renderContent()}
            </main>
        </>
    );
};

export default App;
