export const COPILOT_KINDS = ['phone', 'email', 'objections', 'roleplay'];

const STRING_FIELDS = [
  'company', 'industry', 'contact', 'title', 'seniority', 'city', 'region', 'country',
  'bestWindow', 'timezone', 'painPoint',
];
const LIST_FIELDS = ['signals', 'techStack'];
const MAX_STRING = 160;
const MAX_LIST = 6;

/**
 * Whitelists and truncates the lead payload so only known, bounded fields
 * ever reach the prompt. Returns null if required fields are missing.
 */
export function sanitizeLead(input) {
  if (!input || typeof input !== 'object') return null;
  const lead = {};
  for (const f of STRING_FIELDS) {
    const v = input[f];
    lead[f] = typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, MAX_STRING) : '';
  }
  for (const f of LIST_FIELDS) {
    const v = Array.isArray(input[f]) ? input[f] : [];
    lead[f] = v.filter((x) => typeof x === 'string').slice(0, MAX_LIST).map((x) => x.trim().slice(0, 60));
  }
  for (const f of ['headcount', 'headcountGrowth', 'icp', 'reachability', 'intentScore']) {
    const n = Number(input[f]);
    lead[f] = Number.isFinite(n) ? Math.round(n) : null;
  }
  if (lead.country !== 'US' && lead.country !== 'CA') return null;
  if (!lead.company || !lead.contact || !lead.title) return null;
  return lead;
}

function profile(l) {
  const regime = l.country === 'CA' ? 'CASL (Canada)' : 'TCPA (United States)';
  return [
    `Prospect: ${l.contact}, ${l.title} (${l.seniority || 'n/a'}) at ${l.company}`,
    `Industry: ${l.industry || 'n/a'} · Location: ${l.city}, ${l.region}, ${l.country}`,
    l.headcount != null ? `Headcount: ${l.headcount} (${l.headcountGrowth >= 0 ? '+' : ''}${l.headcountGrowth}% YoY)` : '',
    `Buying signals: ${l.signals.join('; ') || 'none detected'}`,
    `Tech stack: ${l.techStack.join(', ') || 'unknown'}`,
    `Likely pain point: ${l.painPoint || 'n/a'}`,
    `Best call window: ${l.bestWindow} ${l.timezone}`,
    `Scores: ICP ${l.icp}/100, reachability ${l.reachability}%, intent ${l.intentScore}/100`,
    `Compliance regime: ${regime}`,
  ]
    .filter(Boolean)
    .join('\n');
}

const TASKS = {
  phone: `Write a cold-call phone script for the rep (the rep's name is Jordan, from ProspectIQ).
Sections, each label on its own line: OPENER, REASON FOR CALL, DISCOVERY (3 bullet questions), VALUE BRIDGE, CLOSE.
This is a cold call: the rep has never spoken to the prospect before.
Open with a permission-based opener. The reason for call must reference the strongest buying signal. Close by asking for a specific 20-minute slot.`,

  email: `Write a 3-email cadence (Day 2, Day 6, Day 11).
For each email write a label line like "EMAIL 1 · Day 2 · Subject: ...", then the body (max 70 words), signed "Jordan".
This is cold outreach: there has been no previous contact.
Email 1 references the strongest buying signal. Email 2 adds one new, useful insight about reaching people in this role. Email 3 is a short, polite break-up email.`,

  objections: `Write counters to the 5 objections this prospect is most likely to raise, given their role, industry and signals.
Format each as the objection in quotes on one line, then a line starting "→ " with a 1–3 sentence response that ends with a question.`,

  roleplay: `Write a practice roleplay for the rep. Play the prospect as realistic: guarded and short on time.
Start with a label line: ROLEPLAY · <name> (<title>, <company>) · Mood: <mood>.
Then alternate lines "<FIRST NAME IN CAPS>: ..." and "YOU: (coaching cue for what the rep should do)". Use 5 exchanges.
Include one objection tied to their signals.
Finish with SCORECARD TARGETS and 3 bullets.`,
};

// Appended verbatim by the service. Legal wording is not left to the model.
const COMPLIANCE = {
  CA: {
    phone: '⚑ Compliance: CASL applies to any follow-up email. Identify yourself and ProspectIQ, and include an unsubscribe link.',
    email: '⚑ Compliance: CASL. Every email must identify the sender, include a mailing address and a working unsubscribe link.',
  },
  US: {
    phone: '⚑ Compliance: TCPA. Verified business line; dial manually. Honor any do-not-call request immediately.',
    email: '⚑ Compliance: CAN-SPAM. Include a physical address and an unsubscribe link; no misleading subject lines.',
  },
};

export function complianceLine(kind, lead) {
  return COMPLIANCE[lead.country]?.[kind] ?? '';
}

export function buildMessages(kind, lead) {
  return [
    { role: 'user', content: `${TASKS[kind]}\n\nPROSPECT DATA\n${profile(lead)}` },
  ];
}
