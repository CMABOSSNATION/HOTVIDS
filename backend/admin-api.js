const express = require('express');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  next();
});

// ── CONFIG ──────────────────────────────────────────────────────────
const ADMIN_PASSWORD  = 'cma2024admin';
const STREAM_SH       = '/root/HOTVIDS/tv-channel/stream.sh';
const VIDEOS_DIR      = '/root/HOTVIDS/tv-channel/videos';
const NORMALIZED_DIR  = '/tmp/normalized';
const CONCAT_FILE     = '/tmp/concat.txt';
const SEGMENTS_DIR    = '/root/HOTVIDS/tv-channel/segments';
const R2_ENDPOINT     = 'https://c0bfd297b3696dfbf20d2df5800c57ff.r2.cloudflarestorage.com';
const R2_BUCKET       = 'hotvids';
const SETTINGS_FILE   = '/root/HOTVIDS/tv-channel/settings.json';

// ── AUTH MIDDLEWARE ─────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization;
  if (token !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── LOAD / SAVE SETTINGS ────────────────────────────────────────────
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) return JSON.parse(fs.readFileSync(SETTINGS_FILE));
  } catch(e) {}
  return {
    ticker: 'CMA TV | Clean Money Avenue Media Technology Ltd | HOTVID - Live TV Videos Radio | CyberMuzik Streaming | WhatsApp Bot Solutions | Prison Management System | Money Lending System | Web App Software Dev | CCTV Installation | Cybersecurity | Bebe Cool Pallaso Fik Fameica Sheebah Spice Diana | Ugandan Music 24/7 | Afrobeats Bongo Gospel | Celebrity News | Download HOTVID Free | hotvid.com',
    tickerSpeed: 100,
    tickerColor: '0xFFD700',
    tickerBg: '0x0a0a1a',
    logoText: 'CMA TV',
    logoColor: '0xFFD700',
    logoBg: '0x1a0a2e',
    showLive: true,
    playlist: []
  };
}

function saveSettings(s) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2));
}

// ── REBUILD STREAM.SH vf FILTER ─────────────────────────────────────
function rebuildVF(s) {
  const logo = `drawtext=text='${s.logoText}':fontsize=20:fontcolor=${s.logoColor}:x=16:y=60:box=1:boxcolor=${s.logoBg}@0.92:boxborderw=8`;
  const live = s.showLive ? `, drawtext=text='LIVE':fontsize=11:fontcolor=white:x=16:y=94:box=1:boxcolor=0x8B0000@0.95:boxborderw=5` : '';
  const ticker = `, drawtext=text='  ${s.ticker}  ':fontsize=13:fontcolor=${s.tickerColor}:x=w-mod(t*${s.tickerSpeed}\\,w+tw):y=h-80:box=1:boxcolor=${s.tickerBg}@0.92:boxborderw=8`;
  return logo + live + ticker;
}

function applyVFToScript(s) {
  let sh = fs.readFileSync(STREAM_SH, 'utf8');
  const newVF = `-vf "${rebuildVF(s)}"`;
  sh = sh.replace(/-vf ".*?"/s, newVF);
  fs.writeFileSync(STREAM_SH, sh);
}

// ── REBUILD PLAYLIST ────────────────────────────────────────────────
function applyPlaylist(playlist) {
  const lines = playlist.map(f => `file '${NORMALIZED_DIR}/${f}'`).join('\n');
  fs.writeFileSync(CONCAT_FILE, lines);
}

// ── ROUTES ──────────────────────────────────────────────────────────

// Status
app.get('/api/status', auth, (req, res) => {
  exec('pm2 jlist', (err, stdout) => {
    try {
      const list = JSON.parse(stdout);
      const cma = list.find(p => p.name === 'cma-tv');
      const hotvid = list.find(p => p.name === 'hotvid');
      const segs = fs.existsSync(SEGMENTS_DIR) ? fs.readdirSync(SEGMENTS_DIR).filter(f => f.endsWith('.ts')).length : 0;
      const m3u8 = fs.existsSync(`${SEGMENTS_DIR}/live.m3u8`) ? fs.readFileSync(`${SEGMENTS_DIR}/live.m3u8`,'utf8') : '';
      const seqMatch = m3u8.match(/MEDIA-SEQUENCE:(\d+)/);
      res.json({
        cmatv: { status: cma?.pm2_env?.status, uptime: cma?.pm2_env?.pm_uptime, restarts: cma?.pm2_env?.restart_time, cpu: cma?.monit?.cpu, memory: Math.round((cma?.monit?.memory||0)/1024/1024) },
        hotvid: { status: hotvid?.pm2_env?.status },
        segments: segs,
        sequence: seqMatch ? seqMatch[1] : '?',
        settings: loadSettings()
      });
    } catch(e) { res.json({ error: e.message }); }
  });
});

// Stream control
app.post('/api/stream/restart', auth, (req, res) => {
  exec('pm2 restart cma-tv', (err, stdout) => res.json({ ok: !err, out: stdout }));
});

app.post('/api/stream/stop', auth, (req, res) => {
  exec('pm2 stop cma-tv', (err, stdout) => res.json({ ok: !err, out: stdout }));
});

app.post('/api/stream/start', auth, (req, res) => {
  exec('pm2 start cma-tv', (err, stdout) => res.json({ ok: !err, out: stdout }));
});

// Logs
app.get('/api/logs', auth, (req, res) => {
  exec('pm2 logs cma-tv --lines 30 --nostream', (err, stdout, stderr) => {
    res.json({ logs: stderr || stdout });
  });
});

// Videos list
app.get('/api/videos', auth, (req, res) => {
  try {
    const files = fs.readdirSync(VIDEOS_DIR).filter(f => f.endsWith('.mp4'));
    const normalized = fs.existsSync(NORMALIZED_DIR) ? fs.readdirSync(NORMALIZED_DIR).filter(f => f.endsWith('.mp4')) : [];
    let playlist = [];
    if (fs.existsSync(CONCAT_FILE)) {
      playlist = fs.readFileSync(CONCAT_FILE,'utf8').split('\n')
        .filter(l => l.startsWith('file'))
        .map(l => path.basename(l.replace(/file '.*\//,'').replace("'",'').trim()));
    }
    res.json({ files, normalized, playlist });
  } catch(e) { res.json({ error: e.message }); }
});

// Update playlist order
app.post('/api/playlist', auth, (req, res) => {
  try {
    const { playlist } = req.body;
    applyPlaylist(playlist);
    const s = loadSettings();
    s.playlist = playlist;
    saveSettings(s);
    res.json({ ok: true });
  } catch(e) { res.json({ error: e.message }); }
});

// Update ticker
app.post('/api/ticker', auth, (req, res) => {
  try {
    const s = loadSettings();
    Object.assign(s, req.body);
    saveSettings(s);
    applyVFToScript(s);
    exec('pm2 restart cma-tv', () => res.json({ ok: true }));
  } catch(e) { res.json({ error: e.message }); }
});

// Update branding
app.post('/api/branding', auth, (req, res) => {
  try {
    const s = loadSettings();
    Object.assign(s, req.body);
    saveSettings(s);
    applyVFToScript(s);
    exec('pm2 restart cma-tv', () => res.json({ ok: true }));
  } catch(e) { res.json({ error: e.message }); }
});

// Force R2 sync
app.post('/api/sync', auth, (req, res) => {
  const cmd = `aws s3 sync ${SEGMENTS_DIR}/ s3://${R2_BUCKET}/tv/ --endpoint-url ${R2_ENDPOINT} --acl public-read --quiet`;
  exec(cmd, (err) => res.json({ ok: !err }));
});

// Clear R2 and resync
app.post('/api/sync/reset', auth, (req, res) => {
  const del = `aws s3 rm s3://${R2_BUCKET}/tv/ --recursive --endpoint-url ${R2_ENDPOINT}`;
  exec(del, () => {
    const sync = `aws s3 sync ${SEGMENTS_DIR}/ s3://${R2_BUCKET}/tv/ --endpoint-url ${R2_ENDPOINT} --acl public-read --quiet`;
    exec(sync, (err) => res.json({ ok: !err }));
  });
});

// VPS stats
app.get('/api/system', auth, (req, res) => {
  exec("free -m | awk 'NR==2{print $2,$3,$4}' && df -h / | awk 'NR==2{print $2,$3,$4,$5}' && top -bn1 | grep 'Cpu' | awk '{print $2}'", (err, stdout) => {
    const lines = stdout.trim().split('\n');
    const mem = lines[0]?.split(' ') || [];
    const disk = lines[1]?.split(' ') || [];
    res.json({
      memory: { total: mem[0], used: mem[1], free: mem[2] },
      disk: { total: disk[0], used: disk[1], free: disk[2], percent: disk[3] },
      cpu: lines[2]
    });
  });
});

app.listen(4500, () => console.log('CMA Admin API running on port 4500'));
