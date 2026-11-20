import React from 'react';
import { Recommendation } from '../types/planner';

interface ActionCardProps {
  action: Recommendation;
}

export const ActionCard: React.FC<ActionCardProps> = ({ action }) => {
  return (
    <article className="action-card" aria-labelledby={`action-title-${action.id}`}>
      <div className="action-card-header">
        <h3 id={`action-title-${action.id}`} className="action-title">
          {action.action}
        </h3>
        <span className="action-timing-tag" title="Recommended timing window">
          🕒 {action.when}
        </span>
      </div>

      <p className="action-desc" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        <strong>Why:</strong> {action.why}
      </p>

      <div className="action-meta-row">
        <span>
          <strong>Protects:</strong> {action.who}
        </span>
        <span>•</span>
        <span>
          <strong>Effort:</strong> {action.effort}
        </span>
        <span>•</span>
        <span>
          <strong>Cost:</strong> {action.costBand}
        </span>
      </div>

      <div className="action-impact-box">
        <span className="action-impact-label">Direct Impact:</span>
        <span>{action.directImpact}</span>
      </div>

      <div className="action-limitation">
        <strong>What this does not change:</strong> {action.limitation}
      </div>

      <div className="action-source-note">
        Source: {action.sourceNote}
      </div>
    </article>
  );
};
