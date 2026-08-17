// Push local git HEAD to GitHub via REST API (api.github.com reachable even when github.com:443 is not)
const { execSync } = require('child_process');
const token = execSync('gh auth token', { encoding: 'utf8' }).trim();
const repo = 'Phaethon-Belle5/xiaoaijiang-home';
const head = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
const MB = 64 * 1024 * 1024;

async function api(path, method, body) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch('https://api.github.com' + path, {
      method: method || 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        'User-Agent': 'dsh-git-push',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
    return j;
  } finally {
    clearTimeout(t);
  }
}

function git(args) {
  return execSync(`git ${args}`, { encoding: 'utf8', maxBuffer: MB }).trim();
}

const blobs = new Map();   // sha -> { content(b64), size }
const trees = new Map();   // sha -> [{mode,type,sha,path}]
const commits = [];        // [{sha, tree, parents:[], message, author, committer}]
const seen = new Set();

function parseAuthor(s) {
  // "Name <email> 1786965537 +0800"
  const m = s.match(/^(.*) <(.*)> (\d+) ([+-]\d{4})$/);
  const ts = Number(m[3]), tz = m[4]; // e.g. "+0800"
  const tzMin = (parseInt(tz.slice(1, 3), 10) * 60 + parseInt(tz.slice(3, 5), 10)) * (tz[0] === '-' ? -1 : 1);
  // 墙钟时间（把 ts+偏移 当作 UTC 再转 ISO），保证 GitHub 存回 unix+原始时区，sha 与本地一致
  const wall = new Date((ts + tzMin * 60) * 1000);
  const iso = wall.toISOString().replace(/\.\d{3}Z$/, '');
  const tzc = tz.slice(0, 3) + ':' + tz.slice(3); // "+08:00"
  return { name: m[1], email: m[2], date: iso + tzc };
}

function walk(sha) {
  if (seen.has(sha)) return;
  seen.add(sha);
  const type = git(`cat-file -t ${sha}`);
  if (type === 'blob') {
    const content = execSync(`git cat-file blob ${sha}`, { encoding: 'base64', maxBuffer: MB });
    blobs.set(sha, { content, size: Buffer.from(content, 'base64').length });
  } else if (type === 'tree') {
    const out = git(`-c core.quotepath=false ls-tree ${sha}`);
    const entries = out.split('\n').filter(Boolean).map((l) => {
      const m = l.match(/^(\d{6}) (blob|tree|commit) ([0-9a-f]{40})\t(.*)$/);
      return { mode: m[1], type: m[2], sha: m[3], path: m[4] };
    });
    entries.forEach((e) => { if (e.type !== 'commit') walk(e.sha); });
    trees.set(sha, entries);
  } else if (type === 'commit') {
    const p = git(`cat-file -p ${sha}`);
    const lines = p.split('\n');
    let tree = '', parents = [], i = 0;
    for (; i < lines.length; i++) {
      if (lines[i].startsWith('tree ')) tree = lines[i].slice(5);
      else if (lines[i].startsWith('parent ')) parents.push(lines[i].slice(7));
      else if (lines[i] === '') break;
    }
    parents.forEach((pr) => walk(pr));
    walk(tree);
    const hdr = {};
    lines.slice(0, i).forEach((l) => {
      const m = l.match(/^(\S+)\s(.*)$/);
      if (m) (hdr[m[1]] = hdr[m[1]] || []).push(m[2]);
    });
    const msg = lines.slice(i + 1).join('\n');
    commits.push({
      sha,
      tree,
      parents,
      message: msg,
      author: parseAuthor(hdr.author[0]),
      committer: parseAuthor(hdr.committer[0]),
    });
  }
}

async function main() {
  console.log('HEAD:', head);
  walk(head);
  console.log(`objects: ${blobs.size} blobs, ${trees.size} trees, ${commits.length} commits`);

  let n = 0;
  for (const [sha, b] of blobs) {
    try {
      await api(`/repos/${repo}/git/blobs`, 'POST', { content: b.content, encoding: 'base64' });
    } catch (e) {
      console.log(`blob ${n + 1}/${blobs.size} sha=${sha.slice(0, 7)} size=${b.size} FAIL: ${e.message.slice(0, 100)}`);
      throw e;
    }
    if (++n % 20 === 0) console.log(`blobs ${n}/${blobs.size}`);
  }
  console.log('blobs done');

  n = 0;
  for (const [sha, entries] of trees) {
    const tree = entries.map((e) => ({ path: e.path, mode: e.mode, type: e.type === 'commit' ? 'commit' : (e.type === 'tree' ? 'tree' : 'blob'), sha: e.sha }));
    const res = await api(`/repos/${repo}/git/trees`, 'POST', { tree });
    if (res.sha !== sha) {
      console.log(`!! TREE SHA MISMATCH: sent ${sha.slice(0, 7)}, got ${res.sha.slice(0, 7)} (path issue?)`);
      process.exit(1);
    }
    if (++n % 10 === 0) console.log(`trees ${n}/${trees.size}`);
  }
  console.log('trees done');

  // commits from oldest to newest
  commits.reverse();
  let headRemoteSha = null;
  for (const c of commits) {
    const exists = await fetch(`https://api.github.com/repos/${repo}/git/commits/${c.sha}`, {
      headers: { Authorization: 'Bearer ' + token, 'User-Agent': 'dsh-git-push', 'X-GitHub-Api-Version': '2022-11-28' },
    });
    if (exists.ok) { console.log(`commit exists, skip: ${c.sha.slice(0, 7)}`); if (c.sha === head) headRemoteSha = c.sha; continue; }
    const res = await api(`/repos/${repo}/git/commits`, 'POST', {
      message: c.message,
      tree: c.tree,
      parents: c.parents,
      author: c.author,
      committer: c.committer,
    });
    // GitHub 会规范化 message 尾部换行，导致 sha 与本地不同；内容一致即可，记录远端 sha
    if (res.sha !== c.sha) console.log(`commit created: ${c.sha.slice(0, 7)} -> remote ${res.sha.slice(0, 7)} (sha differs due to API message normalization)`);
    else console.log(`commit created: ${c.sha.slice(0, 7)}`);
    if (c.sha === head) headRemoteSha = res.sha;
  }

  const cur = await api(`/repos/${repo}/git/ref/heads/master`);
  console.log('remote master currently:', cur.object.sha);
  const target = headRemoteSha || head;
  if (cur.object.sha !== target) {
    // GitHub git-data API 一致性延迟：刚创建的对象可能暂时不可见，重试
    let ok = false;
    for (let attempt = 1; attempt <= 6 && !ok; attempt++) {
      try {
        await api(`/repos/${repo}/git/refs/heads/master`, 'PATCH', { sha: target, force: false });
        ok = true;
      } catch (e) {
        console.log(`ref update attempt ${attempt} failed (${e.message.slice(0, 80)}), retrying...`);
        await new Promise((r) => setTimeout(r, 3000 * attempt));
      }
    }
    if (!ok) throw new Error('ref update failed after retries');
    console.log('ref updated to', target);
  } else {
    console.log('ref already at HEAD');
  }
  console.log('PUSH OK');
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
