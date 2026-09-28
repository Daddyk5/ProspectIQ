export type Country = 'US' | 'CA';
export type Currency = 'USD' | 'CAD';
export type Seniority = 'Manager' | 'Director' | 'VP' | 'C-Suite';
export type IntentLevel = 'High' | 'Medium' | 'Low';
export type SignalKind = 'hiring' | 'funding' | 'web' | 'news' | 'filing' | 'tech';

export interface Lead {
  id: string;
  company: string;
  domain: string;
  industry: string;
  contact: string;
  title: string;
  seniority: Seniority;
  city: string;
  region: string; // state / province code
  country: Country;
  /** Annual revenue in USD millions; displayed in the viewer's currency. */
  revenueUsdM: number;
  headcount: number;
  headcountGrowth: number; // % YoY
  icp: number; // 0–100
  reachability: number; // 0–100
  intent: IntentLevel;
  intentScore: number; // 0–100
  signals: string[];
  techStack: string[];
  bestWindow: string;
  timezone: string;
  painPoint: string;
}

export interface MarketSignal {
  id: string;
  company: string;
  city: string;
  region: string;
  kind: SignalKind;
  text: string;
  intentDelta: number;
  minutesAgo: number;
}

export interface Metric {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  hint: string;
  spark: number[];
}

export interface GeoRegion {
  code: string;
  name: string;
  country: Country;
  row: number;
  col: number;
  accounts: number;
  coverage: number; // % of TAM enriched
  connectRate: number; // %
}

export interface DashboardData {
  metrics: Metric[];
  regions: GeoRegion[];
  signals: MarketSignal[];
  /** 5 weekdays × 10 hourly buckets (8am–5pm local) of live-connect probability. */
  callHeatmap: number[][];
}

export interface TimelineEvent {
  kind: SignalKind;
  label: string;
  detail: string;
  daysAgo: number;
}

export interface EntryPath {
  tier: Seniority;
  title: string;
  probability: number;
  recommended: boolean;
}

export interface Account360 {
  leadId: string;
  timeline: TimelineEvent[];
  headcountSeries: number[]; // trailing 12 months
  pathway: EntryPath[];
  callWindows: { day: string; window: string; probability: number }[];
  compliance: { regime: 'CASL' | 'TCPA'; status: string; detail: string };
}

export type CopilotKind = 'phone' | 'email' | 'objections' | 'roleplay';

export type StepChannel = 'call' | 'email' | 'linkedin' | 'crm';

export interface CampaignStep {
  id: string;
  day: number;
  channel: StepChannel;
  title: string;
  detail: string;
  entered: number;
  completed: number;
  conversion: number; // % that advance or convert
  branch: string;
  aiPersonalized: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  audience: string;
  status: 'Running' | 'Paused' | 'Draft';
  meetings: number;
  pipelineUsd: number;
  steps: CampaignStep[];
}

export interface EngineModel {
  name: string;
  kind: string;
  inputs: string;
  output: string;
  metric: string;
  latency: string;
}

export interface EngineLayer {
  id: string;
  title: string;
  summary: string;
  models: EngineModel[];
}
