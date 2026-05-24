// Quick preview server — runs Next.js dev on port 3333 with a mock SDK injected.
// Usage: node preview-server.mjs
// Then open: http://localhost:3333/games/math-practice-001
//
// No childId or Supabase needed — GameClient works standalone with localStorage settings.

import { spawn } from 'child_process';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';

const PORT = 3333;
const NEXT_PORT = 3334;

// Start Next.js dev on NEXT_PORT
const next = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['next', 'dev', '--port', String(NEXT_PORT)],
  { stdio: 'inherit', shell: false }
);
next.on('close', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => { next.kill(); process.exit(0); });

// SDK mock script injected into every HTML response
const SDK_MOCK = `
<script>
window.MathPlatformSDK = {
  emit(event, data) {
    console.log('[SDK]', event, data);
    if (event === 'GAME_OVER') {
      console.log('%c GAME OVER — stars: ' + data.stars + '  score: ' + data.score + '/' + data.maxScore, 'background:#222;color:#ff0;font-size:16px;padding:4px 8px');
    }
  }
};
</script>
`;

// Proxy server that injects the mock SDK into HTML responses
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${NEXT_PORT}`);
    const proxyRes = await fetch(url.toString(), {
      method: req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers).filter(([k]) => k !== 'host')
      ),
    });

    const contentType = proxyRes.headers.get('content-type') ?? '';
    const body = await proxyRes.arrayBuffer();

    proxyRes.headers.forEach((v, k) => {
      if (k.toLowerCase() !== 'content-encoding') res.setHeader(k, v);
    });

    if (contentType.includes('text/html')) {
      const html = new TextDecoder().decode(body);
      const injected = html.replace('</head>', SDK_MOCK + '</head>');
      res.setHeader('content-length', Buffer.byteLength(injected));
      res.writeHead(proxyRes.status);
      res.end(injected);
    } else {
      res.writeHead(proxyRes.status);
      res.end(Buffer.from(body));
    }
  } catch {
    res.writeHead(502);
    res.end('Waiting for Next.js to start… refresh in a moment.');
  }
}).listen(PORT, () => {
  console.log(`\n🎮  Preview server ready`);
  console.log(`    http://localhost:${PORT}/games/math-practice-001\n`);
});
