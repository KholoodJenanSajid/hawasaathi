import React, { useState, useEffect } from 'react';
import { AirDataState } from '../types/air';
import { UserProfile } from '../types/profile';
import { generateTopThreeActions } from '../lib/planner';
import { generateGuidedExplanation, ExplainContext } from '../lib/explainer';
import { askHawaSaathi, checkBackendHealth } from '../lib/api';

interface AskViewProps {
  airState: AirDataState;
  profile: UserProfile;
}

interface QAPair {
  question: string;
  answer: string;
  source: 'ai' | 'fallback';
  modelUsed?: string;
  disclaimer: string;
}

const SUGGESTED_QUESTIONS = [
  'Why this advice, for my home, today?',
  'Why is morning window opening discouraged during winter?',
  'Can houseplants or ionizers clean severe winter smog?',
  'What should older adults and children avoid during smog peaks?',
  'How do mosquito coils and incense affect our indoor air?',
  'Why does our household action not change the city’s AQI?',
];

export const AskView: React.FC<AskViewProps> = ({ airState, profile }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QAPair[]>([]);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);

  const { current, cleanestWindow, dirtiestWindow } = airState;
  const topActions = generateTopThreeActions(
    current,
    cleanestWindow,
    dirtiestWindow,
    profile
  );

  // Check health endpoint on mount
  useEffect(() => {
    checkBackendHealth().then((h) => {
      setGeminiConfigured(h.geminiConfigured);
    });
  }, []);

  const buildContext = (): ExplainContext => {
    return {
      city: profile.location.cityName,
      aqi: current?.aqi ?? null,
      category: current?.category ?? 'Elevated',
      dominantPollutant: current?.dominantPollutant ?? 'PM2.5',
      cleanerHours: cleanestWindow ? cleanestWindow.label : 'midday afternoon',
      dirtierHours: dirtiestWindow ? dirtiestWindow.label : 'early morning and late evening',
      actions: topActions.map((a) => ({
        action: a.action,
        when: a.when,
        who: a.who,
        directImpact: a.directImpact,
      })),
      householdSummary: {
        hasChildren: profile.household.children > 0,
        hasOlderAdults: profile.household.olderAdults > 0,
        hasVulnerability: profile.household.hasVulnerability,
        commuteMode: profile.lifestyle.commuteMode,
      },
    };
  };

  const handleSubmit = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || trimmed.length > 500) return;

    setLoading(true);
    const context = buildContext();

    try {
      // Attempt backend endpoint
      const result = await askHawaSaathi({
        prompt: trimmed,
        context,
      });

      setHistory((prev) => [
        {
          question: trimmed,
          answer: result.answer,
          source: result.source,
          modelUsed: result.modelUsed,
          disclaimer: result.disclaimer,
        },
        ...prev,
      ]);
      setPrompt('');
    } catch {
      // Deterministic client fallback if server endpoint is offline or fails
      const fallbackText = generateGuidedExplanation(trimmed, context);
      setHistory((prev) => [
        {
          question: trimmed,
          answer: fallbackText,
          source: 'fallback',
          disclaimer:
            'Guided explanation generated from public-health rules and current forecast context.',
        },
        ...prev,
      ]);
      setPrompt('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-labelledby="ask-heading">
      <div className="view-header">
        <h1 id="ask-heading" className="view-title">
          Ask HawaSaathi
        </h1>
        <p className="view-subtitle">
          Plain-language explanations for “why this advice, for my home, today?”
        </p>
      </div>

      {/* Backend Status Notice */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8125rem',
          color: 'var(--text-muted)',
          marginBottom: '16px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-light)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <span>
          🤖 <strong>Explainer Mode:</strong>{' '}
          {geminiConfigured
            ? 'Gemini Live Assistant (with automatic guided fallback)'
            : 'Guided Expert Explainer (deterministic public-health engine)'}
        </span>
        <span style={{ fontStyle: 'italic' }}>
          Zero accounts • Privacy preserved
        </span>
      </div>

      {/* Suggested Tappable Questions */}
      <div style={{ marginBottom: '16px' }}>
        <span className="form-label" style={{ display: 'block', marginBottom: '4px' }}>
          Tap a common family question:
        </span>
        <div className="chip-group" role="group" aria-label="Suggested questions">
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              className="chip-btn"
              disabled={loading}
              onClick={() => handleSubmit(q)}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Question Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(prompt);
        }}
        style={{ marginBottom: '24px' }}
      >
        <div className="form-group">
          <label htmlFor="user-prompt-input" className="form-label">
            Or type your own question (up to 500 characters):
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              id="user-prompt-input"
              type="text"
              maxLength={500}
              className="form-input"
              placeholder="e.g. Why should we keep our windows shut early morning?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !prompt.trim()}
            >
              {loading ? 'Thinking...' : 'Ask'}
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginTop: '4px',
            }}
          >
            <span>Questions are answered using only today’s forecast and household context.</span>
            <span>{prompt.length}/500</span>
          </div>
        </div>
      </form>

      {/* Answers Feed */}
      <div className="qa-feed" role="feed" aria-label="Conversation history">
        {history.length === 0 ? (
          <div
            className="card"
            style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}
          >
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>💭</span>
            <p style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
              No questions asked yet.
            </p>
            <p style={{ fontSize: '0.8125rem', marginTop: '4px' }}>
              Tap any suggestion above to learn why specific timings and interventions were selected for {profile.location.cityName}.
            </p>
          </div>
        ) : (
          history.map((item, idx) => (
            <article key={idx} className="qa-box" aria-labelledby={`qa-q-${idx}`}>
              <div id={`qa-q-${idx}`} className="qa-question">
                ❓ {item.question}
              </div>
              <div className="qa-answer">{item.answer}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <span className="qa-source-badge">
                  {item.source === 'ai' ? '🤖 AI Explanation' : '📘 Guided explanation'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {item.disclaimer}
                </span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
};
