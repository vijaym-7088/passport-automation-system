import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Notice from '../components/Notice';

const DEMO = [
  ['Applicant', 'vijay@example.com', 'user1234'],
  ['Passport officer', 'admin@pas.gov', 'admin123'],
  ['Verification officer', 'verifier@pas.gov', 'verify123'],
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const signedIn = await login(form.email, form.password);
      navigate(signedIn.role === 'applicant' ? '/applications' : '/queue', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <aside className="auth-aside">
        <h1>Apply for a passport without the paperwork.</h1>
        <p>
          Fill in your particulars once, attach your documents, and follow the file through every
          desk it crosses.
        </p>
        <ol className="stage-list">
          <li>Submit your application and documents</li>
          <li>A passport officer checks the file</li>
          <li>Police verification is recorded</li>
          <li>Your passport number is issued</li>
        </ol>
      </aside>

      <div className="auth-main">
        <div className="auth-card">
          <h2>Sign in</h2>
          <p>Use the account you registered with.</p>

          <Notice>{error}</Notice>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <footer>
            No account yet? <Link to="/register">Register as an applicant</Link>
          </footer>

          <div className="demo-keys">
            Seeded accounts
            {DEMO.map(([role, email, password]) => (
              <div key={email}>
                <span>{role}</span>
                <code>{email} / {password}</code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
