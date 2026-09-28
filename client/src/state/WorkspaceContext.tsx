import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { env } from '../lib/env';
import { api } from '../services/api';
import type { Campaign } from '../types';
import { RealtimeSocket } from './realtime-socket';
import { initialWorkspaceState, workspaceReducer, type WorkspaceState } from './workspace-reducer';

interface WorkspaceContextValue extends WorkspaceState {
  enrollLead: (leadId: string, sequenceId: string) => Promise<void>;
  setCampaignStatus: (id: string, status: Extract<Campaign['status'], 'Running' | 'Paused'>) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/**
 * Owns the live workspace state. The server pushes a full snapshot on connect
 * and incremental JSON events afterwards; commands go over REST and their
 * effects come back through the same socket, so every tab stays consistent.
 */
export function WorkspaceProvider({ children, wsUrl = env.wsUrl }: { children: ReactNode; wsUrl?: string }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspaceState);

  useEffect(() => {
    const socket = new RealtimeSocket(wsUrl, {
      onMessage: (message) => dispatch({ type: 'message', message }),
      onStatus: (status) => dispatch({ type: 'connection', status }),
    });
    socket.connect();
    return () => socket.close();
  }, [wsUrl]);

  const enrollLead = useCallback(async (leadId: string, sequenceId: string) => {
    await api.enrollLead(leadId, sequenceId);
  }, []);

  const setCampaignStatus = useCallback(async (id: string, status: 'Running' | 'Paused') => {
    await api.setCampaignStatus(id, status);
  }, []);

  const value = useMemo(() => ({ ...state, enrollLead, setCampaignStatus }), [state, enrollLead, setCampaignStatus]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}
