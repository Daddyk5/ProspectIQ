import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Campaign, Lead, ServerMessage } from '../types';
import { RealtimeSocket } from './realtime-socket';
import { initialWorkspaceState, workspaceReducer } from './workspace-reducer';

const campaign: Campaign = {
  id: 'seq-1', name: 'Q4 Canada Expansion', audience: 'Directors', status: 'Running', compliance: 'CASL',
  meetingsBooked: 64, pipelineUsd: 1_380_000, activeGeos: ['ON'], trigger: { intentMin: 60, icpMin: 80 },
  steps: [{ id: 's1', day: 1, channel: 'call', title: 'Precision AI Call Window', detail: '', inbound: 1840, done: 1612, conversionRate: 21.4 }],
};
const lead: Lead = {
  id: 'lead-1', company: 'Northwind', contact: 'Priya', title: 'Director', industry: 'Logistics', city: 'Toronto', region: 'ON',
  country: 'CA', lat: 43.65, lng: -79.38, intentTier: 'High', intentScore: 88, icp: 94, reachability: 78, revenueUsdM: 84,
  lastSignal: 'Hiring', enrolledSequenceId: null,
};
const snapshot: ServerMessage = {
  type: 'snapshot', ts: 't0',
  payload: { campaigns: [campaign], leads: [lead], metrics: { signalsToday: 2104, credits: { used: 6812, limit: 10000 } } },
};

describe('workspaceReducer', () => {
  it('hydrates from a snapshot and upserts incremental updates', () => {
    let s = workspaceReducer(initialWorkspaceState, { type: 'message', message: snapshot });
    expect(s.hydrated).toBe(true);
    expect(s.metrics?.signalsToday).toBe(2104);

    s = workspaceReducer(s, { type: 'message', message: { type: 'campaign.updated', ts: 't1', payload: { ...campaign, meetingsBooked: 65 } } });
    expect(s.campaigns).toHaveLength(1);
    expect(s.campaigns[0].meetingsBooked).toBe(65);

    s = workspaceReducer(s, { type: 'message', message: { type: 'lead.updated', ts: 't2', payload: { ...lead, id: 'lead-2' } } });
    expect(s.leads.map((l) => l.id)).toEqual(['lead-1', 'lead-2']);
    expect(s.lastEventAt).toBe('t2');
  });

  it('tracks connection status', () => {
    expect(workspaceReducer(initialWorkspaceState, { type: 'connection', status: 'reconnecting' }).connection).toBe('reconnecting');
  });
});

class FakeSocket {
  onopen?: () => void;
  onmessage?: (e: { data: string }) => void;
  onclose?: () => void;
  onerror?: () => void;
  close = vi.fn(() => this.onclose?.());
}

describe('RealtimeSocket', () => {
  afterEach(() => vi.useRealTimers());

  it('dispatches only schema-valid messages', () => {
    const fake = new FakeSocket();
    const onMessage = vi.fn();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rt = new RealtimeSocket('ws://x', { onMessage, onStatus: () => {}, createSocket: () => fake as unknown as WebSocket });
    rt.connect();
    fake.onopen?.();
    fake.onmessage?.({ data: 'not json' });
    fake.onmessage?.({ data: JSON.stringify({ type: 'metrics.updated', ts: 't', payload: { signalsToday: 'lots' } }) });
    fake.onmessage?.({ data: JSON.stringify(snapshot) });
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage.mock.calls[0][0].type).toBe('snapshot');
    expect(warn).toHaveBeenCalledTimes(2);
    rt.close();
  });

  it('reconnects with backoff after an unexpected close', () => {
    vi.useFakeTimers();
    const sockets: FakeSocket[] = [];
    const statuses: string[] = [];
    const rt = new RealtimeSocket('ws://x', {
      onMessage: () => {},
      onStatus: (s) => statuses.push(s),
      createSocket: () => {
        const s = new FakeSocket();
        sockets.push(s);
        return s as unknown as WebSocket;
      },
    });
    rt.connect();
    sockets[0].onopen?.();
    sockets[0].onclose?.(); // server went away
    expect(statuses.at(-1)).toBe('reconnecting');
    vi.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(2);
    rt.close();
    expect(statuses.at(-1)).toBe('closed');
  });
});
