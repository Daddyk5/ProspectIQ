import { env } from '../lib/env';
import type { Campaign, Lead } from '../types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly hint?: string;
  readonly retryable: boolean;

  constructor(status: number, code: string, message: string, opts: { hint?: string; retryable?: boolean } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.hint = opts.hint;
    this.retryable = opts.retryable ?? status >= 500;
  }
}

/** Turns a non-2xx response with the server's `{ error: { code, message } }` shape into an ApiError. */
export async function toApiError(res: Response): Promise<ApiError> {
  let body: { error?: { code?: string; message?: string; hint?: string; retryable?: boolean } } = {};
  try {
    body = await res.json();
  } catch {
    /* non-JSON error body */
  }
  const e = body.error ?? {};
  return new ApiError(res.status, e.code ?? `HTTP_${res.status}`, e.message ?? res.statusText ?? 'Request failed', {
    hint: e.hint,
    retryable: e.retryable,
  });
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${env.apiBaseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the ProspectIQ server', { retryable: true });
  }
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<T>;
}

export interface AiHealth {
  online: boolean;
  host: string;
  preferredModels: string[];
  availableModels: string[];
}

export const api = {
  enrollLead: (leadId: string, sequenceId: string) =>
    request<{ lead: Lead; campaign: Campaign }>(`/api/leads/${encodeURIComponent(leadId)}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ sequenceId }),
    }),
  setCampaignStatus: (id: string, status: 'Running' | 'Paused') =>
    request<Campaign>(`/api/campaigns/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  aiHealth: (): Promise<AiHealth> =>
    fetch(`${env.apiBaseUrl}/api/ai/health`)
      .then((r) => r.json() as Promise<AiHealth>)
      .catch(() => ({ online: false, host: 'unreachable', preferredModels: [], availableModels: [] })),
};
