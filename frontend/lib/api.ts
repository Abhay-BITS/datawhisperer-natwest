const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dw_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function login(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function getSources(sessionId: string) {
  const res = await fetch(`${BASE_URL}/api/sources?session_id=${sessionId}`, {
    headers: getHeaders(),
  });
  return res.json();
}

export async function cloneSources(fromSessionId: string, toSessionId: string) {
  const res = await fetch(`${BASE_URL}/api/sources/clone`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ from_session_id: fromSessionId, to_session_id: toSessionId }),
  });
  return res.json();
}

export async function testSource(dbType: string, config: Record<string, any>) {
  const res = await fetch(`${BASE_URL}/api/sources/test`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ db_type: dbType, config }),
  });
  return res.json();
}

export async function connectSource(dbType: string, config: Record<string, any>, name: string, sessionId: string, selectedTables?: string[]) {
  const res = await fetch(`${BASE_URL}/api/sources/connect`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ db_type: dbType, config, name, session_id: sessionId, selected_tables: selectedTables }),
  });
  return res.json();
}

export async function fetchSampleCreds(dbType: string) {
  const res = await fetch(`${BASE_URL}/api/sources/sample-creds/${dbType}`, {
    headers: getHeaders(),
  });
  return res.json();
}

export async function connectDemoSource(sessionId: string, dbType: string = 'sqlite') {
  const res = await fetch(`${BASE_URL}/api/sources/demo`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ session_id: sessionId, db_type: dbType }),
  });
  return res.json();
}

export async function uploadFile(file: File, sessionId: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('session_id', sessionId);
  formData.append('name', file.name);
  const token = localStorage.getItem('dw_token');
  const res = await fetch(`${BASE_URL}/api/sources/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return res.json();
}

export async function deleteSource(sourceId: string) {
  const res = await fetch(`${BASE_URL}/api/sources/${sourceId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.json();
}

export async function getSourceSchema(sourceId: string) {
  const res = await fetch(`${BASE_URL}/api/sources/${sourceId}/schema`, {
    headers: getHeaders(),
  });
  return res.json();
}

export async function sendChat(
  message: string,
  sessionId: string,
  mode: string,
  sourceIds?: string[],
  historyContext?: { role: string; content: string }[]
) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      message,
      session_id: sessionId,
      mode,
      source_ids: sourceIds,
      history_override: historyContext,
    }),
  });
  return res.json();
}

export async function getChatHistory(sessionId: string) {
  const res = await fetch(`${BASE_URL}/api/chat/history?session_id=${sessionId}`, {
    headers: getHeaders(),
  });
  return res.json();
}

export async function suggestQuestions(sessionId: string, sourceId?: string) {
  const res = await fetch(`${BASE_URL}/api/sources/suggest-questions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ session_id: sessionId, source_id: sourceId }),
  });
  return res.json();
}

export async function exportResultCsv(result: any) {
  const res = await fetch(`${BASE_URL}/api/export/result/csv`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ result }),
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'datawhisperer_result.csv';
  a.click();
}

export async function exportHistoryCsv(sessionId: string) {
  const res = await fetch(`${BASE_URL}/api/export/history/csv?session_id=${sessionId}`, {
    headers: getHeaders(),
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'datawhisperer_history.csv';
  a.click();
}
