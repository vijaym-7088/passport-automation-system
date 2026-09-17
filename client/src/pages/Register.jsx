import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Notice from '../components/Notice';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  function set(key) {
    return (e) => setForm({ ...form, [key]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form);
      navigate('/applications', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <aside className="auth-aside">
        <h1>Create your applicant account.</h1>
        <p>
          One account covers every application you make. Officer accounts are created by the
          passport office, not here.
        </p>
      </aside>

      <div className="auth-main">
        <div className="auth-card">
          <h2>Register</h2>
          <p>This takes about a minute.</p>

          <Notice>{error}</Notice>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" required value={form.name} onChange={set('name')} />
            </div>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" required value={form.email} onChange={set('email')} />
            </div>
            <div className="field">
              <label htmlFor="phone">Mobile number</label>
              <input id="phone" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                minLength={6}
                required
                value={form.password}
                onChange={set('password')}
              />
            </div>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <footer>
            Already registered? <Link to="/login">Sign in</Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
