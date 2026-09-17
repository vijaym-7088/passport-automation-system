import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isStaff = user?.role === 'admin' || user?.role === 'verifier';

  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <header className="masthead">
        <div className="masthead-inner">
          <Link to="/" className="wordmark">
            <span className="seal" aria-hidden="true">PS</span>
            <span>
              <strong>Passport Seva</strong>
              <span>Application portal</span>
            </span>
          </Link>

          <nav>
            {isStaff ? (
              <NavLink to="/queue">Application queue</NavLink>
            ) : (
              <>
                <NavLink to="/applications" end>My applications</NavLink>
                <NavLink to="/applications/new">Apply</NavLink>
              </>
            )}
            <span className="whoami">
              <b>{user?.name}</b>
              {user?.role}
            </span>
            <button type="button" className="btn" onClick={signOut}>Sign out</button>
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </>
  );
}
