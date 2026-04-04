var CACHE_NAME = 'mini-phone-shell-v2';
var APP_SHELL = [
    './',
    './index.html',
    './manifest.json'
];

var DEFAULT_NOTIFICATION_ICON = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='192'%20height='192'%20viewBox='0%200%20192%20192'%3E%3Crect%20width='192'%20height='192'%20rx='42'%20fill='%23f7f7f7'/%3E%3Crect%20x='36'%20y='20'%20width='120'%20height='152'%20rx='28'%20fill='%23111827'/%3E%3Crect%20x='48'%20y='36'%20width='96'%20height='120'%20rx='20'%20fill='white'/%3E%3Ccircle%20cx='96'%20cy='136'%20r='8'%20fill='%23e5e7eb'/%3E%3Ctext%20x='96'%20y='94'%20text-anchor='middle'%20font-size='32'%20font-family='Segoe%20UI,%20Arial,%20sans-serif'%20fill='%23111827'%3EMP%3C/text%3E%3C/svg%3E";

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                return cache.addAll(APP_SHELL);
            })
            .catch(function() {
                return Promise.resolve();
            })
            .then(function() {
                return self.skipWaiting();
            })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        Promise.all([
            caches.keys().then(function(keys) {
                return Promise.all(
                    keys
                        .filter(function(key) { return key !== CACHE_NAME; })
                        .map(function(key) { return caches.delete(key); })
                );
            }),
            self.clients.claim()
        ])
    );
});

self.addEventListener('fetch', function(event) {
    var request = event.request;

    if (request.method !== 'GET') {
        return;
    }

    var url = new URL(request.url);

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(function(response) {
                    var responseClone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put('./index.html', responseClone);
                    });
                    return response;
                })
                .catch(function() {
                    return caches.match('./index.html').then(function(cachedPage) {
                        return cachedPage || Response.error();
                    });
                })
        );
        return;
    }

    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        caches.match(request).then(function(cachedResponse) {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request)
                .then(function(response) {
                    if (response && response.ok) {
                        var responseClone = response.clone();
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(function() {
                    if (request.destination === 'document') {
                        return caches.match('./index.html').then(function(cachedPage) {
                            return cachedPage || Response.error();
                        });
                    }
                    return Response.error();
                });
        })
    );
});

self.addEventListener('message', function(event) {
    var data = event.data || {};
    if (data.type !== 'SHOW_NOTIFICATION') return;

    var title = data.title || '新消息';
    var options = {
        body: data.body || '',
        icon: data.icon || DEFAULT_NOTIFICATION_ICON,
        badge: data.badge || DEFAULT_NOTIFICATION_ICON,
        tag: data.tag || ('mini-msg-' + Date.now()),
        renotify: false,
        data: {
            contactId: data.contactId || '',
            url: data.url || ''
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    var payload = event.notification.data || {};
    var targetUrl = payload.url || self.registration.scope;
    var contactId = payload.contactId || '';

    event.waitUntil((async function() {
        var clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        var matchUrl = targetUrl ? new URL(targetUrl, self.registration.scope).href : self.registration.scope;

        for (var i = 0; i < clientsList.length; i++) {
            var win = clientsList[i];
            if (win.url === matchUrl || win.url.indexOf(self.registration.scope) === 0) {
                try {
                    await win.focus();
                } catch (e) {}
                try {
                    win.postMessage({ type: 'OPEN_CHAT', contactId: contactId });
                } catch (e2) {}
                return;
            }
        }

        var opened = await self.clients.openWindow(targetUrl);
        if (opened && contactId) {
            try {
                opened.postMessage({ type: 'OPEN_CHAT', contactId: contactId });
            } catch (e3) {}
        }
    })());
});
