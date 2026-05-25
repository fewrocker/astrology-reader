export interface SlimReading {
  id: string;
  readingType: 'single' | 'three-card' | 'celtic-cross';
  spreadMode: string | null;
  firstCardName: string;
  intentPreview: string | null;
  createdAt: string;
}

export interface ReadingsListResponse {
  items: SlimReading[];
  total: number;
  limit: number;
  offset: number;
}

export interface FullReading extends SlimReading {
  cards: unknown[];
  synthesis: unknown | null;
  schemaVersion: number;
  journalEntryId: string | null;
}

export interface SaveReadingRequest {
  readingType: 'single' | 'three-card' | 'celtic-cross';
  spreadMode?: string | null;
  firstCardName: string;
  intentPreview?: string | null;
  cards: unknown[];
  synthesis?: unknown;
}

function authHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

export async function saveReading(
  payload: SaveReadingRequest,
  token: string
): Promise<{ id: string; createdAt: string }> {
  const res = await fetch('/api/readings', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string; feature?: string };
    throw Object.assign(new Error(body.error ?? 'save_failed'), { status: res.status, feature: body.feature });
  }
  return res.json() as Promise<{ id: string; createdAt: string }>;
}

export async function listReadings(
  token: string,
  limit = 20,
  offset = 0
): Promise<ReadingsListResponse> {
  const res = await fetch(`/api/readings?limit=${limit}&offset=${offset}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string; feature?: string };
    throw Object.assign(new Error(body.error ?? 'list_failed'), { status: res.status, feature: body.feature });
  }
  return res.json() as Promise<ReadingsListResponse>;
}

export async function getReading(id: string, token: string): Promise<FullReading> {
  const res = await fetch(`/api/readings/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw Object.assign(new Error(body.error ?? 'fetch_failed'), { status: res.status });
  }
  return res.json() as Promise<FullReading>;
}

export async function deleteReading(id: string, token: string): Promise<{ ok: boolean }> {
  const res = await fetch(`/api/readings/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw Object.assign(new Error(body.error ?? 'delete_failed'), { status: res.status });
  }
  return res.json() as Promise<{ ok: boolean }>;
}
