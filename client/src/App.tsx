import { useEffect, useState } from 'react';
import { WorkspaceShell } from './components/WorkspaceShell';
import type { Session } from './features/auth/auth-service';
import { SignInScreen } from './features/auth/SignInScreen';
import { WelcomeModal } from './features/auth/WelcomeModal';
import { env } from './lib/env';
import { WorkspaceProvider } from './state/WorkspaceContext';

type Stage = { name: 'signed-out' } | { name: 'welcome'; session: Session } | { name: 'workspace'; session: Session };

const SESSION_KEY = 'prospectiq.session';

function restore(): Stage {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return { name: 'workspace', session: JSON.parse(raw) as Session };
  } catch {
    /* storage unavailable (private mode, blocked cookies) */
  }
  return { name: 'signed-out' };
}

export function App() {
  const [stage, setStage] = useState<Stage>(restore);

  useEffect(() => {
    document.title = stage.name === 'signed-out' ? 'ProspectIQ — Sign in' : 'ProspectIQ';
  }, [stage.name]);

  if (stage.name === 'signed-out') {
    return <SignInScreen onSignedIn={(session) => setStage({ name: 'welcome', session })} />;
  }

  const launch = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(stage.session));
    } catch {
      /* non-persistent session is fine */
    }
    setStage({ name: 'workspace', session: stage.session });
  };

  const signOut = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setStage({ name: 'signed-out' });
  };

  return (
    <WorkspaceProvider>
      {/* The workspace connects and hydrates behind the welcome modal, but stays inert until launch. */}
      <div inert={stage.name === 'welcome'}>
        <WorkspaceShell session={stage.session} onSignOut={signOut} />
      </div>
      {stage.name === 'welcome' && <WelcomeModal session={stage.session} videoSrc={env.welcomeVideoUrl} onLaunch={launch} />}
    </WorkspaceProvider>
  );
}
