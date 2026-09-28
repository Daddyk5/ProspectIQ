import { Activity, PhoneCall, Radar, Workflow } from 'lucide-react';
import { useEffect, useState } from 'react';

const SLIDES = [
  { icon: Radar, title: 'Live buying signals', body: 'Hiring sprees, funding and SEC / SEDAR+ filings scored in real time across the US and Canada.', stat: '2,104', statLabel: 'signals today' },
  { icon: PhoneCall, title: 'Phone-in-hand call windows', body: 'Dial every decision-maker at the hour they actually pick up.', stat: '+6.2 pts', statLabel: 'live connect rate' },
  { icon: Workflow, title: 'Multi-channel sequences', body: 'Call, email, LinkedIn and CRM sync, with conversion tracked at every node.', stat: '$4.8M', statLabel: 'pipeline forecast' },
];

/**
 * Left-hand product teaser. Pass `videoSrc` to play a muted marketing loop;
 * without it, an animated feature carousel stands in as the placeholder.
 */
export function MarketingLoop({ videoSrc }: { videoSrc?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    if (paused || videoSrc) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 4000);
    return () => clearInterval(t);
  }, [paused, videoSrc]);

  const slide = SLIDES[index];
  const Icon = slide.icon;

  return (
    <section aria-label="ProspectIQ product preview" className="relative hidden overflow-hidden border-r border-slate-800 bg-slate-950 lg:flex lg:flex-col">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgb(99_102_241/0.22),transparent_55%),radial-gradient(ellipse_at_80%_90%,rgb(16_185_129/0.12),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(51_65_85/0.25)_1px,transparent_1px),linear-gradient(90deg,rgb(51_65_85/0.25)_1px,transparent_1px)] bg-size-[48px_48px] mask-[radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      <div className="relative flex items-center gap-2.5 p-10">
        <div className="grid size-8 place-items-center rounded-lg bg-brand shadow-[0_0_20px_rgb(99_102_241/0.55)]">
          <Radar className="size-4 text-white" aria-hidden="true" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-white">
          Prospect<span className="text-indigo-400">IQ</span>
        </span>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-10">
        {/* 16:9 slot reserved for the marketing loop video */}
        <div className="relative aspect-video w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-2xl shadow-black/60">
          {videoSrc ? (
            <video className="size-full object-cover" src={videoSrc} autoPlay muted loop playsInline aria-hidden="true" />
          ) : (
            <div key={index} className="fade-up flex size-full flex-col justify-between p-7" aria-live="polite">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl border border-indigo-500/40 bg-indigo-500/15 text-indigo-300">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-base font-semibold text-white">{slide.title}</div>
                  <div className="text-xs text-slate-400">{slide.body}</div>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-4xl font-semibold tracking-tight text-white tabular-nums">{slide.stat}</div>
                  <div className="text-xs text-slate-500">{slide.statLabel}</div>
                </div>
                <div className="flex h-16 items-end gap-1" aria-hidden="true">
                  {[30, 45, 38, 60, 52, 72, 66, 88].map((h, i) => (
                    <span key={i} className="w-2.5 rounded-t bg-linear-to-t from-brand to-go/80" style={{ height: `${h}%`, animation: `fade-up .4s ${i * 0.05}s both` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative flex items-center justify-between p-10 text-xs text-slate-500">
        <div className="flex gap-1.5" role="tablist" aria-label="Preview slides">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              role="tab"
              aria-selected={i === index}
              aria-label={s.title}
              onClick={() => setIndex(i)}
              className={`h-1.5 cursor-pointer rounded-full transition-all ${i === index ? 'w-6 bg-indigo-400' : 'w-1.5 bg-slate-700 hover:bg-slate-500'}`}
            />
          ))}
        </div>
        {!videoSrc && (
          <button onClick={() => setPaused((p) => !p)} className="flex cursor-pointer items-center gap-1 hover:text-slate-300" aria-pressed={paused}>
            <Activity className="size-3.5" aria-hidden="true" /> {paused ? 'Play preview' : 'Pause preview'}
          </button>
        )}
      </div>
    </section>
  );
}
