const toast = document.getElementById('toast');
const startButton = document.getElementById('startButton');
const soundButton = document.getElementById('soundButton');
const installButton = document.getElementById('installButton');
let deferredPrompt = null;
let muted = false;
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

startButton.addEventListener('click', () => {
  showToast('Главный экран готов. Продолжение пока закрыто.');
});

soundButton.addEventListener('click', () => {
  muted = !muted;
  soundButton.style.opacity = muted ? '.45' : '1';
  showToast(muted ? 'Звук выключен' : 'Звук включен');
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener('click', async () => {
  if (!deferredPrompt) {
    showToast('На iPhone: Поделиться → На экран «Домой»');
    return;
  }
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installButton.hidden = true;
});

window.addEventListener('appinstalled', () => {
  installButton.hidden = true;
  showToast('Игра установлена');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      showToast('Офлайн-режим пока недоступен');
    });
  });
}

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
if (isIOS && !isStandalone) {
  installButton.hidden = false;
}
