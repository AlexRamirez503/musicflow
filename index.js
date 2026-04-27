const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// API proxy for Invidious
const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.jing.rocks',
  'https://vid.puffyan.us',
  'https://invidious.snopyta.org'
];

let currentInstance = 0;

function getInvidiousUrl() {
  return INVIDIOUS_INSTANCES[currentInstance % INVIDIOUS_INSTANCES.length];
}

function rotateInstance() {
  currentInstance++;
}

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Search API
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);
  
  for (let i = 0; i < INVIDIOUS_INSTANCES.length; i++) {
    try {
      const url = getInvidiousUrl();
      const response = await fetch(url + '/api/v1/search?q=' + encodeURIComponent(query) + '&type=video&sort_by=relevance');
      if (response.ok) {
        const data = await response.json();
        const tracks = data.filter(v => v.type === 'video').slice(0, 20).map(v => ({
          id: v.videoId,
          title: v.title,
          artist: v.author,
          thumbnail: v.videoThumbnails && v.videoThumbnails.length > 0 ? v.videoThumbnails[0].url : '',
          duration: v.lengthSeconds,
          source: 'youtube'
        }));
        return res.json(tracks);
      }
      rotateInstance();
    } catch(e) {
      rotateInstance();
    }
  }
  res.json([]);
});

// Genre API
app.get('/api/genre/:genre', async (req, res) => {
  const genre = req.params.genre;
  const queries = {
    'reggaeton': 'reggaeton 2024 2025 music',
    'salsa': 'salsa music hits',
    'bachata': 'bachata music hits',
    'cumbia': 'cumbia music hits',
    'pop': 'pop latino music hits',
    'worship': 'musica cristiana alabanza adoracion',
    'latin': 'musica latina trending hits'
  };
  const query = queries[genre] || genre + ' music';
  
  for (let i = 0; i < INVIDIOUS_INSTANCES.length; i++) {
    try {
      const url = getInvidiousUrl();
      const response = await fetch(url + '/api/v1/search?q=' + encodeURIComponent(query) + '&type=video&sort_by=relevance');
      if (response.ok) {
        const data = await response.json();
        const tracks = data.filter(v => v.type === 'video').slice(0, 20).map(v => ({
          id: v.videoId,
          title: v.title,
          artist: v.author,
          thumbnail: v.videoThumbnails && v.videoThumbnails.length > 0 ? v.videoThumbnails[0].url : '',
          duration: v.lengthSeconds,
          source: 'youtube'
        }));
        return res.json(tracks);
      }
      rotateInstance();
    } catch(e) {
      rotateInstance();
    }
  }
  res.json([]);
});

// Trending API
app.get('/api/trending', async (req, res) => {
  for (let i = 0; i < INVIDIOUS_INSTANCES.length; i++) {
    try {
      const url = getInvidiousUrl();
      const response = await fetch(url + '/api/v1/trending?type=Music&region=MX');
      if (response.ok) {
        const data = await response.json();
        const tracks = data.slice(0, 20).map(v => ({
          id: v.videoId,
          title: v.title,
          artist: v.author,
          thumbnail: v.videoThumbnails && v.videoThumbnails.length > 0 ? v.videoThumbnails[0].url : '',
          duration: v.lengthSeconds,
          source: 'youtube'
        }));
        return res.json(tracks);
      }
      rotateInstance();
    } catch(e) {
      rotateInstance();
    }
  }
  res.json([]);
});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.send(HTML_CONTENT);
});

app.get('/index.html', (req, res) => {
  res.send(HTML_CONTENT);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('MusicFlow server running on port ' + PORT);
});

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>MusicFlow</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#121212;--surface:#181818;--surface2:#282828;--surface3:#333;--green:#1db954;--green-dark:#1aa34a;--text:#fff;--text2:#a7a7a7;--text3:#6a6a6a}
html,body{height:100%;overflow:hidden;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-tap-highlight-color:transparent}
.app{display:flex;flex-direction:column;height:100%;position:relative}
.main{flex:1;overflow-y:auto;overflow-x:hidden;padding-bottom:140px;-webkit-overflow-scrolling:touch}
.main::-webkit-scrollbar{display:none}

/* Bottom Nav */
.bottom-nav{position:fixed;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.95) 20%);padding:8px 0 12px;display:flex;justify-content:space-around;z-index:100}
.nav-btn{display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:none;color:var(--text3);font-size:10px;cursor:pointer;padding:4px 16px}
.nav-btn.active{color:var(--text)}
.nav-btn svg{width:24px;height:24px}

/* Player Bar */
.player-bar{position:fixed;bottom:56px;left:0;right:0;background:var(--surface2);padding:8px 12px;display:flex;align-items:center;gap:10px;z-index:99;display:none;border-radius:8px 8px 0 0}
.player-bar.visible{display:flex}
.player-bar .cover{width:40px;height:40px;border-radius:4px;object-fit:cover;background:var(--surface3)}
.player-bar .info{flex:1;min-width:0}
.player-bar .info .title{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.player-bar .info .artist{font-size:11px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.player-bar .controls{display:flex;gap:8px;align-items:center}
.player-bar .controls button{background:none;border:none;color:var(--text);cursor:pointer;padding:4px}
.player-bar .controls svg{width:24px;height:24px}
.player-bar .progress{position:absolute;bottom:0;left:0;height:2px;background:var(--green);transition:width .3s linear}

/* Sections */
.section{padding:0 16px;margin-bottom:24px}
.section-title{font-size:18px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.h-scroll{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;-webkit-overflow-scrolling:touch}
.h-scroll::-webkit-scrollbar{display:none}

/* Cards */
.track-card{flex-shrink:0;width:140px;cursor:pointer}
.track-card .thumb{width:140px;height:140px;border-radius:8px;object-fit:cover;background:var(--surface2)}
.track-card .name{font-size:12px;font-weight:600;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.track-card .sub{font-size:11px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* Filter chips */
.filter-row{display:flex;gap:8px;overflow-x:auto;padding:0 16px 12px;-webkit-overflow-scrolling:touch}
.filter-row::-webkit-scrollbar{display:none}
.filter-chip{flex-shrink:0;padding:7px 16px;border-radius:20px;background:var(--surface2);color:var(--text);font-size:13px;font-weight:500;border:none;cursor:pointer;white-space:nowrap;transition:background .2s,color .2s}
.filter-chip.active{background:var(--green);color:#000}
.filter-chip:active{opacity:.8}

/* Quick-access artist grid (Spotify style) */
.quick-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:0 16px;margin-bottom:20px}
.quick-card{display:flex;align-items:center;gap:0;background:var(--surface2);border-radius:6px;overflow:hidden;cursor:pointer;height:56px;transition:background .2s}
.quick-card:active{background:var(--surface3)}
.quick-card .qc-img{width:56px;height:56px;object-fit:cover;flex-shrink:0;background:var(--surface3)}
.quick-card .qc-name{flex:1;padding:0 10px;font-size:12px;font-weight:700;line-height:1.2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

/* Genre cards */
.genre-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:0 16px}
.genre-card{border-radius:8px;padding:16px;height:80px;position:relative;overflow:hidden;cursor:pointer}
.genre-card .name{font-size:14px;font-weight:700;color:#fff}
.genre-card .icon{position:absolute;bottom:4px;right:8px;font-size:28px;opacity:.8}

/* Song Row */
.song-row{display:flex;align-items:center;gap:10px;padding:8px 16px;cursor:pointer;border-radius:8px}
.song-row:active{background:var(--surface2)}
.song-row .idx{width:20px;text-align:center;font-size:13px;color:var(--text2)}
.song-row .thumb{width:40px;height:40px;border-radius:4px;object-fit:cover;background:var(--surface2);flex-shrink:0}
.song-row .info{flex:1;min-width:0}
.song-row .info .title{font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.song-row .info .artist{font-size:11px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
.song-row .info .artist:active{text-decoration:underline}
.song-row .dur{font-size:11px;color:var(--text3)}

/* Search */
.search-input-wrap{position:relative;padding:0 16px;margin-bottom:16px}
.search-input{width:100%;padding:10px 12px 10px 36px;border-radius:20px;border:none;background:#fff;color:#000;font-size:14px;outline:none}
.search-input::placeholder{color:#757575}
.search-icon{position:absolute;left:28px;top:50%;transform:translateY(-50%);color:#757575}

/* Artist Profile */
.artist-hero{position:relative;padding:60px 20px 20px;background-size:cover;background-position:center;min-height:220px;display:flex;align-items:flex-end}
.artist-hero::before{content:'';position:absolute;inset:0;background:linear-gradient(transparent 20%,rgba(0,0,0,.85))}
.artist-hero .content{position:relative;z-index:1;display:flex;align-items:flex-end;gap:16px}
.artist-hero .avatar{width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.3);background:var(--surface2);flex-shrink:0}
.artist-hero .meta .label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,.6)}
.artist-hero .meta h1{font-size:24px;font-weight:800}
.artist-hero .meta .count{font-size:12px;color:rgba(255,255,255,.6);margin-top:2px}
.artist-hero .back-btn{position:absolute;top:16px;left:16px;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,.6);border:none;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2}
.artist-actions{display:flex;gap:12px;padding:12px 16px;align-items:center}
.play-all-btn{width:44px;height:44px;border-radius:50%;background:var(--green);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer}
.play-all-btn svg{width:20px;height:20px;fill:#000}
.shuffle-btn{background:none;border:1px solid var(--text3);color:var(--text);padding:6px 16px;border-radius:20px;font-size:12px;cursor:pointer}

/* Loading */
.loading{display:flex;align-items:center;justify-content:center;padding:40px;color:var(--text2)}
.spinner{width:24px;height:24px;border:3px solid var(--surface3);border-top-color:var(--green);border-radius:50%;animation:spin .8s linear infinite;margin-right:8px}
@keyframes spin{to{transform:rotate(360deg)}}

/* Greeting */
.greeting{padding:16px 16px 8px;font-size:22px;font-weight:700}

/* Empty */
.empty{text-align:center;padding:60px 20px;color:var(--text2)}
.empty svg{width:48px;height:48px;opacity:.3;margin-bottom:12px}

/* Hidden YouTube player */
#yt-player-wrap{position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;z-index:-1}

  .song-row.now-playing { background: rgba(34, 197, 94, 0.2) !important; border-left: 3px solid #22c55e; }
  .track-card.now-playing { border: 2px solid #22c55e; }

/* Expanded Player */
#expanded-player{position:fixed;top:0;left:0;right:0;bottom:0;background:linear-gradient(135deg,var(--surface) 0%,var(--bg) 100%);z-index:1000;display:none;flex-direction:column;padding:16px;overflow-y:auto;-webkit-overflow-scrolling:touch}
#expanded-player.visible{display:flex}
#expanded-player .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
#expanded-player .header button{background:none;border:none;color:var(--text);cursor:pointer;font-size:24px;width:32px;height:32px;display:flex;align-items:center;justify-content:center}
#expanded-player .cover-wrap{flex:1;display:flex;justify-content:center;align-items:center;margin-bottom:24px}
#expanded-player .cover{width:280px;height:280px;border-radius:12px;object-fit:cover;background:var(--surface2);box-shadow:0 8px 24px rgba(0,0,0,.4)}
#expanded-player .info{text-align:center;margin-bottom:24px}
#expanded-player .title{font-size:20px;font-weight:700;margin-bottom:8px}
#expanded-player .artist{font-size:14px;color:var(--text2)}
#expanded-player .progress-wrap{margin-bottom:24px}
#expanded-player .time-row{display:flex;justify-content:space-between;font-size:12px;color:var(--text2);margin-bottom:8px}
#expanded-player .progress-bar{width:100%;height:4px;background:var(--surface2);border-radius:2px;cursor:pointer;position:relative}
#expanded-player .progress-bar .fill{height:100%;background:var(--green);border-radius:2px}
#expanded-player .controls-wrap{display:flex;justify-content:center;gap:24px;margin-bottom:24px}
#expanded-player .controls-wrap button{background:none;border:none;color:var(--text);cursor:pointer;width:48px;height:48px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:background .2s}
#expanded-player .controls-wrap button:active{background:var(--surface2)}
#expanded-player .controls-wrap button.play{width:64px;height:64px;background:var(--green);color:#000}
#expanded-player .controls-wrap button.play:active{background:var(--green-dark)}
#expanded-player .controls-wrap svg{width:24px;height:24px}
#expanded-player .controls-wrap button.play svg{width:32px;height:32px}
</style>
</head>
<body>
<div class="app">
  <div class="main" id="main-content"></div>

  <!-- Player Bar -->
  <div class="player-bar" id="player-bar" style="cursor:pointer">
    <img class="cover" id="pb-cover" src="" alt="" onclick="event.stopPropagation(); Player.openExpanded()" style="cursor:pointer">
    <div class="info" onclick="event.stopPropagation(); Player.openExpanded()" style="cursor:pointer">
      <div class="title" id="pb-title">-</div>
      <div class="artist" id="pb-artist">-</div>
    </div>
    <div class="controls" onclick="event.stopPropagation()">
      <button onclick="event.stopPropagation(); Player.prev()"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>
      <button onclick="event.stopPropagation(); Player.toggle()" id="pb-play-btn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>
      <button onclick="event.stopPropagation(); Player.next()"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>
    </div>
    <div class="progress" id="pb-progress" onclick="event.stopPropagation()"></div>
  </div>

  <!-- Bottom Nav -->
  <div class="bottom-nav">
    <button class="nav-btn active" id="nav-home" onclick="Nav.go('home')">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
      <span>Inicio</span>
    </button>
    <button class="nav-btn" id="nav-search" onclick="Nav.go('search')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <span>Buscar</span>
    </button>
  </div>
</div>

<!-- Expanded Player -->
<div id="expanded-player">
  <div class="header">
    <button onclick="Player.closeExpanded()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
    <span style="font-size:14px;color:var(--text2)">Reproduciendo</span>
    <button style="visibility:hidden"></button>
  </div>
  <div class="cover-wrap">
    <img class="cover" id="exp-cover" src="" alt="">
  </div>
  <div class="info">
    <div class="title" id="exp-title">-</div>
    <div class="artist" id="exp-artist">-</div>
  </div>
  <div class="progress-wrap">
    <div class="progress-bar" id="exp-progress-bar" onclick="Player.seekFromExpanded(event)" ontouchstart="Player.startDrag(event)" ontouchmove="Player.dragProgress(event)" ontouchend="Player.endDrag(event)">
      <div class="fill" id="exp-progress-fill" style="width:0%"></div>
    </div>
    <div class="time-row">
      <span id="exp-current-time">0:00</span>
      <span id="exp-duration">0:00</span>
    </div>
  </div>
  <div class="controls-wrap">
    <button onclick="Player.prev()"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>
    <button class="play" onclick="Player.toggle()" id="exp-play-btn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>
    <button onclick="Player.next()"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>
  </div>
</div>

<!-- Hidden YouTube player -->
<div id="yt-player-wrap"><div id="yt-player"></div></div>

<script>
const SERVER_URL = "https://invidious.io";

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════
const JAMENDO_CLIENT_ID = "4bef6fe7";
const JAMENDO_BASE = "https://api.jamendo.com/v3.0";

const GENRES = [
  {id:"alabanza",name:"Alabanza y Adoraci\\u00f3n",color:"#8B5CF6",icon:"\\ud83d\\ude4f"},
  {id:"reggaeton",name:"Reggaeton",color:"#EF4444",icon:"\\ud83d\\udd25"},
  {id:"salsa",name:"Salsa",color:"#F59E0B",icon:"\\ud83d\\udc83"},
  {id:"bachata",name:"Bachata",color:"#EC4899",icon:"\\u2764\\ufe0f"},
  {id:"cumbia",name:"Cumbia",color:"#10B981",icon:"\\ud83c\\udf89"},
  {id:"pop-latino",name:"Pop Latino",color:"#3B82F6",icon:"\\ud83c\\udfb5"},
  {id:"ranchera",name:"Ranchera",color:"#D97706",icon:"\\ud83e\\udd20"},
  {id:"regional-mexicano",name:"Regional Mexicano",color:"#059669",icon:"\\ud83c\\uddf2\\ud83c\\uddfd"},
  {id:"trap-latino",name:"Trap Latino",color:"#7C3AED",icon:"\\ud83c\\udfa4"},
  {id:"balada",name:"Baladas",color:"#DB2777",icon:"\\ud83d\\udc9c"},
  {id:"rock-latino",name:"Rock en Espa\\u00f1ol",color:"#DC2626",icon:"\\ud83c\\udfb8"},
  {id:"merengue",name:"Merengue",color:"#F97316",icon:"\\ud83e\\udd41"}
];

const GENRE_QUERIES = {
  "alabanza":"alabanza cristiana worship espa\\u00f1ol",
  "reggaeton":"reggaeton 2024 2025 \\u00e9xitos",
  "salsa":"salsa rom\\u00e1ntica \\u00e9xitos",
  "bachata":"bachata \\u00e9xitos rom\\u00e1ntica",
  "cumbia":"cumbia \\u00e9xitos populares",
  "pop-latino":"pop latino \\u00e9xitos 2024 2025",
  "ranchera":"ranchera mexicana \\u00e9xitos",
  "regional-mexicano":"regional mexicano corridos \\u00e9xitos",
  "trap-latino":"trap latino \\u00e9xitos",
  "balada":"baladas rom\\u00e1nticas en espa\\u00f1ol",
  "rock-latino":"rock en espa\\u00f1ol \\u00e9xitos",
  "merengue":"merengue \\u00e9xitos bailable"
};

const QUICK_ARTISTS = [
  "Jes\\u00fas Adri\\u00e1n Romero","Bad Bunny","Shakira","Christian Nodal",
  "Peso Pluma","Karol G","Ozuna","Marcos Witt","Daddy Yankee","Maluma"
];

// ═══════════════════════════════════════════════════════════════════
// YOUTUBE API (using YouTube Innertube - no API key needed)
// ═══════════════════════════════════════════════════════════════════

// Invidious API - Alternative to YouTube with no quota limits
const InvidiousAPI = {
  instances: ["https://inv.nadeko.net", "https://invidious.nerdvpn.de", "https://invidious.jing.rocks", "https://iv.ggtyler.dev", "https://invidious.privacyredirect.com"],
  currentIndex: 0,

  async fetch(endpoint, params) {
    const maxRetries = this.instances.length;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const instance = this.instances[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.instances.length;
        const url = new URL(\`\${instance}/api/v1/\${endpoint}\`);
        for (const [k, v] of Object.entries(params)) {
          url.searchParams.set(k, String(v));
        }
        const r = await fetch(url.toString(), {
          headers: {"User-Agent": "Mozilla/5.0"},
          signal: AbortSignal.timeout(10000)
        });
        if (!r.ok) throw new Error(\`Status \${r.status}\`);
        return await r.json();
      } catch (e) {
        console.log(\`[Invidious] Attempt \${attempt + 1} failed:\`, e.message);
        continue;
      }
    }
    throw new Error("All Invidious instances failed");
  },

  async search(query, limit = 20) {
    try {
      console.log(\`[Invidious] Searching: \${query}\`);
      const data = await this.fetch("search", {
        q: query + " music",
        type: "video",
        sort_by: "relevance",
        duration: "short"
      });
      
      if (!Array.isArray(data)) return [];
      
      const results = [];
      for (const item of data) {
        if (item.type !== "video") continue;
        if (item.lengthSeconds && item.lengthSeconds > 600) continue;
        
        results.push({
          id: "yt-" + item.videoId,
          videoId: item.videoId,
          title: item.title,
          artist: item.author,
          channelId: item.authorId || "",
          thumbnail: item.videoThumbnails?.[0]?.url || \`https://i.ytimg.com/vi/\${item.videoId}/default.jpg\`,
          thumbnailLarge: item.videoThumbnails?.[item.videoThumbnails.length - 1]?.url || \`https://i.ytimg.com/vi/\${item.videoId}/hqdefault.jpg\`,
          duration: item.lengthSeconds || 0,
          views: item.viewCount || 0,
          source: "youtube"
        });
        
        if (results.length >= limit) break;
      }
      
      console.log(\`[Invidious] Found \${results.length} videos\`);
      return results;
    } catch (e) {
      console.error("[Invidious] Search error:", e);
      return [];
    }
  },

  async trending(limit = 20) {
    try {
      console.log("[Invidious] Fetching trending");
      const data = await this.fetch("trending", { region: "MX" });
      
      if (!Array.isArray(data)) return [];
      
      const results = [];
      for (const item of data) {
        if (item.type !== "video") continue;
        if (item.lengthSeconds && item.lengthSeconds > 600) continue;
        
        results.push({
          id: "yt-" + item.videoId,
          videoId: item.videoId,
          title: item.title,
          artist: item.author,
          channelId: item.authorId || "",
          thumbnail: item.videoThumbnails?.[0]?.url || \`https://i.ytimg.com/vi/\${item.videoId}/default.jpg\`,
          thumbnailLarge: item.videoThumbnails?.[item.videoThumbnails.length - 1]?.url || \`https://i.ytimg.com/vi/\${item.videoId}/hqdefault.jpg\`,
          duration: item.lengthSeconds || 0,
          views: item.viewCount || 0,
          source: "youtube"
        });
        
        if (results.length >= limit) break;
      }
      
      console.log(\`[Invidious] Found \${results.length} trending videos\`);
      return results;
    } catch (e) {
      console.error("[Invidious] Trending error:", e);
      return [];
    }
  }
};


// Server configuration
const SERVER_CONFIG = {
  baseURL: window.location.origin,
  apiBase: window.location.origin + "/api"
};

// API wrapper para conectarse al servidor
const ServerAPI = {
  async call(endpoint, method = "GET", data = null) {
    try {
      const url = \`\${SERVER_CONFIG.apiBase}/\${endpoint}\`;
      const options = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15000)
      };
      
      if (data) {
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(\`Server error: \${response.status}\`);
      }
      
      const result = await response.json();
      return Array.isArray(result) ? result : (result.result?.data?.json || []);
    } catch (e) {
      console.error(\`[ServerAPI] Error calling \${endpoint}:\`, e);
      return [];
    }
  },

  async getTrending() {
    console.log("[ServerAPI] Fetching trending");
    const result = await this.call("trending");
    return result;
  },

  async searchGenre(genre) {
    console.log(\`[ServerAPI] Searching genre: \${genre}\`);
    const result = await this.call(\`genre/\${genre}\`);
    return result;
  },

  async search(query) {
    console.log(\`[ServerAPI] Searching: \${query}\`);
    const result = await this.call(\`search?q=\${encodeURIComponent(query)}\`);
    return result;
  },

  async getPopularLatin() {
    console.log("[ServerAPI] Fetching popular Latin");
    const result = await this.call("genre/latin-trending");
    return result;
  },

  async getWorshipMusic() {
    console.log("[ServerAPI] Fetching worship music");
    const result = await this.call("genre/worship");
    return result;
  }
};

const YTSearch = {
  // YouTube Innertube API - proxied through local HTTP server to bypass CORS
  INNERTUBE_URL: "https://musicflow-eta2zkek.manus.space/api/trpc/youtube.search",
  BROWSE_URL: "https://musicflow-eta2zkek.manus.space/api/trpc/youtube.browse",
  context: {
    client: {
      clientName: "WEB",
      clientVersion: "2.20240101.00.00",
      hl: "es",
      gl: "MX"
    }
  },

  cleanTitle(title) {
    let c = title
      .replace(/\\(Official\\s*(Music\\s*)?Video\\)/gi,"")
      .replace(/\\(Official\\s*Audio\\)/gi,"")
      .replace(/\\(Lyric\\s*Video\\)/gi,"")
      .replace(/\\(Lyrics?\\)/gi,"")
      .replace(/\\(Audio\\s*Oficial\\)/gi,"")
      .replace(/\\(Video\\s*Oficial\\)/gi,"")
      .replace(/\\(Video\\s*Lyric\\)/gi,"")
      .replace(/\\[Official\\s*(Music\\s*)?Video\\]/gi,"")
      .replace(/\\[Official\\s*Audio\\]/gi,"")
      .replace(/\\[Audio\\s*Oficial\\]/gi,"")
      .replace(/\\[Video\\s*Oficial\\]/gi,"")
      .replace(/HD|4K|HQ/gi,"")
      .replace(/\\s*\\|\\s*/g," - ")
      .trim();
    const m = c.match(/^(.+?)\\s*[-\\u2013\\u2014]\\s*(.+)$/);
    if (m) return {artist:m[1].trim(),title:m[2].trim()};
    return {artist:"",title:c};
  },

  parseDuration(text) {
    if (!text) return 0;
    const parts = text.split(":").map(Number);
    if (parts.length===3) return parts[0]*3600+parts[1]*60+parts[2];
    if (parts.length===2) return parts[0]*60+parts[1];
    return parts[0]||0;
  },

  extractVideos(data) {
    const results = [];
    try {
      const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
      for (const sec of sections) {
        const items = sec?.itemSectionRenderer?.contents || [];
        for (const item of items) {
          const v = item?.videoRenderer;
          if (!v) continue;
          const vid = v.videoId || "";
          const rawTitle = v?.title?.runs?.[0]?.text || "";
          const channel = v?.ownerText?.runs?.[0]?.text || "";
          const durText = v?.lengthText?.simpleText || "";
          const dur = this.parseDuration(durText);
          const thumb = v?.thumbnail?.thumbnails?.[0]?.url || "https://i.ytimg.com/vi/"+vid+"/default.jpg";
          const thumbLarge = "https://i.ytimg.com/vi/"+vid+"/hqdefault.jpg";
          if (dur > 0 && dur <= 600) {
            const {artist,title} = this.cleanTitle(rawTitle);
            results.push({
              id:"yt-"+vid, videoId:vid, title:title||rawTitle,
              artist:artist||channel,
              channelId:"",
              thumbnail:thumb,
              thumbnailLarge:thumbLarge,
              duration:dur, views:0, source:"youtube"
            });
          }
        }
      }
    } catch(e) { console.error("extractVideos error",e); }
    return results;
  },

  extractBrowseVideos(data) {
    const results = [];
    try {
      const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
      for (const tab of tabs) {
        const sections = tab?.tabRenderer?.content?.sectionListRenderer?.contents || [];
        for (const sec of sections) {
          const items = sec?.itemSectionRenderer?.contents || sec?.shelfRenderer?.content?.expandedShelfContentsRenderer?.items || [];
          for (const item of items) {
            const v = item?.videoRenderer;
            if (!v) continue;
            const vid = v.videoId || "";
            const rawTitle = v?.title?.runs?.[0]?.text || v?.title?.simpleText || "";
            const channel = v?.ownerText?.runs?.[0]?.text || v?.shortBylineText?.runs?.[0]?.text || "";
            const durText = v?.lengthText?.simpleText || "";
            const dur = this.parseDuration(durText);
            const thumb = v?.thumbnail?.thumbnails?.[0]?.url || "";
            const thumbLarge = "https://i.ytimg.com/vi/"+vid+"/hqdefault.jpg";
            if (dur > 0 && dur <= 600) {
              const {artist,title} = this.cleanTitle(rawTitle);
              results.push({
                id:"yt-"+vid, videoId:vid, title:title||rawTitle,
                artist:artist||channel,
                channelId:"",
                thumbnail:thumb||thumbLarge,
                thumbnailLarge:thumbLarge,
                duration:dur, views:0, source:"youtube"
              });
            }
          }
        }
      }
    } catch(e) {}
    return results;
  },

  async search(query) {
    // Try server first (has Invidious fallback)
    try {
      const serverResults = await ServerAPI.search(query);
      if (serverResults.length > 0) {
        console.log("[YTSearch] Using server results");
        return serverResults;
      }
    } catch(e) {
      console.log("[YTSearch] Server failed, trying Invidious");
    }
    
    // Try Invidious
    try {
      const invResults = await InvidiousAPI.search(query, 20);
      if (invResults.length > 0) {
        console.log("[YTSearch] Using Invidious results");
        return invResults;
      }
    } catch(e) {
      console.log("[YTSearch] Invidious failed, trying YouTube Innertube");
    }
    
    // Fallback to YouTube Innertube
    try {
      const r = await fetch(this.INNERTUBE_URL, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({context:this.context, query:query+" music"}),
        signal: AbortSignal.timeout(12000)
      });
      if (!r.ok) return [];
      const data = await r.json();
      return this.extractVideos(data).slice(0,20);
    } catch(e) { console.error("YT search error",e); return []; }
  },

  async trending() {
    // Search for trending Latin music instead of browse (more reliable)
    try {
      const r = await fetch(this.INNERTUBE_URL, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({context:this.context, query:"m\\u00fasica latina \\u00e9xitos 2025 2026"}),
        signal: AbortSignal.timeout(12000)
      });
      if (!r.ok) return [];
      const data = await r.json();
      return this.extractVideos(data).slice(0,20);
    } catch(e) { console.error("YT trending error",e); return []; }
  },

  async artistTracks(name) {
    return this.search(name+" canciones");
  },

  async genreTracks(genreId) {
    const q = GENRE_QUERIES[genreId] || genreId+" m\\u00fasica latina";
    return this.search(q);
  }
};

// ═══════════════════════════════════════════════════════════════════
// JAMENDO API
// ═══════════════════════════════════════════════════════════════════
const Jamendo = {
  async fetch(endpoint, params={}) {
    const url = new URL(JAMENDO_BASE+"/"+endpoint+"/");
    url.searchParams.set("client_id",JAMENDO_CLIENT_ID);
    url.searchParams.set("format","json");
    for (const [k,v] of Object.entries(params)) url.searchParams.set(k,v);
    try {
      const r = await fetch(url.toString());
      const d = await r.json();
      return d.results || [];
    } catch(e) { return []; }
  },
  async popularLatin(limit=12) {
    return this.fetch("tracks",{limit,order:"popularity_week",tags:"latin+pop",include:"musicinfo"});
  },
  async search(q, limit=10) {
    return this.fetch("tracks",{limit,search:q,order:"relevance"});
  }
};

// ═══════════════════════════════════════════════════════════════════
// PLAYER (YouTube IFrame API)
// ═══════════════════════════════════════════════════════════════════
let ytPlayer = null;
let ytReady = false;
const ytReadyCbs = [];

function loadYTAPI() {
  if (ytReady) return Promise.resolve();
  return new Promise(res => {
    ytReadyCbs.push(res);
    if (document.querySelector('script[src*="iframe_api"]')) return;
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
    window.onYouTubeIframeAPIReady = () => {
      ytReady = true;
      ytPlayer = new YT.Player("yt-player",{
        height:"1",width:"1",
        playerVars:{autoplay:0,controls:0,disablekb:1,fs:0,iv_load_policy:3,modestbranding:1,rel:0,playsinline:1},
        events:{
          onReady:()=>{ ytReadyCbs.forEach(c=>c()); ytReadyCbs.length=0; },
          onStateChange:(e)=>{
            if (Player.activeSource!=="youtube") return;
            if (e.data===YT.PlayerState.PLAYING) Player._onPlay();
            else if (e.data===YT.PlayerState.PAUSED) Player._onPause();
            else if (e.data===YT.PlayerState.ENDED) Player._onEnd();
          },
          onError:()=>{ if(Player.activeSource==="youtube") Player.next(); }
        }
      });
    };
  });
}

const Player = {
  currentTrack: null,
  queue: [],
  queueIndex: 0,
  isPlaying: false,
  shuffle: false,
  repeat: "none",
  activeSource: "html5",
  audio: new Audio(),
  _interval: null,
  _isDragging: false,
  _lastSavedTime: 0,

  init() {
    loadYTAPI();
    this.audio.addEventListener("ended",()=>{ if(this.activeSource==="html5") this._onEnd(); });
    this.audio.addEventListener("error",()=>{ if(this.activeSource==="html5") this.next(); });
    this.audio.addEventListener("play",()=>{ if(this.activeSource==="html5") this._onPlay(); });
    this.audio.addEventListener("pause",()=>{ if(this.activeSource==="html5") this._onPause(); });
    this._interval = setInterval(()=>this._updateProgress(),500);

    // Keep audio alive
    try {
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.001;
      osc.connect(gain); gain.connect(ctx.destination); osc.start();
      document.addEventListener("click",()=>{ if(ctx.state==="suspended") ctx.resume(); });
      document.addEventListener("touchstart",()=>{ if(ctx.state==="suspended") ctx.resume(); });
    } catch(e){}

    // Restore last played track from localStorage
    this._restoreLastTrack();
  },

  _saveLastTrack() {
    if (!this.currentTrack) return;
    try {
      const t = this.currentTrack;
      const track = {
        id: t.id,
        title: t.title,
        artist: t.artist,
        artistName: t.artistName,
        source: t.source,
        videoId: t.videoId,
        audioUrl: t.audioUrl,
        duration: t.duration,
        thumbnail: t.thumbnail,
        thumbnailLarge: t.thumbnailLarge
      };
      const data = {
        track: track,
        queue: this.queue.slice(0, 50).map(q => ({
          id: q.id,
          title: q.title,
          artist: q.artist,
          artistName: q.artistName,
          source: q.source,
          videoId: q.videoId,
          audioUrl: q.audioUrl,
          duration: q.duration,
          thumbnail: q.thumbnail,
          thumbnailLarge: q.thumbnailLarge
        })),
        queueIndex: this.queueIndex,
        shuffle: this.shuffle,
        repeat: this.repeat,
        currentTime: this.activeSource === "youtube" ? (ytPlayer?.getCurrentTime?.() || 0) : (this.audio.currentTime || 0),
        timestamp: Date.now()
      };
      const dataStr = JSON.stringify(data);
      localStorage.setItem('mf_last_track', dataStr);
      if (window.MusicFlowNative && window.MusicFlowNative.saveData) {
        try { window.MusicFlowNative.saveData('mf_last_track', dataStr); } catch(e2) {}
      }
    } catch(e) {}
  },

  _restoreLastTrack() {
    try {
      let saved = localStorage.getItem('mf_last_track');
      if (!saved && window.MusicFlowNative && window.MusicFlowNative.loadData) {
        try { saved = window.MusicFlowNative.loadData('mf_last_track'); } catch(e2) {}
      }
      if (!saved) return;
      const data = JSON.parse(saved);
      if (!data || !data.track) return;
      // Validate track has required fields
      const track = data.track;
      if (!track || !track.id || !track.title) return;
      // Ensure track has all necessary fields with proper defaults
      this.currentTrack = {
        id: String(track.id),
        title: String(track.title || "Sin título"),
        artist: String(track.artist || track.artistName || "Artista desconocido"),
        artistName: String(track.artistName || track.artist || "Artista desconocido"),
        source: String(track.source || "unknown"),
        videoId: track.videoId ? String(track.videoId) : null,
        audioUrl: track.audioUrl ? String(track.audioUrl) : null,
        duration: Number(track.duration) || 0,
        thumbnail: String(track.thumbnail || ""),
        thumbnailLarge: String(track.thumbnailLarge || track.thumbnail || "")
      };
      // Validate queue items
      this.queue = (data.queue || []).filter(q => {
        if (!q || !q.id || !q.title) return false;
        return true;
      }).map(q => ({
        id: String(q.id),
        title: String(q.title || "Sin título"),
        artist: String(q.artist || q.artistName || ""),
        artistName: String(q.artistName || q.artist || ""),
        source: String(q.source || "unknown"),
        videoId: q.videoId ? String(q.videoId) : null,
        audioUrl: q.audioUrl ? String(q.audioUrl) : null,
        duration: Number(q.duration) || 0,
        thumbnail: String(q.thumbnail || ""),
        thumbnailLarge: String(q.thumbnailLarge || q.thumbnail || "")
      }));
      this.queueIndex = Math.max(0, Math.min(Number(data.queueIndex) || 0, this.queue.length - 1));
      this.shuffle = Boolean(data.shuffle) || false;
      this.repeat = String(data.repeat || "none");
      this._lastSavedTime = Number(data.currentTime) || 0;
      this.isPlaying = false;
      // Schedule _updateBar to run after DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this._updateBar());
      } else {
        this._updateBar();
      }
    } catch(e) {}
  },

  _extractMainArtist(artistStr) {
    if (!artistStr) return '';
    // Split by common separators: ft., feat., x, &, ,, y, with, vs
    let main = artistStr.split(/\\s*(?:ft\\.?|feat\\.?|featuring|\\sx\\s|\\s&\\s|\\sy\\s|\\svs\\.?\\s|,)\\s*/i)[0].trim();
    // Remove trailing " -" or leading/trailing whitespace
    main = main.replace(/\\s*-\\s*$/, '').trim();
    return main;
  },

  _trackArtistPlay(track) {
    if (!track || !track.artist) return;
    try {
      const key = 'mf_recent_artists';
      let artists = [];
      
      // Try to load from localStorage first
      try {
        const stored = localStorage.getItem(key);
        if (stored) artists = JSON.parse(stored);
      } catch(e1) {}
      
      // If empty, try sessionStorage
      if (!artists || artists.length === 0) {
        try {
          const stored = sessionStorage.getItem(key);
          if (stored) artists = JSON.parse(stored);
        } catch(e2) {}
      }
      
      // If still empty, try native storage
      if (!artists || artists.length === 0) {
        if (window.MusicFlowNative && window.MusicFlowNative.loadData) {
          try {
            const nativeData = window.MusicFlowNative.loadData(key);
            if (nativeData) artists = JSON.parse(nativeData);
          } catch(e3) {}
        }
      }
      
      // Ensure artists is an array
      if (!Array.isArray(artists)) artists = [];
      
      const name = this._extractMainArtist(track.artist);
      if (!name || name.length < 2) return;
      const thumb = track.thumbnailLarge || track.thumbnail || '';
      
      const existing = artists.findIndex(a => a && a.name && a.name.toLowerCase() === name.toLowerCase());
      if (existing >= 0) {
        artists[existing].playCount = (artists[existing].playCount || 1) + 1;
        artists[existing].lastPlayed = Date.now();
        if (thumb) artists[existing].thumbnail = thumb;
        const item = artists.splice(existing, 1)[0];
        artists.unshift(item);
      } else {
        artists.unshift({ name, thumbnail: thumb, lastPlayed: Date.now(), playCount: 1 });
      }
      
      // Keep only 10 most recent artists
      artists = artists.slice(0, 10);
      const data = JSON.stringify(artists);
      
      // Save to all storage methods
      try { localStorage.setItem(key, data); } catch(e1) {}
      try { sessionStorage.setItem(key, data); } catch(e2) {}
      if (window.MusicFlowNative && window.MusicFlowNative.saveData) {
        try { window.MusicFlowNative.saveData(key, data); } catch(e3) {}
      }
    } catch(e) {}
  },

  play(track, queue) {
    // Detener completamente cualquier reproducción anterior
    this.stopAll();
    
    // Esperar un poco para asegurar que se detuvo
    setTimeout(() => {
      this.currentTrack = track;
      if (queue) { this.queue = queue; this.queueIndex = queue.findIndex(t=>t.id===track.id); if(this.queueIndex<0) this.queueIndex=0; }
      
      if (track.source==="youtube" && track.videoId) {
        this.activeSource = "youtube";
        if (ytPlayer && ytPlayer.loadVideoById) {
          ytPlayer.loadVideoById(track.videoId);
          if (this._lastSavedTime > 0) {
            setTimeout(() => {
              if (ytPlayer && ytPlayer.seekTo) {
                ytPlayer.seekTo(this._lastSavedTime);
              }
              this._lastSavedTime = 0;
            }, 500);
          }
        }
      } else if (track.audioUrl) {
        this.activeSource = "html5";
        this.audio.src = track.audioUrl;
        if (this._lastSavedTime > 0) {
          this.audio.currentTime = this._lastSavedTime;
          this._lastSavedTime = 0;
        }
        this.audio.play().catch(()=>{});
      }

      this._updateBar();
      this._updateMediaSession(true);
      // Save last played track & track artist
      this._saveLastTrack();
      this._trackArtistPlay(track);
      // Notify native with artwork
      if (window.MusicFlowNative) {
        try {
          const artUrl = track.thumbnailLarge || track.thumbnail || "";
          window.MusicFlowNative.startAudioServiceWithArt(track.title||"MusicFlow", track.artist||"Reproduciendo", artUrl);
        } catch(e){}
      }
    }, 100);
  },
  
  play_old(track, queue) {
    // Detener completamente cualquier reproducción anterior
    this.stopAll();
    this.currentTrack = track;
    if (queue) { this.queue = queue; this.queueIndex = queue.findIndex(t=>t.id===track.id); if(this.queueIndex<0) this.queueIndex=0; }

    if (track.source==="youtube" && track.videoId) {
      this.activeSource = "youtube";
      if (ytPlayer && ytPlayer.loadVideoById) {
        ytPlayer.loadVideoById(track.videoId);
        if (this._lastSavedTime > 0) {
          setTimeout(() => {
            if (ytPlayer && ytPlayer.seekTo) {
              ytPlayer.seekTo(this._lastSavedTime);
            }
            this._lastSavedTime = 0;
          }, 500);
        }
      }
    } else if (track.audioUrl) {
      this.activeSource = "html5";
      this.audio.src = track.audioUrl;
      if (this._lastSavedTime > 0) {
        this.audio.currentTime = this._lastSavedTime;
        this._lastSavedTime = 0;
      }
      this.audio.play().catch(()=>{});
    }

    this._updateBar();
    this._updateMediaSession(true);
    // Save last played track & track artist
    this._saveLastTrack();
    this._trackArtistPlay(track);
    // Notify native with artwork
    if (window.MusicFlowNative) {
      try {
        const artUrl = track.thumbnailLarge || track.thumbnail || "";
        window.MusicFlowNative.startAudioServiceWithArt(track.title||"MusicFlow", track.artist||"Reproduciendo", artUrl);
      } catch(e){}
    }
  },

  toggle() {
    if (this.isPlaying) this.pause(); else this.resume();
  },
  pause() {
    if (this.activeSource==="youtube" && ytPlayer?.pauseVideo) ytPlayer.pauseVideo();
    else this.audio.pause();
  },
  resume() {
    if (this.activeSource==="youtube" && ytPlayer?.playVideo) ytPlayer.playVideo();
    else this.audio.play().catch(()=>{});
  },
  next() {
    if (!this.queue.length) return;
    let idx = this.shuffle ? Math.floor(Math.random()*this.queue.length) : (this.queueIndex+1)%this.queue.length;
    this.play(this.queue[idx], this.queue);
  },
  prev() {
    if (!this.queue.length) return;
    const ct = this.activeSource==="youtube" ? (ytPlayer?.getCurrentTime?.()||0) : this.audio.currentTime;
    if (ct > 3) { this.seek(0); return; }
    let idx = this.queueIndex===0 ? this.queue.length-1 : this.queueIndex-1;
    this.play(this.queue[idx], this.queue);
  },
  seek(t) {
    if (this.activeSource==="youtube" && ytPlayer?.seekTo) ytPlayer.seekTo(t,true);
    else this.audio.currentTime = t;
  },
  stopAll() {
    // Detener HTML5 audio
    try {
      this.audio.pause();
      this.audio.src = "";
      this.audio.currentTime = 0;
    } catch(e) {}
    
    // Detener YouTube player
    if (ytPlayer) {
      try { ytPlayer.stopVideo(); } catch(e) {}
      try { ytPlayer.unMute(); } catch(e) {}
    }
    
    this.isPlaying = false;
  },

  _onPlay() {
    this.isPlaying=true; this._updateBar(); this._updateMediaSession(true);
    if (window.MusicFlowNative) { try { window.MusicFlowNative.updatePlayState(true); } catch(e){} }
  },
  _onPause() {
    this.isPlaying=false; this._updateBar(); this._updateMediaSession(false);
    if (window.MusicFlowNative) { try { window.MusicFlowNative.updatePlayState(false); } catch(e){} }
  },
  _onEnd() {
    if (this.repeat==="one") { this.seek(0); this.resume(); return; }
    let idx = this.shuffle ? Math.floor(Math.random()*this.queue.length) : this.queueIndex+1;
    if (idx>=this.queue.length) {
      if (this.repeat==="all") this.play(this.queue[0],this.queue);
      else { this.isPlaying=false; this._updateBar(); }
      return;
    }
    this.play(this.queue[idx],this.queue);
  },

  _updateProgress() {
    if (!this.currentTrack) return;
    let ct=0,dur=0;
    if (this.activeSource==="youtube" && ytPlayer?.getCurrentTime) {
      ct=ytPlayer.getCurrentTime()||0; dur=ytPlayer.getDuration()||0;
    } else {
      ct=this.audio.currentTime||0; dur=this.audio.duration||0;
    }
    const pct = dur>0 ? (ct/dur*100) : 0;
    const el = document.getElementById("pb-progress");
    if (el) el.style.width = pct+"%";
    const expFill = document.getElementById("exp-progress-fill");
    if (expFill) expFill.style.width = pct+"%";
    document.getElementById("exp-current-time").textContent = this._fmtTime(ct);
    document.getElementById("exp-duration").textContent = this._fmtTime(dur);
  },

  _fmtTime(s) {
    if (!s || s < 0) return "0:00";
    const m = Math.floor(s/60);
    const sec = Math.floor(s%60);
    return m+":" + String(sec).padStart(2,"0");
  },

  _updateBar() {
    const bar = document.getElementById("player-bar");
    if (!this.currentTrack) { bar.classList.remove("visible"); return; }
    bar.classList.add("visible");
    document.getElementById("pb-cover").src = this.currentTrack.thumbnail || this.currentTrack.thumbnailLarge || "";
    document.getElementById("pb-title").textContent = this.currentTrack.title || "-";
    document.getElementById("pb-artist").textContent = this.currentTrack.artist || this.currentTrack.artistName || "-";
    const btn = document.getElementById("pb-play-btn");
    this._highlightCurrentTrack();
    btn.innerHTML = this.isPlaying
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    this._updateExpanded();
  },

  _updateMediaSession(playing) {
    if (!("mediaSession" in navigator) || !this.currentTrack) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.currentTrack.title,
        artist: this.currentTrack.artist || "MusicFlow",
        album: "MusicFlow",
        artwork: this.currentTrack.thumbnailLarge ? [{src:this.currentTrack.thumbnailLarge,sizes:"512x512",type:"image/jpeg"}] : []
      });
      navigator.mediaSession.playbackState = playing?"playing":"paused";
      navigator.mediaSession.setActionHandler("play",()=>this.resume());
      navigator.mediaSession.setActionHandler("pause",()=>this.pause());
      navigator.mediaSession.setActionHandler("previoustrack",()=>this.prev());
      navigator.mediaSession.setActionHandler("nexttrack",()=>this.next());
    } catch(e){}
  },

  _highlightCurrentTrack() {
    if (!this.currentTrack) return;
    document.querySelectorAll(".song-row.now-playing, .track-card.now-playing").forEach(el => el.classList.remove("now-playing"));
    const trackId = this.currentTrack.id;
    const rows = document.querySelectorAll(".song-row, .track-card");
    rows.forEach(r => {
      const oc = r.getAttribute("onclick") || "";
      const m = oc.match(/playTrack\\('([^']+)/);
      if (m && m[1] === trackId) r.classList.add("now-playing");
    });
  },

  openExpanded() {
    const exp = document.getElementById("expanded-player");
    if (exp) exp.classList.add("visible");
    this._updateExpanded();
  },

  closeExpanded() {
    const exp = document.getElementById("expanded-player");
    if (exp) exp.classList.remove("visible");
  },

  _updateExpanded() {
    if (!this.currentTrack) return;
    document.getElementById("exp-cover").src = this.currentTrack.thumbnailLarge || this.currentTrack.thumbnail || "";
    document.getElementById("exp-title").textContent = this.currentTrack.title || "-";
    document.getElementById("exp-artist").textContent = this.currentTrack.artist || this.currentTrack.artistName || "-";
    const btn = document.getElementById("exp-play-btn");
    btn.innerHTML = this.isPlaying
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  },

  startDrag(evt) {
    this._isDragging = true;
    evt.preventDefault();
  },

  dragProgress(evt) {
    if (!this._isDragging) return;
    evt.preventDefault();
    const bar = document.getElementById("exp-progress-bar");
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    let x = evt.touches?.[0]?.clientX || evt.clientX;
    const pct = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    const dur = this.activeSource === "youtube" ? (ytPlayer?.getDuration?.() || 0) : (this.audio.duration || 0);
    if (dur > 0) this.seek(pct * dur);
  },

  endDrag(evt) {
    this._isDragging = false;
    evt.preventDefault();
  },

  seekFromExpanded(evt) {
    const bar = evt.target.closest(".progress-bar");
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    let x = evt.clientX;
    if (evt.touches && evt.touches.length > 0) {
      x = evt.touches[0].clientX;
    }
    const pct = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    const dur = this.activeSource === "youtube" ? (ytPlayer?.getDuration?.() || 0) : (this.audio.duration || 0);
    if (dur > 0) this.seek(pct * dur);
  }
};

// ═══════════════════════════════════════════════════════════════════
// NAVIGATION & VIEWS
// ═══════════════════════════════════════════════════════════════════
const Nav = {
  current: "home",
  history: [],

  go(page, data) {
    this.history.push({page:this.current});
    this.current = page;
    document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
    const nb = document.getElementById("nav-"+page);
    if (nb) nb.classList.add("active");
    this.render(page, data);
    document.getElementById("main-content").scrollTop = 0;
  },

  back() {
    if (this.history.length) {
      const prev = this.history.pop();
      this.current = prev.page;
      document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
      const nb = document.getElementById("nav-"+prev.page);
      if (nb) nb.classList.add("active");
      this.render(prev.page);
      document.getElementById("main-content").scrollTop = 0;
    }
  },

  render(page, data) {
    const el = document.getElementById("main-content");
    switch(page) {
      case "home": Views.home(el); break;
      case "search": Views.search(el); break;
      case "artist": Views.artist(el, data); break;
      case "genre": Views.genre(el, data); break;
    }
  }
};

// ═══════════════════════════════════════════════════════════════════
// VIEWS
// ═══════════════════════════════════════════════════════════════════
function fmtDur(s) { if(!s)return""; const m=Math.floor(s/60); return m+":"+String(Math.floor(s%60)).padStart(2,"0"); }

function trackCardHTML(t) {
  const thumb = t.thumbnailLarge||t.thumbnail||t.album_image||"";
  const title = t.title||t.name||"";
  const artist = t.artist||t.artist_name||"";
  return \`<div class="track-card" onclick="playTrack('\${t.id}', event)"><img class="thumb" src="\${thumb}" loading="lazy" onerror="this.src=''"><div class="name">\${title}</div><div class="sub">\${artist}</div></div>\`;
}

function songRowHTML(t, idx, showArtistLink=true) {
  const thumb = t.thumbnail||t.thumbnailLarge||t.album_image||"";
  const title = t.title||t.name||"";
  const artist = t.artist||t.artist_name||"";
  const dur = fmtDur(t.duration);
  const artistClick = showArtistLink && t.source==="youtube" ? \`onclick="event.stopPropagation();Nav.go('artist',{name:'\${artist.replace(/'/g,"\\\\'")}'})"\` : "";
  return \`<div class="song-row" onclick="playTrack('\${t.id}', event)">
    <span class="idx">\${idx+1}</span>
    <img class="thumb" src="\${thumb}" loading="lazy" onerror="this.src=''">
    <div class="info"><div class="title">\${title}</div><div class="artist" \${artistClick}>\${artist}</div></div>
    \${dur?\`<span class="dur">\${dur}</span>\`:""}
  </div>\`;
}

// Global track store
let _allTracks = {};
let _allTracksInOrder = []; // Keep track of all tracks in current view, in order

function storeTracks(tracks) { 
  tracks.forEach(t=>{ _allTracks[t.id]=t; });
  _allTracksInOrder = tracks; // Also store in order
}

window.playTrack = function(id, evt) {
  const t = _allTracks[id];
  if (!t) return;
  
  // SIEMPRE reproducir la cancion que tocaste primero
  Player.play(t, [t]);
  
  // Luego, construir la cola de fondo (para siguiente/anterior)
  const clickedEl = evt?.target?.closest(".song-row, .track-card");
  if (!clickedEl) return;
  
  // Find all song elements in the same parent section
  let parent = clickedEl.parentElement;
  while (parent && !parent.classList.contains("section") && !parent.classList.contains("h-scroll") && !parent.id.includes("tracks")) {
    parent = parent.parentElement;
  }
  
  if (!parent) parent = document.getElementById("main-content");
  
  // Get all songs in this parent, in order
  const allSongEls = Array.from(parent.querySelectorAll(".song-row, .track-card"));
  
  // Build queue from these elements
  const queue = [];
  let foundClickedTrack = false;
  
  allSongEls.forEach((el) => {
    const onclick = el.getAttribute("onclick") || "";
    const match = onclick.match(/playTrack\\('([^']+)/);
    if (match) {
      const trackId = match[1];
      const track = _allTracks[trackId];
      if (track && trackId !== id) {
        queue.push(track);
      }
      if (trackId === id) foundClickedTrack = true;
    }
  });
  
  // Update the player queue with the remaining tracks
  if (queue.length > 0) {
    Player.queue = [t, ...queue];
    Player.queueIndex = 0;
  }
};

// Home filter function
window.homeFilter = function(filter, btn) {
  document.querySelectorAll('.filter-chip').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const grid = document.getElementById('home-quick-grid');
  const trending = document.getElementById('home-trending');
  const jamendo = document.getElementById('home-jamendo');
  if (filter==='all') {
    if(grid)grid.style.display='grid';
    if(trending)trending.style.display='block';
    if(jamendo)jamendo.style.display='block';
  } else if (filter==='music') {
    if(grid)grid.style.display='grid';
    if(trending)trending.style.display='block';
    if(jamendo)jamendo.style.display='none';
  }
};

const Views = {
  async home(el) {
    const h = new Date().getHours();
    const greeting = h<12?"Buenos d\\u00edas":h<18?"Buenas tardes":"Buenas noches";

    // Build quick-access artist cards from recently played artists
    let recentArtists = [];
    try {
      recentArtists = JSON.parse(localStorage.getItem('mf_recent_artists') || '[]');
      if (!recentArtists || recentArtists.length === 0) {
        recentArtists = JSON.parse(sessionStorage.getItem('mf_recent_artists') || '[]');
      }
      if (!recentArtists || recentArtists.length === 0) {
        if (window.MusicFlowNative && window.MusicFlowNative.loadData) {
          const nativeData = window.MusicFlowNative.loadData('mf_recent_artists');
          if (nativeData) recentArtists = JSON.parse(nativeData);
        }
      }
    } catch(e) {}
    
    let quickCardsHTML = '';
    if (recentArtists.length > 0) {
      // Show recently played artists (up to 10)
      quickCardsHTML = recentArtists.slice(0, 10).map(a => {
        const safeA = a.name.replace(/'/g,"\\\\'");
        const thumb = a.thumbnail || '';
        return \`<div class="quick-card" onclick="Nav.go('artist',{name:'\${safeA}'})">
          <img class="qc-img" src="\${thumb}" onerror="this.style.display='none'">
          <div class="qc-name">\${a.name}</div>
        </div>\`;
      }).join("");
    } else {
      // No history yet - show empty state message
      quickCardsHTML = '<div style="grid-column:1/-1;padding:12px 0;color:var(--text2);font-size:13px">Escucha m\\u00fasica para ver tus artistas recientes aqu\\u00ed</div>';
    }

    el.innerHTML = \`
      <div class="greeting">\${greeting}</div>
      <div class="filter-row">
        <button class="filter-chip active" onclick="homeFilter('all',this)">Todas</button>
        <button class="filter-chip" onclick="homeFilter('music',this)">M\\u00fasica</button>
      </div>
      <div id="home-quick-grid" class="quick-grid">\${quickCardsHTML}</div>
      <div id="home-trending" class="section"><div class="section-title">\\ud83d\\udd25 Tendencias Latinas</div><div class="loading"><div class="spinner"></div>Cargando...</div></div>

      <div id="home-jamendo" class="section"><div class="section-title">\\ud83c\\udfb5 M\\u00fasica Independiente</div><div class="loading"><div class="spinner"></div>Cargando...</div></div>
    \`;

    // No need to load thumbnails - they come from play history

    // Load trending
    YTSearch.trending().then(tracks => {
      storeTracks(tracks);
      const container = document.getElementById("home-trending");
      if (!container) return;
      if (tracks.length) {
        container.innerHTML = \`<div class="section-title">\\ud83d\\udd25 Tendencias Latinas</div><div class="h-scroll">\${tracks.map(t=>trackCardHTML(t)).join("")}</div>\`;
      } else {
        container.innerHTML = \`<div class="section-title">\\ud83d\\udd25 Tendencias Latinas</div><div style="padding:8px;color:var(--text2);font-size:13px">No disponible en este momento</div>\`;
      }
    });

    // Load Jamendo
    Jamendo.popularLatin().then(tracks => {
      const mapped = tracks.map(t=>({id:"j-"+t.id,title:t.name,artist:t.artist_name,artistName:t.artist_name,thumbnail:t.album_image||t.image,thumbnailLarge:t.album_image||t.image,audioUrl:t.audio,duration:t.duration,source:"jamendo"}));
      storeTracks(mapped);
      const container = document.getElementById("home-jamendo");
      if (!container) return;
      if (mapped.length) {
        container.innerHTML = \`<div class="section-title">\\ud83c\\udfb5 M\\u00fasica Independiente</div><div class="h-scroll">\${mapped.map(t=>trackCardHTML(t)).join("")}</div>\`;
      } else {
        container.innerHTML = "";
      }
    });
  },

  search(el) {
    el.innerHTML = \`
      <div style="padding:16px 16px 0"><h1 style="font-size:22px;font-weight:700;margin-bottom:16px">Buscar</h1></div>
      <div class="search-input-wrap">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search-input" id="search-input" type="text" placeholder="Artistas, canciones o \\u00e1lbumes" autofocus>
      </div>
      <div id="search-results">
        <div class="section"><div class="section-title">Explorar G\\u00e9neros</div>
          <div class="genre-grid" style="padding:0">
            \${GENRES.map(g=>\`<div class="genre-card" style="background:\${g.color}" onclick="Nav.go('genre',{id:'\${g.id}',name:'\${g.name}'})"><div class="name">\${g.name}</div><div class="icon">\${g.icon}</div></div>\`).join("")}
          </div>
        </div>
      </div>
    \`;
    let debounce;
    document.getElementById("search-input").addEventListener("input",function(){
      clearTimeout(debounce);
      const q = this.value.trim();
      if (!q) {
        document.getElementById("search-results").innerHTML = \`<div class="section"><div class="section-title">Explorar G\\u00e9neros</div><div class="genre-grid" style="padding:0">\${GENRES.map(g=>\`<div class="genre-card" style="background:\${g.color}" onclick="Nav.go('genre',{id:'\${g.id}',name:'\${g.name}'})"><div class="name">\${g.name}</div><div class="icon">\${g.icon}</div></div>\`).join("")}</div></div>\`;
        return;
      }
      document.getElementById("search-results").innerHTML = '<div class="loading"><div class="spinner"></div>Buscando...</div>';
      debounce = setTimeout(async()=>{
        const [ytTracks, jTracks] = await Promise.all([
          YTSearch.search(q),
          Jamendo.search(q)
        ]);
        const jMapped = jTracks.map(t=>({id:"j-"+t.id,title:t.name,artist:t.artist_name,artistName:t.artist_name,thumbnail:t.album_image||t.image,thumbnailLarge:t.album_image||t.image,audioUrl:t.audio,duration:t.duration,source:"jamendo"}));
        storeTracks(ytTracks);
        storeTracks(jMapped);

        // Extract unique artists
        const seen = new Set();
        const artists = [];
        ytTracks.forEach(t=>{ if(t.artist&&!seen.has(t.artist)){seen.add(t.artist);artists.push({name:t.artist,thumb:t.thumbnailLarge});} });

        let html = "";
        if (artists.length) {
          html += \`<div class="section"><div class="section-title">Artistas</div><div class="h-scroll">\${artists.slice(0,6).map(a=>\`<div style="flex-shrink:0;width:90px;text-align:center;cursor:pointer" onclick="Nav.go('artist',{name:'\${a.name.replace(/'/g,"\\\\'")}'})""><div style="width:70px;height:70px;border-radius:50%;overflow:hidden;margin:0 auto;background:var(--surface2)"><img src="\${a.thumb}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'"></div><div style="font-size:11px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\${a.name}</div><div style="font-size:10px;color:var(--text2)">Artista</div></div>\`).join("")}</div></div>\`;
        }
        if (ytTracks.length) {
          html += \`<div class="section"><div class="section-title">Canciones</div>\${ytTracks.map((t,i)=>songRowHTML(t,i)).join("")}</div>\`;
        }
        if (jMapped.length) {
          html += \`<div class="section"><div class="section-title">M\\u00fasica Independiente</div>\${jMapped.map((t,i)=>songRowHTML(t,i,false)).join("")}</div>\`;
        }
        if (!ytTracks.length && !jMapped.length) {
          html = \`<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><p style="font-size:16px;font-weight:600;color:var(--text)">No se encontraron resultados</p><p style="font-size:13px;margin-top:4px">Intent\\u00e1 con otro nombre</p></div>\`;
        }
        document.getElementById("search-results").innerHTML = html;
      },400);
    });
  },

  async artist(el, data) {
    const name = data?.name || "Artista";
    el.innerHTML = \`
      <div class="artist-hero" id="artist-hero" style="background-image:linear-gradient(var(--surface),var(--bg))">
        <button class="back-btn" onclick="Nav.back()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg></button>
        <div class="content">
          <img class="avatar" id="artist-avatar" src="" onerror="this.style.display='none'">
          <div class="meta">
            <div class="label">Artista</div>
            <h1>\${name}</h1>
            <div class="count" id="artist-count">Cargando...</div>
          </div>
        </div>
      </div>
      <div class="artist-actions">
        <button class="play-all-btn" id="artist-play-all" onclick="event.stopPropagation()"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>
        <button class="shuffle-btn" id="artist-shuffle" onclick="event.stopPropagation()">Aleatorio</button>
      </div>
      <div id="artist-tracks"><div class="loading"><div class="spinner"></div>Cargando canciones...</div></div>
    \`;

    const tracks = await YTSearch.artistTracks(name);
    storeTracks(tracks);

    if (tracks.length) {
      const hero = tracks[0].thumbnailLarge || tracks[0].thumbnail;
      if (hero) {
        document.getElementById("artist-hero").style.backgroundImage = \`url(\${hero})\`;
        document.getElementById("artist-avatar").src = hero;
      }
      document.getElementById("artist-count").textContent = tracks.length+" canciones";
      document.getElementById("artist-tracks").innerHTML = tracks.map((t,i)=>songRowHTML(t,i,false)).join("");
      document.getElementById("artist-play-all").onclick = (e)=>{
        e.preventDefault();
        e.stopPropagation();
        Player.play(tracks[0],tracks);
      };
      document.getElementById("artist-shuffle").onclick = (e)=>{
        e.preventDefault();
        e.stopPropagation();
        const shuffled = [...tracks].sort(()=>Math.random()-.5);
        Player.play(shuffled[0],shuffled);
      };
    } else {
      document.getElementById("artist-count").textContent = "Sin resultados";
      document.getElementById("artist-tracks").innerHTML = '<div class="empty"><p>No se encontraron canciones</p></div>';
    }
  },

  async genre(el, data) {
    const genre = data || {};
    const g = GENRES.find(g=>g.id===genre.id);
    el.innerHTML = \`
      <div style="padding:16px;display:flex;align-items:center;gap:12px">
        <button style="background:none;border:none;color:var(--text);cursor:pointer" onclick="Nav.back()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg></button>
        <h1 style="font-size:22px;font-weight:700">\${g?g.icon+" ":""} \${genre.name||"G\\u00e9nero"}</h1>
      </div>
      <div id="genre-tracks"><div class="loading"><div class="spinner"></div>Cargando...</div></div>
    \`;

    const tracks = await YTSearch.genreTracks(genre.id);
    storeTracks(tracks);

    if (tracks.length) {
      document.getElementById("genre-tracks").innerHTML = \`<div class="section">\${tracks.map((t,i)=>songRowHTML(t,i)).join("")}</div>\`;
    } else {
      document.getElementById("genre-tracks").innerHTML = '<div class="empty"><p>No se encontraron canciones para este g\\u00e9nero</p></div>';
    }
  }
};

// ═══════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════
Player.init();
Nav.go("home");

// Handle visibility change for YouTube
document.addEventListener("visibilitychange",()=>{
  if (document.hidden && Player.isPlaying && Player.activeSource==="youtube") {
    setTimeout(()=>{
      if (ytPlayer?.getPlayerState?.()===YT.PlayerState.PAUSED) ytPlayer.playVideo();
    },200);
  }
});
</script>
</body>
</html>
`;
