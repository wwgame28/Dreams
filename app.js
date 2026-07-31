const toast = document.getElementById('toast');
const startButton = document.getElementById('startButton');
const soundButton = document.getElementById('soundButton');
const installButton = document.getElementById('installButton');
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let deferredPrompt = null;
let muted = false;
let toastTimer;
let particles = [];
let animationFrame;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(canvas.clientWidth * ratio);
  canvas.height = Math.floor(canvas.clientHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function createParticle(initial = false) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const warm = Math.random() > 0.42;
  return {
    x: Math.random() * width,
    y: initial ? Math.random() * height : height + 20,
    radius: Math.random() * 2.2 + 0.7,
    speedY: Math.random() * 0.42 + 0.14,
    drift: (Math.random() - 0.5) * 0.28,
    phase: Math.random() * Math.PI * 2,
    pulse: Math.random() * 0.018 + 0.006,
    alpha: Math.random() * 0.58 + 0.25,
    color: warm ? '231,201,142' : '173,145,236'
  };
}

function seedParticles() {
  const count = Math.min(72, Math.max(38, Math.floor(canvas.clientWidth / 7)));
  particles = Array.from({ length: count }, () => createParticle(true));
}

function drawParticles(time = 0) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);

  particles.forEach((particle, index) => {
    particle.phase += particle.pulse;
    particle.y -= particle.speedY;
    particle.x += particle.drift + Math.sin(particle.phase) * 0.12;

    if (particle.y < -18 || particle.x < -25 || particle.x > width + 25) {
      particles[index] = createParticle(false);
      return;
    }

    const shimmer = 0.55 + Math.sin(particle.phase + time * 0.0007) * 0.45;
    const alpha = Math.max(0.08, particle.alpha * shimmer);
    const glow = particle.radius * 4.5;

    ctx.beginPath();
    ctx.fillStyle = `rgba(${particle.color},${alpha * 0.18})`;
    ctx.arc(particle.x, particle.y, glow, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = `rgba(${particle.color},${alpha})`;
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  animationFrame = requestAnimationFrame(drawParticles);
}

function startParticles() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  cancelAnimationFrame(animationFrame);
  resizeCanvas();
  seedParticles();
  drawParticles();
}

window.addEventListener('resize', startParticles, { passive: true });
startParticles();

startButton.addEventListener('click', () => {
  showToast('Город пока спит. Первая глава появится следующим обновлением.');
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
if (isIOS && !isStandalone) installButton.hidden = false;