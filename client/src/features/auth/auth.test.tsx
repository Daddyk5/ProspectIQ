import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthError, type Session } from './auth-service';
import { SignInScreen } from './SignInScreen';
import { WelcomeModal } from './WelcomeModal';

const session: Session = { user: { name: 'Priya Raman', email: 'priya@northwind.ca', org: 'northwind.ca' }, provider: 'password', issuedAt: '' };

function setup(password = vi.fn(async () => session)) {
  const onSignedIn = vi.fn();
  const provider = vi.fn(async () => ({ ...session, provider: 'google' as const }));
  render(<SignInScreen onSignedIn={onSignedIn} auth={{ password, provider }} />);
  return { onSignedIn, password, provider, user: userEvent.setup() };
}

describe('SignInScreen', () => {
  it('blocks submission and marks fields invalid when the form is empty', async () => {
    const { user, password } = setup();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const email = screen.getByLabelText('Work email');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('Enter your work email address');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Enter your password');
    expect(email).toHaveFocus();
    expect(password).not.toHaveBeenCalled();
  });

  it('validates email format and password length with Zod', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Work email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText(/valid email address/)).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
  });

  it('shows a loading state, then signs in with valid credentials', async () => {
    let resolve!: (s: Session) => void;
    const { user, onSignedIn } = setup(vi.fn(() => new Promise<Session>((r) => (resolve = r))));
    await user.type(screen.getByLabelText('Work email'), 'priya@northwind.ca');
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const submit = screen.getByRole('button', { name: /Signing in/ });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    resolve(session);
    await waitFor(() => expect(onSignedIn).toHaveBeenCalledWith(session));
  });

  it('announces server errors in an alert and re-enables the form', async () => {
    const { user } = setup(vi.fn(async () => { throw new AuthError('INVALID_CREDENTIALS', 'That email and password combination is incorrect.'); }));
    await user.type(screen.getByLabelText('Work email'), 'priya@northwind.ca');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('incorrect');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('signs in through Microsoft SSO', async () => {
    const { user, provider, onSignedIn } = setup();
    await user.click(screen.getByRole('button', { name: 'Continue with Microsoft SSO' }));
    expect(provider).toHaveBeenCalledWith('microsoft');
    await waitFor(() => expect(onSignedIn).toHaveBeenCalled());
  });

  it('toggles password visibility accessibly', async () => {
    const { user } = setup();
    const toggle = screen.getByRole('button', { name: 'Show password' });
    await user.click(toggle);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('WelcomeModal', () => {
  it('is a labelled modal dialog with a video and the launch action', async () => {
    const onLaunch = vi.fn();
    render(<WelcomeModal session={session} videoSrc="/tour.mp4" onLaunch={onLaunch} />);
    const dialog = screen.getByRole('dialog', { name: 'Welcome to ProspectIQ, Priya' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('ProspectIQ product tour video')).toHaveAttribute('src', '/tour.mp4');
    await userEvent.click(screen.getByRole('button', { name: 'Launch ProspectIQ Workspace' }));
    expect(onLaunch).toHaveBeenCalled();
  });

  it('shows an error state with retry when the video fails to load', async () => {
    render(<WelcomeModal session={session} videoSrc="/missing.mp4" onLaunch={() => {}} />);
    fireEvent.error(screen.getByLabelText('ProspectIQ product tour video'));
    expect(await screen.findByRole('alert')).toHaveTextContent('The product tour is unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play product tour' })).toBeInTheDocument();
  });

  it('closes with Escape', async () => {
    const onLaunch = vi.fn();
    render(<WelcomeModal session={session} videoSrc="/tour.mp4" onLaunch={onLaunch} />);
    await userEvent.keyboard('{Escape}');
    expect(onLaunch).toHaveBeenCalled();
  });
});
