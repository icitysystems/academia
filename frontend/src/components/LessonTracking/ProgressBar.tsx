import React from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  height?: 'sm' | 'md' | 'lg';
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color = 'primary',
  showLabel = true,
  height = 'md',
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={`progress-bar-container progress-bar-${height}`}>
      <div className="progress-bar-track">
        <div
          className={`progress-bar-fill progress-bar-${color}`}
          style={{ width: `${percentage}%` }}
        >
          {showLabel && (
            <span className="progress-bar-label">{Math.round(percentage)}%</span>
          )}
        </div>
      </div>
      {showLabel && (
        <span className="progress-bar-text">{Math.round(percentage)}%</span>
      )}
    </div>
  );
};

export default ProgressBar;
