// Called once a day by a Vercel cron (see vercel.json).
// Supabase's free plan pauses a project after 7 days without activity,
// which takes the whole ticket site down. A small daily read prevents that.
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return res.status(500).json({ ok: false, error: 'Supabase env vars missing' });
  }

  try {
    const r = await fetch(`${url}/rest/v1/rpc/get_registration_status`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, at: new Date().toISOString() });
  } catch (error) {
    return res.status(502).json({ ok: false, error: String(error) });
  }
}
