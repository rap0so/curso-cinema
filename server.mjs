import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PROGRESS_FILE = join(ROOT, 'progress.json');
const PORT = Number(process.env.PORT) || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function saveProgress(request, response) {
  const body = await readBody(request);
  try {
    await writeFile(PROGRESS_FILE, `${JSON.stringify(JSON.parse(body), null, 2)}\n`);
    response.writeHead(204).end();
  } catch {
    response.writeHead(400).end();
  }
}

async function serveStatic(pathname, response) {
  const relativePath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(ROOT, relativePath.endsWith('/') ? `${relativePath}index.html` : relativePath);
  if (!filePath.startsWith(ROOT)) return response.writeHead(403).end();
  try {
    const content = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(content);
  } catch {
    response.writeHead(404).end();
  }
}

createServer((request, response) => {
  const { pathname } = new URL(request.url, 'http://localhost');
  if (pathname === '/progress.json' && request.method === 'PUT') return saveProgress(request, response);
  return serveStatic(pathname, response);
}).listen(PORT, () => console.log(`🎬 http://localhost:${PORT}`));
