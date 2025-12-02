// script.js - small adjustments: hero background now uses the image directly (no gradient overlay)
// unchanged: manifest-driven carousel and expanded behavior

const MANIFEST_PATH = 'images/manifest.json';
const MANIFEST_FALLBACK = 'images/manifest.example.json';
const DEBUG = false;

/* DOM refs */
const carousel = document.getElementById('carousel');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const expandedPanel = document.getElementById('expanded-panel');
const expandedInner = document.getElementById('expanded-inner');
const closeExpanded = document.getElementById('close-expanded');
const profilePic = document.getElementById('profile-pic');
const profileWrap = document.getElementById('profile-wrap');
const heroEl = document.getElementById('hero');

let albums = [];
let cards = [];
let current = 0;

function log(...args){ if (DEBUG) console.log('[slideshow]',...args); }

function imageExists(url, timeout = 1200) {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const t = setTimeout(()=>{ if (done) return; done = true; img.onload = img.onerror = null; resolve(false); }, timeout);
    img.onload = () => { if (done) return; done = true; clearTimeout(t); resolve(true); };
    img.onerror = () => { if (done) return; done = true; clearTimeout(t); resolve(false); };
    img.src = url;
  });
}

async function fetchJson(path) {
  try {
    const r = await fetch(path, { cache:'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch(e) {
    return null;
  }
}

function albumsFromManifest(manifest) {
  if (!manifest || !manifest.albums) return [];
  const order = Array.isArray(manifest.albumOrder) ? manifest.albumOrder : Object.keys(manifest.albums).map(k=>Number(k)).sort((a,b)=>a-b);
  const out = [];
  for (const id of order) {
    const entry = manifest.albums[String(id)];
    if (!entry) continue;
    out.push({
      id: Number(id),
      title: entry.title || `Album ${id}`,
      cover: entry.cover || (entry.images && entry.images[0]) || `images/photo${id}.JPG`,
      images: Array.isArray(entry.images) ? entry.images.slice() : []
    });
  }
  return out;
}

/* small discovery helper (only used when manifest images[] empty) */
async function discoverFromCoverFolder(album) {
  if (!album || !album.cover) return [];
  const folder = album.cover.includes('/') ? album.cover.substring(0, album.cover.lastIndexOf('/')) : 'images';
  const exts = ['.JPG','.jpg','.jpeg','.png','.webp'];
  const found = [];
  let consecutiveMisses = 0;
  const consecutiveLimit = 3;
  const maxIndex = 20;
  for (let idx=1; idx<=maxIndex; idx++){
    let foundForIndex = false;
    for (const ext of exts){
      const path = `${folder}/ph${album.id}s${idx}${ext}`;
      // eslint-disable-next-line no-await-in-loop
      if (await imageExists(path,900)){
        found.push(path);
        foundForIndex = true;
        break;
      }
    }
    if (!foundForIndex) consecutiveMisses++; else consecutiveMisses = 0;
    if (consecutiveMisses >= consecutiveLimit) break;
  }
  log('discoverFromCoverFolder', album.id, '->', found.length);
  return found;
}

/* Hero background: prefer the fit image in images/folderx. Use the image directly (no gradient overlay). */
async function setHeroBackground() {
  if (!heroEl) return;
  const fitCandidates = [
    'images/folderx/fit.jpg',
    'images/folderx/fit.JPG',
    'images/folderx/fit.png',
    'images/folderx/fit.webp'
  ];
  for (const f of fitCandidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await imageExists(f, 900)) {
      heroEl.style.backgroundImage = `url("${f}")`;
      heroEl.style.backgroundSize = 'cover';
      heroEl.style.backgroundPosition = 'center 14%'; // show more of top of image
      heroEl.style.backgroundRepeat = 'no-repeat';
      log('hero background set to', f);
      return;
    }
  }

  // fallback: try first album cover if available
  try {
    if (Array.isArray(albums) && albums.length > 0 && albums[0].cover) {
      const c = albums[0].cover;
      // eslint-disable-next-line no-await-in-loop
      if (await imageExists(c, 900)) {
        heroEl.style.backgroundImage = `url("${c}")`;
        heroEl.style.backgroundSize = 'cover';
        heroEl.style.backgroundPosition = 'center 14%';
        heroEl.style.backgroundRepeat = 'no-repeat';
        log('hero background set to album cover', c);
        return;
      }
    }
  } catch (e) {
    log('error while checking album cover fallback', e);
  }

  // Additional generic fallback filenames
  const fallbackCandidates = ['images/hero.jpg', 'images/hero.JPG', 'images/hero.webp', 'images/hero.png'];
  for (const f of fallbackCandidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await imageExists(f, 900)) {
      heroEl.style.backgroundImage = `url("${f}")`;
      heroEl.style.backgroundSize = 'cover';
      heroEl.style.backgroundPosition = 'center 14%';
      heroEl.style.backgroundRepeat = 'no-repeat';
      log('hero background set to fallback', f);
      return;
    }
  }

  // final fallback: remove inline backgroundImage so CSS fallback remains (which is now plain)
  heroEl.style.backgroundImage = '';
}

/* Profile picture: prefer folderx/face.*, legacy next */
async function setProfilePicture() {
  if (!profilePic || !profileWrap) return;
  const faceCandidates = [
    'images/folderx/face.jpg',
    'images/folderx/face.JPG',
    'images/folderx/face.png',
    'images/folderx/face.webp',
    'images/face.jpg',
    'images/face.JPG',
    'images/folder1/face.jpg',
    'images/folder1/face.JPG'
  ];
  for (const p of faceCandidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await imageExists(p,900)) {
      profilePic.src = p;
      profilePic.alt = 'Profile';
      profilePic.classList.add('visible');
      profileWrap.style.display = '';
      log('profile pic set to', p);
      return;
    }
  }
  // none found -> hide profile, but keep hero background
  profilePic.src = '';
  profilePic.classList.remove('visible');
  profileWrap.style.display = 'none';
  log('no profile pic found - hidden');
}

/* Carousel build / arrange / nav / expanded (unchanged from previous working code) */
function buildCarousel() {
  if (!carousel) return;
  carousel.innerHTML = '';
  cards = albums.map((album,i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.index = i;
    card.dataset.albumId = album.id;
    card.setAttribute('role','listitem');

    const img = document.createElement('img');
    img.src = album.cover;
    img.alt = `${album.title} cover`;
    card.appendChild(img);

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = album.title;
    card.appendChild(label);

    card.addEventListener('click', () => {
      const idx = Number(card.dataset.index);
      if (idx === current) toggleExpanded();
      else { current = idx; arrange(); }
    });

    carousel.appendChild(card);
    return card;
  });
  arrange(true);
}

function arrange(initial=false) {
  const n = cards.length;
  cards.forEach((card,i) => {
    let offset = i - current;
    if (offset > n/2) offset -= n;
    if (offset < -n/2) offset += n;

    const spacingX = 96;
    const rotateY = offset * -16;
    const translateX = offset * spacingX;
    const translateZ = -Math.abs(offset) * 70;
    const scale = 1 - Math.min(Math.abs(offset) * 0.08, 0.52);
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
      if (Math.abs(offset) === 1) card.classList.add('behind');
      if (Math.abs(offset) >= 2) card.classList.add('far-behind');
    }

    if (initial) card.style.transitionDelay = `${Math.abs(offset) * 30}ms`;
    else card.style.transitionDelay = `0ms`;
  });
}

/* navigation & expanded logic (same) */
if (prevBtn) prevBtn.addEventListener('click', ()=>{ current = (current - 1 + albums.length) % albums.length; arrange(); });
if (nextBtn) nextBtn.addEventListener('click', ()=>{ current = (current + 1) % albums.length; arrange(); });

document.addEventListener('keydown', (e) => {
  if (expandedPanel && expandedPanel.classList.contains('open')) {
    if (e.key === 'Escape') closeExpandedView();
    return;
  }
  if (e.key === 'ArrowLeft' || e.key === 'a') { current = (current - 1 + albums.length) % albums.length; arrange(); }
  else if (e.key === 'ArrowRight' || e.key === 'd') { current = (current + 1) % albums.length; arrange(); }
});

function openExpandedViewForAlbum(album) {
  if (!expandedPanel || !expandedInner) return;
  expandedInner.innerHTML = '';
  expandedPanel.classList.add('open');
  expandedPanel.setAttribute('aria-hidden','false');

  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.textContent = 'Loading album\u2026';
  expandedInner.appendChild(loader);

  const images = Array.isArray(album.images) ? album.images.slice() : [];

  expandedInner.innerHTML = '';
  if (!images || images.length === 0) {
    const msg = document.createElement('div');
    msg.className = 'loader';
    msg.textContent = 'No photos found for this album.';
    expandedInner.appendChild(msg);
    return;
  }

  images.forEach((src,i) => {
    const item = document.createElement('div');
    item.className = 'expanded-item';
    const img = document.createElement('img');
    img.src = src;
    img.alt = `${album.title} photo ${i+1}`;
    img.loading = 'lazy';
    item.appendChild(img);
    expandedInner.appendChild(item);
  });

  requestAnimationFrame(()=> {
    const node = expandedInner.children[0];
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    expandedInner.focus();
  });
}

function toggleExpanded() {
  if (!expandedPanel) return;
  if (expandedPanel.classList.contains('open')) closeExpandedView();
  else openExpandedViewForAlbum(albums[current]);
}

function closeExpandedView() {
  if (!expandedPanel) return;
  expandedPanel.classList.remove('open');
  expandedPanel.setAttribute('aria-hidden','true');
  const centerCard = cards[current];
  if (centerCard) {
    centerCard.animate([{ transform: centerCard.style.transform }, { transform: centerCard.style.transform + ' scale(1.06)' }, { transform: centerCard.style.transform }], { duration: 420, easing: 'cubic-bezier(.2,.9,.2,1)' });
  }
}
if (closeExpanded) closeExpanded.addEventListener('click', closeExpandedView);

/* micro-bounce */
setInterval(()=> {
  const centerCard = cards[current];
  if (!centerCard || (expandedPanel && expandedPanel.classList.contains('open'))) return;
  centerCard.animate([
    { transform: centerCard.style.transform + ' translateY(0px)' },
    { transform: centerCard.style.transform + ' translateY(-6px)' },
    { transform: centerCard.style.transform + ' translateY(0px)' }
  ], { duration: 1400, easing: 'cubic-bezier(.2,.9,.2,1)' });
}, 3000);

/* init */
async function init() {
  log('init: load manifest');
  let manifest = await fetchJson(MANIFEST_PATH);
  if (!manifest) {
    log('manifest missing; trying fallback');
    manifest = await fetchJson(MANIFEST_FALLBACK);
  }

  if (manifest && manifest.albums) {
    albums = albumsFromManifest(manifest);
  } else {
    albums = [{ id:1, title:'Album 1', cover:'images/folder1/photo1.JPG', images:['images/folder1/ph1s1.JPG','images/folder1/ph1s2.JPG'] }];
  }

  for (let i=0;i<albums.length;i++){
    const a = albums[i];
    if (a.cover) {
      if (!(await imageExists(a.cover,900))) {
        if (Array.isArray(a.images) && a.images[0] && await imageExists(a.images[0],900)) {
          a.cover = a.images[0];
        } else {
          log('cover missing for album', a.id, a.cover);
        }
      }
    }
    if (!Array.isArray(a.images) || a.images.length === 0) {
      const discovered = await discoverFromCoverFolder(a);
      if (discovered && discovered.length > 0) a.images = discovered;
      else a.images = [];
    }
  }

  await setHeroBackground();
  await setProfilePicture();

  buildCarousel();
  log('init complete, albums:', albums.length);

  albums.forEach(a => { if (a && a.cover) { const im = new Image(); im.src = a.cover; } });
}

init();
