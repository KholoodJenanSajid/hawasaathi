import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExplainRequestSchema,
  executeExplain,
  checkRateLimit,
} from '../../api/_shared';
import { generateGuidedExplanation } from '../lib/explainer';

describe('GenAI Explainer & API Validation', () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it('rejects user prompt longer than 500 characters', () => {
    const longPrompt = 'a'.repeat(501);
    const result = ExplainRequestSchema.safeParse({
      prompt: longPrompt,
      context: {
        city: 'Delhi',
        aqi: 320,
        category: 'Very Poor',
        cleanerHours: '1:00 PM – 3:00 PM',
        dirtierHours: '6:00 AM – 8:00 AM',
        actions: [],
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('500 characters');
    }
  });

  it('rejects empty or whitespace-only prompt', () => {
    const result = ExplainRequestSchema.safeParse({
      prompt: '   ',
      context: {
        city: 'Delhi',
        aqi: 200,
        category: 'Moderate',
        cleanerHours: '1:00 PM – 3:00 PM',
        dirtierHours: '6:00 AM – 8:00 AM',
        actions: [],
      },
    });

    expect(result.success).toBe(false);
  });

  it('returns high-quality deterministic guided explanation when Gemini is unconfigured', async () => {
    delete process.env.GEMINI_API_KEY;

    const res = await executeExplain({
      prompt: 'Why this advice, for my home, today?',
      context: {
        city: 'Kolkata',
        aqi: 280,
        category: 'Poor',
        dominantPollutant: 'PM2.5',
        cleanerHours: '12:00 PM – 2:00 PM',
        dirtierHours: '7:00 AM – 9:00 AM',
        actions: [
          {
            action: 'Ventilate only midday',
            when: '12:00 PM – 2:00 PM',
            who: 'Whole home',
            directImpact: 'Avoids smog ingress',
          },
        ],
      },
    });

    expect(res.status).toBe(200);
    if ('answer' in res.body) {
      expect(res.body.source).toBe('fallback');
      expect(res.body.answer).toContain('Kolkata');
      expect(res.body.answer).toContain('280');
      expect(res.body.answer).toContain('Poor');
      expect(res.body.disclaimer).toContain('Guided explanation');
    }
  });

  it('strictly enforces safety rules in guided explanation', () => {
    const context = {
      city: 'Delhi',
      aqi: 350,
      category: 'Very Poor',
      dominantPollutant: 'PM2.5',
      cleanerHours: '1:00 PM – 3:00 PM',
      dirtierHours: '6:00 AM – 8:00 AM',
      actions: [],
    };

    // Test houseplants and ozone prompt
    const plantAnswer = generateGuidedExplanation(
      'Can houseplants or ozone machines clean the smog?',
      context
    );
    expect(plantAnswer).toContain('Public-health guidance');
    expect(plantAnswer).toContain('cannot filter a heavy winter smog');
    expect(plantAnswer).toContain('ozone generators and standalone ionizers should be strictly avoided');

    // Test city air impact prompt
    const cityAnswer = generateGuidedExplanation(
      'Will my household clean the city air?',
      context
    );
    expect(cityAnswer).toContain('will not visibly change the citywide AQI');
    expect(cityAnswer).toContain('personal exposure');
  });

  it('rate limits client after 20 requests in 1 minute', () => {
    const testClientId = 'rate-limit-test-ip';
    // Consume 20 requests
    for (let i = 0; i < 20; i++) {
      expect(checkRateLimit(testClientId, 20, 60000)).toBe(true);
    }
    // 21st request must be denied
    expect(checkRateLimit(testClientId, 20, 60000)).toBe(false);
  });
});
