import { CircleAlert, LoaderCircle, Play, RotateCcw, Rocket, Sparkles } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { useFocusTrap } from '../../lib/use-focus-trap';
import type { Session } from './auth-service';

type VideoState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'blocked' | 'error';

const MEDIA_ERRORS: Record<number, string> = {
  1: 'Playback was aborted.',
  2: 'A network error stopped the video from loading.',
  3: 'The video could not be decoded.',
  4: 'The video file is missing or its format is not supported.',
};

interface Props {
  session: Session;
  videoSrc: string;
  posterSrc?: string;
  onLaunch: () => void;
}

export function WelcomeModal({ session, videoSrc, posterSrc, onLaunch }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [video, setVideo] = useState<VideoState>('idle');
  const [videoError, setVideoError] = useState('');
  const [launching, setLaunching] = useState(false);
  const id = useId();

  const launch = () => {
    setLaunching(true);
    videoRef.current?.pause();
    onLaunch();
  };
  useFocusTrap(dialogRef, launch);

  async function play() {
    const v = videoRef.current;
    if (!v) return;
    setVideo('loading');
    try {
      await v.play();
    } catch (e) {
      // NotAllowedError: autoplay policy; the native controls still work.
      if (e instanceof DOMException && e.name === 'NotAllowedError') setVideo('blocked');
      else if (!v.error) setVideo('paused');
    }
  }

  function retry() {
    setVideoError('');
    setVideo('idle');
    videoRef.current?.load();
  }

  const firstName = session.user.name.split(' ')[0] || 'there';
  const showOverlay = video === 'idle' || video === 'blocked' || video === 'ended';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-desc`}
        className="fade-up w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/70"
      >
        <header className="border-b border-slate-800 bg-linear-to-br from-indigo-500/15 to-transparent px-6 pt-6 pb-5">
          <span className="chip border-indigo-500/40 bg-indigo-500/15 text-indigo-200">
            <Sparkles className="size-3" aria-hidden="true" /> Workspace ready
          </span>
          <h2 id={`${id}-title`} className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Welcome to ProspectIQ, {firstName}
          </h2>
          <p id={`${id}-desc`} className="mt-1 text-sm text-slate-400">
            Signed in as {session.user.email}. Watch the 2-minute tour, or jump straight into your workspace.
          </p>
        </header>

        <div className="p-6">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-800 bg-black">
            <video
              ref={videoRef}
              className="size-full"
              src={videoSrc}
              poster={posterSrc}
              preload="metadata"
              playsInline
              controls={video !== 'idle' && video !== 'error'}
              aria-label="ProspectIQ product tour video"
              onPlaying={() => setVideo('playing')}
              onWaiting={() => setVideo('loading')}
              onPause={() => setVideo((s) => (s === 'error' ? s : 'paused'))}
              onEnded={() => setVideo('ended')}
              onError={() => {
                const code = videoRef.current?.error?.code ?? 4;
                setVideoError(MEDIA_ERRORS[code] ?? 'The video could not be played.');
                setVideo('error');
              }}
            >
              <p>
                Your browser cannot play HTML5 video. <a href={videoSrc}>Download the tour</a> instead.
              </p>
            </video>

            {showOverlay && (
              <button
                type="button"
                onClick={play}
                className="group absolute inset-0 grid cursor-pointer place-items-center bg-linear-to-t from-black/70 via-black/20 to-black/40"
                aria-label={video === 'ended' ? 'Replay product tour' : 'Play product tour'}
              >
                <span className="grid size-16 place-items-center rounded-full bg-brand text-white shadow-[0_0_0_8px_rgb(99_102_241/0.25)] transition-transform group-hover:scale-105">
                  {video === 'ended' ? <RotateCcw className="size-7" aria-hidden="true" /> : <Play className="ml-1 size-7 fill-current" aria-hidden="true" />}
                </span>
                {video === 'blocked' && <span className="absolute bottom-4 text-xs text-slate-300">Your browser blocked playback. Press play to start.</span>}
              </button>
            )}

            {video === 'loading' && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center" role="status">
                <LoaderCircle className="size-8 animate-spin text-white/80" aria-hidden="true" />
                <span className="sr-only">Loading video</span>
              </div>
            )}

            {video === 'error' && (
              <div role="alert" className="absolute inset-0 grid place-items-center bg-slate-950/95 p-6 text-center">
                <div>
                  <CircleAlert className="mx-auto size-8 text-rose-400" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium text-slate-100">The product tour is unavailable</p>
                  <p className="mt-1 text-xs text-slate-400">{videoError} You can launch your workspace and watch it later from Help.</p>
                  <button type="button" className="btn btn-sm mt-4" onClick={retry}>
                    <RotateCcw className="size-3.5" aria-hidden="true" /> Try again
                  </button>
                </div>
              </div>
            )}
          </div>

          <ul className="mt-5 grid gap-2 text-sm text-slate-400 sm:grid-cols-3">
            {['Review live buying signals', 'Map territories by intent', 'Launch AI-timed sequences'].map((t, i) => (
              <li key={t} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-800/30 px-3 py-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-indigo-500/20 font-mono text-[11px] text-indigo-300">{i + 1}</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-800 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-500">Press Esc to skip the tour</span>
          <button type="button" className="btn btn-primary h-11 px-5 text-[15px]" onClick={launch} disabled={launching} aria-busy={launching} autoFocus>
            {launching ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Rocket className="size-4" aria-hidden="true" />}
            Launch ProspectIQ Workspace
          </button>
        </footer>
      </div>
    </div>
  );
}
