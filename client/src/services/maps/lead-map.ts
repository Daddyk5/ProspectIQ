import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { MarkerClusterer, type Renderer } from '@googlemaps/markerclusterer';
import { TIER_COLOR, formatInt } from '../../lib/format';
import type { Campaign, Lead } from '../../types';
import { DARK_MAP_STYLE } from './dark-map-style';
import { createPlaceDetailsClient, type PlaceDetails } from './place-details';

export interface LeadMapOptions {
  apiKey: string;
  /** With a Map ID, Advanced Markers + cloud styling are used; otherwise classic markers + DARK_MAP_STYLE. */
  mapId?: string;
  campaigns: Campaign[];
  onEnroll: (leadId: string, sequenceId: string) => Promise<void>;
}

type AnyMarker = google.maps.Marker | google.maps.marker.AdvancedMarkerElement;
type PlaceState = { status: 'loading' } | { status: 'ok'; details: PlaceDetails } | { status: 'error'; message: string };

let configuredKey: string | null = null;

/** Loads the Maps JavaScript API once per page; later calls reuse the same script. */
export async function loadGoogleMaps(apiKey: string) {
  if (!apiKey) throw new Error('Google Maps API key is missing (VITE_GOOGLE_MAPS_API_KEY)');
  if (configuredKey === null) {
    setOptions({ key: apiKey, v: 'weekly' });
    configuredKey = apiKey;
  }
  const [core, maps, marker] = await Promise.all([importLibrary('core'), importLibrary('maps'), importLibrary('marker')]);
  return { core, maps, marker };
}

const svgUrl = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

function pinSvg(color: string, enrolled: boolean): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
    <circle cx="13" cy="13" r="11" fill="${color}" fill-opacity="0.25"/>
    <circle cx="13" cy="13" r="6.5" fill="${color}" stroke="#0f172a" stroke-width="2"/>
    ${enrolled ? '<circle cx="13" cy="13" r="2.2" fill="#fff"/>' : ''}
  </svg>`;
}

function clusterSvg(size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#6366f1" fill-opacity="0.22"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 6}" fill="#4f46e5" stroke="#a5b4fc" stroke-width="1.5"/>
  </svg>`;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text; // never innerHTML: lead data is untrusted
  return node;
}

/**
 * Imperative owner of one Google Map: markers for a geo dataset, clustering,
 * and a dark InfoWindow with live prospect fields and an enroll action.
 * React components create it once and push data in with setLeads/setCampaigns.
 */
export class LeadMapController {
  private readonly map: google.maps.Map;
  private readonly info: google.maps.InfoWindow;
  private readonly clusterer: MarkerClusterer;
  private readonly advanced: boolean;
  private readonly markers = new Map<string, { marker: AnyMarker; lead: Lead }>();
  private readonly chosenSequence = new Map<string, string>();
  private campaigns: Campaign[];
  private openLeadId: string | null = null;
  private pendingLeadId: string | null = null;
  private enrollError: { leadId: string; message: string } | null = null;
  private readonly places = createPlaceDetailsClient();
  /** Google Place Details per lead id, fetched lazily when a marker with a placeId is opened. */
  private readonly placeState = new Map<string, PlaceState>();
  private readonly lib: Awaited<ReturnType<typeof loadGoogleMaps>>;
  private readonly opts: LeadMapOptions;

  static async create(container: HTMLElement, opts: LeadMapOptions): Promise<LeadMapController> {
    const lib = await loadGoogleMaps(opts.apiKey);
    return new LeadMapController(container, opts, lib);
  }

  private constructor(container: HTMLElement, opts: LeadMapOptions, lib: Awaited<ReturnType<typeof loadGoogleMaps>>) {
    this.opts = opts;
    this.lib = lib;
    this.campaigns = opts.campaigns;
    this.advanced = Boolean(opts.mapId);
    this.map = new lib.maps.Map(container, {
      center: { lat: 45, lng: -96 },
      zoom: 3.5,
      minZoom: 2,
      mapId: opts.mapId || undefined,
      styles: opts.mapId ? undefined : DARK_MAP_STYLE,
      backgroundColor: '#0f172a',
      disableDefaultUI: true,
      zoomControl: true,
      fullscreenControl: true,
      clickableIcons: false,
      gestureHandling: 'cooperative',
    });
    this.info = new lib.maps.InfoWindow({ maxWidth: 320 });
    this.info.addListener('closeclick', () => (this.openLeadId = null));
    this.clusterer = new MarkerClusterer({ map: this.map, markers: [], renderer: this.clusterRenderer() });
  }

  /** Adds, updates and removes markers so the map matches `leads` exactly. */
  setLeads(leads: Lead[]): void {
    const incoming = new Map(leads.map((l) => [l.id, l]));
    const removed: AnyMarker[] = [];
    for (const [id, entry] of this.markers) {
      if (!incoming.has(id)) {
        removed.push(entry.marker);
        this.markers.delete(id);
      }
    }
    const added: AnyMarker[] = [];
    for (const lead of leads) {
      const existing = this.markers.get(lead.id);
      if (existing) {
        const prev = existing.lead;
        existing.lead = lead;
        if (prev.intentTier !== lead.intentTier || prev.enrolledSequenceId !== lead.enrolledSequenceId) this.restyle(existing.marker, lead);
        if (prev.placeId !== lead.placeId) {
          this.placeState.delete(lead.id);
          this.setPosition(existing.marker, lead);
        } else if (prev.lat !== lead.lat || prev.lng !== lead.lng) {
          this.setPosition(existing.marker, lead);
        }
      } else {
        const marker = this.createMarker(lead);
        this.markers.set(lead.id, { marker, lead });
        added.push(marker);
      }
    }
    if (removed.length) this.clusterer.removeMarkers(removed, true);
    if (added.length) this.clusterer.addMarkers(added, true);
    if (removed.length || added.length) this.clusterer.render();
    if (this.openLeadId && !this.markers.has(this.openLeadId)) this.info.close();
    this.refreshInfo();
  }

  setCampaigns(campaigns: Campaign[]): void {
    this.campaigns = campaigns;
    this.refreshInfo();
  }

  /** Pans to a lead and opens its InfoWindow (used when a table row is selected). */
  focus(leadId: string): void {
    const entry = this.markers.get(leadId);
    if (!entry) return;
    this.map.panTo(this.positionOf(entry.lead));
    if ((this.map.getZoom() ?? 0) < 9) this.map.setZoom(9);
    this.open(leadId);
  }

  fitToLeads(): void {
    if (!this.markers.size) return;
    const bounds = new this.lib.core.LatLngBounds();
    for (const { lead } of this.markers.values()) bounds.extend(this.positionOf(lead));
    this.map.fitBounds(bounds, 48);
  }

  destroy(): void {
    this.info.close();
    this.clusterer.clearMarkers();
    this.clusterer.setMap(null);
    google.maps.event.clearInstanceListeners(this.map);
    this.markers.clear();
  }

  // ── markers ─────────────────────────────────────────────────────────────

  /** Google's verified location when Place Details loaded, otherwise the dataset coordinates. */
  private positionOf(lead: Lead): google.maps.LatLngLiteral {
    const place = this.placeState.get(lead.id);
    return place?.status === 'ok' ? place.details.location : { lat: lead.lat, lng: lead.lng };
  }

  private createMarker(lead: Lead): AnyMarker {
    const position = this.positionOf(lead);
    let marker: AnyMarker;
    if (this.advanced) {
      marker = new this.lib.marker.AdvancedMarkerElement({ position, title: lead.company, content: this.pinElement(lead), gmpClickable: true });
    } else {
      marker = new this.lib.marker.Marker({ position, title: lead.company, icon: this.pinIcon(lead), optimized: true });
    }
    marker.addListener('click', () => this.open(lead.id));
    return marker;
  }

  private restyle(marker: AnyMarker, lead: Lead): void {
    if (marker instanceof this.lib.marker.Marker) marker.setIcon(this.pinIcon(lead));
    else (marker as google.maps.marker.AdvancedMarkerElement).content = this.pinElement(lead);
  }

  private setPosition(marker: AnyMarker, lead: Lead): void {
    const pos = this.positionOf(lead);
    if (marker instanceof this.lib.marker.Marker) marker.setPosition(pos);
    else (marker as google.maps.marker.AdvancedMarkerElement).position = pos;
  }

  private pinIcon(lead: Lead): google.maps.Icon {
    return {
      url: svgUrl(pinSvg(TIER_COLOR[lead.intentTier], Boolean(lead.enrolledSequenceId))),
      scaledSize: new this.lib.core.Size(26, 26),
      anchor: new this.lib.core.Point(13, 13),
    };
  }

  private pinElement(lead: Lead): HTMLElement {
    const img = el('img');
    img.src = svgUrl(pinSvg(TIER_COLOR[lead.intentTier], Boolean(lead.enrolledSequenceId)));
    img.width = img.height = 26;
    img.alt = '';
    img.style.transform = 'translateY(50%)'; // center the dot on the coordinate
    return img;
  }

  private clusterRenderer(): Renderer {
    return {
      render: ({ count, position }) => {
        const size = Math.min(64, 30 + Math.log2(count) * 7);
        if (this.advanced) {
          const div = el('div', 'grid place-items-center rounded-full font-semibold text-white', String(count));
          Object.assign(div.style, {
            width: `${size}px`, height: `${size}px`, fontSize: '12px', transform: 'translateY(50%)',
            background: 'radial-gradient(circle, #4f46e5 55%, rgb(99 102 241 / .25) 56%)', border: '1px solid #a5b4fc',
          });
          return new this.lib.marker.AdvancedMarkerElement({ position, content: div, zIndex: 1000 + count });
        }
        return new this.lib.marker.Marker({
          position,
          icon: { url: svgUrl(clusterSvg(size)), scaledSize: new this.lib.core.Size(size, size), anchor: new this.lib.core.Point(size / 2, size / 2) },
          label: { text: String(count), color: '#ffffff', fontSize: '12px', fontWeight: '600' },
          title: `${count} prospects`,
          zIndex: 1000 + count,
        });
      },
    };
  }

  // ── info window ─────────────────────────────────────────────────────────

  private open(leadId: string): void {
    const entry = this.markers.get(leadId);
    if (!entry) return;
    this.openLeadId = leadId;
    this.enrollError = null;
    this.info.setContent(this.infoContent(entry.lead));
    this.info.setOptions({ ariaLabel: entry.lead.company });
    this.info.open({ map: this.map, anchor: entry.marker, shouldFocus: false });
    const state = this.placeState.get(leadId);
    if (entry.lead.placeId && (!state || state.status === 'error')) void this.loadPlace(entry.lead);
  }

  private async loadPlace(lead: Lead): Promise<void> {
    const placeId = lead.placeId!;
    this.placeState.set(lead.id, { status: 'loading' });
    this.refreshInfo();
    try {
      const details = await this.places.get(placeId);
      const current = this.markers.get(lead.id);
      if (!current || current.lead.placeId !== placeId) return; // lead changed while loading
      this.placeState.set(lead.id, { status: 'ok', details });
      this.setPosition(current.marker, current.lead);
      this.clusterer.render();
    } catch (e) {
      this.placeState.set(lead.id, { status: 'error', message: e instanceof Error ? e.message : 'Request failed' });
    }
    this.refreshInfo();
  }

  private placeSection(lead: Lead): HTMLElement | null {
    if (!lead.placeId) return null;
    const state = this.placeState.get(lead.id) ?? { status: 'loading' as const };
    const box = el('div', 'mt-3 rounded-md border border-slate-800 bg-slate-800/30 px-2 py-2 text-[11px]');
    box.setAttribute('aria-live', 'polite');
    if (state.status === 'loading') {
      box.append(el('span', 'text-slate-400', 'Verifying headquarters with Google Places…'));
    } else if (state.status === 'error') {
      box.append(el('span', 'text-amber-300', `Google Place details unavailable: ${state.message}`));
    } else {
      const { details } = state;
      box.append(el('div', 'text-[9px] tracking-wide text-emerald-400 uppercase', '✓ Verified by Google Places'));
      box.append(el('div', 'mt-1 font-medium text-slate-100', details.name));
      box.append(el('div', 'text-slate-400', details.formattedAddress));
      box.append(el('div', 'mt-1 truncate font-mono text-[10px] text-slate-500', details.placeId));
      if (details.googleMapsUri) {
        const link = el('a', 'mt-1 inline-block text-indigo-300 hover:text-indigo-200', 'Open in Google Maps ↗');
        link.href = details.googleMapsUri;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        box.append(link);
      }
    }
    return box;
  }

  private refreshInfo(): void {
    const entry = this.openLeadId ? this.markers.get(this.openLeadId) : undefined;
    if (entry) this.info.setContent(this.infoContent(entry.lead));
  }

  private infoContent(lead: Lead): HTMLElement {
    const root = el('div', 'w-72 p-4 font-sans text-slate-300');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', `${lead.company} prospect details`);

    const head = el('div', 'flex items-start justify-between gap-2 pr-6');
    head.append(el('div', 'text-sm font-semibold text-white', lead.company));
    const tier = el('span', 'shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-white', `${lead.intentTier} intent`);
    tier.style.background = TIER_COLOR[lead.intentTier];
    head.append(tier);
    root.append(head);
    root.append(el('div', 'mt-0.5 text-xs text-slate-400', `${lead.contact} · ${lead.title}`));
    root.append(el('div', 'mt-0.5 text-[11px] text-slate-500', `${lead.city}, ${lead.region} · ${lead.industry} · ${lead.country === 'CA' ? 'CASL' : 'TCPA'}`));

    const stats = el('dl', 'mt-3 grid grid-cols-4 gap-1.5 text-center');
    for (const [label, value] of [
      ['Intent', String(lead.intentScore)],
      ['ICP', String(lead.icp)],
      ['Reach', `${lead.reachability}%`],
      ['Rev', `$${formatInt(lead.revenueUsdM)}M`],
    ]) {
      const cell = el('div', 'rounded-md border border-slate-800 bg-slate-800/40 py-1.5');
      cell.append(el('dt', 'text-[9px] tracking-wide text-slate-500 uppercase', label), el('dd', 'mt-0.5 font-mono text-xs text-slate-100', value));
      stats.append(cell);
    }
    root.append(stats);

    const signal = el('div', 'mt-3 rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-1.5 text-[11px] text-indigo-200');
    signal.textContent = `Latest signal: ${lead.lastSignal}`;
    root.append(signal);
    const place = this.placeSection(lead);
    if (place) root.append(place);

    const enrolledIn = this.campaigns.find((c) => c.id === lead.enrolledSequenceId);
    if (enrolledIn) {
      root.append(el('div', 'mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-2 text-xs font-medium text-emerald-300', `✓ Enrolled in ${enrolledIn.name}`));
      return root;
    }

    const selectId = `seq-${lead.id}`;
    const label = el('label', 'mt-3 block text-[11px] text-slate-500', 'Sequence');
    label.htmlFor = selectId;
    const select = el('select', 'mt-1 h-8 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100');
    select.id = selectId;
    const preferred = this.chosenSequence.get(lead.id) ?? this.campaigns.find((c) => c.status === 'Running')?.id ?? this.campaigns[0]?.id;
    for (const c of this.campaigns) {
      const opt = el('option', '', `${c.name}${c.status === 'Paused' ? ' (paused)' : ''}`);
      opt.value = c.id;
      opt.selected = c.id === preferred;
      select.append(opt);
    }
    select.addEventListener('change', () => this.chosenSequence.set(lead.id, select.value));

    const pending = this.pendingLeadId === lead.id;
    const button = el('button', 'mt-2 flex h-9 w-full cursor-pointer items-center justify-center rounded-lg bg-indigo-500 text-sm font-medium text-white hover:bg-indigo-400 disabled:cursor-wait disabled:opacity-60', pending ? 'Enrolling…' : 'Enroll in Sequence');
    button.type = 'button';
    button.disabled = pending || !this.campaigns.length;
    const status = el('p', 'mt-1.5 min-h-4 text-[11px] text-rose-300');
    status.setAttribute('aria-live', 'polite');
    if (this.enrollError?.leadId === lead.id) status.textContent = this.enrollError.message;

    button.addEventListener('click', async () => {
      this.pendingLeadId = lead.id;
      this.enrollError = null;
      this.refreshInfo();
      try {
        await this.opts.onEnroll(lead.id, select.value);
      } catch (e) {
        this.enrollError = { leadId: lead.id, message: e instanceof Error ? e.message : 'Enrollment failed' };
      } finally {
        this.pendingLeadId = null;
        this.refreshInfo(); // the live lead.updated event re-renders this as "Enrolled"
      }
    });

    root.append(label, select, button, status);
    return root;
  }
}
