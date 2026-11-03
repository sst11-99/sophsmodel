const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const locale = require('../api/locale');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
http.createServer(async (req, res) => {
  if (req.url.split('?')[0] === '/api/locale') {
    req.headers['x-vercel-ip-country'] = process.env.PREVIEW_COUNTRY || 'TH';
    res.status = (status) => { res.statusCode = status; return res; };
    res.json = (data) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
    return locale(req, res);
  }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/submission-demo') {
      const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-store');
      return res.end(html.replace(/<script src="supabase-config\.js[^"]*"><\/script>/, '').replace(/<script src="backend\.js[^"]*"><\/script>/, '').replace('</body>', '<script src="scripts/submission-demo.js"></script></body>'));
    }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep) || !types[path.extname(file)]) throw new Error();
    const data = await fs.readFile(file);
    res.setHeader('Content-Type', types[path.extname(file)]);
    res.setHeader('Cache-Control', 'no-store');
    res.end(data);
  } catch { res.statusCode = 404; res.end('Not found'); }
}).listen(Number(process.env.PREVIEW_PORT || 4174), '127.0.0.1', () => console.log('Preview ready (PREVIEW_PORT defaults to 4174)'));
