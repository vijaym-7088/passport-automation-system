import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import MyApplications from './pages/MyApplications';
import ApplicationForm from './pages/ApplicationForm';
import ApplicationDetail from './pages/ApplicationDetail';
import StaffQueue from './pages/StaffQueue';

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'applicant' ? '/applications' : '/queue'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/applications" element={<MyApplications />} />
        <Route path="/applications/new" element={<ApplicationForm />} />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/applications/:id/edit" element={<ApplicationForm />} />
        <Route
          path="/queue"
          element={
            <ProtectedRoute roles={['admin', 'verifier']}>
              <StaffQueue />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
