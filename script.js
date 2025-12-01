// script.js - improved loader that prefers a manifest and falls back to conservative discovery
// Behavior:
// 1) Try to fetch images/manifest.json (recommended - fastest & reliable).
// 2) If manifest exists, use it to populate albums and expanded images.
// 3) If not present, fall back to a conservative discovery attempt (limited probes).
// NOTE: For reliable operation, generate images/manifest.json using the provided generator script (see tools/generate-manifest.js).

/* ----------------- configuration ----------------- */

// default fallback covers (keeps original three cover files)
// Replace DEFAULT_ALBUMS with the block below
const DEFAULT_ALBUMS = [
  { id: 1, title: 'Album 1', cover: 'images/folder1/photo1.JPG', images: [
    'images/folder1/ph1s1.JPG',
    'images/folder1/ph1s2.JPG'
  ] },
  { id: 2, title: 'Album 2', cover: 'images/photo2.JPG', images: [] },
  { id: 3, title: 'Album 3', cover: 'images/photo3.jpg', images: [] }
];

const MANIFEST_PATH = 'images/manifest.json'; // recommended file to commit
const DEBUG = false;

/* ----------------- DOM refs ----------------- */
const carousel = document.getElementById('carousel');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const expandedPanel = document.getElementById('expanded-panel');
const expandedInner = document.getElementById('expanded-inner');
const closeExpanded = document.getElementById('close-expanded');

let albums = []; // runtime albums list used by buildCarousel
let current = 0;
let cards = [];

/* ----------------- helper utilities ----------------- */
function log(...args) { if (DEBUG) console.log('[slideshow]', ...args); }

/* attempt to load manifest.json */
async function loadManifest() {
  try {
    const r = await fetch(MANIFEST_PATH, { cache: 'no-store' });
    if (!r.ok) {
      log('manifest not found (status)', r.status);
      return null;
    }
    const json = await r.json();
    log('manifest loaded', json);
    return json;
  } catch (err) {
    log('manifest fetch failed', err);
    return null;
  }
}

/* normalize manifest into albums array */
function albumsFromManifest(manifest) {
  // manifest expected format:
  // {
  //   "albumOrder": [1,2,3],
  //   "albums": {
  //     "1": { "title": "Album 1", "cover":"images/photo1.JPG", "images": ["images/album1/ph1s1.jpg", ...] },
  //     "2": { ... }
  //   }
  // }
  const out = [];
  const order = Array.isArray(manifest.albumOrder) ? manifest.albumOrder : Object.keys(manifest.albums || {}).map(k => Number(k)).sort((a,b)=>a-b);
  for (const id of order) {
    const key = String(id);
    const a = manifest.albums && manifest.albums[key];
    if (!a) continue;
    out.push({
      id: Number(id),
      title: a.title || `Album ${id}`,
      cover: a.cover || (Array.isArray(a.images) && a.images[0]) || `images/photo${id}.JPG`,
      images: Array.isArray(a.images) ? a.images.slice() : []
    });
  }
  return out;
}

/* safe image existence check (with small timeout) */
function imageExists(url, timeout = 1800) {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    let timer = setTimeout(() => {
      if (done) return;
      done = true;
      img.onload = img.onerror = null;
      resolve(false);
    }, timeout);

    img.onload = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(true);
    };
    img.onerror = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(false);
    };
    img.src = url;
  });
}

/* conservative discovery fallback (kept intentionally limited) */
async function discoverAlbumImagesConservative(albumId) {
  // This will try a few likely folder names and extensions, but it is limited.
  const candidateFolders = [
    `images/album${albumId}`,
    `images/album-${albumId}`,
    `images/a${albumId}`,
    `images`
  ];
  const exts = ['.JPG', '.jpg', '.jpeg', '.png', '.webp'];
  const found = [];
  const maxIndex = 25; // keep small to avoid many requests
  const consecutiveMissLimit = 3;
  let consecutiveMisses = 0;

  for (let idx = 1; idx <= maxIndex; idx++) {
    let foundForIndex = false;
    for (const folder of candidateFolders) {
      for (const ext of exts) {
        const path = `${folder}/ph${albumId}s${idx}${ext}`;
        // eslint-disable-next-line no-await-in-loop
        const exists = await imageExists(path, 1200);
        if (exists) {
          found.push(path);
          foundForIndex = true;
          break;
        }
      }
      if (foundForIndex) break;
    }
    if (!foundForIndex) {
      consecutiveMisses++;
    } else {
      consecutiveMisses = 0;
    }
    if (consecutiveMisses >= consecutiveMissLimit) break;
  }
  return found;
}

/* ----------------- carousel build & layout ----------------- */

function buildCarousel() {
  if (!carousel) return;
  carousel.innerHTML = '';
  cards = albums.map((album, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.index = i;
    card.dataset.albumId = album.id;

    const img = document.createElement('img');
    img.src = album.cover;
    img.alt = `${album.title} cover`;
    card.appendChild(img);

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = album.title;
    card.appendChild(label);

    carousel.appendChild(card);

    card.addEventListener('click', () => {
      const idx = Number(card.dataset.index);
      if (idx === current) {
        toggleExpanded();
      } else {
        current = idx;
        arrange();
      }
    });

    return card;
  });
  arrange(true);
}

function arrange(initial = false) {
  const n = cards.length;
  cards.forEach((card, i) => {
    let offset = i - current;
    if (offset > n / 2) offset -= n;
    if (offset < -n / 2) offset += n;

    const spacingX = 92;
    const rotateY = offset * -16;
    const translateX = offset * spacingX;
    const translateZ = -Math.abs(offset) * 60;
    const scale = 1 - Math.min(Math.abs(offset) * 0.08, 0.46);
    const zIndex = 1000 - Math.abs(offset);

    const transform = `translate(-50%,-50%) translateX(${translateX}px) rotateY(${rotateY}deg) translateZ(${translateZ}px) scale(${scale})`;
    card.style.transform = transform;
    card.style.zIndex = zIndex;

    card.classList.remove('center','behind','far-behind');
    if (offset === 0) {
      card.classList.add('center');
      card.setAttribute('aria-current','true');
      card.style.pointerEvents = 'auto';
    } else {
      card.removeAttribute('aria-current');
      card.style.pointerEvents = 'auto';
      if (Math.abs(offset) === 1) card.classList.add('behind');
      if (Math.abs(offset) >= 2) card.classList.add('far-behind');
    }

    if (initial) {
      card.style.transitionDelay = `${Math.abs(offset) * 30}ms`;
    } else {
      card.style.transitionDelay = `0ms`;
    }
  });
}

/* ----------------- navigation & key handlers ----------------- */

if (prevBtn) prevBtn.addEventListener('click', () => { current = (current - 1 + albums.length) % albums.length; arrange(); });
if (nextBtn) nextBtn.addEventListener('click', () => { current = (current + 1) % albums.length; arrange(); });

document.addEventListener('keydown', (e) => {
  if (expandedPanel && expandedPanel.classList.contains('open')) {
    if (e.key === 'Escape') closeExpandedView();
    return;
  }
  if (e.key === 'ArrowLeft' || e.key === 'a') {
    current = (current - 1 + albums.length) % albums.length; arrange();
  } else if (e.key === 'ArrowRight' || e.key === 'd') {
    current = (current + 1) % albums.length; arrange();
  }
});

/* ----------------- expanded view ----------------- */

async function openExpandedViewForAlbum(albumId) {
  if (!expandedPanel || !expandedInner) return;
  expandedInner.innerHTML = '';
  expandedPanel.classList.add('open');
  expandedPanel.setAttribute('aria-hidden','false');

  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.textContent = 'Loading album…';
  expandedInner.appendChild(loader);

  // find album in albums (manifest or defaults)
  const album = albums.find(a => Number(a.id) === Number(albumId));
  let images = [];

  if (album && Array.isArray(album.images) && album.images.length > 0) {
    // manifest supplied images (fast)
    images = album.images.slice();
  } else {
    // fallback discovery: conservative probing
    images = await discoverAlbumImagesConservative(albumId);
  }

  expandedInner.innerHTML = '';
  if (!images || images.length === 0) {
    const msg = document.createElement('div');
    msg.className = 'loader';
    msg.textContent = 'No photos found for this album.';
    expandedInner.appendChild(msg);
  } else {
    images.forEach((src, i) => {
      const item = document.createElement('div');
      item.className = 'expanded-item';
      const img = document.createElement('img');
      img.src = src;
      img.alt = `Photo ${i + 1}`;
      item.appendChild(img);
      expandedInner.appendChild(item);
    });
    requestAnimationFrame(() => {
      const node = expandedInner.children[0];
      if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      expandedInner.focus();
    });
  }
}

function closeExpandedView() {
  if (!expandedPanel) return;
  expandedPanel.classList.remove('open');
  expandedPanel.setAttribute('aria-hidden','true');
  // subtle animate center card
  const centerCard = cards[current];
  if (centerCard) {
    centerCard.animate([{ transform: centerCard.style.transform }, { transform: centerCard.style.transform + ' scale(1.06)' }, { transform: centerCard.style.transform }], { duration: 420, easing: 'ease-out' });
  }
}

if (closeExpanded) closeExpanded.addEventListener('click', closeExpandedView);

/* ----------------- bootstrap ----------------- */

async function init() {
  // 1) try manifest
  const manifest = await loadManifest();
  if (manifest && manifest.albums) {
    albums = albumsFromManifest(manifest);
    if (albums.length === 0) {
      log('manifest contained no albums; falling back to defaults');
      albums = DEFAULT_ALBUMS.slice();
    }
  } else {
    // fallback: use defaults (covers) and no pre-known images
    albums = DEFAULT_ALBUMS.slice();
    log('no manifest found; using default covers and conservative discovery for expanded images');
  }

  // build carousel with whatever albums we have
  buildCarousel();

  // micro animation for center card
  setInterval(() => {
    const centerCard = cards[current];
    if (!centerCard || (expandedPanel && expandedPanel.classList.contains('open'))) return;
    centerCard.animate([
      { transform: centerCard.style.transform + ' translateY(0px)' },
      { transform: centerCard.style.transform + ' translateY(-6px)' },
      { transform: centerCard.style.transform + ' translateY(0px)' }
    ], { duration: 1400, easing: 'cubic-bezier(.2,.9,.2,1)' });
  }, 3000);

  // warm covers
  albums.forEach(a => { const img = new Image(); img.src = a.cover; });
}

init();
