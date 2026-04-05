const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const webpush = require('web-push');

const ROOT_DIR = __dirname;
const PORT = parseInt(process.env.PORT || '8787', 10);
const HOST = process.env.HOST || '127.0.0.1';
const VAPID_FILE = path.join(ROOT_DIR, '.push-vapid.json');
const SUBS_FILE = path.join(ROOT_DIR, '.push-subscriptions.json');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
};

let vapidConfig = null;
let subscriptions = new Map();

function sendJson(res, status, payload) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
    res.writeHead(status, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store'
    });
    res.end(text);
}

async function readJsonFile(filePath, fallback) {
    try {
        const raw = await fsp.readFile(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

async function writeJsonFile(filePath, value) {
    await fsp.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

async function ensureVapidConfig() {
    const envPublic = process.env.VAPID_PUBLIC_KEY;
    const envPrivate = process.env.VAPID_PRIVATE_KEY;
    const envSubject = process.env.VAPID_SUBJECT;

    if (envPublic && envPrivate) {
        vapidConfig = {
            subject: envSubject || 'mailto:admin@mini-phone.local',
            publicKey: envPublic,
            privateKey: envPrivate
        };
        return;
    }

    const fileData = await readJsonFile(VAPID_FILE, null);
    if (fileData && fileData.publicKey && fileData.privateKey) {
        vapidConfig = {
            subject: fileData.subject || 'mailto:admin@mini-phone.local',
            publicKey: fileData.publicKey,
            privateKey: fileData.privateKey
        };
        return;
    }

    const generated = webpush.generateVAPIDKeys();
    vapidConfig = {
        subject: 'mailto:admin@mini-phone.local',
        publicKey: generated.publicKey,
        privateKey: generated.privateKey
    };
    await writeJsonFile(VAPID_FILE, vapidConfig);
}

function normalizeSubscription(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (!raw.endpoint || !raw.keys || !raw.keys.p256dh || !raw.keys.auth) return null;
    return {
        endpoint: String(raw.endpoint),
        expirationTime: raw.expirationTime || null,
        keys: {
            p256dh: String(raw.keys.p256dh),
            auth: String(raw.keys.auth)
        }
    };
}

async function loadSubscriptions() {
    const arr = await readJsonFile(SUBS_FILE, []);
    subscriptions = new Map();
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
        const sub = normalizeSubscription(item && item.subscription ? item.subscription : item);
        if (!sub) continue;
        subscriptions.set(sub.endpoint, {
            subscription: sub,
            updatedAt: item.updatedAt || new Date().toISOString(),
            client: item.client || {}
        });
    }
}

async function saveSubscriptions() {
    const arr = [];
    for (const entry of subscriptions.values()) {
        arr.push(entry);
    }
    await writeJsonFile(SUBS_FILE, arr);
}

function removeDeadSubscription(endpoint) {
    if (!endpoint) return false;
    const had = subscriptions.delete(endpoint);
    return had;
}

async function parseJsonBody(req) {
    let raw = '';
    await new Promise((resolve, reject) => {
        req.on('data', (chunk) => {
            raw += chunk;
            if (raw.length > 1_000_000) {
                reject(new Error('body_too_large'));
                req.destroy();
            }
        });
        req.on('end', resolve);
        req.on('error', reject);
    });

    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch (e) {
        throw new Error('invalid_json');
    }
}

async function handleApi(req, res, pathname) {
    if (pathname === '/api/push/vapid-public-key' && req.method === 'GET') {
        return sendJson(res, 200, { ok: true, publicKey: vapidConfig.publicKey });
    }

    if (pathname === '/api/push/subscribe' && req.method === 'POST') {
        let body;
        try {
            body = await parseJsonBody(req);
        } catch (e) {
            return sendJson(res, 400, { ok: false, reason: e.message || 'invalid_body' });
        }

        const sub = normalizeSubscription(body.subscription);
        if (!sub) {
            return sendJson(res, 400, { ok: false, reason: 'invalid_subscription' });
        }

        subscriptions.set(sub.endpoint, {
            subscription: sub,
            updatedAt: new Date().toISOString(),
            client: body.client || {}
        });
        await saveSubscriptions();
        return sendJson(res, 200, { ok: true, total: subscriptions.size });
    }

    if (pathname === '/api/push/unsubscribe' && req.method === 'POST') {
        let body;
        try {
            body = await parseJsonBody(req);
        } catch (e) {
            return sendJson(res, 400, { ok: false, reason: e.message || 'invalid_body' });
        }

        const endpoint = (body.endpoint) || (body.subscription && body.subscription.endpoint) || '';
        if (!endpoint) {
            return sendJson(res, 400, { ok: false, reason: 'missing_endpoint' });
        }

        const removed = removeDeadSubscription(endpoint);
        await saveSubscriptions();
        return sendJson(res, 200, { ok: true, removed, total: subscriptions.size });
    }

    if (pathname === '/api/push/send-test' && req.method === 'POST') {
        let body;
        try {
            body = await parseJsonBody(req);
        } catch (e) {
            return sendJson(res, 400, { ok: false, reason: e.message || 'invalid_body' });
        }

        const payload = {
            title: body.title || 'Mini Push 测试',
            body: body.body || '后台推送测试成功',
            icon: body.icon || 'icon-192.png',
            badge: body.badge || 'icon-192.png',
            requireInteraction: body.requireInteraction !== false,
            timestamp: Date.now(),
            contactId: body.contactId || '',
            url: body.url || 'http://localhost:' + PORT + '/index.html'
        };
        const payloadText = JSON.stringify(payload);

        const targetEndpoint = body.endpoint || '';
        const targets = [];
        for (const entry of subscriptions.values()) {
            if (targetEndpoint && entry.subscription.endpoint !== targetEndpoint) continue;
            targets.push(entry.subscription);
        }

        if (targets.length === 0) {
            return sendJson(res, 404, { ok: false, reason: 'no_subscription' });
        }

        let sent = 0;
        let failed = 0;
        let removed = 0;

        for (const sub of targets) {
            try {
                await webpush.sendNotification(sub, payloadText, { TTL: 60 });
                sent += 1;
            } catch (e) {
                failed += 1;
                const statusCode = e && e.statusCode;
                if (statusCode === 404 || statusCode === 410) {
                    if (removeDeadSubscription(sub.endpoint)) {
                        removed += 1;
                    }
                }
            }
        }

        if (removed > 0) {
            await saveSubscriptions();
        }

        return sendJson(res, 200, {
            ok: true,
            sent,
            failed,
            removed,
            total: subscriptions.size
        });
    }

    if (pathname === '/api/push/subscriptions' && req.method === 'GET') {
        return sendJson(res, 200, {
            ok: true,
            total: subscriptions.size,
            endpoints: Array.from(subscriptions.keys())
        });
    }

    return sendJson(res, 404, { ok: false, reason: 'not_found' });
}

async function serveStatic(req, res, pathname) {
    let targetPath = pathname;
    if (targetPath === '/' || targetPath === '') {
        targetPath = '/index.html';
    }

    const rootResolved = path.resolve(ROOT_DIR);
    const relativeTarget = targetPath.replace(/^[/\\]+/, '');
    const normalized = path.normalize(relativeTarget);
    const absPath = path.resolve(ROOT_DIR, normalized);
    if (absPath !== rootResolved && !absPath.startsWith(rootResolved + path.sep)) {
        return sendText(res, 403, 'Forbidden');
    }

    let stat;
    try {
        stat = await fsp.stat(absPath);
    } catch (e) {
        return sendText(res, 404, 'Not Found');
    }

    if (stat.isDirectory()) {
        const idx = path.join(absPath, 'index.html');
        try {
            await fsp.access(idx, fs.constants.F_OK);
            const content = await fsp.readFile(idx);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(content);
        } catch (e) {
            return sendText(res, 404, 'Not Found');
        }
    }

    const ext = path.extname(absPath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
    try {
        const content = await fsp.readFile(absPath);
        res.writeHead(200, { 'Content-Type': mimeType });
        return res.end(content);
    } catch (e) {
        return sendText(res, 500, 'Internal Server Error');
    }
}

async function main() {
    await ensureVapidConfig();
    await loadSubscriptions();

    webpush.setVapidDetails(vapidConfig.subject, vapidConfig.publicKey, vapidConfig.privateKey);

    const server = http.createServer(async (req, res) => {
        const parsed = new URL(req.url, 'http://' + req.headers.host);
        const pathname = decodeURIComponent(parsed.pathname || '/');

        try {
            if (pathname.startsWith('/api/push/')) {
                return await handleApi(req, res, pathname);
            }
            return await serveStatic(req, res, pathname);
        } catch (e) {
            return sendJson(res, 500, { ok: false, reason: 'server_error', error: e.message || String(e) });
        }
    });

    server.listen(PORT, HOST, () => {
        console.log('[push-server] running at http://' + HOST + ':' + PORT);
        console.log('[push-server] subscriptions:', subscriptions.size);
    });
}

main().catch((e) => {
    console.error('[push-server] fatal:', e);
    process.exit(1);
});
