interface MinimalReq {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface MinimalRes {
  status: (code: number) => MinimalRes;
  json: (data: unknown) => void;
  setHeader: (name: string, value: string) => MinimalRes;
}

export default async function handler(req: MinimalReq, res: MinimalRes) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const geminiConfigured = Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0
  );

  // Booleans only, no secrets!
  return res.status(200).json({
    geminiConfigured,
  });
}
