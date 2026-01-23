import React from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { GET_SCHOOL, DELETE_SCHOOL, GET_MY_CLASSES } from '../../../graphql/lessons/queries';
import './SchoolDetails.css';

interface Class {
  id: string;
  name: string;
  grade: string;
  section: string;
  academicYear: string;
  schedule: string;
  studentCount: number;
  subjectCount: number;
}

const SchoolDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, loading, error } = useQuery(GET_SCHOOL, {
    variables: { id },
  });

  const { data: classesData, loading: loadingClasses } = useQuery(GET_MY_CLASSES, {
    variables: { filters: { schoolId: id } },
  });

  const [deleteSchool] = useMutation(DELETE_SCHOOL);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this school? All associated classes will also be deleted.')) {
      return;
    }

    try {
      await deleteSchool({ variables: { id } });
      navigate('/lessons/schools');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <div className="loading">Loading school details...</div>;
  if (error) return <div className="error">Error: {error.message}</div>;
  if (!data?.school) return <div className="error">School not found</div>;

  const school = data.school;
  const classes: Class[] = classesData?.myClasses || [];

  return (
    <div className="school-details-page">
      <div className="page-header">
        <div className="header-content">
          <button onClick={() => navigate('/lessons/schools')} className="btn-back">
            ← Back to Schools
          </button>
          <h1>{school.name}</h1>
          <div className="header-actions">
            <Link to={`/lessons/schools/${id}/edit`} className="btn btn-secondary">
              Edit School
            </Link>
            <button onClick={handleDelete} className="btn btn-danger">
              Delete School
            </button>
          </div>
        </div>
      </div>

      <div className="details-container">
        <div className="info-card">
          <h2>School Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Status</label>
              <span className={`badge badge-${school.status.toLowerCase()}`}>
                {school.status}
              </span>
            </div>
            {school.location && (
              <div className="info-item">
                <label>Location</label>
                <span>📍 {school.location}</span>
              </div>
            )}
            {school.address && (
              <div className="info-item">
                <label>Address</label>
                <span>{school.address}</span>
              </div>
            )}
            {school.phone && (
              <div className="info-item">
                <label>Phone</label>
                <span>📞 {school.phone}</span>
              </div>
            )}
            {school.email && (
              <div className="info-item">
                <label>Email</label>
                <span>✉️ {school.email}</span>
              </div>
            )}
            <div className="info-item">
              <label>Teachers</label>
              <span>👥 {school.teacherCount} teacher{school.teacherCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        <div className="classes-card">
          <div className="card-header">
            <h2>Classes ({classes.length})</h2>
            <Link to={`/lessons/classes/new?schoolId=${id}`} className="btn btn-primary btn-sm">
              + Add Class
            </Link>
          </div>

          {loadingClasses ? (
            <div className="loading-small">Loading classes...</div>
          ) : classes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <p>No classes yet</p>
              <Link to={`/lessons/classes/new?schoolId=${id}`} className="btn btn-primary">
                Create First Class
              </Link>
            </div>
          ) : (
            <div className="classes-list">
              {classes.map((cls) => (
                <div key={cls.id} className="class-item">
                  <div className="class-info">
                    <h3>{cls.name}</h3>
                    <div className="class-meta">
                      <span>Grade {cls.grade}</span>
                      {cls.section && <span>Section {cls.section}</span>}
                      <span>{cls.academicYear}</span>
                    </div>
                  </div>
                  <div className="class-stats">
                    <div className="stat">
                      <span className="stat-value">{cls.studentCount}</span>
                      <span className="stat-label">Students</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{cls.subjectCount}</span>
                      <span className="stat-label">Subjects</span>
                    </div>
                  </div>
                  <Link to={`/lessons/classes/${cls.id}`} className="btn btn-secondary btn-sm">
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchoolDetails;
