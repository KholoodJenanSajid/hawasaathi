import { executeExplain } from './_shared';

interface MinimalReq {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
}

interface MinimalRes {
  status: (code: number) => MinimalRes;
  json: (data: unknown) => void;
  setHeader: (name: string, value: string) => MinimalRes;
}

export default async function handler(req: MinimalReq, res: MinimalRes) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const clientIp =
    (Array.isArray(req.headers['x-forwarded-for'])
      ? req.headers['x-forwarded-for'][0]
      : req.headers['x-forwarded-for']) ||
    (req.headers['x-real-ip'] as string) ||
    'anonymous-client';

  try {
    const result = await executeExplain(req.body, clientIp);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
