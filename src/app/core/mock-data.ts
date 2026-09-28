import {
  Account360,
  Campaign,
  EngineLayer,
  EntryPath,
  GeoRegion,
  Lead,
  MarketSignal,
  Metric,
  Seniority,
  SignalKind,
  TimelineEvent,
} from './models';

// All companies and people below are fictional.

export const LEADS: Lead[] = [
  {
    id: 'l-01', company: 'Northwind Logistics', domain: 'northwindlogistics.ca', industry: 'Logistics',
    contact: 'Priya Raman', title: 'Director of Sales Operations', seniority: 'Director',
    city: 'Toronto', region: 'ON', country: 'CA', revenueUsdM: 84, headcount: 420, headcountGrowth: 18,
    icp: 94, reachability: 78, intent: 'High', intentScore: 88,
    signals: ['Hiring 5 SDRs', 'Series C', 'Pricing page 4×'],
    techStack: ['Salesforce', 'Outreach', 'Snowflake', 'Gong', 'ZoomInfo'],
    bestWindow: 'Tue–Thu · 9:30–11:00', timezone: 'ET', painPoint: 'ramping a new SDR pod without burning the Ontario territory',
  },
  {
    id: 'l-02', company: 'Lonestar Freightworks', domain: 'lonestarfreight.com', industry: 'Logistics',
    contact: 'Marcus Delgado', title: 'VP of Sales', seniority: 'VP',
    city: 'Austin', region: 'TX', country: 'US', revenueUsdM: 126, headcount: 610, headcountGrowth: 12,
    icp: 89, reachability: 64, intent: 'High', intentScore: 81,
    signals: ['New CRO hired', 'G2 category visits'],
    techStack: ['HubSpot', 'Aircall', 'Looker', 'Slack'],
    bestWindow: 'Mon–Wed · 8:00–9:30', timezone: 'CT', painPoint: 'low live-connect rates on mid-market shippers',
  },
  {
    id: 'l-03', company: 'Cascadia Health Systems', domain: 'cascadiahealth.ca', industry: 'Healthcare IT',
    contact: 'Emily Tran', title: 'Director of Revenue Operations', seniority: 'Director',
    city: 'Vancouver', region: 'BC', country: 'CA', revenueUsdM: 58, headcount: 290, headcountGrowth: 22,
    icp: 91, reachability: 72, intent: 'High', intentScore: 84,
    signals: ['Expanding to US', 'Hiring RevOps'],
    techStack: ['Salesforce', 'Salesloft', 'Tableau', 'Okta'],
    bestWindow: 'Wed–Thu · 10:00–11:30', timezone: 'PT', painPoint: 'building a compliant outbound motion ahead of US expansion',
  },
  {
    id: 'l-04', company: 'Prairie Ledger Financial', domain: 'prairieledger.ca', industry: 'Fintech',
    contact: 'Jordan Whitehorse', title: 'VP of Growth', seniority: 'VP',
    city: 'Calgary', region: 'AB', country: 'CA', revenueUsdM: 37, headcount: 180, headcountGrowth: 31,
    icp: 86, reachability: 58, intent: 'Medium', intentScore: 67,
    signals: ['SEDAR+ filing', 'Headcount +31%'],
    techStack: ['HubSpot', 'Segment', 'Stripe', 'Intercom'],
    bestWindow: 'Tue · 13:00–15:00', timezone: 'MT', painPoint: 'turning product-led signups into sales-qualified pipeline',
  },
  {
    id: 'l-05', company: 'Beacon Street Analytics', domain: 'beaconstreet.io', industry: 'SaaS',
    contact: 'Sarah Kim', title: 'Chief Revenue Officer', seniority: 'C-Suite',
    city: 'Boston', region: 'MA', country: 'US', revenueUsdM: 72, headcount: 350, headcountGrowth: 9,
    icp: 82, reachability: 31, intent: 'Medium', intentScore: 62,
    signals: ['Competitor churn review', 'Webinar attendee'],
    techStack: ['Salesforce', 'Gong', 'Clari', 'Snowflake'],
    bestWindow: 'Fri · 8:00–8:45', timezone: 'ET', painPoint: 'forecast accuracy slipping as the team scales',
  },
  {
    id: 'l-06', company: 'Harborline Manufacturing', domain: 'harborline.com', industry: 'Manufacturing',
    contact: 'Daniel Okafor', title: 'Sales Operations Manager', seniority: 'Manager',
    city: 'Hamilton', region: 'ON', country: 'CA', revenueUsdM: 210, headcount: 1250, headcountGrowth: 4,
    icp: 74, reachability: 69, intent: 'Low', intentScore: 38,
    signals: ['ERP migration'],
    techStack: ['Microsoft Dynamics', 'SAP', 'Teams'],
    bestWindow: 'Mon · 14:00–16:00', timezone: 'ET', painPoint: 'dealer territories with stale contact data',
  },
  {
    id: 'l-07', company: 'Summit Peak Software', domain: 'summitpeak.dev', industry: 'SaaS',
    contact: 'Alex Novak', title: 'Director of Sales Development', seniority: 'Director',
    city: 'Denver', region: 'CO', country: 'US', revenueUsdM: 44, headcount: 230, headcountGrowth: 27,
    icp: 92, reachability: 81, intent: 'High', intentScore: 90,
    signals: ['Hiring 8 SDRs', 'Series B', 'Dialer RFP'],
    techStack: ['Salesforce', 'Outreach', 'Orum', 'Gong'],
    bestWindow: 'Tue–Thu · 8:30–10:00', timezone: 'MT', painPoint: 'SDR ramp time and dial-to-connect ratio',
  },
  {
    id: 'l-08', company: 'Maple & Pine Retail Group', domain: 'mapleandpine.ca', industry: 'Retail',
    contact: 'Isabelle Gagnon', title: 'VP of Marketing', seniority: 'VP',
    city: 'Montréal', region: 'QC', country: 'CA', revenueUsdM: 150, headcount: 900, headcountGrowth: 6,
    icp: 71, reachability: 49, intent: 'Medium', intentScore: 55,
    signals: ['Bilingual campaign launch'],
    techStack: ['Shopify Plus', 'Klaviyo', 'HubSpot'],
    bestWindow: 'Wed · 10:00–11:00', timezone: 'ET', painPoint: 'reaching B2B wholesale buyers in both official languages',
  },
  {
    id: 'l-09', company: 'Riverbend Insurance Partners', domain: 'riverbendins.com', industry: 'Insurance',
    contact: 'Michael Brennan', title: 'Chief Executive Officer', seniority: 'C-Suite',
    city: 'Chicago', region: 'IL', country: 'US', revenueUsdM: 320, headcount: 1800, headcountGrowth: 3,
    icp: 68, reachability: 12, intent: 'Low', intentScore: 29,
    signals: ['10-K filed'],
    techStack: ['Salesforce', 'Guidewire', 'Workday'],
    bestWindow: 'Thu · 17:00–17:30', timezone: 'CT', painPoint: 'agency producer productivity',
  },
  {
    id: 'l-10', company: 'Coastal Pacific Solar', domain: 'coastalpacificsolar.com', industry: 'Clean Energy',
    contact: 'Natalie Ortiz', title: 'Director of Sales', seniority: 'Director',
    city: 'San Diego', region: 'CA', country: 'US', revenueUsdM: 95, headcount: 480, headcountGrowth: 19,
    icp: 87, reachability: 70, intent: 'High', intentScore: 79,
    signals: ['New office: Phoenix', 'Hiring AEs'],
    techStack: ['Salesforce', 'Five9', 'Marketo'],
    bestWindow: 'Tue–Wed · 9:00–10:30', timezone: 'PT', painPoint: 'commercial installer pipeline in new Sun Belt markets',
  },
  {
    id: 'l-11', company: 'Gulfstream Dental Networks', domain: 'gulfstreamdental.com', industry: 'Healthcare',
    contact: 'Brian Lee', title: 'VP of Operations', seniority: 'VP',
    city: 'Tampa', region: 'FL', country: 'US', revenueUsdM: 63, headcount: 520, headcountGrowth: 11,
    icp: 77, reachability: 55, intent: 'Medium', intentScore: 60,
    signals: ['Acquired 3 clinics'],
    techStack: ['HubSpot', 'RingCentral', 'Power BI'],
    bestWindow: 'Mon–Tue · 12:00–13:00', timezone: 'ET', painPoint: 'standardizing outreach across newly acquired practices',
  },
  {
    id: 'l-12', company: 'Capital Region Cyber', domain: 'capitalcyber.ca', industry: 'Cybersecurity',
    contact: 'Olivia Chen', title: 'Director of Sales Operations', seniority: 'Director',
    city: 'Ottawa', region: 'ON', country: 'CA', revenueUsdM: 29, headcount: 140, headcountGrowth: 35,
    icp: 93, reachability: 76, intent: 'High', intentScore: 92,
    signals: ['Hiring 4 BDRs', 'Gov contract win', 'Compared vendors'],
    techStack: ['Salesforce', 'Apollo', 'Gong', 'Slack'],
    bestWindow: 'Tue–Thu · 9:00–10:30', timezone: 'ET', painPoint: 'scaling enterprise outbound after a federal contract win',
  },
  {
    id: 'l-13', company: 'Silicon Hills Payroll', domain: 'siliconhillspay.com', industry: 'HR Tech',
    contact: 'Tyler Brooks', title: 'Sales Manager', seniority: 'Manager',
    city: 'Round Rock', region: 'TX', country: 'US', revenueUsdM: 51, headcount: 260, headcountGrowth: 15,
    icp: 80, reachability: 74, intent: 'Medium', intentScore: 64,
    signals: ['Launched SMB tier'],
    techStack: ['HubSpot', 'Aircall', 'Gong'],
    bestWindow: 'Wed–Thu · 15:00–16:30', timezone: 'CT', painPoint: 'SMB volume outbound with a small team',
  },
  {
    id: 'l-14', company: 'Emerald Bay Hospitality', domain: 'emeraldbayhotels.com', industry: 'Hospitality',
    contact: 'Hannah Park', title: 'VP of Sales', seniority: 'VP',
    city: 'Seattle', region: 'WA', country: 'US', revenueUsdM: 180, headcount: 2100, headcountGrowth: -2,
    icp: 63, reachability: 44, intent: 'Low', intentScore: 24,
    signals: ['Leadership change'],
    techStack: ['Salesforce', 'Oracle Hospitality'],
    bestWindow: 'Tue · 10:00–11:00', timezone: 'PT', painPoint: 'group-booking sales coverage for corporate accounts',
  },
  {
    id: 'l-15', company: 'Halifax Marine Tech', domain: 'halifaxmarine.tech', industry: 'Industrial IoT',
    contact: 'Liam MacDonald', title: 'Director of Business Development', seniority: 'Director',
    city: 'Halifax', region: 'NS', country: 'CA', revenueUsdM: 22, headcount: 110, headcountGrowth: 24,
    icp: 84, reachability: 67, intent: 'Medium', intentScore: 71,
    signals: ['Export grant', 'Hiring SDR'],
    techStack: ['HubSpot', 'Zoom Phone'],
    bestWindow: 'Mon–Wed · 9:00–10:00', timezone: 'AT', painPoint: 'opening US port-authority accounts from Atlantic Canada',
  },
  {
    id: 'l-16', company: 'Peachtree Legal Cloud', domain: 'peachtreelegal.com', industry: 'Legal Tech',
    contact: 'Jasmine Wright', title: 'VP of Revenue', seniority: 'VP',
    city: 'Atlanta', region: 'GA', country: 'US', revenueUsdM: 34, headcount: 170, headcountGrowth: 20,
    icp: 88, reachability: 60, intent: 'High', intentScore: 83,
    signals: ['Series A', 'Pricing page 3×'],
    techStack: ['Salesforce', 'Salesloft', 'Chorus'],
    bestWindow: 'Tue–Thu · 11:00–12:00', timezone: 'ET', painPoint: 'building a first outbound team from scratch',
  },
];

export const INDUSTRIES = [...new Set(LEADS.map((l) => l.industry))].sort();

export const SIGNAL_POOL: Omit<MarketSignal, 'id' | 'minutesAgo'>[] = [
  { company: 'Northwind Logistics', city: 'Toronto', region: 'ON', kind: 'hiring', text: 'just posted 5 SDR job openings', intentDelta: 45 },
  { company: 'Summit Peak Software', city: 'Denver', region: 'CO', kind: 'web', text: 'viewed "AI dialer" comparison pages 6× today', intentDelta: 32 },
  { company: 'Prairie Ledger Financial', city: 'Calgary', region: 'AB', kind: 'filing', text: 'filed a SEDAR+ material change report on US expansion', intentDelta: 28 },
  { company: 'Capital Region Cyber', city: 'Ottawa', region: 'ON', kind: 'news', text: 'announced a $18M federal cybersecurity contract', intentDelta: 38 },
  { company: 'Lonestar Freightworks', city: 'Austin', region: 'TX', kind: 'hiring', text: 'hired a new Chief Revenue Officer', intentDelta: 41 },
  { company: 'Peachtree Legal Cloud', city: 'Atlanta', region: 'GA', kind: 'funding', text: 'closed a $14M Series A', intentDelta: 36 },
  { company: 'Cascadia Health Systems', city: 'Vancouver', region: 'BC', kind: 'news', text: 'opened a Seattle office for US expansion', intentDelta: 27 },
  { company: 'Coastal Pacific Solar', city: 'San Diego', region: 'CA', kind: 'hiring', text: 'is hiring 6 Account Executives in Phoenix', intentDelta: 30 },
  { company: 'Beacon Street Analytics', city: 'Boston', region: 'MA', kind: 'tech', text: 'removed a legacy dialer from its stack', intentDelta: 22 },
  { company: 'Halifax Marine Tech', city: 'Halifax', region: 'NS', kind: 'funding', text: 'received a federal export-development grant', intentDelta: 19 },
  { company: 'Gulfstream Dental Networks', city: 'Tampa', region: 'FL', kind: 'news', text: 'acquired 3 clinics in Orlando', intentDelta: 17 },
  { company: 'Riverbend Insurance Partners', city: 'Chicago', region: 'IL', kind: 'filing', text: 'flagged sales productivity in its SEC 10-K', intentDelta: 12 },
  { company: 'Silicon Hills Payroll', city: 'Round Rock', region: 'TX', kind: 'tech', text: 'installed Gong across its sales team', intentDelta: 21 },
  { company: 'Maple & Pine Retail Group', city: 'Montréal', region: 'QC', kind: 'web', text: 'researched bilingual sales engagement tools', intentDelta: 18 },
];

export const SIGNAL_KIND_LABEL: Record<SignalKind, string> = {
  hiring: 'Hiring',
  funding: 'Funding',
  web: 'Web intent',
  news: 'News',
  filing: 'Filing',
  tech: 'Tech change',
};

export const METRICS: Metric[] = [
  { label: 'TAM coverage · US + CA', value: '84.2%', delta: '+3.1 pts', positive: true, hint: '108,113 of 128,400 ICP accounts enriched', spark: [61, 64, 66, 70, 71, 74, 77, 79, 80, 82, 83, 84] },
  { label: 'Est. meetings performed', value: '1,284', delta: '+22.6%', positive: true, hint: 'Rolling 30 days · 212 this week', spark: [42, 48, 45, 53, 58, 55, 61, 66, 64, 71, 76, 82] },
  { label: 'Live connect rate', value: '18.7%', delta: '+6.2 pts', positive: true, hint: 'vs 12.5% pre-ProspectIQ baseline', spark: [12.5, 12.8, 13.4, 14.1, 14.9, 15.2, 16.0, 16.4, 17.1, 17.6, 18.2, 18.7] },
  { label: 'Pipeline ROI forecast', value: '$4.82M', delta: '7.4× spend', positive: true, hint: 'Q4 sourced pipeline · 80% CI $4.1–5.5M', spark: [1.2, 1.5, 1.9, 2.1, 2.6, 2.9, 3.3, 3.6, 3.9, 4.2, 4.5, 4.8] },
];

// Tile-grid cartogram of North America: Canada on rows 0–2, US on rows 3–10.
const TILES: [code: string, name: string, country: 'US' | 'CA', row: number, col: number][] = [
  ['YT', 'Yukon', 'CA', 0, 1], ['NT', 'Northwest Territories', 'CA', 0, 2], ['NU', 'Nunavut', 'CA', 0, 3],
  ['BC', 'British Columbia', 'CA', 1, 1], ['AB', 'Alberta', 'CA', 1, 2], ['SK', 'Saskatchewan', 'CA', 1, 3],
  ['MB', 'Manitoba', 'CA', 1, 4], ['ON', 'Ontario', 'CA', 1, 6], ['QC', 'Québec', 'CA', 1, 8], ['NL', 'Newfoundland and Labrador', 'CA', 1, 10],
  ['NB', 'New Brunswick', 'CA', 2, 9], ['PE', 'Prince Edward Island', 'CA', 2, 10], ['NS', 'Nova Scotia', 'CA', 2, 11],
  ['AK', 'Alaska', 'US', 3, 0], ['ME', 'Maine', 'US', 3, 11],
  ['WI', 'Wisconsin', 'US', 4, 6], ['VT', 'Vermont', 'US', 4, 10], ['NH', 'New Hampshire', 'US', 4, 11],
  ['WA', 'Washington', 'US', 5, 1], ['ID', 'Idaho', 'US', 5, 2], ['MT', 'Montana', 'US', 5, 3], ['ND', 'North Dakota', 'US', 5, 4],
  ['MN', 'Minnesota', 'US', 5, 5], ['IL', 'Illinois', 'US', 5, 6], ['MI', 'Michigan', 'US', 5, 7], ['NY', 'New York', 'US', 5, 9], ['MA', 'Massachusetts', 'US', 5, 10],
  ['OR', 'Oregon', 'US', 6, 1], ['NV', 'Nevada', 'US', 6, 2], ['WY', 'Wyoming', 'US', 6, 3], ['SD', 'South Dakota', 'US', 6, 4],
  ['IA', 'Iowa', 'US', 6, 5], ['IN', 'Indiana', 'US', 6, 6], ['OH', 'Ohio', 'US', 6, 7], ['PA', 'Pennsylvania', 'US', 6, 8],
  ['NJ', 'New Jersey', 'US', 6, 9], ['CT', 'Connecticut', 'US', 6, 10], ['RI', 'Rhode Island', 'US', 6, 11],
  ['CA', 'California', 'US', 7, 1], ['UT', 'Utah', 'US', 7, 2], ['CO', 'Colorado', 'US', 7, 3], ['NE', 'Nebraska', 'US', 7, 4],
  ['MO', 'Missouri', 'US', 7, 5], ['KY', 'Kentucky', 'US', 7, 6], ['WV', 'West Virginia', 'US', 7, 7], ['VA', 'Virginia', 'US', 7, 8],
  ['MD', 'Maryland', 'US', 7, 9], ['DE', 'Delaware', 'US', 7, 10],
  ['AZ', 'Arizona', 'US', 8, 2], ['NM', 'New Mexico', 'US', 8, 3], ['KS', 'Kansas', 'US', 8, 4], ['AR', 'Arkansas', 'US', 8, 5],
  ['TN', 'Tennessee', 'US', 8, 6], ['NC', 'North Carolina', 'US', 8, 7], ['SC', 'South Carolina', 'US', 8, 8], ['DC', 'District of Columbia', 'US', 8, 9],
  ['OK', 'Oklahoma', 'US', 9, 4], ['LA', 'Louisiana', 'US', 9, 5], ['MS', 'Mississippi', 'US', 9, 6], ['AL', 'Alabama', 'US', 9, 7], ['GA', 'Georgia', 'US', 9, 8],
  ['HI', 'Hawaii', 'US', 10, 0], ['TX', 'Texas', 'US', 10, 4], ['FL', 'Florida', 'US', 10, 9],
];

const MAJOR_MARKETS: Record<string, number> = {
  CA: 14200, TX: 10900, NY: 9800, FL: 8100, IL: 5600, ON: 7400, PA: 4300, MA: 3900, GA: 3800, WA: 3600,
  NC: 3500, NJ: 3400, VA: 3100, OH: 3300, CO: 2900, QC: 3600, BC: 3100, AB: 2400, MI: 2800, AZ: 2700,
};

/** Deterministic pseudo-random in [0, 1) so mock data is stable across reloads. */
export function seeded(seed: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

export const REGIONS: GeoRegion[] = TILES.map(([code, name, country, row, col]) => {
  const accounts = MAJOR_MARKETS[code] ?? Math.round(180 + seeded(code) * 1400);
  return {
    code, name, country, row, col, accounts,
    coverage: Math.round(62 + seeded(code, 1) * 34),
    connectRate: +(11 + seeded(code, 2) * 12).toFixed(1),
  };
});

// Mon–Fri × 8am–5pm. Mid-morning Tue–Thu is the phone-in-hand sweet spot.
export const CALL_HEATMAP: number[][] = [0, 1, 2, 3, 4].map((d) =>
  Array.from({ length: 10 }, (_, h) => {
    const morning = Math.exp(-((h - 1.8) ** 2) / 2.2);
    const lateDay = 0.55 * Math.exp(-((h - 8.2) ** 2) / 1.4);
    const dayBoost = [0.78, 1, 0.96, 0.92, 0.62][d];
    return Math.round((8 + 30 * Math.max(morning, lateDay) * dayBoost + seeded(`${d}-${h}`) * 4) * 10) / 10;
  }),
);

const PATH_TITLES: Record<Seniority, string> = {
  Manager: 'Sales Operations Manager',
  Director: 'Director of Sales Operations',
  VP: 'VP of Sales',
  'C-Suite': 'CEO / CRO',
};
const TIERS: Seniority[] = ['Manager', 'Director', 'VP', 'C-Suite'];

export function buildAccount360(lead: Lead): Account360 {
  const r = (salt: number) => seeded(lead.id, salt);

  const timeline: TimelineEvent[] = [
    { kind: 'web' as SignalKind, label: 'High-intent web session', detail: `${2 + Math.floor(r(1) * 5)} visits to pricing & integrations pages`, daysAgo: 1 },
    ...lead.signals.map((s, i) => ({
      kind: (['hiring', 'funding', 'news', 'filing', 'tech'] as SignalKind[])[Math.floor(r(10 + i) * 5)],
      label: s,
      detail: `Detected by intent pipeline · confidence ${80 + Math.floor(r(20 + i) * 18)}%`,
      daysAgo: 3 + i * 6 + Math.floor(r(30 + i) * 5),
    })),
    { kind: 'tech' as SignalKind, label: `${lead.techStack[0]} footprint confirmed`, detail: 'Technographic crawl + DNS records', daysAgo: 34 },
  ].sort((a, b) => a.daysAgo - b.daysAgo);

  const monthlyGrowth = lead.headcountGrowth / 100 / 12;
  const headcountSeries = Array.from({ length: 12 }, (_, i) =>
    Math.round(lead.headcount / (1 + monthlyGrowth) ** (11 - i) * (0.98 + r(40 + i) * 0.04)),
  );

  const bestIdx = TIERS.indexOf(lead.seniority);
  const pathway: EntryPath[] = TIERS.map((tier, i) => {
    let p = i === bestIdx ? lead.reachability : lead.reachability * (0.45 + r(50 + i) * 0.35) - Math.abs(i - bestIdx) * 6;
    if (tier === 'C-Suite' && i !== bestIdx) p = Math.min(p, 9 + r(60) * 6);
    return {
      tier,
      title: i === bestIdx ? lead.title : PATH_TITLES[tier],
      probability: Math.max(4, Math.round(p)),
      recommended: false,
    };
  });
  const top = pathway.reduce((a, b) => (b.probability > a.probability ? b : a));
  top.recommended = true;

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const callWindows = [0, 1, 2]
    .map((i) => ({
      day: days[Math.floor(r(70 + i) * 5)],
      window: ['8:30–9:15', '9:30–10:15', '10:30–11:15', '15:30–16:15', '16:30–17:00'][Math.floor(r(80 + i) * 5)] + ` ${lead.timezone}`,
      probability: Math.round(lead.reachability * (0.62 + r(90 + i) * 0.3)),
    }))
    .sort((a, b) => b.probability - a.probability);

  const compliance =
    lead.country === 'CA'
      ? { regime: 'CASL' as const, status: 'Implied consent · valid', detail: 'Conspicuous publication of business email; expires in 21 months. Unsubscribe link enforced.' }
      : { regime: 'TCPA' as const, status: 'Business line · clear', detail: 'Number scrubbed against DNC + reassigned-numbers DB. Manual-dial only for wireless lines.' };

  return { leadId: lead.id, timeline, headcountSeries, pathway, callWindows, compliance };
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: 'c-ca', name: 'Q4 Canada Expansion · CASL-safe', audience: 'ON, BC, AB · Directors of Sales Ops · 50–500 FTE',
    status: 'Running', meetings: 64, pipelineUsd: 1_380_000,
    steps: [
      { id: 's1', day: 1, channel: 'call', title: 'Precision AI Call Window', detail: 'Dial at predicted phone-in-hand window per contact', entered: 1840, completed: 1612, conversion: 21.4, branch: 'No answer → voicemail drop + continue', aiPersonalized: true },
      { id: 's2', day: 2, channel: 'email', title: 'Hyper-Personalized Email', detail: 'Signal-aware first line, CASL unsubscribe footer', entered: 1446, completed: 1402, conversion: 38.2, branch: 'Opened ≥2× → priority re-dial', aiPersonalized: true },
      { id: 's3', day: 4, channel: 'linkedin', title: 'LinkedIn Touchpoint', detail: 'Connection note referencing trigger event', entered: 1188, completed: 961, conversion: 27.9, branch: 'Accepted → soft CTA message', aiPersonalized: true },
      { id: 's4', day: 5, channel: 'crm', title: 'Automatic CRM Sync', detail: 'Push activity, intent & next-best-action to Salesforce', entered: 1188, completed: 1188, conversion: 5.4, branch: 'Meeting booked → AE handoff', aiPersonalized: false },
    ],
  },
  {
    id: 'c-us', name: 'US Mid-Market SaaS Blitz', audience: 'TX, CO, GA, MA · VP Sales / RevOps · Series A–C',
    status: 'Running', meetings: 91, pipelineUsd: 2_140_000,
    steps: [
      { id: 's1', day: 1, channel: 'call', title: 'Precision AI Call Window', detail: 'TCPA-scrubbed numbers, local-presence caller ID', entered: 2620, completed: 2310, conversion: 19.8, branch: 'No answer → continue', aiPersonalized: true },
      { id: 's2', day: 2, channel: 'email', title: 'Hyper-Personalized Email', detail: 'References hiring spree + tech stack gap', entered: 2102, completed: 2064, conversion: 41.5, branch: 'Clicked → call within 15 min', aiPersonalized: true },
      { id: 's3', day: 4, channel: 'linkedin', title: 'LinkedIn Touchpoint', detail: 'Profile view + voice note', entered: 1734, completed: 1390, conversion: 24.1, branch: 'Replied → route to AE', aiPersonalized: true },
      { id: 's4', day: 5, channel: 'crm', title: 'Automatic CRM Sync', detail: 'HubSpot sync with deal-stage automation', entered: 1734, completed: 1734, conversion: 5.2, branch: 'Meeting booked → AE handoff', aiPersonalized: false },
    ],
  },
  {
    id: 'c-hc', name: 'Healthcare IT Decision Makers', audience: 'US + CA · Directors of RevOps · Healthcare IT',
    status: 'Paused', meetings: 23, pipelineUsd: 610_000,
    steps: [
      { id: 's1', day: 1, channel: 'call', title: 'Precision AI Call Window', detail: 'Avoid clinic hours; target admin windows', entered: 720, completed: 640, conversion: 16.2, branch: 'No answer → continue', aiPersonalized: true },
      { id: 's2', day: 2, channel: 'email', title: 'Hyper-Personalized Email', detail: 'HIPAA / PHIPA-aware messaging', entered: 603, completed: 590, conversion: 33.0, branch: 'Opened → LinkedIn priority', aiPersonalized: true },
      { id: 's3', day: 4, channel: 'linkedin', title: 'LinkedIn Touchpoint', detail: 'Share relevant case study', entered: 512, completed: 402, conversion: 22.6, branch: 'Accepted → soft CTA', aiPersonalized: false },
      { id: 's4', day: 5, channel: 'crm', title: 'Automatic CRM Sync', detail: 'Salesforce Health Cloud sync', entered: 512, completed: 512, conversion: 4.5, branch: 'Meeting booked → AE handoff', aiPersonalized: false },
    ],
  },
];

export const ENGINE_LAYERS: EngineLayer[] = [
  {
    id: 'data', title: 'Data Enrichment & Knowledge Graph',
    summary: 'Resolves 128K+ US/CA business entities from firmographic, technographic, intent and contact sources into one graph, normalized for USD/CAD and state/province compliance rules.',
    models: [
      { name: 'Entity Resolver', kind: 'Siamese transformer + graph clustering', inputs: 'Company names, domains, addresses, registry IDs (EIN / BN)', output: 'Canonical account & contact nodes', metric: 'F1 0.97', latency: 'batch · nightly' },
      { name: 'Contact Validator', kind: 'Gradient-boosted classifier', inputs: 'SMTP handshake, carrier lookup, bounce history', output: 'Email / phone deliverability score', metric: 'Precision 0.95', latency: '120 ms' },
      { name: 'Compliance Gate', kind: 'Rules engine + consent ledger', inputs: 'Country, province/state, line type, consent source', output: 'CASL / TCPA eligibility per channel', metric: '0 violations (audited)', latency: '8 ms' },
    ],
  },
  {
    id: 'predict', title: 'Predictive Reachability & Scoring',
    summary: 'Scores every account/contact pair on fit, reachability and timing so reps know who to dial, at which title, and when.',
    models: [
      { name: 'ICP Match Score', kind: 'LightGBM ranker', inputs: 'Title fit, headcount velocity, tech stack, revenue band', output: '0–100 fit score + top drivers', metric: 'AUC 0.91', latency: '40 ms' },
      { name: 'Title Reachability Index', kind: 'Hierarchical Bayesian model', inputs: 'Historical connect rates by title × industry × region', output: 'Connect probability per seniority tier', metric: 'Brier 0.08', latency: '25 ms' },
      { name: 'Optimal Call Window', kind: 'Temporal Fusion Transformer', inputs: 'Dial outcomes, timezone, calendar density, seasonality', output: 'Hour-level phone-in-hand forecast', metric: '+49% connect lift', latency: '60 ms' },
    ],
  },
  {
    id: 'agentic', title: 'Conversational & Agentic AI',
    summary: 'LLM agents that turn signals into talk tracks, watch the web for buying triggers, and let reps rehearse before they dial.',
    models: [
      { name: 'Dynamic Scripting Engine', kind: 'LLM + retrieval over account graph', inputs: 'Persona, pain points, live signals, win/loss notes', output: 'Talk tracks, email cadences, objection counters', metric: '4.6 / 5 rep rating', latency: '~1.8 s stream' },
      { name: 'Intent & Signal Pipeline', kind: 'Crawler + event classifier', inputs: 'Job boards, news, SEC EDGAR, SEDAR+, web traffic', output: 'Scored buying triggers', metric: '2.1K signals / day', latency: 'streaming' },
      { name: 'AI Roleplay Simulator', kind: 'Persona-conditioned voice agent', inputs: 'Prospect profile, objection library', output: 'Interactive practice calls + scorecard', metric: '−31% ramp time', latency: '<400 ms voice' },
    ],
  },
];
