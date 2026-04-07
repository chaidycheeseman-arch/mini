;(function() {
    if (window.miniRuntimeLog) return;

    var STORAGE_KEY = 'mini_runtime_logs_v1';
    var MAX_LOGS = 200;
    var originalConsole = {};
    var logs = [];
    var persistTimer = null;
    var suppressCapture = false;

    ['log', 'info', 'warn', 'error'].forEach(function(level) {
        originalConsole[level] = typeof console[level] === 'function'
            ? console[level].bind(console)
            : function() {};
    });

    function pad(num) {
        return String(num).padStart(2, '0');
    }

    function formatTimestamp(ts) {
        var date = new Date(ts);
        return [
            date.getFullYear(),
            '-',
            pad(date.getMonth() + 1),
            '-',
            pad(date.getDate()),
            ' ',
            pad(date.getHours()),
            ':',
            pad(date.getMinutes()),
            ':',
            pad(date.getSeconds())
        ].join('');
    }

    function escapeHtml(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function stringifyArg(arg) {
        if (arg instanceof Error) {
            return arg.stack || (arg.name + ': ' + arg.message);
        }
        if (typeof arg === 'string') return arg;
        if (arg === undefined) return 'undefined';
        if (arg === null) return 'null';
        if (typeof arg === 'number' || typeof arg === 'boolean' || typeof arg === 'bigint') {
            return String(arg);
        }
        if (typeof arg === 'function') {
            return '[Function ' + (arg.name || 'anonymous') + ']';
        }
        if (arg && arg.nodeType === 1 && arg.tagName) {
            var nodeId = arg.id ? ('#' + arg.id) : '';
            var nodeClass = arg.className ? ('.' + String(arg.className).trim().replace(/\s+/g, '.')) : '';
            return '<' + String(arg.tagName).toLowerCase() + nodeId + nodeClass + '>';
        }
        try {
            return JSON.stringify(arg);
        } catch (error) {
            try {
                return Object.prototype.toString.call(arg);
            } catch (fallbackError) {
                return '[Unserializable]';
            }
        }
    }

    function clearPersistedLogStorage() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem('localforage/' + STORAGE_KEY);
            Object.keys(localStorage).forEach(function(key) {
                if (String(key).indexOf(STORAGE_KEY) !== -1) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {}
    }

    function schedulePersist() {
        if (suppressCapture) return;
        if (persistTimer) clearTimeout(persistTimer);
        persistTimer = setTimeout(function() {
            persistTimer = null;
            if (!window.localforage || typeof localforage.setItem !== 'function') return;
            localforage.setItem(STORAGE_KEY, logs.slice(-MAX_LOGS)).catch(function(error) {
                originalConsole.error('[runtime-log] persist failed', error);
            });
        }, 120);
    }

    function queueRender() {
        if (typeof window.requestAnimationFrame === 'function') {
            requestAnimationFrame(function() {
                if (window.miniRuntimeLog) window.miniRuntimeLog.render();
            });
            return;
        }
        if (window.miniRuntimeLog) window.miniRuntimeLog.render();
    }

    function addEntry(level, args, source) {
        if (suppressCapture) return;
        var text = Array.prototype.slice.call(args || []).map(stringifyArg).join(' ').trim();
        if (!text) return;
        logs.push({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            timestamp: Date.now(),
            level: level,
            source: source || '',
            message: text
        });
        if (logs.length > MAX_LOGS) {
            logs = logs.slice(-MAX_LOGS);
        }
        schedulePersist();
        queueRender();
    }

    function clearAllPersistedRuntimeLogs() {
        clearPersistedLogStorage();
        if (!window.localforage) return Promise.resolve();
        var removeOne = function(key) {
            if (typeof localforage.removeItem !== 'function') return Promise.resolve();
            return localforage.removeItem(key).catch(function() {});
        };
        if (typeof localforage.keys !== 'function') {
            return removeOne(STORAGE_KEY);
        }
        return localforage.keys().then(function(keys) {
            var removeTasks = [];
            (Array.isArray(keys) ? keys : []).forEach(function(key) {
                if (String(key).indexOf('mini_runtime_logs') !== -1) {
                    removeTasks.push(removeOne(key));
                }
            });
            if (!removeTasks.length) removeTasks.push(removeOne(STORAGE_KEY));
            return Promise.all(removeTasks);
        }).catch(function() {
            return removeOne(STORAGE_KEY);
        });
    }

    function getPlainText() {
        return logs.map(function(item) {
            var prefix = '[' + formatTimestamp(item.timestamp) + '] ' + item.level.toUpperCase();
            if (item.source) prefix += ' [' + item.source + ']';
            return prefix + ' ' + item.message;
        }).join('\n');
    }

    function fallbackCopy(text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            document.execCommand('copy');
            return true;
        } catch (error) {
            return false;
        } finally {
            textarea.remove();
        }
    }

    function getNotificationDebugInfoSafe() {
        if (typeof window._getNotificationDebugInfo !== 'function') return null;
        try {
            return window._getNotificationDebugInfo() || null;
        } catch (error) {
            return {
                debugError: error && error.message ? error.message : String(error)
            };
        }
    }

    function buildDebugStatusItems() {
        var info = getNotificationDebugInfoSafe();
        var permissionRaw = info && info.notificationPermission ? info.notificationPermission : 'unknown';
        var permissionText = permissionRaw === 'granted'
            ? '已授权'
            : permissionRaw === 'denied'
                ? '已拒绝'
                : permissionRaw === 'default'
                    ? '未决定'
                    : '不可用';
        var lastEntry = logs.length ? logs[logs.length - 1] : null;
        var hasError = logs.some(function(item) { return item.level === 'error'; });
        var items = [
            {
                label: '日志总数',
                value: String(logs.length),
                state: hasError ? 'is-bad' : 'is-good'
            },
            {
                label: '最近一条',
                value: lastEntry ? formatTimestamp(lastEntry.timestamp) : '暂无',
                state: lastEntry ? 'is-good' : 'is-warn'
            },
            {
                label: '通知权限',
                value: permissionText,
                state: permissionRaw === 'granted' ? 'is-good' : (permissionRaw === 'denied' ? 'is-bad' : 'is-warn')
            },
            {
                label: '安全上下文',
                value: info ? (info.secureContext ? '是' : '否') : '未知',
                state: info ? (info.secureContext ? 'is-good' : 'is-bad') : 'is-warn'
            },
            {
                label: 'Service Worker',
                value: info ? (info.serviceWorkerSupported ? '支持' : '不支持') : '未知',
                state: info ? (info.serviceWorkerSupported ? 'is-good' : 'is-warn') : 'is-warn'
            },
            {
                label: 'Push API',
                value: info ? (info.pushSupported ? '支持' : '不支持') : '未知',
                state: info ? (info.pushSupported ? 'is-good' : 'is-warn') : 'is-warn'
            }
        ];

        if (info && info.debugError) {
            items.push({
                label: '调试读取',
                value: info.debugError,
                state: 'is-bad'
            });
        }
        return items;
    }

    function renderDebugStatus() {
        var statusEl = document.getElementById('runtime-debug-status');
        if (!statusEl) return;
        statusEl.innerHTML = buildDebugStatusItems().map(function(item) {
            return '' +
                '<div class="runtime-debug-status-item ' + escapeHtml(item.state || '') + '">' +
                    '<span class="runtime-debug-status-label">' + escapeHtml(item.label) + '</span>' +
                    '<span class="runtime-debug-status-value">' + escapeHtml(item.value) + '</span>' +
                '</div>';
        }).join('');
    }

    function renderLogs() {
        var listEl = document.getElementById('runtime-log-list');
        var metaEl = document.getElementById('runtime-log-meta');

        if (metaEl) metaEl.textContent = '';
        renderDebugStatus();
        if (!listEl) return;

        if (!logs.length) {
            listEl.innerHTML = '<div class="runtime-log-empty">当前没有日志</div>';
            return;
        }

        listEl.innerHTML = logs.slice().reverse().map(function(item) {
            var sourceHtml = item.source
                ? '<span class="runtime-log-source">' + escapeHtml(item.source) + '</span>'
                : '';
            return '' +
                '<div class="runtime-log-item" data-level="' + escapeHtml(item.level) + '">' +
                    '<div class="runtime-log-head">' +
                        '<div class="runtime-log-head-left">' +
                            '<span class="runtime-log-badge">' + escapeHtml(item.level.toUpperCase()) + '</span>' +
                            sourceHtml +
                        '</div>' +
                        '<span class="runtime-log-time">' + escapeHtml(formatTimestamp(item.timestamp)) + '</span>' +
                    '</div>' +
                    '<div class="runtime-log-line">' + escapeHtml(item.message) + '</div>' +
                '</div>';
        }).join('');
    }

    var restorePromise = Promise.resolve().then(function() {
        if (!window.localforage || typeof localforage.getItem !== 'function') return;
        return localforage.getItem(STORAGE_KEY).then(function(saved) {
            if (Array.isArray(saved)) {
                logs = saved.slice(-MAX_LOGS);
            }
        }).catch(function(error) {
            originalConsole.error('[runtime-log] restore failed', error);
        });
    }).then(function() {
        renderLogs();
    });

    ['log', 'info', 'warn', 'error'].forEach(function(level) {
        console[level] = function() {
            addEntry(level, arguments, 'console');
            return originalConsole[level].apply(console, arguments);
        };
    });

    window.addEventListener('error', function(event) {
        var source = event.filename
            ? String(event.filename).split('/').pop() + ':' + event.lineno + ':' + event.colno
            : 'window.onerror';
        addEntry('error', [event.message || 'Script error'], source);
    });

    window.addEventListener('unhandledrejection', function(event) {
        var reason = event && event.reason;
        addEntry('error', ['Unhandled promise rejection:', stringifyArg(reason)], 'unhandledrejection');
    });

    window.refreshRuntimeLogViewer = function() {
        return restorePromise.then(function() {
            renderLogs();
        });
    };

    window.openRuntimeDebugPanel = function() {
        if (typeof window.openApp === 'function') {
            window.openApp('runtime-debug-app');
        } else {
            var app = document.getElementById('runtime-debug-app');
            if (app) app.style.display = 'flex';
        }
        return window.refreshRuntimeLogViewer();
    };

    window.closeRuntimeDebugPanel = function() {
        if (typeof window.openApp === 'function') {
            window.openApp('settings-app');
            return;
        }
        var debugApp = document.getElementById('runtime-debug-app');
        var settingsApp = document.getElementById('settings-app');
        if (debugApp) debugApp.style.display = 'none';
        if (settingsApp) settingsApp.style.display = 'flex';
    };

    window.clearRuntimeLogViewer = function() {
        suppressCapture = true;
        logs = [];
        if (persistTimer) {
            clearTimeout(persistTimer);
            persistTimer = null;
        }
        renderLogs();
        return clearAllPersistedRuntimeLogs().catch(function(error) {
            originalConsole.error('[runtime-log] clear failed', error);
        }).finally(function() {
            restorePromise = Promise.resolve();
            logs = [];
            renderLogs();
            suppressCapture = false;
        });
    };

    window.copyRuntimeLogViewer = function() {
        return restorePromise.then(function() {
            var text = getPlainText();
            var copied = false;
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                return navigator.clipboard.writeText(text).then(function() {
                    copied = true;
                }).catch(function() {
                    copied = fallbackCopy(text);
                }).then(function() {
                    if (!copied) {
                        throw new Error('copy failed');
                    }
                    addEntry('info', ['已复制后台日志到剪贴板'], 'runtime-log');
                });
            }
            copied = fallbackCopy(text);
            if (!copied) throw new Error('copy failed');
            addEntry('info', ['已复制后台日志到剪贴板'], 'runtime-log');
        }).catch(function(error) {
            originalConsole.error('[runtime-log] copy failed', error);
            addEntry('warn', ['复制日志失败，请稍后重试'], 'runtime-log');
        });
    };

    window.miniRuntimeLog = {
        render: function() {
            return restorePromise.then(function() {
                renderLogs();
            });
        },
        getLogs: function() {
            return logs.slice();
        },
        clear: window.clearRuntimeLogViewer,
        copy: window.copyRuntimeLogViewer
    };

    document.addEventListener('DOMContentLoaded', function() {
        renderLogs();
    });
})();
