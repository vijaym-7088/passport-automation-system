import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import Notice from '../components/Notice';

const EMPTY = {
  applicationType: 'fresh',
  personal: {
    firstName: '',
    lastName: '',
    dob: '',
    gender: 'male',
    placeOfBirth: '',
    maritalStatus: 'single',
  },
  family: { fatherName: '', motherName: '' },
  contact: {
    phone: '',
    email: '',
    address: { line1: '', line2: '', city: '', state: '', pincode: '' },
  },
};

export default function ApplicationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api(`/applications/${id}`)
      .then(({ application }) => {
        setForm({
          applicationType: application.applicationType,
          personal: {
            ...application.personal,
            dob: application.personal.dob?.slice(0, 10) || '',
          },
          family: application.family || EMPTY.family,
          contact: application.contact,
        });
      })
      .catch((err) => setError(err.message));
  }, [id]);

  function set(section, key, value) {
    setForm((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  }

  function setAddress(key, value) {
    setForm((prev) => ({
      ...prev,
      contact: { ...prev.contact, address: { ...prev.contact.address, [key]: value } },
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { application } = id
        ? await api(`/applications/${id}`, { method: 'PUT', body: form })
        : await api('/applications', { method: 'POST', body: form });
      navigate(`/applications/${application._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{id ? 'Edit application' : 'New passport application'}</h1>
          <p>
            Saving keeps this as a draft. You attach documents and submit it on the next screen.
          </p>
        </div>
      </div>

      <Notice>{error}</Notice>

      <div className="panel">
        <div className="panel-body">
          <form onSubmit={handleSubmit}>
            <fieldset>
              <legend>Applicant particulars</legend>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="type">Type of application</label>
                  <select
                    id="type"
                    value={form.applicationType}
                    onChange={(e) => setForm({ ...form, applicationType: e.target.value })}
                  >
                    <option value="fresh">Fresh passport</option>
                    <option value="reissue">Reissue of passport</option>
                  </select>
                </div>
                <div className="field" />
                <div className="field">
                  <label htmlFor="firstName">Given name</label>
                  <input
                    id="firstName"
                    required
                    value={form.personal.firstName}
                    onChange={(e) => set('personal', 'firstName', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="lastName">Surname</label>
                  <input
                    id="lastName"
                    required
                    value={form.personal.lastName}
                    onChange={(e) => set('personal', 'lastName', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="dob">Date of birth</label>
                  <input
                    id="dob"
                    type="date"
                    required
                    value={form.personal.dob}
                    onChange={(e) => set('personal', 'dob', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="pob">Place of birth</label>
                  <input
                    id="pob"
                    required
                    value={form.personal.placeOfBirth}
                    onChange={(e) => set('personal', 'placeOfBirth', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="gender">Gender</label>
                  <select
                    id="gender"
                    value={form.personal.gender}
                    onChange={(e) => set('personal', 'gender', e.target.value)}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="marital">Marital status</label>
                  <select
                    id="marital"
                    value={form.personal.maritalStatus}
                    onChange={(e) => set('personal', 'maritalStatus', e.target.value)}
                  >
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend>Family details</legend>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="father">Father's name</label>
                  <input
                    id="father"
                    value={form.family.fatherName}
                    onChange={(e) => set('family', 'fatherName', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="mother">Mother's name</label>
                  <input
                    id="mother"
                    value={form.family.motherName}
                    onChange={(e) => set('family', 'motherName', e.target.value)}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend>Contact and address</legend>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="phone">Mobile number</label>
                  <input
                    id="phone"
                    required
                    value={form.contact.phone}
                    onChange={(e) => set('contact', 'phone', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="cemail">Email address</label>
                  <input
                    id="cemail"
                    type="email"
                    required
                    value={form.contact.email}
                    onChange={(e) => set('contact', 'email', e.target.value)}
                  />
                </div>
                <div className="field span-2">
                  <label htmlFor="line1">Address line 1</label>
                  <input
                    id="line1"
                    required
                    value={form.contact.address.line1}
                    onChange={(e) => setAddress('line1', e.target.value)}
                  />
                </div>
                <div className="field span-2">
                  <label htmlFor="line2">Address line 2</label>
                  <input
                    id="line2"
                    value={form.contact.address.line2}
                    onChange={(e) => setAddress('line2', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="city">City or district</label>
                  <input
                    id="city"
                    required
                    value={form.contact.address.city}
                    onChange={(e) => setAddress('city', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="state">State</label>
                  <input
                    id="state"
                    required
                    value={form.contact.address.state}
                    onChange={(e) => setAddress('state', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="pincode">Pincode</label>
                  <input
                    id="pincode"
                    required
                    pattern="\d{6}"
                    title="Six digits"
                    value={form.contact.address.pincode}
                    onChange={(e) => setAddress('pincode', e.target.value)}
                  />
                </div>
              </div>
            </fieldset>

            <div className="btn-row">
              <button className="btn btn-primary" disabled={busy}>
                {busy ? 'Saving…' : id ? 'Save changes' : 'Save draft'}
              </button>
              <button type="button" className="btn" onClick={() => navigate(-1)}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
