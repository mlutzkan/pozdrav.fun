// ─── TRACK MANIFEST ────────────────────────────────────────
let tracks = [];

async function loadTracks() {
  try {
    const res = await fetch('tracks.json');
    if (!res.ok) throw new Error('fetch failed');
    tracks = await res.json();
  } catch {
    tracks = [
      { id: 'bdz',                  slot: 'hero',    file: 'audio/BDZ.mp3' },
      { id: 'emo',                 slot: 'example', index: 0, file: 'audio/Emo.mp3',  comingSoon: false },
      { id: 'zabavna-priyatel',    slot: 'example', index: 1, file: null,             comingSoon: true  },
      { id: 'za-mama',             slot: 'example', index: 2, file: 'audio/Mamo.mp3', comingSoon: false },
      { id: 'pyrvi-tants',         slot: 'example', index: 3, file: null,             comingSoon: true  }
    ];
  }
  initHeroAudio();
  initExampleCards();
}

// ─── NAV SCROLL ────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('main-nav').classList.toggle('scrolled', window.scrollY > 40);
});

// ─── MOBILE MENU ───────────────────────────────────────────
function openMobileMenu() {
  document.getElementById('mobile-menu').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeMobileMenu() {
  document.getElementById('mobile-menu').classList.remove('open');
  document.body.style.overflow = '';
}
function navTo(id) {
  closeMobileMenu();
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, 50);
}

// ─── WIRE UP EVENTS ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.nav-logo').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.querySelector('.nav-mobile-btn').addEventListener('click', openMobileMenu);
  document.querySelector('.mobile-menu-close').addEventListener('click', closeMobileMenu);

  document.querySelectorAll('[data-nav-to]').forEach(btn => {
    btn.addEventListener('click', () => navTo(btn.dataset.navTo));
  });

  document.getElementById('hero-play-btn').addEventListener('click', function () {
    toggleHeroPlay(this);
  });

  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => toggleFaq(btn));
  });

  initReveal();
  initHeroWaveform();
  initCardWaveforms();
  loadTracks();
});

// ─── SCROLL REVEAL ─────────────────────────────────────────
function initReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

// ─── HERO WAVEFORM ─────────────────────────────────────────
function initHeroWaveform() {
  const heroWF = document.getElementById('hero-waveform');
  if (!heroWF) return;
  [30,50,70,90,80,60,95,75,55,45,65,85,70,50,40,60,80,70,55,45].forEach((h, i) => {
    const bar = document.createElement('div');
    bar.className = 'wave-bar';
    bar.style.height = h + '%';
    bar.style.animationDelay = (i * 0.07) + 's';
    heroWF.appendChild(bar);
  });
}

// ─── AUDIO CARD WAVEFORMS ──────────────────────────────────
const wfHeights = [
  [20,45,70,55,80,65,40,85,60,35,75,50,90,70,45,60,80,55,40,65,75,50,30,85,60],
  [60,30,75,50,90,40,65,80,35,70,55,85,45,60,25,80,65,40,75,50,85,35,60,70,45],
  [40,65,50,80,35,70,55,90,45,60,75,30,85,50,65,40,75,60,45,80,55,35,70,85,50],
  [70,45,85,60,35,75,50,90,65,40,80,55,30,70,45,85,60,35,75,50,65,80,45,60,40]
];
function initCardWaveforms() {
  for (let i = 0; i < 4; i++) {
    const aw = document.getElementById('aw-' + i);
    if (!aw) continue;
    wfHeights[i].forEach((h, j) => {
      const bar = document.createElement('div');
      bar.className = 'aw-bar';
      bar.style.height = h + '%';
      bar.style.flex = '1';
      bar.style.animationDelay = (j * 0.06) + 's';
      aw.appendChild(bar);
    });
  }
}

// ─── EXAMPLE AUDIO CARDS ───────────────────────────────────
let activeCard = null;
let activeIdx  = null;
let progressInterval = null;
const audioObjects = {};

function initExampleCards() {
  document.querySelectorAll('.audio-card').forEach((card, idx) => {
    const track = tracks.find(t => t.slot === 'example' && t.index === idx);
    if (!track || track.comingSoon) {
      applyComingSoon(card);
      return;
    }

    if (track.file) {
      const audio = new Audio(track.file);
      audioObjects[idx] = audio;
      audio.addEventListener('ended', () => stopCard(card, idx));
      audio.addEventListener('error', () => stopCard(card, idx));

      // Update duration display once metadata loads
      const durEl = card.querySelector('.audio-duration');
      audio.addEventListener('loadedmetadata', () => {
        if (durEl && audio.duration) durEl.textContent = formatTime(audio.duration);
      });

      // Click progress track to seek
      const progressTrack = card.querySelector('.audio-progress');
      if (progressTrack) {
        progressTrack.addEventListener('click', (e) => {
          if (!audio.duration) return;
          const rect = progressTrack.getBoundingClientRect();
          const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          audio.currentTime = pct * audio.duration;
          const pb = document.getElementById('pb-' + idx);
          if (pb) pb.style.width = (pct * 100) + '%';
        });
      }
    }

    const btn = card.querySelector('.audio-play');
    if (btn) btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAudio(card, idx);
    });
  });
}

function applyComingSoon(card) {
  card.classList.add('coming-soon');
  const btn = card.querySelector('.audio-play');
  if (btn) {
    btn.disabled = true;
    btn.setAttribute('aria-label', 'Скоро налично');
  }
  const badge = document.createElement('span');
  badge.className = 'coming-soon-badge';
  badge.textContent = 'Скоро';
  const genre = card.querySelector('.audio-card-genre');
  if (genre) genre.after(badge);
}

function setCardPlayState(card, idx, playing) {
  const btn  = card.querySelector('.audio-play');
  const path = btn?.querySelector('path');
  if (path) {
    path.setAttribute('d', playing
      ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z'
      : 'M8 5v14l11-7z'
    );
  }
  card.classList.toggle('active', playing);
  card.querySelectorAll('.aw-bar').forEach(b => b.classList.toggle('playing', playing));
}

function stopCard(card, idx) {
  const audio = audioObjects[idx];
  if (audio) { audio.pause(); audio.currentTime = 0; }
  setCardPlayState(card, idx, false);
  clearInterval(progressInterval);
  progressInterval = null;
  const pb = document.getElementById('pb-' + idx);
  if (pb) pb.style.width = '0%';
  if (activeCard === card) { activeCard = null; activeIdx = null; }
}

function toggleAudio(card, idx) {
  const audio = audioObjects[idx];

  // Pause current card
  if (activeCard === card) {
    if (audio) audio.pause();
    setCardPlayState(card, idx, false);
    clearInterval(progressInterval);
    progressInterval = null;
    activeCard = null;
    activeIdx  = null;
    return;
  }

  // Stop any other playing card first
  if (activeCard) stopCard(activeCard, activeIdx);

  // Stop hero audio if it is actually playing
  if (heroAudio && !heroAudio.paused) {
    heroAudio.pause();
    heroPlaying = false;
    setHeroPlayState(false);
    clearInterval(heroProgressInterval);
    heroProgressInterval = null;
  }

  // Play this card
  if (audio) {
    audio.play().catch(() => setCardPlayState(card, idx, false));
  }
  setCardPlayState(card, idx, true);
  activeCard = card;
  activeIdx  = idx;

  // Real-time progress from audio element
  const pb = document.getElementById('pb-' + idx);
  clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    if (!audio || !audio.duration) return;
    if (pb) pb.style.width = (audio.currentTime / audio.duration * 100) + '%';
  }, 250);
}

// ─── HERO AUDIO ────────────────────────────────────────────
let heroAudio = null;
let heroPlaying = false;
let heroProgressInterval = null;

function initHeroAudio() {
  const heroTrack = tracks.find(t => t.slot === 'hero');
  if (!heroTrack || !heroTrack.file) return;

  heroAudio = new Audio(heroTrack.file);
  heroAudio.preload = 'metadata';

  heroAudio.addEventListener('ended', () => {
    heroPlaying = false;
    setHeroPlayState(false);
    clearInterval(heroProgressInterval);
    heroProgressInterval = null;
    const pb = document.getElementById('hero-pb');
    if (pb) pb.style.width = '0%';
  });

  heroAudio.addEventListener('loadedmetadata', () => {
    const durEl = document.getElementById('hero-duration');
    if (durEl && heroAudio.duration) durEl.textContent = formatTime(heroAudio.duration);
  });

  heroAudio.addEventListener('error', () => {
    heroPlaying = false;
    clearInterval(heroProgressInterval);
    heroProgressInterval = null;
    const btn = document.getElementById('hero-play-btn');
    if (btn) btn.classList.add('error');
  });

  const heroProgress = document.getElementById('hero-progress');
  if (heroProgress) {
    heroProgress.addEventListener('click', (e) => {
      if (!heroAudio || !heroAudio.duration) return;
      const rect = heroProgress.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      heroAudio.currentTime = pct * heroAudio.duration;
      const pb = document.getElementById('hero-pb');
      if (pb) pb.style.width = (pct * 100) + '%';
    });
  }
}

function toggleHeroPlay(btn) {
  if (!heroAudio) return;
  heroPlaying = !heroPlaying;
  if (heroPlaying) {
    // Stop any example card that is actually playing
    if (activeCard) {
      const activeAudio = audioObjects[activeIdx];
      if (activeAudio && !activeAudio.paused) stopCard(activeCard, activeIdx);
    }
    heroAudio.play().catch(() => {
      heroPlaying = false;
      setHeroPlayState(false);
    });
    const pb = document.getElementById('hero-pb');
    clearInterval(heroProgressInterval);
    heroProgressInterval = setInterval(() => {
      if (!heroAudio || !heroAudio.duration) return;
      if (pb) pb.style.width = (heroAudio.currentTime / heroAudio.duration * 100) + '%';
    }, 250);
  } else {
    heroAudio.pause();
    clearInterval(heroProgressInterval);
    heroProgressInterval = null;
  }
  setHeroPlayState(heroPlaying);
}

function setHeroPlayState(playing) {
  const btn = document.getElementById('hero-play-btn');
  if (!btn) return;
  const path = btn.querySelector('path');
  if (path) {
    path.setAttribute('d', playing
      ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z'
      : 'M8 5v14l11-7z'
    );
  }
  document.querySelectorAll('.wave-bar').forEach(b => {
    b.classList.toggle('playing', playing);
  });
}

function formatTime(s) {
  const m  = Math.floor(s / 60);
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

// ─── FAQ ───────────────────────────────────────────────────
function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = btn.classList.contains('open');
  document.querySelectorAll('.faq-question.open').forEach(q => {
    q.classList.remove('open');
    q.nextElementSibling.classList.remove('open');
  });
  if (!isOpen) {
    btn.classList.add('open');
    answer.classList.add('open');
  }
}
