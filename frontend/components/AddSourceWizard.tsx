'use client';

import { useState, useEffect } from 'react';
import { connectSource, testSource, connectDemoSource, uploadFile as uploadFileApi, fetchSampleCreds } from '@/lib/api';
import type { DataSource } from '@/lib/types';
import { useOnboarding } from '@/hooks/useOnboarding';

interface AddSourceWizardProps {
  sessionId: string;
  onClose: () => void;
  onAdded: (s: DataSource) => void;
}

export function AddSourceWizard({ sessionId, onClose, onAdded }: AddSourceWizardProps) {
  const [step, setStep] = useState(1);
  const { nextStep, currentStep } = useOnboarding();
  const [selectedType, setSelectedType] = useState<string>('');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [sourceName, setSourceName] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectingDemo, setConnectingDemo] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [error, setError] = useState('');

  const SOURCE_TYPES = [
    { id: 'postgresql', label: 'PostgreSQL', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg' },
    { id: 'mysql', label: 'MySQL', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg' },
    { id: 'sqlite', label: 'SQLite', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sqlite/sqlite-original.svg' },
    { id: 'csv', label: 'CSV', icon: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/files.svg' },
    { id: 'excel', label: 'Excel', icon: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/microsoftexcel.svg' },
  ];

  useEffect(() => {
    setConfig({});
    setSourceName('');
    setTestResult(null);
    setAvailableTables([]);
    setSelectedTables([]);
    setSelectedFile(null);
    setError('');
  }, [selectedType]);

  const isFileType = selectedType === 'csv' || selectedType === 'excel';

  const handleFindTables = async () => {
    setTesting(true);
    setError('');
    try {
      const result = await testSource(selectedType, config);
      setTestResult(result);
      if (result.success) {
        if (result.tables && result.tables.length > 0) {
          setAvailableTables(result.tables);
          setSelectedTables(result.tables);
          setStep(3);
        } else {
          handleConnect();
        }
      } else {
        setError(result.error || 'Connection failed');
      }
    } catch {
      setError('Connection failed');
    }
    setTesting(false);
  };

  const handleConnect = async () => {
    setConnecting(true);
    setConnectingDemo(false);
    setError('');
    try {
      let result;
      if (isFileType && selectedFile) {
        result = await uploadFileApi(selectedFile, sessionId);
      } else {
        result = await connectSource(
          selectedType,
          config,
          sourceName || config.database || 'my_source',
          sessionId,
          selectedTables.length > 0 ? selectedTables : undefined
        );
      }
      if (result.error) {
        setError(result.error);
      } else {
        setPreview(result);
        setStep(4);
      }
    } catch {
      setError('Failed to connect');
    }
    setConnecting(false);
    setConnectingDemo(false);
  };

  const handleConnectDemo = async () => {
    setConnectingDemo(true);
    setError('');
    try {
      if (selectedType === 'csv' || selectedType === 'excel') {
        const result = await connectDemoSource(sessionId, 'csv');
        if (result.error) setError(result.error);
        else { setPreview(result); setStep(4); }
      } else {
        const data = await fetchSampleCreds(selectedType);
        if (data.error) {
          setError(data.error);
        } else {
          // Auto-fill form state
          if (data.source_name) setSourceName(data.source_name);
          const newConfig = { ...config };
          if (data.host) newConfig.host = data.host;
          if (data.port) newConfig.port = data.port.toString();
          if (data.database) newConfig.database = data.database;
          if (data.username) newConfig.username = data.username;
          if (data.password) newConfig.password = data.password;
          setConfig(newConfig);
        }
      }
    } catch {
      setError('Failed to retrieve sample credentials');
    }
    setConnectingDemo(false);
  };

  const handleSave = () => {
    if (preview) onAdded(preview);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(7,9,12,0.85)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="mobile-modal" style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 16,
        width: '100%',
        maxWidth: 560,
        padding: '2rem',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: 0, fontSize: '1.25rem' }}>
              Add Data Source
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '4px 0 0' }}>
              Step {step} of 4
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem' }}
          >
            ✕
          </button>
        </div>

        {step === 1 && (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>
              Choose your data source type:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: '1.5rem' }}>
              {SOURCE_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  style={{
                    background: selectedType === t.id ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                    border: `1px solid ${selectedType === t.id ? 'var(--accent)' : 'var(--border-default)'}`,
                    borderRadius: 10,
                    padding: '0.75rem 0.5rem',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: 28, height: 28, margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={t.icon} alt={t.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                    {t.label}
                  </div>
                </button>
              ))}
            </div>
            <button
              className="btn-primary"
              disabled={!selectedType}
              onClick={() => { setStep(2); if (currentStep === 2) nextStep(); }}
              style={{ width: '100%' }}
            >
              Continue →
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            {isFileType ? (
              <div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  Upload your {selectedType.toUpperCase()} file:
                </p>
                <div
                  style={{
                    border: '2px dashed var(--border-default)',
                    borderRadius: 10,
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    marginBottom: '1rem',
                    background: selectedFile ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      cursor: 'pointer',
                      zIndex: 10
                    }}
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                      e.target.value = '';
                    }}
                  />
                  {selectedFile ? (
                    <div className="animate-fade-in" style={{ position: 'relative', zIndex: 5 }}>
                      <p style={{ color: 'var(--accent)', margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>✓</p>
                      <p style={{ color: 'var(--text-primary)', margin: '4px 0 0', fontSize: '0.9375rem', fontWeight: 500 }}>
                        {selectedFile.name}
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>
                        Click or drag to change file
                      </p>
                    </div>
                  ) : (
                    <div style={{ position: 'relative', zIndex: 5 }}>
                      <div style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.6 }}>
                        <img src="https://cdn.jsdelivr.net/npm/@tabler/icons/icons/folder.svg" alt="upload" style={{ width: '100%', height: '100%' }} />
                      </div>
                      <p style={{ color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>
                        Drop your CSV file here
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>
                        or click to browse from computer
                      </p>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1rem' }}>
                {['Source Name', 'Host', 'Port', 'Database', 'Username', 'Password'].map(field => {
                  const key = field.toLowerCase().replace(' ', '_');
                  return (
                    <div key={field}>
                      <label style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', display: 'block', marginBottom: 4 }}>
                        {field}
                      </label>
                      <input
                        type={field === 'Password' ? 'password' : 'text'}
                        placeholder={
                          field === 'Port' ? (selectedType === 'postgresql' ? '5432' : '3306') :
                            field === 'Host' ? 'localhost' :
                              field === 'Source Name' ? 'my_database' : ''
                        }
                        value={key === 'source_name' ? sourceName : (config[key] || '')}
                        onChange={e => {
                          if (key === 'source_name') setSourceName(e.target.value);
                          else setConfig(prev => ({ ...prev, [key]: e.target.value }));
                        }}
                        style={{
                          width: '100%',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-default)',
                          borderRadius: 7,
                          padding: '0.5rem 0.75rem',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.875rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '1.5rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                Don't have a source? Use our pre-loaded sample data:
              </p>
              <button
                data-tour="wizard-sample"
                className="btn-ghost"
                onClick={handleConnectDemo}
                disabled={connecting}
                style={{
                  width: '100%',
                  borderStyle: 'dashed',
                  color: 'var(--accent)',
                  padding: '0.75rem'
                }}
              >
                {connectingDemo ? 'Fetching Credentials...' : 
                 selectedType === 'postgresql' ? 'Fill with Supabase Sample' :
                 selectedType === 'mysql' ? 'Fill with TiDB Sample' :
                 (selectedType === 'sqlite' || selectedType === 'csv') ? 'Fill with Industry Sample' :
                 'Use "Monthly Revenue" Sample Data'}
              </button>
            </div>

            {error && (
              <div style={{
                padding: '0.75rem',
                borderRadius: 8,
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid #f87171',
                marginBottom: '1rem',
                fontSize: '0.8125rem',
                color: '#f87171',
                textAlign: 'center'
              }}>
                {`✗ ${error}`}
              </div>
            )}



            {testResult && !testResult.success && (
              <div style={{
                padding: '0.75rem',
                borderRadius: 8,
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid #f87171',
                marginBottom: '1rem',
                fontSize: '0.8125rem',
                color: '#f87171',
              }}>
                {`✗ ${testResult.error}`}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>
                ← Back
              </button>
              <button
                className="btn-primary"
                onClick={isFileType ? handleConnect : handleFindTables}
                disabled={testing || connecting || (isFileType && !selectedFile)}
                style={{ flex: 1 }}
              >
                {testing || connecting ? 'Searching...' : isFileType ? 'Connect →' : 'Find Tables →'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
              We found <strong style={{ color: 'var(--accent)' }}>{availableTables.length}</strong> tables in this database. Pick which ones to include:
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Available Tables
                </span>
                <button
                  onClick={() => {
                    if (selectedTables.length === availableTables.length) setSelectedTables([]);
                    else setSelectedTables(availableTables);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  {selectedTables.length === availableTables.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div style={{
                maxHeight: 260, overflowY: 'auto',
                border: '1px solid var(--border-default)', borderRadius: 12,
                background: 'var(--bg-elevated)', padding: '6px'
              }}>
                {availableTables.map(table => (
                  <label key={table} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    cursor: 'pointer', borderRadius: 8, transition: 'background 0.1s',
                    background: selectedTables.includes(table) ? 'rgba(52,211,153,0.06)' : 'transparent',
                    marginBottom: 2
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedTables.includes(table)}
                      onChange={() => {
                        setSelectedTables(prev =>
                          prev.includes(table) ? prev.filter(t => t !== table) : [...prev, table]
                        );
                      }}
                      style={{
                        width: 16, height: 16, cursor: 'pointer',
                        accentColor: 'var(--accent)'
                      }}
                    />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {table}
                    </span>
                  </label>
                ))}
              </div>

              {selectedTables.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                  <img src="https://cdn.jsdelivr.net/npm/@tabler/icons/icons/alert-triangle.svg" alt="warning" style={{ width: 14, height: 14 }} />
                  <p style={{ color: 'var(--error)', fontSize: '0.75rem', margin: 0 }}>
                    Please select at least one table to continue.
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" onClick={() => setStep(2)} style={{ flex: 1 }}>
                ← Edit Config
              </button>
              <button
                className="btn-primary"
                onClick={handleConnect}
                disabled={connecting || selectedTables.length === 0}
                style={{ flex: 1 }}
              >
                {connecting ? 'Connecting...' : `Connect ${selectedTables.length} ${selectedTables.length === 1 ? 'Table' : 'Tables'} →`}
              </button>
            </div>
          </div>
        )}

        {step === 4 && preview && (
          <div>
            <div style={{
              padding: '1rem',
              background: 'rgba(52,211,153,0.08)',
              border: '1px solid #34d399',
              borderRadius: 8,
              marginBottom: '1rem',
            }}>
              <p style={{ color: '#34d399', margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>
                ✓ Connected! Found {preview.table_count} {preview.table_count === 1 ? 'table' : 'tables'}.
              </p>
            </div>

            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              marginBottom: '1.5rem',
              maxHeight: 200,
              overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', marginBottom: 12 }}>
                <img
                  src={isFileType ? 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/files.svg' : 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg'}
                  alt="icon"
                  style={{ width: 16, height: 16 }}
                />
                <strong style={{ fontWeight: 600 }}>{preview.name}</strong>
              </div>
              {preview.schema?.tables && Object.entries(preview.schema.tables).map(([tname, tinfo]: [string, any]) => (
                <div key={tname} style={{ marginLeft: 16, marginTop: 4 }}>
                  <div style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <img src="https://cdn.jsdelivr.net/npm/@tabler/icons/icons/table.svg" alt="table" style={{ width: 14, height: 14 }} />
                    {tname} ({tinfo.row_count} rows)
                  </div>
                  {tinfo.columns?.slice(0, 4).map((col: any) => (
                    <div key={col.name} style={{ marginLeft: 20, color: 'var(--text-muted)' }}>
                      │&nbsp;&nbsp;&nbsp;├── {col.name} {col.type}{col.pk ? ' PK' : ''}{col.fk ? ` FK→${col.fk}` : ''}
                    </div>
                  ))}
                  {tinfo.columns?.length > 4 && (
                    <div style={{ marginLeft: 20, color: 'var(--text-muted)' }}>
                      │&nbsp;&nbsp;&nbsp;└── +{tinfo.columns.length - 4} more columns
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button className="btn-primary" onClick={handleSave} style={{ width: '100%' }}>
              Save & Continue →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
