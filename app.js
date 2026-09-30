(() => {
'use strict';
const $ = selector => document.querySelector(selector);
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const ambient = [...document.querySelectorAll('.ambient-video')];
const hero = $('#hero-video'), heroToggle = $('#hero-toggle');
const dialog = $('#film-dialog'), dialogVideo = $('#dialog-video');
const onScreen = new Set();
const playbackRates = { 'media/flight-side.mp4': 0.8, 'media/dlc-side.mp4': 0.5, 'media/trajectory-oblique.mp4': 0.75 };
let heroPaused = false, noticeTimer, hubaraURL, focusedBeforeDialog;
function notify(message) {
  clearTimeout(noticeTimer);
  $('#notice').textContent = message;
  $('#notice').hidden = false;
  noticeTimer = setTimeout(() => { $('#notice').hidden = true; }, 6000);
}
function attemptPlay(video) {
  const promise = video.play();
  if (promise) promise.catch(() => {});
}
function syncPlayback() {
  ambient.forEach(video => {
    const allowed = !motion.matches && !document.hidden && !dialog.open && onScreen.has(video) && !(video === hero && heroPaused);
    if (allowed) attemptPlay(video); else video.pause();
  });
}
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => entry.isIntersecting ? onScreen.add(entry.target) : onScreen.delete(entry.target));
  syncPlayback();
}, { threshold: 0.18 });
ambient.forEach(video => { video.muted = true; video.playbackRate = playbackRates[video.getAttribute('src')] || 1; observer.observe(video); });
document.addEventListener('visibilitychange', syncPlayback);
motion.addEventListener('change', syncPlayback);
function updateHeroControl() {
  heroToggle.textContent = hero.paused ? '▷' : 'Ⅱ';
  heroToggle.setAttribute('aria-label', hero.paused ? '播放背景视频' : '暂停背景视频');
}
hero.addEventListener('play', updateHeroControl);
hero.addEventListener('pause', updateHeroControl);
heroToggle.addEventListener('click', () => {
  heroPaused = !hero.paused;
  if (heroPaused) hero.pause(); else attemptPlay(hero);
  updateHeroControl();
});
document.querySelectorAll('[data-film]').forEach(button => button.addEventListener('click', () => {
  focusedBeforeDialog = button;
  $('#film-title').textContent = button.dataset.title;
  dialogVideo.src = button.dataset.film;
  dialogVideo.playbackRate = playbackRates[button.dataset.film] || 1;
  dialogVideo.muted = true;
  dialog.showModal();
  document.body.classList.add('dialog-open');
  syncPlayback();
  attemptPlay(dialogVideo);
}));
$('#close-film').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
dialog.addEventListener('close', () => {
  dialogVideo.pause();
  dialogVideo.removeAttribute('src');
  dialogVideo.load();
  document.body.classList.remove('dialog-open');
  focusedBeforeDialog?.focus({ preventScroll: true });
  syncPlayback();
});
dialogVideo.addEventListener('error', () => {
  if (dialogVideo.hasAttribute('src')) notify('视频未能读取。请确认 media 文件夹与网页保存在同一目录。');
});
const hubara = $('#hubara-video');
$('#hubara-file').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('video/') && !/\.(mp4|mov|webm|m4v)$/i.test(file.name)) {
    notify('请选择 MP4、MOV 或 WebM 视频文件。'); return;
  }
  hubara.pause();
  if (hubaraURL) URL.revokeObjectURL(hubaraURL);
  hubaraURL = URL.createObjectURL(file);
  hubara.src = hubaraURL;
  hubara.hidden = false;
  $('#hubara-placeholder').hidden = true;
  hubara.muted = true;
  attemptPlay(hubara);
  notify('实飞视频已载入，仅用于本次本机预览，未上传或永久保存。');
});
hubara.addEventListener('error', () => {
  hubara.hidden = true;
  $('#hubara-placeholder').hidden = false;
  notify('此视频无法播放，建议使用 H.264 编码的 MP4 文件。');
});
$('.upload-button').addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('#hubara-file').click(); }
});
$('#present').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else notify('当前浏览器不支持网页全屏，请使用浏览器的全屏功能。');
  } catch { notify('当前窗口未允许全屏。可在独立浏览器中打开本页后使用 F11。'); }
});
document.addEventListener('fullscreenchange', () => {
  $('#present span').textContent = document.fullscreenElement ? '退出全屏' : '全屏汇报';
  $('#present').setAttribute('aria-label', document.fullscreenElement ? '退出全屏汇报' : '进入全屏汇报');
});
window.addEventListener('pagehide', () => { ambient.forEach(video => video.pause()); dialogVideo.pause(); });
window.addEventListener('pageshow', syncPlayback);
updateHeroControl();
})();
