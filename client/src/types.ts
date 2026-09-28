import { z } from 'zod';

/**
 * Wire contracts shared with the server. Every WebSocket message is validated
 * against these before it reaches application state.
 */
export const StepSchema = z.object({
  id: z.string(),
  day: z.number(),
  channel: z.enum(['call', 'email', 'linkedin', 'crm']),
  title: z.string(),
  detail: z.string(),
  inbound: z.number(),
  done: z.number(),
  conversionRate: z.number(),
});

export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  audience: z.string(),
  status: z.enum(['Running', 'Paused', 'Draft']),
  compliance: z.string(),
  meetingsBooked: z.number(),
  pipelineUsd: z.number(),
  activeGeos: z.array(z.string()),
  trigger: z.object({ intentMin: z.number(), icpMin: z.number() }),
  steps: z.array(StepSchema),
});

export const LeadSchema = z.object({
  id: z.string(),
  company: z.string(),
  contact: z.string(),
  title: z.string(),
  industry: z.string(),
  city: z.string(),
  region: z.string(),
  country: z.enum(['US', 'CA']),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  intentTier: z.enum(['High', 'Medium', 'Low']),
  intentScore: z.number(),
  icp: z.number(),
  reachability: z.number(),
  revenueUsdM: z.number(),
  lastSignal: z.string(),
  enrolledSequenceId: z.string().nullable(),
  /** Google Place ID of the headquarters. When present, the map shows verified Place Details. */
  placeId: z.string().min(1).max(512).optional(),
});

export const MetricsSchema = z.object({
  signalsToday: z.number(),
  credits: z.object({ used: z.number(), limit: z.number() }),
});

export const ServerMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('snapshot'),
    ts: z.string(),
    payload: z.object({ campaigns: z.array(CampaignSchema), leads: z.array(LeadSchema), metrics: MetricsSchema }),
  }),
  z.object({ type: z.literal('campaign.updated'), ts: z.string(), payload: CampaignSchema }),
  z.object({ type: z.literal('lead.updated'), ts: z.string(), payload: LeadSchema }),
  z.object({ type: z.literal('metrics.updated'), ts: z.string(), payload: MetricsSchema }),
  z.object({ type: z.literal('pong'), ts: z.string(), payload: z.object({}) }),
]);

export type CampaignStep = z.infer<typeof StepSchema>;
export type Campaign = z.infer<typeof CampaignSchema>;
export type Lead = z.infer<typeof LeadSchema>;
export type Metrics = z.infer<typeof MetricsSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
export type IntentTier = Lead['intentTier'];
export type Channel = CampaignStep['channel'];
