'use strict';

/**
 * dsh-theme-mbcc-console-ext — 宿主（Node）半部。
 *
 * 两件事：
 *   1. 让包成为能被 loader 挂载的 cordis 插件（name / apply 必须是字面量静态属性）；
 *   2. 用 webServer 的 exact 路由把 assets/ 下的资源发给浏览器 —— 开屏 PV 与壁纸原图
 *      都从这里取，走同源 HTTP，支持 Range（视频拖动进度条要用）。
 *
 * 路由写作 Node 原生 handler（与宿主自带插件一致的写法），而不是 Fetch resource：
 * 这条路径在宿主里是既有的、可用的。
 */

const path = require('node:path');
const fs = require('node:fs');

const NAME = 'dsh-theme-mbcc-console-ext';
const ROUTE_BASE = '/mbcc-console-wall/assets/';
const ASSET_ROOT = path.join(__dirname, 'assets');
/** 开屏诊断流水：客户端每个阶段回传一行 JSON，控制台打不开也能查 */
const DIAG_PATH = '/mbcc-console-wall/diag';
const DIAG_FILE = path.join(__dirname, 'diag.jsonl');

const MIME = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

/** 小文件常驻内存：一次读盘，之后按 Range 切片 */
const blobs = new Map();

function readAsset(rel) {
  if (blobs.has(rel)) return blobs.get(rel);
  const root = path.resolve(ASSET_ROOT);
  const resolved = path.resolve(path.join(root, rel));
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  const buf = fs.readFileSync(resolved);
  blobs.set(rel, buf);
  return buf;
}

function mimeOf(rel) {
  // theme2.webp 的字节其实是 JPEG（原图导出时改过后缀），按内容给类型
  if (rel === 'theme2.webp') return 'image/jpeg';
  return MIME[path.extname(rel).toLowerCase()] || 'application/octet-stream';
}

/** 解析 `bytes=start-end`；越界或非法返回 null（当整包处理） */
function parseRange(header, size) {
  if (typeof header !== 'string') return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  let start;
  let end;
  if (m[1] === '' && m[2] === '') return null;
  if (m[1] === '') {
    const suffix = Number(m[2]);
    if (!suffix) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return null;
  return { start, end };
}

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
  });
  res.end(text);
}

/** 一个精确路径的静态资源 handler。 */
function assetHandler(rel) {
  return function handle(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD', 'content-type': 'text/plain; charset=utf-8' });
      res.end('method not allowed');
      return;
    }
    let buf;
    try {
      buf = readAsset(rel);
    } catch (e) {
      buf = null;
    }
    if (!buf) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      res.end('asset not found');
      return;
    }
    const size = buf.length;
    const headers = {
      'content-type': mimeOf(rel),
      'accept-ranges': 'bytes',
      'cache-control': 'public, max-age=86400',
      etag: '"' + size.toString(16) + '-' + rel.length.toString(16) + '"',
      'x-content-type-options': 'nosniff',
    };
    const range = parseRange(req.headers.range, size);
    if (range) {
      const chunk = buf.subarray(range.start, range.end + 1);
      headers['content-range'] = 'bytes ' + range.start + '-' + range.end + '/' + size;
      headers['content-length'] = String(chunk.length);
      res.writeHead(206, headers);
      res.end(req.method === 'HEAD' ? undefined : chunk);
      return;
    }
    headers['content-length'] = String(size);
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : buf);
  };
}

/**
 * 诊断端点：客户端用 navigator.sendBeacon 把开屏各阶段状态 POST 过来，
 * 追加写入包目录下的 diag.jsonl。只收 JSON、限 64KB，出错一律吞掉不影响页面。
 */
function diagHandler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { allow: 'POST', 'content-type': 'text/plain; charset=utf-8' });
    res.end('method not allowed');
    return;
  }
  let size = 0;
  const chunks = [];
  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > 65536) {
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on('end', () => {
    try {
      const text = Buffer.concat(chunks).toString('utf8').trim();
      if (text) fs.appendFileSync(DIAG_FILE, text + '\n', 'utf8');
      sendJson(res, 200, { ok: true });
    } catch (e) {
      sendJson(res, 500, { ok: false, error: String(e && e.message) });
    }
  });
  req.on('error', () => {
    try {
      res.destroy();
    } catch (e) {}
  });
}

function apply(ctx) {
  // webServer 可能比本插件晚就绪：inject 等它，注册随上下文一起释放。
  if (typeof ctx.inject !== 'function') return;
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => {
      const disposers = [];
      const add = (rel, handler) => {
        try {
          disposers.push(webCtx.webServer.register({ kind: 'exact', path: ROUTE_BASE + rel, handler }));
        } catch (e) {
          const log = webCtx.logger;
          if (log && typeof log.warn === 'function') log.warn('[mbcc-wall] route ' + rel + ' failed: ' + e.message);
        }
      };
      add('opening.mp4', assetHandler('opening.mp4'));
      add('theme2.webp', assetHandler('theme2.webp'));
      // 诊断端点：确认宿主半部确实挂上了（浏览器控制台 / curl 可用）
      add('ping.json', (req, res) => sendJson(res, 200, { ok: true, build: 'mbcc-console/54-adaptive', files: blobs.size }));
      disposers.push(webCtx.webServer.register({ kind: 'exact', path: DIAG_PATH, handler: diagHandler }));
      return () => {
        for (const dispose of disposers) {
          try {
            dispose();
          } catch (e) {}
        }
      };
    });
  });
}

module.exports = {
  name: NAME,
  apply,
  Config: undefined,
};
