// Serverless endpoint to GET/PUT the repository's manifest.json using GitHub API
// Expects env vars: GITHUB_TOKEN and GITHUB_REPO (owner/repo)

const https = require('https');

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const path = 'manifest.json';

  if (!repo) {
    res.statusCode = 500; res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'GITHUB_REPO not configured' }));
    return;
  }

  // Helper for GitHub API fetch using global fetch if available
  const ghFetch = global.fetch ? global.fetch.bind(global) : (url, opts) => {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const h = Object.assign({ 'User-Agent': 'manifest-endpoint' }, (opts && opts.headers) || {});
      const reqOpts = { method: opts && opts.method || 'GET', headers: h };
      const r = https.request(u, reqOpts, (rres) => {
        let out = '';
        rres.on('data', c => out += c);
        rres.on('end', () => {
          resolve({ ok: rres.statusCode >= 200 && rres.statusCode < 300, status: rres.statusCode, text: async () => out, json: async () => { try { return JSON.parse(out); } catch (e) { return out; } } });
        });
      });
      r.on('error', reject);
      if (opts && opts.body) r.write(opts.body);
      r.end();
    });
  };

  if (req.method === 'GET') {
    try {
      const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
      const resp = await ghFetch(apiUrl, { headers: { Authorization: token ? `token ${token}` : '', Accept: 'application/vnd.github.v3.raw' } });
      if (!resp.ok) {
        // file missing or inaccessible — return empty array so client falls back
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify([]));
        return;
      }
      const text = await resp.text();
      // If GitHub returned base64 JSON object with content, try to parse
      try {
        const parsed = JSON.parse(text);
        // If the API returned the file metadata (not raw), decode content
        if (parsed && parsed.content) {
          const buff = Buffer.from(parsed.content, 'base64').toString('utf8');
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(buff);
          return;
        }
      } catch (e) {
        // not a JSON wrapper, may be raw file
      }

      // Return raw response
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(text);
    } catch (err) {
      res.statusCode = 500; res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: String(err) }));
    }
    return;
  }

  if (req.method === 'POST') {
    if (!token) {
      res.statusCode = 500; res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'GITHUB_TOKEN not configured' }));
      return;
    }

    try {
      const bodyRaw = await readRequestBody(req);
      const body = bodyRaw ? JSON.parse(bodyRaw) : {};
      const docs = body.docs || body;
      const content = Buffer.from(JSON.stringify(docs, null, 2)).toString('base64');

      const url = `https://api.github.com/repos/${repo}/contents/${path}`;
      // Try to get existing file to obtain SHA
      const getResp = await ghFetch(url, { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } });
      let sha;
      if (getResp.ok) {
        const meta = await getResp.json();
        sha = meta.sha;
      }

      const putBody = JSON.stringify({ message: 'Update manifest.json via admin', content, sha });
      const putResp = await ghFetch(url, { method: 'PUT', headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github.v3+json' }, body: putBody });
      const putJson = await putResp.json();
      if (!putResp.ok) {
        res.statusCode = 500; res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: putJson }));
        return;
      }

      res.statusCode = 200; res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, commit: putJson.commit }));
    } catch (err) {
      res.statusCode = 500; res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: String(err) }));
    }
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.statusCode = 405; res.end();
