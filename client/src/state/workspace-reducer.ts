import type { Campaign, Lead, Metrics, ServerMessage } from '../types';
import type { SocketStatus } from './realtime-socket';

export interface WorkspaceState {
  connection: SocketStatus;
  /** False until the first snapshot arrives. */
  hydrated: boolean;
  campaigns: Campaign[];
  leads: Lead[];
  metrics: Metrics | null;
  lastEventAt: string | null;
}

export type WorkspaceAction =
  | { type: 'connection'; status: SocketStatus }
  | { type: 'message'; message: ServerMessage };

export const initialWorkspaceState: WorkspaceState = {
  connection: 'connecting',
  hydrated: false,
  campaigns: [],
  leads: [],
  metrics: null,
  lastEventAt: null,
};

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const next = list.slice();
  next[i] = item;
  return next;
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  if (action.type === 'connection') return { ...state, connection: action.status };

  const { message } = action;
  switch (message.type) {
    case 'snapshot':
      return {
        ...state,
        hydrated: true,
        campaigns: message.payload.campaigns,
        leads: message.payload.leads,
        metrics: message.payload.metrics,
        lastEventAt: message.ts,
      };
    case 'campaign.updated':
      return { ...state, campaigns: upsert(state.campaigns, message.payload), lastEventAt: message.ts };
    case 'lead.updated':
      return { ...state, leads: upsert(state.leads, message.payload), lastEventAt: message.ts };
    case 'metrics.updated':
      return { ...state, metrics: message.payload, lastEventAt: message.ts };
    case 'pong':
      return state;
  }
}
