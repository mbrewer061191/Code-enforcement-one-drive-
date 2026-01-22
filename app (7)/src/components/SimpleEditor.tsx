import React, { useRef, useEffect } from 'react';

interface SimpleEditorProps {
    value: string;
    onChange: (html: string) => void;
}

const SimpleEditor: React.FC<SimpleEditorProps> = ({ value, onChange }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    // Initial load check
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, [value]); // Sync when value adds new placeholder

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (editorRef.current) editorRef.current.focus();
    };

    return (
        <div className="simple-editor" style={{ border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
            <div className="toolbar" style={{ background: '#f1f5f9', padding: '8px', borderBottom: '1px solid #ccc', display: 'flex', gap: '5px' }}>
                <button type="button" className="editor-btn" onClick={() => execCmd('bold')} style={{ fontWeight: 'bold' }}>B</button>
                <button type="button" className="editor-btn" onClick={() => execCmd('italic')} style={{ fontStyle: 'italic' }}>I</button>
                <button type="button" className="editor-btn" onClick={() => execCmd('underline')} style={{ textDecoration: 'underline' }}>U</button>
                <div style={{ width: '1px', background: '#ccc', margin: '0 5px' }}></div>
                <button type="button" className="editor-btn" onClick={() => execCmd('justifyLeft')}>Left</button>
                <button type="button" className="editor-btn" onClick={() => execCmd('justifyCenter')}>Center</button>
                <button type="button" className="editor-btn" onClick={() => execCmd('justifyRight')}>Right</button>
                <div style={{ width: '1px', background: '#ccc', margin: '0 5px' }}></div>
                <button type="button" className="editor-btn" onClick={() => execCmd('insertUnorderedList')}>• List</button>
            </div>

            <div
                ref={editorRef}
                contentEditable
                className="editor-content"
                onInput={handleInput}
                style={{
                    minHeight: '300px',
                    padding: '20px',
                    outline: 'none',
                    lineHeight: '1.5',
                    fontFamily: '"Times New Roman", serif',
                    fontSize: '16px',
                    whiteSpace: 'pre-wrap'
                }}
            />

            <style>{`
                .editor-btn {
                    background: white;
                    border: 1px solid #cbd5e1;
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    min-width: 30px;
                }
                .editor-btn:hover {
                    background: #e2e8f0;
                }
                .editor-content:focus {
                    background: #fdfdfd;
                }
            `}</style>
        </div>
    );
};

export default SimpleEditor;
