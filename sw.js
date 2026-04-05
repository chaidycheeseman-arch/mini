self.addEventListener('install', function() {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
});

var DEFAULT_ICON = 'icon-192.png';
var DEFAULT_BADGE = 'icon-192.png';

function buildNotificationOptions(data) {
    var payload = data || {};
    return {
        body: payload.body || '',
        icon: payload.icon || DEFAULT_ICON,
        badge: payload.badge || DEFAULT_BADGE,
        tag: payload.tag || ('mini-msg-' + Date.now()),
        renotify: !!payload.renotify,
        requireInteraction: payload.requireInteraction !== false,
        timestamp: payload.timestamp || Date.now(),
        data: {
            contactId: payload.contactId || '',
            url: payload.url || '',
            source: payload.source || 'sw'
        }
    };
}

self.addEventListener('message', function(event) {
    var data = event.data || {};
    if (data.type !== 'SHOW_NOTIFICATION') return;
    var title = data.title || '新消息';
    event.waitUntil(self.registration.showNotification(title, buildNotificationOptions(data)));
});

self.addEventListener('push', function(event) {
    var payload = {};
    try {
        payload = event.data ? event.data.json() : {};
    } catch (e) {
        payload = { body: event.data ? event.data.text() : '' };
    }
    var title = payload.title || '新消息';
    event.waitUntil(self.registration.showNotification(title, buildNotificationOptions(payload)));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    var payload = event.notification.data || {};
    var targetUrl = payload.url || '';
    var contactId = payload.contactId || '';

    event.waitUntil((async function() {
        var clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        if (clientsList && clientsList.length > 0) {
            var win = clientsList[0];
            try {
                await win.focus();
            } catch (e) {}
            try {
                win.postMessage({ type: 'OPEN_CHAT', contactId: contactId });
            } catch (e2) {}
            return;
        }
        if (targetUrl) {
            await self.clients.openWindow(targetUrl);
        }
    })());
});
