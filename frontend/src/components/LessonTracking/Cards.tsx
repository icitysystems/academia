import React from 'react';
import { Link } from 'react-router-dom';
import './Cards.css';

interface SchoolCardProps {
  school: {
    id: string;
    name: string;
    location?: string;
    status: string;
    teacherCount: number;
  };
  onDelete?: () => void;
}

export const SchoolCard: React.FC<SchoolCardProps> = ({ school, onDelete }) => {
  return (
    <div className="card school-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">{school.name}</h3>
          <span className={`badge badge-${school.status.toLowerCase()}`}>
            {school.status}
          </span>
        </div>
        {onDelete && (
          <button onClick={onDelete} className="card-delete-btn">
            ✕
          </button>
        )}
      </div>
      <div className="card-body">
        {school.location && (
          <div className="card-info">
            <span className="card-icon">📍</span>
            <span>{school.location}</span>
          </div>
        )}
        <div className="card-info">
          <span className="card-icon">👥</span>
          <span>{school.teacherCount} teacher{school.teacherCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="card-footer">
        <Link to={`/lessons/schools/${school.id}`} className="card-link">
          View Details →
        </Link>
      </div>
    </div>
  );
};

interface ClassCardProps {
  cls: {
    id: string;
    name: string;
    grade: string;
    section?: string;
    academicYear: string;
    studentCount: number;
    subjectCount: number;
    archived?: boolean;
  };
}

export const ClassCard: React.FC<ClassCardProps> = ({ cls }) => {
  return (
    <div className={`card class-card ${cls.archived ? 'archived' : ''}`}>
      {cls.archived && <div className="archived-badge">Archived</div>}
      <div className="card-header">
        <h3 className="card-title">{cls.name}</h3>
        <div className="card-meta">
          <span>Grade {cls.grade}</span>
          {cls.section && <span>• Section {cls.section}</span>}
        </div>
      </div>
      <div className="card-body">
        <div className="card-info">
          <span className="label">Academic Year:</span>
          <span className="value">{cls.academicYear}</span>
        </div>
        <div className="card-stats">
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
      </div>
      <div className="card-footer">
        <Link to={`/lessons/classes/${cls.id}`} className="card-link">
          View Details →
        </Link>
      </div>
    </div>
  );
};

interface LessonCardProps {
  lesson: {
    id: string;
    topic: string;
    date: string;
    startTime?: string;
    endTime?: string;
    class: {
      name: string;
    };
    status: string;
    studentsPresent: number;
    studentsAbsent: number;
  };
}

export const LessonCard: React.FC<LessonCardProps> = ({ lesson }) => {
  return (
    <Link to={`/lessons/lessons/${lesson.id}`} className="card lesson-card">
      <div className="card-header">
        <h3 className="card-title">{lesson.topic}</h3>
        <span className={`badge badge-${lesson.status.toLowerCase()}`}>
          {lesson.status}
        </span>
      </div>
      <div className="card-body">
        <div className="card-info">
          <span className="card-icon">📅</span>
          <span>{new Date(lesson.date).toLocaleDateString()}</span>
        </div>
        {lesson.startTime && lesson.endTime && (
          <div className="card-info">
            <span className="card-icon">🕐</span>
            <span>{lesson.startTime} - {lesson.endTime}</span>
          </div>
        )}
        <div className="card-info">
          <span className="card-icon">📚</span>
          <span>{lesson.class.name}</span>
        </div>
        <div className="card-attendance">
          <span className="attendance-present">✓ {lesson.studentsPresent} present</span>
          <span className="attendance-absent">✗ {lesson.studentsAbsent} absent</span>
        </div>
      </div>
    </Link>
  );
};
