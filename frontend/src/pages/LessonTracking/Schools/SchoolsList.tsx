import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Link } from 'react-router-dom';
import { GET_MY_SCHOOLS, CREATE_SCHOOL, DELETE_SCHOOL } from '../../../graphql/lessons/queries';

interface School {
  id: string;
  name: string;
  location: string;
  address: string;
  phone: string;
  email: string;
  status: string;
  teacherCount: number;
  createdAt: string;
}

const SchoolsList: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    address: '',
    phone: '',
    email: '',
  });

  const { data, loading, error, refetch } = useQuery(GET_MY_SCHOOLS);
  const [createSchool, { loading: creating }] = useMutation(CREATE_SCHOOL);
  const [deleteSchool] = useMutation(DELETE_SCHOOL);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSchool({ variables: { input: formData } });
      setFormData({ name: '', location: '', address: '', phone: '', email: '' });
      setShowForm(false);
      refetch();
    } catch (err) {
      console.error('Error creating school:', err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteSchool({ variables: { id } });
        refetch();
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    }
  };

  if (loading) return <div className="loading">Loading schools...</div>;
  if (error) return <div className="error">Error: {error.message}</div>;

  const schools: School[] = data?.mySchools || [];

  return (
    <div className="schools-page" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>My Schools</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : '+ Add School'}
        </button>
      </div>

      {showForm && (
        <div className="form-card" style={{ background: 'white', padding: '2rem', borderRadius: '12px', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginTop: 0 }}>Add New School</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label>School Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label>Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button type="submit" disabled={creating} className="btn btn-primary">
                {creating ? 'Creating...' : 'Create School'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {schools.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏫</div>
          <h2>No Schools Yet</h2>
          <p>Click "Add School" to get started</p>
        </div>
      ) : (
        <div className="schools-grid" style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {schools.map((school) => (
            <div key={school.id} className="school-card" style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'transform 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>{school.name}</h3>
                  <span style={{ padding: '0.25rem 0.75rem', background: '#d1fae5', color: '#059669', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '500' }}>
                    {school.status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link to={`/lessons/schools/${school.id}`} style={{ padding: '0.5rem', borderRadius: '4px', background: '#f3f4f6', textDecoration: 'none', color: '#374151' }}>
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(school.id, school.name)}
                    style={{ padding: '0.5rem', borderRadius: '4px', background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                {school.location && (
                  <div>📍 {school.location}</div>
                )}
                {school.phone && (
                  <div>📞 {school.phone}</div>
                )}
                {school.email && (
                  <div>✉️ {school.email}</div>
                )}
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e5e7eb' }}>
                  👥 {school.teacherCount} teacher{school.teacherCount !== 1 ? 's' : ''}
                </div>
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <Link to={`/lessons/schools/${school.id}/classes`} className="btn btn-secondary" style={{ width: '100%', textAlign: 'center', display: 'block', textDecoration: 'none' }}>
                  View Classes
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SchoolsList;
