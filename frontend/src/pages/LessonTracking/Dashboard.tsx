import React from 'react';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { GET_DASHBOARD_SUMMARY } from '../../graphql/lessons/queries';
import './Dashboard.css';

interface DashboardSummaryData {
  dashboardSummary: {
    todayLessons: Array<{
      id: string;
      date: string;
      duration: number;
      status: string;
      class: { id: string; name: string };
      classSubject: { subject: { id: string; name: string } };
    }>;
    upcomingLessons: Array<{
      id: string;
      date: string;
      duration: number;
      status: string;
      class: { id: string; name: string };
      classSubject: { subject: { id: string; name: string } };
    }>;
    weekProgress: number;
    alertsCount: number;
    schoolsCount: number;
    classesCount: number;
    recentProgress: Array<{
      classSubjectId: string;
      subjectName: string;
      className: string;
      completionPercentage: number;
      onTrack: boolean;
    }>;
  };
}

const Dashboard: React.FC = () => {
  const { data, loading, error } = useQuery<DashboardSummaryData>(GET_DASHBOARD_SUMMARY);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">Error loading dashboard: {error.message}</div>;
  if (!data) return null;

  const summary = data.dashboardSummary;

  return (
    <div className="lesson-tracking-dashboard">
      <div className="dashboard-header">
        <h1>Lesson Tracking Dashboard</h1>
        <div className="quick-actions">
          <Link to="/lessons/new" className="btn btn-primary">
            + Log New Lesson
          </Link>
          <Link to="/lessons/schools" className="btn btn-secondary">
            Manage Schools
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="dashboard-cards">
        <div className="card">
          <div className="card-icon">🏫</div>
          <div className="card-content">
            <h3>{summary.schoolsCount}</h3>
            <p>Schools</p>
          </div>
        </div>
        <div className="card">
          <div className="card-icon">👥</div>
          <div className="card-content">
            <h3>{summary.classesCount}</h3>
            <p>Active Classes</p>
          </div>
        </div>
        <div className="card">
          <div className="card-icon">📅</div>
          <div className="card-content">
            <h3>{summary.todayLessons.length}</h3>
            <p>Today's Lessons</p>
          </div>
        </div>
        <div className="card">
          <div className="card-icon">⚠️</div>
          <div className="card-content">
            <h3>{summary.alertsCount}</h3>
            <p>Alerts</p>
          </div>
        </div>
      </div>

      {/* Week Progress */}
      <div className="week-progress-section">
        <h2>This Week's Progress</h2>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${summary.weekProgress}%` }}>
            <span>{summary.weekProgress.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Today's Lessons */}
        <div className="dashboard-section">
          <h2>Today's Lessons</h2>
          {summary.todayLessons.length === 0 ? (
            <p className="no-data">No lessons scheduled for today</p>
          ) : (
            <div className="lesson-list">
              {summary.todayLessons.map((lesson) => (
                <Link key={lesson.id} to={`/lessons/${lesson.id}`} className="lesson-card">
                  <div className="lesson-time">{new Date(lesson.date).toLocaleTimeString()}</div>
                  <div className="lesson-details">
                    <h4>{lesson.classSubject.subject.name}</h4>
                    <p>{lesson.class.name}</p>
                    <span className={`status status-${lesson.status.toLowerCase()}`}>
                      {lesson.status}
                    </span>
                  </div>
                  <div className="lesson-duration">{lesson.duration}h</div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Lessons */}
        <div className="dashboard-section">
          <h2>Upcoming Lessons</h2>
          {summary.upcomingLessons.length === 0 ? (
            <p className="no-data">No upcoming lessons planned</p>
          ) : (
            <div className="lesson-list">
              {summary.upcomingLessons.slice(0, 5).map((lesson) => (
                <Link key={lesson.id} to={`/lessons/${lesson.id}`} className="lesson-card">
                  <div className="lesson-date">{new Date(lesson.date).toLocaleDateString()}</div>
                  <div className="lesson-details">
                    <h4>{lesson.classSubject.subject.name}</h4>
                    <p>{lesson.class.name}</p>
                  </div>
                  <div className="lesson-duration">{lesson.duration}h</div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Progress */}
        <div className="dashboard-section full-width">
          <h2>Class Progress Overview</h2>
          {summary.recentProgress.length === 0 ? (
            <p className="no-data">No progress data available</p>
          ) : (
            <div className="progress-grid">
              {summary.recentProgress.map((progress) => (
                <div key={progress.classSubjectId} className="progress-card">
                  <div className="progress-header">
                    <h4>{progress.subjectName}</h4>
                    <p>{progress.className}</p>
                  </div>
                  <div className="progress-indicator">
                    <div className="circular-progress">
                      <svg width="80" height="80">
                        <circle cx="40" cy="40" r="35" fill="none" stroke="#eee" strokeWidth="8" />
                        <circle
                          cx="40"
                          cy="40"
                          r="35"
                          fill="none"
                          stroke={progress.onTrack ? '#4caf50' : '#ff9800'}
                          strokeWidth="8"
                          strokeDasharray={`${progress.completionPercentage * 2.2} 220`}
                          transform="rotate(-90 40 40)"
                        />
                        <text x="40" y="45" textAnchor="middle" fontSize="16" fontWeight="bold">
                          {progress.completionPercentage.toFixed(0)}%
                        </text>
                      </svg>
                    </div>
                    <div className="progress-status">
                      <span className={`badge ${progress.onTrack ? 'badge-success' : 'badge-warning'}`}>
                        {progress.onTrack ? '✓ On Track' : '⚠ Behind'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="quick-links-section">
        <h2>Quick Access</h2>
        <div className="quick-links-grid">
          <Link to="/lessons/schools" className="quick-link-card">
            <div className="icon">🏫</div>
            <h3>Schools</h3>
            <p>Manage your schools</p>
          </Link>
          <Link to="/lessons/classes" className="quick-link-card">
            <div className="icon">👥</div>
            <h3>Classes</h3>
            <p>View all classes</p>
          </Link>
          <Link to="/lessons/all" className="quick-link-card">
            <div className="icon">📚</div>
            <h3>Lessons</h3>
            <p>View lesson history</p>
          </Link>
          <Link to="/lessons/reports" className="quick-link-card">
            <div className="icon">📊</div>
            <h3>Reports</h3>
            <p>Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
