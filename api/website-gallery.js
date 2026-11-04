// Read only the existing public gallery manifest. Never forward visitor credentials.
const endpoint = 'https://zyzwvrogeudwvackduau.supabase.co/functions/v1/website-gallery/sophie';
module.exports = async function websiteGallery(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Gallery unavailable');
    const data = await response.json();
    if (!Array.isArray(data.photos)) throw new Error('Invalid gallery');
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: 'Gallery temporarily unavailable' });
  }
};
