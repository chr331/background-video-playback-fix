# Background Video Playback Fix / Prevent Video Pause on Tab Switch / 网页后台防暂停脚本

<p align="center">
  <a href="https://github.com/chr331/background-video-playback-fix/raw/main/background-video-playback-fix.user.js">
    <img alt="立即安装 / Install Now" src="https://img.shields.io/badge/%E7%AB%8B%E5%8D%B3%E5%AE%89%E8%A3%85%20%2F%20INSTALL%20NOW-00a152?style=for-the-badge&logo=tampermonkey&logoColor=white">
  </a>
  <a href="https://github.com/chr331/background-video-playback-fix/issues">
    <img alt="问题反馈 / Issues" src="https://img.shields.io/badge/%E9%97%AE%E9%A2%98%E5%8F%8D%E9%A6%88%20%2F%20ISSUES-1677ff?style=for-the-badge&logo=github&logoColor=white">
  </a>
</p>

<p align="center">
  <a href="#zh"><img alt="中文说明" src="https://img.shields.io/badge/%E4%B8%AD%E6%96%87%E8%AF%B4%E6%98%8E-1677ff?style=for-the-badge"></a>
  <a href="#en"><img alt="English Guide" src="https://img.shields.io/badge/English_Guide-1677ff?style=for-the-badge"></a>
  <a href="https://chr331.github.io/background-video-playback-fix/"><img alt="Guide Page" src="https://img.shields.io/badge/Guide_Page-6f42c1?style=for-the-badge"></a>
</p>

让网页视频/音频在切换标签页、窗口失焦、页面隐藏或冻结后**继续播放，防止自动暂停**。  
Force video and audio to keep playing in the background. Prevent websites from pausing media during tab switching, window blur, page hiding, or freezing.

## Install Now / 立即安装

[![立即安装 / Install Now](https://img.shields.io/badge/%E7%AB%8B%E5%8D%B3%E5%AE%89%E8%A3%85%20%2F%20INSTALL%20NOW-00a152?style=for-the-badge&logo=tampermonkey&logoColor=white)](https://github.com/chr331/background-video-playback-fix/raw/main/background-video-playback-fix.user.js)

安装后刷新目标网站即可生效。  
After installing, refresh the target website.


<a id="zh"></a>

## 中文说明

这是一个通用 Tampermonkey / Violentmonkey 油猴脚本，用来尽量阻止网页在切换标签页、窗口失焦、页面隐藏或页面进入冻结状态时强制暂停正在播放的视频和音频。

### 为什么会暂停

很多网站不是因为浏览器限制而暂停播放，而是在自己的播放器脚本里监听这些事件：

- `blur`
- `visibilitychange`
- `pagehide`
- `freeze`

当这些事件触发时，网站会主动调用 `video.pause()` 或 `audio.pause()`。这个脚本会在 `document-start` 尽早注入，观察这些后台事件但不阻断页面自己的事件监听器；在媒体正在播放或刚刚播放过时，它会把 `document.hidden`、`document.visibilityState` 和 `document.hasFocus()` 临时伪装成前台状态，同时只阻止由后台事件触发的 `pause()` 调用。

### 安装

1. 安装 Tampermonkey 或 Violentmonkey。
2. 点击上方醒目的 **立即安装 / Install Now** 按钮，或打开 [background-video-playback-fix.user.js](https://github.com/chr331/background-video-playback-fix/raw/main/background-video-playback-fix.user.js)。
3. 在脚本管理器里确认安装。
4. 刷新需要后台播放的网站。

### 适用范围

脚本默认匹配全部 `http://*/*` 和 `https://*/*` 页面，也会尽量覆盖 iframe 中的播放器。它适合处理通过页面失焦、标签页隐藏、页面隐藏等事件主动暂停媒体的网站。

### 直播弹幕兼容

从 `0.2.1` 起，脚本不再包裹或吞掉 `visibilitychange`、`blur` 等页面事件。斗鱼、B 站直播等网站的弹幕、直播聊天、播放器 UI 仍然可以收到这些事件；脚本只会在这些事件之后拦截媒体自己的 `pause()` 调用。

### 用户主动暂停兼容

从 `0.2.2` 起，脚本会识别近期真实的鼠标、触摸和播放器快捷键操作。即使网站在拖动进度条或操作播放器时触发了 `blur`，用户随后主动点击暂停仍会被放行；没有用户操作的后台自动暂停仍会被阻止。

### 限制

这个脚本不能绕过 DRM、付费权限、浏览器自动播放策略、网络限制或网站服务端限制。如果某个网站必须依赖真实的页面可见性状态完成业务逻辑，启用脚本后也可能影响该页面行为。

### 调试

在浏览器控制台输入：

```js
window.__backgroundMediaPlaybackKeepalive
```

可以查看脚本是否安装、观察到多少后台事件、阻止了多少次后台自动暂停，以及放行了多少次用户主动暂停。

<a id="en"></a>

## English Guide

Background Video Playback Fix is a general Tampermonkey / Violentmonkey userscript that keeps video and audio playing when websites try to pause media after tab switching, window blur, page visibility changes, pagehide, or page freeze events.

### Root Cause

Many sites do not pause because of a browser media policy. Their player code listens for background-related events such as:

- `blur`
- `visibilitychange`
- `pagehide`
- `freeze`

When those events fire, the site actively calls `video.pause()` or `audio.pause()`. This script runs at `document-start`, observes those background events without blocking the page's own listeners, temporarily reports the page as visible while media is active or recently active, and blocks only the `pause()` calls that are triggered near those background events.

### Install

1. Install Tampermonkey or Violentmonkey.
2. Click the prominent **Install Now** button above, or open [background-video-playback-fix.user.js](https://github.com/chr331/background-video-playback-fix/raw/main/background-video-playback-fix.user.js).
3. Confirm the installation in your userscript manager.
4. Refresh the site where you want background playback.

### Scope

The script matches all `http://*/*` and `https://*/*` pages and also tries to cover player iframes. It is intended for sites that pause media through blur, tab-hidden, page-hidden, or freeze handlers.

### Live Danmaku Compatibility

Since `0.2.1`, the script no longer wraps or swallows `visibilitychange`, `blur`, or related page events. Danmaku overlays, live chat, and player UI on live sites such as Douyu and Bilibili Live can still receive those events; the script only blocks media `pause()` calls that follow them.

### Intentional Pause Compatibility

Since `0.2.2`, the script recognizes recent trusted mouse, touch, and player-keyboard interactions. A user's pause request is allowed even if dragging the seek bar or operating player controls caused a `blur`; background pause calls without user interaction are still blocked.

### Limits

This script does not bypass DRM, paid access, browser autoplay rules, network limits, or server-side restrictions. On sites that require real page visibility state for normal behavior, the script may change page behavior while media is active.

### Debug

Run this in the browser console:

```js
window.__backgroundMediaPlaybackKeepalive
```

It exposes install status, observed background events, blocked pause calls, and user-requested pauses that were allowed.
