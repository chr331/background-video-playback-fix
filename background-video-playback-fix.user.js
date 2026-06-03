// ==UserScript==
// @name         Background Video Playback Fix / 网页后台防暂停脚本
// @name:zh-CN   网页后台防暂停脚本
// @name:en      Background Video Playback Fix
// @namespace    https://github.com/chr331/background-video-playback-fix
// @version      0.2.0
// @description  Prevent video/audio pause on tab switch, window blur, visibilitychange, pagehide, or freeze. 切换标签页时保持网页视频/音频后台播放。
// @description:zh-CN  视频后台播放油猴脚本：防止网页在切换标签页、窗口失焦、页面隐藏、visibilitychange、pagehide 或 freeze 时自动暂停。
// @description:en     Keep video and audio playing in the background. Prevent websites from pausing HTML5 video during tab switching, blur, visibilitychange, pagehide, or freeze.
// @author       Codex
// @homepageURL  https://github.com/chr331/background-video-playback-fix
// @supportURL   https://github.com/chr331/background-video-playback-fix/issues
// @downloadURL  https://raw.githubusercontent.com/chr331/background-video-playback-fix/main/background-video-playback-fix.user.js
// @updateURL    https://raw.githubusercontent.com/chr331/background-video-playback-fix/main/background-video-playback-fix.user.js
// @match        http://*/*
// @match        https://*/*
// @run-at       document-start
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  function install(win) {
    'use strict';

    if (!win || !win.document) return;
    var doc = win.document;
    var KEY = '__backgroundMediaPlaybackKeepalive';

    if (win[KEY] && win[KEY].installed) return;

    var eventTargetProto = win.EventTarget && win.EventTarget.prototype;
    var mediaProto = win.HTMLMediaElement && win.HTMLMediaElement.prototype;
    if (!eventTargetProto) return;

    var state = win[KEY] || {};
    state.installed = true;
    state.version = '0.2.0';
    state.disabled = false;
    state.lastPlayAt = 0;
    state.lastActiveMediaAt = 0;
    state.lastBackgroundEventAt = 0;
    state.lastBackgroundEvent = '';
    state.wrappedListeners = state.wrappedListeners || 0;
    state.blockedEvents = state.blockedEvents || 0;
    state.blockedPauses = state.blockedPauses || 0;
    state.debug = state.debug || [];
    win[KEY] = state;

    var knownMedia = new Set();
    var BACKGROUND_EVENT_PAUSE_WINDOW_MS = 3000;
    var RECENT_PLAY_WINDOW_MS = 8000;
    var DEBUG_LIMIT = 80;
    var nativeDocProps = {};

    var backgroundEvents = {
      blur: true,
      visibilitychange: true,
      webkitvisibilitychange: true,
      mozvisibilitychange: true,
      msvisibilitychange: true,
      pagehide: true,
      freeze: true
    };

    function now() {
      return Date.now();
    }

    function debug(type, data) {
      try {
        state.debug.push(Object.assign({ type: type, at: now(), url: String(location.href) }, data || {}));
        if (state.debug.length > DEBUG_LIMIT) state.debug.shift();
      } catch (_) {}
    }

    function findDescriptor(target, prop) {
      try {
        var current = target;
        while (current) {
          var descriptor = Object.getOwnPropertyDescriptor(current, prop);
          if (descriptor) return descriptor;
          current = Object.getPrototypeOf(current);
        }
      } catch (_) {}
      return null;
    }

    function captureNativeDocProp(prop, fallback) {
      var descriptor = findDescriptor(doc, prop);
      nativeDocProps[prop] = function () {
        try {
          if (descriptor) {
            if (descriptor.get) return descriptor.get.call(doc);
            if ('value' in descriptor) return descriptor.value;
          }
        } catch (_) {}
        return fallback;
      };
    }

    captureNativeDocProp('hidden', false);
    captureNativeDocProp('webkitHidden', false);
    captureNativeDocProp('mozHidden', false);
    captureNativeDocProp('msHidden', false);
    captureNativeDocProp('visibilityState', 'visible');
    captureNativeDocProp('webkitVisibilityState', 'visible');
    captureNativeDocProp('mozVisibilityState', 'visible');
    captureNativeDocProp('msVisibilityState', 'visible');

    var nativeHasFocus = typeof doc.hasFocus === 'function' ? doc.hasFocus.bind(doc) : function () {
      return true;
    };

    function defineGetter(target, prop, value) {
      if (!target) return;
      try {
        Object.defineProperty(target, prop, {
          configurable: true,
          get: function () {
            return typeof value === 'function' ? value() : value;
          }
        });
      } catch (_) {}
    }

    function defineValue(target, prop, value) {
      if (!target) return;
      try {
        Object.defineProperty(target, prop, {
          configurable: true,
          writable: true,
          value: value
        });
      } catch (_) {
        try {
          target[prop] = value;
        } catch (_) {}
      }
    }

    function nativeValue(prop, fallback) {
      try {
        return nativeDocProps[prop] ? nativeDocProps[prop]() : fallback;
      } catch (_) {
        return fallback;
      }
    }

    function shouldSpoofVisible() {
      if (state.disabled) return false;
      return !!findActiveMedia() ||
        now() - state.lastPlayAt < RECENT_PLAY_WINDOW_MS ||
        now() - state.lastBackgroundEventAt < BACKGROUND_EVENT_PAUSE_WINDOW_MS;
    }

    function forceVisible(target) {
      defineGetter(target, 'hidden', function () {
        return shouldSpoofVisible() ? false : nativeValue('hidden', false);
      });
      defineGetter(target, 'webkitHidden', function () {
        return shouldSpoofVisible() ? false : nativeValue('webkitHidden', false);
      });
      defineGetter(target, 'mozHidden', function () {
        return shouldSpoofVisible() ? false : nativeValue('mozHidden', false);
      });
      defineGetter(target, 'msHidden', function () {
        return shouldSpoofVisible() ? false : nativeValue('msHidden', false);
      });
      defineGetter(target, 'visibilityState', function () {
        return shouldSpoofVisible() ? 'visible' : nativeValue('visibilityState', 'visible');
      });
      defineGetter(target, 'webkitVisibilityState', function () {
        return shouldSpoofVisible() ? 'visible' : nativeValue('webkitVisibilityState', 'visible');
      });
      defineGetter(target, 'mozVisibilityState', function () {
        return shouldSpoofVisible() ? 'visible' : nativeValue('mozVisibilityState', 'visible');
      });
      defineGetter(target, 'msVisibilityState', function () {
        return shouldSpoofVisible() ? 'visible' : nativeValue('msVisibilityState', 'visible');
      });
      defineValue(target, 'hasFocus', function () {
        return shouldSpoofVisible() ? true : nativeHasFocus();
      });
    }

    forceVisible(doc);
    forceVisible(win.Document && win.Document.prototype);
    forceVisible(win.HTMLDocument && win.HTMLDocument.prototype);

    function mediaIsActive(media) {
      try {
        return !!media && !media.paused && !media.ended && media.readyState >= 1;
      } catch (_) {
        return false;
      }
    }

    function findActiveMedia() {
      try {
        for (var item of knownMedia) {
          if (mediaIsActive(item)) return item;
        }
      } catch (_) {}

      try {
        var media = doc.querySelectorAll('video,audio');
        for (var i = 0; i < media.length; i += 1) {
          knownMedia.add(media[i]);
          if (mediaIsActive(media[i])) return media[i];
        }
      } catch (_) {}

      return null;
    }

    function shouldProtectFromBackgroundEvent() {
      if (state.disabled) return false;
      if (findActiveMedia()) {
        state.lastActiveMediaAt = now();
        return true;
      }
      return now() - state.lastPlayAt < RECENT_PLAY_WINDOW_MS;
    }

    function rememberBackgroundEvent(eventName) {
      state.lastBackgroundEventAt = now();
      state.lastBackgroundEvent = eventName;
    }

    function shouldBlockPauseCall(media) {
      if (state.disabled) return false;
      if (!mediaIsActive(media)) return false;
      return now() - state.lastBackgroundEventAt < BACKGROUND_EVENT_PAUSE_WINDOW_MS;
    }

    if (mediaProto && mediaProto.play && !mediaProto.play[KEY]) {
      var rawPlay = mediaProto.play;
      var patchedPlay = function () {
        knownMedia.add(this);
        state.lastPlayAt = now();
        var result = rawPlay.apply(this, arguments);
        try {
          if (result && typeof result.then === 'function') {
            result.then(function () {
              state.lastPlayAt = now();
            }, function () {});
          }
        } catch (_) {}
        return result;
      };
      defineValue(patchedPlay, KEY, true);
      defineValue(mediaProto, 'play', patchedPlay);
    }

    if (mediaProto && mediaProto.pause && !mediaProto.pause[KEY]) {
      var rawPause = mediaProto.pause;
      var patchedPause = function () {
        knownMedia.add(this);
        if (shouldBlockPauseCall(this)) {
          state.blockedPauses += 1;
          debug('blocked-pause', { event: state.lastBackgroundEvent });
          return undefined;
        }
        return rawPause.apply(this, arguments);
      };
      defineValue(patchedPause, KEY, true);
      defineValue(mediaProto, 'pause', patchedPause);
    }

    var rawAddEventListener = eventTargetProto.addEventListener;
    var rawRemoveEventListener = eventTargetProto.removeEventListener;

    function captureShield(event) {
      var eventName = String(event && event.type || '').toLowerCase();
      if (!backgroundEvents[eventName]) return;
      if (!shouldProtectFromBackgroundEvent()) return;

      rememberBackgroundEvent(eventName);
      state.blockedEvents += 1;
      debug('blocked-event', {
        event: eventName,
        target: event.currentTarget === win ? 'window' : 'document'
      });

      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      else if (event.stopPropagation) event.stopPropagation();
    }

    try {
      rawAddEventListener.call(win, 'blur', captureShield, true);
      rawAddEventListener.call(win, 'pagehide', captureShield, true);
      rawAddEventListener.call(win, 'freeze', captureShield, true);
      rawAddEventListener.call(doc, 'visibilitychange', captureShield, true);
      rawAddEventListener.call(doc, 'webkitvisibilitychange', captureShield, true);
      rawAddEventListener.call(doc, 'mozvisibilitychange', captureShield, true);
      rawAddEventListener.call(doc, 'msvisibilitychange', captureShield, true);
    } catch (_) {}

    if (!eventTargetProto[KEY]) {
      var listenerIds = new WeakMap();
      var targetIds = new WeakMap();
      var nextListenerId = 1;
      var nextTargetId = 1;
      var wrappedListeners = new Map();

      function getObjectId(map, object, prefix, nextIdRef) {
        if (!map.has(object)) {
          map.set(object, prefix + nextIdRef.value);
          nextIdRef.value += 1;
        }
        return map.get(object);
      }

      function listenerKey(target, type, listener) {
        if (!listener || (typeof listener !== 'function' && typeof listener !== 'object')) return '';
        var listenerId = getObjectId(listenerIds, listener, 'l', { get value() { return nextListenerId; }, set value(v) { nextListenerId = v; } });
        var targetId = getObjectId(targetIds, target, 't', { get value() { return nextTargetId; }, set value(v) { nextTargetId = v; } });
        return String(type).toLowerCase() + '|' + targetId + '|' + listenerId;
      }

      function callListener(listener, self, event) {
        if (typeof listener === 'function') return listener.call(self, event);
        if (listener && typeof listener.handleEvent === 'function') return listener.handleEvent(event);
        return undefined;
      }

      function wrapListener(target, type, listener) {
        var eventName = String(type || '').toLowerCase();
        if (!backgroundEvents[eventName]) return listener;
        if (!listener || (typeof listener !== 'function' && typeof listener !== 'object')) return listener;

        var key = listenerKey(target, eventName, listener);
        if (wrappedListeners.has(key)) return wrappedListeners.get(key);

        var wrapped = function (event) {
          if (shouldProtectFromBackgroundEvent()) {
            rememberBackgroundEvent(eventName);
            state.blockedEvents += 1;
            debug('blocked-listener', {
              event: eventName,
              target: target === win ? 'window' : target === doc ? 'document' : 'other'
            });
            if (event && event.stopImmediatePropagation) event.stopImmediatePropagation();
            else if (event && event.stopPropagation) event.stopPropagation();
            return undefined;
          }
          return callListener(listener, this, event);
        };

        wrappedListeners.set(key, wrapped);
        state.wrappedListeners += 1;
        return wrapped;
      }

      defineValue(eventTargetProto, 'addEventListener', function (type, listener, options) {
        return rawAddEventListener.call(this, type, wrapListener(this, type, listener), options);
      });

      defineValue(eventTargetProto, 'removeEventListener', function (type, listener, options) {
        var key = listenerKey(this, type, listener);
        var wrapped = key && wrappedListeners.get(key);
        return rawRemoveEventListener.call(this, type, wrapped || listener, options);
      });

      defineValue(eventTargetProto, KEY, true);
    }

    function protectHandlerProperty(target, prop, eventName) {
      if (!target) return;
      var stored = null;
      try {
        Object.defineProperty(target, prop, {
          configurable: true,
          get: function () {
            return stored;
          },
          set: function (handler) {
            if (typeof handler !== 'function') {
              stored = handler;
              return;
            }
            stored = function (event) {
              if (shouldProtectFromBackgroundEvent()) {
                rememberBackgroundEvent(eventName);
                state.blockedEvents += 1;
                debug('blocked-handler', { event: eventName, prop: prop });
                if (event && event.stopImmediatePropagation) event.stopImmediatePropagation();
                else if (event && event.stopPropagation) event.stopPropagation();
                return undefined;
              }
              return handler.call(this, event);
            };
          }
        });
      } catch (_) {}
    }

    protectHandlerProperty(win, 'onblur', 'blur');
    protectHandlerProperty(win, 'onpagehide', 'pagehide');
    protectHandlerProperty(doc, 'onvisibilitychange', 'visibilitychange');
    protectHandlerProperty(doc, 'onwebkitvisibilitychange', 'webkitvisibilitychange');

    debug('installed', {});
  }

  try {
    install(typeof unsafeWindow === 'undefined' ? window : unsafeWindow);
  } catch (_) {
    try {
      install(window);
    } catch (_) {}
  }
})();
