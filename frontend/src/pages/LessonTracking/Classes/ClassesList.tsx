import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { GET_MY_CLASSES, GET_MY_SCHOOLS } from '../../../graphql/lessons/queries';
import './ClassesList.css';

interface Class {
  id: string;
  name: string;
  grade: string;
  section: string;
  academicYear: string;
  schedule: string;
  studentCount: number;
  subjectCount: number;
  school: {
    id: string;
    name: string;
  };
  archived: boolean;
}

const ClassesList: React.FC = () => {
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  const { data: schoolsData } = useQuery(GET_MY_SCHOOLS);
  const { data, loading, error } = useQuery(GET_MY_CLASSES, {
    variables: {
      filters: {
        schoolId: selectedSchool === 'all' ? undefined : selectedSchool,
        archived: showArchived ? undefined : false,
      },
    },
  });

  if (loading) return <div className="loading">Loading classes...</div>;
  if (error) return <div className="error">Error: {error.message}</div>;

  const classes: Class[] = data?.myClasses || [];
  const schools = schoolsData?.mySchools || [];

  // Group classes by school
  const groupedClasses = classes.reduce((acc, cls) => {
    const schoolId = cls.school.id;
    if (!acc[schoolId]) {
      acc[schoolId] = {
        school: cls.school,
        classes: [],
      };
    }
    acc[schoolId].classes.push(cls);
    return acc;
  }, {} as Record<string, { school: { id: string; name: string }; classes: Class[] }>);

  return (
    <div className="classes-list-page">
      <div className="page-header">
        <h1>My Classes</h1>
        <Link to="/lessons/classes/new" className="btn btn-primary">
          + Add Class
        </Link>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label>Filter by School:</label>
          <select value={selectedSchool} onChange={(e) => setSelectedSchool(e.target.value)}>
            <option value="all">All Schools</option>
            {schools.map((school: any) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-checkbox">
          <input
            type="checkbox"
            id="showArchived"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          <label htmlFor="showArchived">Show archived classes</label>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h2>No Classes Yet</h2>
          <p>Start by creating your first class</p>
          <Link to="/lessons/classes/new" className="btn btn-primary">
            Create First Class
          </Link>
        </div>
      ) : (
        <div className="classes-container">
          {Object.values(groupedClasses).map(({ school, classes: schoolClasses }) => (
            <div key={school.id} className="school-group">
              <div className="school-header">
                <h2>{school.name}</h2>
                <span className="class-count">{schoolClasses.length} class{schoolClasses.length !== 1 ? 'es' : ''}</span>
              </div>

              <div className="classes-grid">
                {schoolClasses.map((cls) => (
                  <div key={cls.id} className={`class-card ${cls.archived ? 'archived' : ''}`}>
                    {cls.archived && <div className="archived-badge">Archived</div>}
                    <div className="class-header">
                      <h3>{cls.name}</h3>
                      <div className="class-meta">
                        <span>Grade {cls.grade}</span>
                        {cls.section && <span>• Section {cls.section}</span>}
                      </div>
                    </div>

                    <div className="class-info">
                      <div className="info-row">
                        <span className="label">Academic Year:</span>
                        <span className="value">{cls.academicYear}</span>
                      </div>
                      {cls.schedule && (
                        <div className="info-row">
                          <span className="label">Schedule:</span>
                          <span className="value">{cls.schedule}</span>
                        </div>
                      )}
                    </div>

                    <div className="class-stats">
                      <div className="stat">
                        <span className="stat-value">{cls.studentCount}</span>
                        <span className="stat-label">Students</span>
                      </div>
                      <div className="stat-divider"></div>
                      <div className="stat">
                        <span className="stat-value">{cls.subjectCount}</span>
                        <span className="stat-label">Subjects</span>
                      </div>
                    </div>

                    <div className="card-actions">
                      <Link to={`/lessons/classes/${cls.id}`} className="btn btn-primary btn-block">
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassesList;
