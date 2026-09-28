import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';

const load = (name) => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));

export class NotFoundError extends Error {
  status = 404;
}
export class ConflictError extends Error {
  status = 409;
}

/**
 * In-memory system of record for campaigns, leads and workspace metrics.
 * Every mutation emits an `event` ({ type, payload }) that the WebSocket hub
 * broadcasts; swap this class for a database-backed one without touching the hub.
 */
export class Store extends EventEmitter {
  #campaigns = load('campaigns');
  #leads = load('leads');
  #metrics = { signalsToday: 2104, credits: { used: 6812, limit: 10000 } };
  #timers = [];

  snapshot() {
    return { campaigns: this.#campaigns, leads: this.#leads, metrics: this.#metrics };
  }

  campaigns() {
    return this.#campaigns;
  }

  leads() {
    return this.#leads;
  }

  campaign(id) {
    const c = this.#campaigns.find((x) => x.id === id);
    if (!c) throw new NotFoundError(`Sequence ${id} not found`);
    return c;
  }

  lead(id) {
    const l = this.#leads.find((x) => x.id === id);
    if (!l) throw new NotFoundError(`Lead ${id} not found`);
    return l;
  }

  enroll(leadId, sequenceId) {
    const lead = this.lead(leadId);
    const campaign = this.campaign(sequenceId);
    if (lead.enrolledSequenceId === sequenceId) throw new ConflictError(`${lead.company} is already enrolled in ${campaign.name}`);
    lead.enrolledSequenceId = sequenceId;
    campaign.steps[0].inbound += 1;
    if (!campaign.activeGeos.includes(lead.region)) campaign.activeGeos.push(lead.region);
    this.#emit('lead.updated', lead);
    this.#emit('campaign.updated', campaign);
    return { lead, campaign };
  }

  setStatus(sequenceId, status) {
    const campaign = this.campaign(sequenceId);
    campaign.status = status;
    this.#emit('campaign.updated', campaign);
    return campaign;
  }

  consumeCredit(n = 1) {
    this.#metrics.credits.used = Math.min(this.#metrics.credits.limit, this.#metrics.credits.used + n);
    this.#emit('metrics.updated', this.#metrics);
  }

  /**
   * Demo data feed: stands in for the enrichment/intent pipeline until a real
   * source is connected. Disable with SIMULATE_LIVE=false.
   */
  startSimulation() {
    const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    this.#timers.push(
      setInterval(() => {
        this.#metrics.signalsToday += rand(1, 5);
        this.#emit('metrics.updated', this.#metrics);
      }, 3000),
      setInterval(() => {
        const running = this.#campaigns.filter((c) => c.status === 'Running');
        const c = running[rand(0, running.length - 1)];
        if (!c) return;
        const i = rand(0, c.steps.length - 1);
        const step = c.steps[i];
        const added = rand(1, 6);
        step.inbound += added;
        step.done = Math.min(step.inbound, step.done + rand(0, added));
        step.conversionRate = Math.max(1, +(step.conversionRate + (Math.random() - 0.45) * 0.4).toFixed(1));
        if (Math.random() < 0.25) {
          c.meetingsBooked += 1;
          c.pipelineUsd += rand(12, 40) * 1000;
        }
        this.#emit('campaign.updated', c);
      }, 4000),
      setInterval(() => {
        const lead = this.#leads[rand(0, this.#leads.length - 1)];
        lead.intentScore = Math.max(5, Math.min(99, lead.intentScore + rand(-3, 6)));
        lead.intentTier = lead.intentScore >= 75 ? 'High' : lead.intentScore >= 50 ? 'Medium' : 'Low';
        this.#emit('lead.updated', lead);
      }, 7000),
    );
    for (const t of this.#timers) t.unref?.();
  }

  stopSimulation() {
    this.#timers.forEach(clearInterval);
    this.#timers = [];
  }

  #emit(type, payload) {
    this.emit('event', { type, payload });
  }
}
