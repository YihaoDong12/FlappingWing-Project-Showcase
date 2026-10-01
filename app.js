(() => {
'use strict';
const $ = selector => document.querySelector(selector);
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const ambient = [...document.querySelectorAll('.ambient-video')];
const trajectoryViews = [...document.querySelectorAll('.trajectory-grid video')];
const hero = $('#hero-video'), heroToggle = $('#hero-toggle');
const dialog = $('#film-dialog'), dialogVideo = $('#dialog-video');
const onScreen = new Set();
const playbackRates = {
  'media/flight-side.mp4': 0.8,
  'media/dlc-side.mp4': 0.5,
  'media/dlc-rear.mp4': 0.5,
  'media/trajectory-front.mp4': 0.75,
  'media/trajectory-side.mp4': 0.75,
  'media/trajectory-top.mp4': 0.75,
  'media/trajectory-oblique.mp4': 0.75
};
let heroPaused = false, noticeTimer, focusedBeforeDialog;
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
// Keep the visible projections on the same motion phase without playing off-screen media.
trajectoryViews.forEach(video => video.addEventListener('timeupdate', () => {
  if (motion.matches || document.hidden || dialog.open) return;
  const visible = trajectoryViews.filter(view => onScreen.has(view) && view.readyState >= 2);
  if (visible[0] !== video || video.paused) return;
  visible.slice(1).forEach(view => {
    if (!view.seeking && Math.abs(view.currentTime - video.currentTime) > 0.15) view.currentTime = video.currentTime;
  });
}));
document.addEventListener('visibilitychange', syncPlayback);
motion.addEventListener('change', syncPlayback);
function updateHeroControl() {
  heroToggle.textContent = hero.paused ? '▷' : 'Ⅱ';
  heroToggle.setAttribute('aria-label', hero.paused ? 'Play background video' : 'Pause background video');
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
  if (dialogVideo.hasAttribute('src')) notify('Video unavailable. Keep the media folder alongside the website files.');
});
$('#present').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else notify('Page fullscreen is unavailable. Use your browser’s fullscreen option.');
  } catch { notify('Fullscreen is not allowed in this window. Open the page in a browser and use F11.'); }
});
document.addEventListener('fullscreenchange', () => {
  $('#present span').textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Present';
  $('#present').setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen presentation' : 'Enter fullscreen presentation');
});
window.addEventListener('pagehide', () => {
  ambient.forEach(video => video.pause());
  dialogVideo.pause();
});
window.addEventListener('pageshow', syncPlayback);
updateHeroControl();
})();
