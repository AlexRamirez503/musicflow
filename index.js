const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Invidious instances for fallback
const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.jing.rocks',
  'https://iv.ggtyler.dev',
  'https://invidious.privacyredirect.com'
];

// Helper: fetch with timeout
async function fetchWithTimeout(url, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

// Helper: try Invidious instances
async function invidiousSearch(query, type = 'video') {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=${type}&sort_by=relevance`;
      const res = await fetchWithTimeout(url);
      if (res.ok) {
        const data = await res.json();
        return data.map(item => ({
          id: item.videoId,
          title: item.title,
          artist: item.author || 'Unknown',
          thumbnail: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
          duration: item.lengthSeconds || 0,
          source: 'youtube'
        }));
      }
    } catch (e) {
      continue;
    }
  }
  return [];
}

// Helper: Jamendo search
async function jamendoSearch(query, limit = 20) {
  const clientId = process.env.JAMENDO_CLIENT_ID || 'b0b6a5e8';
  try {
    const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${clientId}&format=json&limit=${limit}&search=${encodeURIComponent(query)}&include=musicinfo`;
    const res = await fetchWithTimeout(url);
    if (res.ok) {
      const data = await res.json();
      return (data.results || []).map(t => ({
        id: t.id,
        title: t.name,
        artist: t.artist_name,
        thumbnail: t.album_image || t.image,
        duration: t.duration || 0,
        audioUrl: t.audio,
        source: 'jamendo'
      }));
    }
  } catch (e) {}
  return [];
}

// API: Search
app.get('/api/search', async (req, res) => {
  const q = req.query.q || '';
  if (!q) return res.json([]);
  
  let results = await invidiousSearch(q + ' music');
  if (results.length === 0) {
    results = await jamendoSearch(q);
  }
  res.json(results);
});

// API: Trending by genre
app.get('/api/genre/:genre', async (req, res) => {
  const genre = req.params.genre;
  const queries = {
    'reggaeton': 'reggaeton 2024 2025 hits',
    'salsa': 'salsa romantica clasica',
    'bachata': 'bachata 2024 2025',
    'cumbia': 'cumbia 2024 exitos',
    'pop-latino': 'pop latino 2024 2025',
    'alabanza': 'musica cristiana alabanza adoracion',
    'latin-trending': 'musica latina trending 2024 2025',
    'worship': 'worship music 2024 2025'
  };
  
  const query = queries[genre] || genre + ' music';
  let results = await invidiousSearch(query);
  if (results.length === 0) {
    results = await jamendoSearch(query);
  }
  res.json(results);
});

// API: Trending
app.get('/api/trending', async (req, res) => {
  let results = await invidiousSearch('musica latina trending 2024 2025 hits');
  if (results.length === 0) {
    results = await jamendoSearch('latin');
  }
  res.json(results);
});

// API: Get audio stream URL for YouTube video
app.get('/api/stream/:videoId', async (req, res) => {
  const videoId = req.params.videoId;
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/videos/${videoId}`;
      const r = await fetchWithTimeout(url);
      if (r.ok) {
        const data = await r.json();
        const audio = data.adaptiveFormats?.find(f => f.type?.startsWith('audio/'));
        if (audio?.url) {
          return res.json({ url: audio.url });
        }
      }
    } catch (e) {
      continue;
    }
  }
  res.status(404).json({ error: 'No audio stream found' });
});

// Fallback: serve index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MusicFlow server running on port ${PORT}`);
});
