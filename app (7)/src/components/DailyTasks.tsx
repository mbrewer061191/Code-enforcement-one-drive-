import React, { useState, useEffect, useMemo } from 'react';
import { Case } from '../types';
import { STREET_ORDER } from '../utils';
import * as dailyTaskService from '../dailyTaskService';
import { DailyProgress } from '../dailyTaskService';

interface DailyTasksProps {
    cases: Case[];
    onSelectCase: (caseId: string) => void;
}

const TaskItem: React.FC<{
    title: string;
    subtext?: string;
    onClick: () => void;
    statusClass?: string;
}> = ({ title, subtext, onClick, statusClass }) => (
    <div className={`case-item ${statusClass || ''}`} onClick={onClick} role="button" tabIndex={0}>
        <div className="case-info">
            <strong>{title}</strong>
            {subtext && <span>{subtext}</span>}
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }}><polyline points="9 18 15 12 9 6"></polyline></svg>
    </div>
);


const DailyTasks: React.FC<DailyTasksProps> = ({ cases, onSelectCase }) => {
    const [patrolIndex, setPatrolIndex] = useState(dailyTaskService.getPatrolState().lastCompletedIndex);
    const [todaysProgress, setTodaysProgress] = useState<DailyProgress>(dailyTaskService.getTodaysProgress());
    const [showAllPatrol, setShowAllPatrol] = useState(false);

    // State for Certificate of Mail generation
    const [certQueue, setCertQueue] = useState<string[]>(dailyTaskService.getCertMailQueue());
    const [isGeneratingCert, setIsGeneratingCert] = useState(false);
    const [certError, setCertError] = useState('');
    const [certSuccess, setCertSuccess] = useState('');

    // Refresh state from storage when the view becomes active again
    useEffect(() => {
        const refreshState = () => {
            const latestProgress = dailyTaskService.getTodaysProgress();
            // Use functional updates to prevent stale state issues
            setTodaysProgress(current => JSON.stringify(latestProgress) !== JSON.stringify(current) ? latestProgress : current);

            const latestQueue = dailyTaskService.getCertMailQueue();
            setCertQueue(current => JSON.stringify(latestQueue) !== JSON.stringify(current) ? latestQueue : current);
        };

        window.addEventListener('focus', refreshState);
        return () => window.removeEventListener('focus', refreshState);
    }, []);


    const casesForCert = useMemo(() => {
        return cases.filter(c => certQueue.includes(c.id));
    }, [certQueue, cases]);

    const handleGenerateCertificate = async () => {
        if (casesForCert.length === 0) return;
        setIsGeneratingCert(true);
        setCertError('');
        setCertSuccess('');
        try {
            // Client-side print generation instead of Google Doc
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                        <head><title>Certificate of Mail</title></head>
                        <body style="font-family: sans-serif; padding: 2rem;">
                            <h1>Certificate of Mailing</h1>
                            <p>Date: ${new Date().toLocaleDateString()}</p>
                            <ul>
                                ${casesForCert.map(c => `<li>${c.address.street} - ${c.caseId}</li>`).join('')}
                            </ul>
                            <script>window.print();</script>
                        </body>
                    </html>
                `);
                printWindow.document.close();
            }

            setCertSuccess(`Successfully generated certificate for ${casesForCert.length} cases.`);
            dailyTaskService.clearCertMailQueue();
            setCertQueue([]);
        } catch (e: any) {
            setCertError(`Failed to generate certificate: ${e.message}`);
        } finally {
            setIsGeneratingCert(false);
        }
    };

    const handleRemoveFromQueue = (caseId: string) => {
        dailyTaskService.removeFromCertMailQueue(caseId);
        setCertQueue(current => current.filter(id => id !== caseId));
    };

    const handleAdvancePatrol = () => {
        dailyTaskService.advancePatrol(STREET_ORDER.length);
        setPatrolIndex(dailyTaskService.getPatrolState().lastCompletedIndex);
        setTodaysProgress(dailyTaskService.getTodaysProgress());
    };

    const handleStreetToggle = (street: string, checked: boolean) => {
        dailyTaskService.markStreetComplete(street, checked);
        setTodaysProgress(dailyTaskService.getTodaysProgress());
    };

    const handleEnvelopeToggle = (caseId: string, isComplete: boolean) => {
        dailyTaskService.setTaskComplete(caseId, 'envelope', isComplete);
        setTodaysProgress(dailyTaskService.getTodaysProgress());
    };

    // --- Task List Calculations ---
    const now = new Date();
    const sevenDaysAgo = new Date(new Date().setDate(now.getDate() - 7));

    const newCases = cases.filter(c =>
        new Date(c.dateCreated) >= sevenDaysAgo && c.status !== 'CLOSED'
    ).sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());

    const newCaseTasks = newCases.map(c => {
        const progress = todaysProgress.completedCaseTasks[c.id] || [];
        const noticeDone = c.notices.length > 0 || progress.includes('notice');
        const envelopeDone = progress.includes('envelope');
        return { ...c, noticeDone, envelopeDone, isComplete: noticeDone && envelopeDone };
    }).filter(c => !c.isComplete);

    const dueCases = cases.filter(c => {
        const deadline = new Date(c.complianceDeadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return deadline < today && c.status !== 'CLOSED' && c.status !== 'PENDING_ABATEMENT';
    });

    const abatementCases = cases.filter(c => c.status === 'PENDING_ABATEMENT');

    // --- Patrol Logic ---
    // Handle the initial state where index is -1
    const currentPatrolIndex = patrolIndex === -1 ? 0 : patrolIndex;
    const streetsForPatrol = STREET_ORDER.slice(currentPatrolIndex, currentPatrolIndex + 3);

    return (
        <div className="tab-content">
            <style>{`
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                    gap: 1.5rem;
                }
                .task-card {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                .task-card h2 { 
                    font-size: 1.1rem;
                    color: var(--text-primary);
                    margin-bottom: 1rem;
                }
                .task-count { 
                    font-size: 0.8rem; 
                    background-color: var(--secondary-color); 
                    color: white; 
                    padding: 0.15rem 0.5rem; 
                    border-radius: 999px; 
                    font-weight: 600;
                }
                .task-list { 
                    display: flex; 
                    flex-direction: column; 
                    gap: 0.75rem; 
                    flex-grow: 1;
                }
                .task-item { 
                    display: flex; 
                    align-items: center; 
                    justify-content: space-between; 
                    background: var(--surface-hover); 
                    padding: 0.75rem; 
                    border-radius: var(--radius-md); 
                    border: 1px solid var(--border-color);
                }
                .subtask-list { 
                    margin-top: 0.5rem; 
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                .subtask-item { 
                    display: flex; 
                    align-items: center; 
                    gap: 0.5rem; 
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                }
                .subtask-item input { 
                    width: 1rem; 
                    height: 1rem; 
                    accent-color: var(--secondary-color);
                }
                .patrol-street { 
                    display: flex; 
                    align-items: center; 
                    gap: 0.75rem; 
                    font-size: 1rem; 
                    padding: 0.75rem;
                    background-color: var(--surface-hover);
                    border-radius: var(--radius-md);
                    margin-bottom: 0.5rem;
                }
                .patrol-street label { flex-grow: 1; cursor: pointer; font-weight: 500; }
                .patrol-street input { width: 1.25rem; height: 1.25rem; flex-shrink: 0; accent-color: var(--secondary-color); cursor: pointer; }
                .completed-task { text-decoration: line-through; color: var(--text-tertiary); }
            `}</style>

            <div className="dashboard-grid">
                {/* Column 1: Immediate Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card task-card">
                        <h2><span>Daily Patrol Route</span></h2>
                        <div className="task-list">
                            {streetsForPatrol.map(street => (
                                <div key={street} className="patrol-street">
                                    <input
                                        type="checkbox"
                                        id={`street-${street}`}
                                        checked={todaysProgress.completedStreets.includes(street)}
                                        onChange={e => handleStreetToggle(street, e.target.checked)}
                                    />
                                    <label htmlFor={`street-${street}`} className={todaysProgress.completedStreets.includes(street) ? 'completed-task' : ''}>
                                        {street.toUpperCase()}
                                    </label>
                                </div>
                            ))}
                        </div>
                        <div className="button-group" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                            <button className="button full-width" onClick={handleAdvancePatrol}>Next Streets</button>
                            <button className="button secondary-action" onClick={() => setShowAllPatrol(!showAllPatrol)}>{showAllPatrol ? 'Hide List' : 'Full List'}</button>
                        </div>
                        {showAllPatrol && (
                            <div className="info-box" style={{ marginTop: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
                                <h4 style={{ marginTop: 0, fontSize: '0.9rem' }}>Full Route Order</h4>
                                <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
                                    {STREET_ORDER.map((s, i) => <li key={s} style={{ fontWeight: i >= currentPatrolIndex && i < currentPatrolIndex + 3 ? 'bold' : 'normal', color: i < currentPatrolIndex ? 'var(--text-tertiary)' : 'inherit' }}>{s.toUpperCase()}</li>)}
                                </ol>
                            </div>
                        )}
                    </div>

                    <div className="card task-card">
                        <h2><span>New Case Processing</span> <span className="task-count">{newCaseTasks.length}</span></h2>
                        <div className="task-list">
                            {newCaseTasks.length > 0 ? newCaseTasks.map(c => (
                                <div key={c.id} className="task-item">
                                    <div style={{ flexGrow: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <strong style={{ cursor: 'pointer', color: 'var(--secondary-color)' }} onClick={() => onSelectCase(c.id)}>{c.address.street}</strong>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{new Date(c.dateCreated).toLocaleDateString()}</span>
                                        </div>
                                        <div className="subtask-list">
                                            <div className={`subtask-item ${c.noticeDone ? 'completed-task' : ''}`}>
                                                <input type="checkbox" checked={c.noticeDone} readOnly />
                                                <span>Generate Initial Notice</span>
                                            </div>
                                            <div className={`subtask-item ${c.envelopeDone ? 'completed-task' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={c.envelopeDone}
                                                    onChange={(e) => handleEnvelopeToggle(c.id, e.target.checked)}
                                                />
                                                <span>Print Envelope</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )) : <div className="empty-state" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>All new cases processed.</div>}
                        </div>
                    </div>
                </div>

                {/* Column 2: Follow-ups & Admin */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card task-card">
                        <h2><span>Due Date Follow-up</span> <span className="task-count" style={{ backgroundColor: 'var(--danger-color)' }}>{dueCases.length}</span></h2>
                        <div className="task-list">
                            {dueCases.length > 0 ? dueCases.map(c => (
                                <TaskItem
                                    key={c.id}
                                    title={c.address.street}
                                    subtext={`Due: ${c.complianceDeadline}`}
                                    onClick={() => onSelectCase(c.id)}
                                    statusClass="overdue"
                                />
                            )) : <div className="empty-state" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No cases due for follow-up.</div>}
                        </div>
                    </div>

                    <div className="card task-card">
                        <h2><span>Pending Abatement</span> <span className="task-count" style={{ backgroundColor: 'var(--abatement-color)' }}>{abatementCases.length}</span></h2>
                        <div className="task-list">
                            {abatementCases.length > 0 ? abatementCases.map(c => (
                                <TaskItem
                                    key={c.id}
                                    title={c.address.street}
                                    subtext={`Violation: ${c.violation.type}`}
                                    onClick={() => onSelectCase(c.id)}
                                    statusClass="abatement"
                                />
                            )) : <div className="empty-state" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No cases pending abatement.</div>}
                        </div>
                    </div>

                    <div className="card task-card">
                        <h2>Mailing Queue</h2>
                        <div className="task-list">
                            <button className="button full-width" onClick={handleGenerateCertificate} disabled={isGeneratingCert || casesForCert.length === 0}>
                                {isGeneratingCert ? <span className="loader" style={{ width: '1em', height: '1em', borderTopColor: 'white' }} /> : `Generate Certificates (${casesForCert.length})`}
                            </button>
                            {certSuccess && <div className="success-message" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{certSuccess}</div>}
                            {certError && <div className="error-message" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{certError}</div>}

                            {casesForCert.length > 0 ? (
                                <div style={{ marginTop: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
                                    {casesForCert.map(c => (
                                        <div key={c.id} className="copyable-row" style={{ marginTop: '0.5rem', padding: '0.5rem' }}>
                                            <span style={{ fontSize: '0.85rem' }}>{c.address.street}</span>
                                            <button className="button danger-action" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', minHeight: 'auto' }} onClick={() => handleRemoveFromQueue(c.id)}>Remove</button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="helper-text" style={{ textAlign: 'center', marginTop: '1rem' }}>Queue is empty.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyTasks;