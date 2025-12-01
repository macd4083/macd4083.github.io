// Albums manifest: covers are the original 3 files in images/ (photo1, photo2, photo3).
// Each album has an id used to search for images named in the pattern: ph{album}s{index} (e.g. ph1s1, ph2s4, ...)
// The code will try multiple candidate folders and common extensions to discover images at runtime.
// This allows flexible placement in subfolders while keeping the album covers at images/photo1..photo3

const albums = [
  { id: 1, title: 'Album 1', cover: 'images/photo1.JPG' },
  { id: 2, title: 'Album 2', cover: 'images/photo2.JPG' },
  { id: 3, title: 'Album 3', cover: 'images/photo3.jpg' }
];

// DOM refs
const carousel = document.getElementById('carousel');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const section = document.getElementById('slideshow-section');
const expandedPanel = document.getElementById('expanded-panel');
const expandedInner = document.getElementById('expanded-inner');
const closeExpanded = document.getElementById('close-expanded');

let current = 0;
let cards = [];

// Build album cards using album covers
function buildCarousel() {
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

    // click behavior: if center, expand; otherwise navigate to clicked
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

// arrange cards around current index (3D rotated look)
function arrange(initial = false) {
  const n = cards.length;
  cards.forEach((card, i) => {
    // circular shortest offset
    let offset = i - current;
    if (offset > n / 2) offset -= n;
    if (offset < -n / 2) offset += n;

    const spacingX = 92;
    const rotateY = offset * -16; // degrees
    const translateX = offset * spacingX;
    const translateZ = -Math.abs(offset) * 60; // push back
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

// Prev/next navigation
prevBtn.addEventListener('click', () => { current = (current - 1 + albums.length) % albums.length; arrange(); });
nextBtn.addEventListener('click', () => { current = (current + 1) % albums.length; arrange(); });

document.addEventListener('keydown', (e) => {
  if (expandedPanel.classList.contains('open')) {
    if (e.key === 'Escape') closeExpandedView();
    return;
  }
  if (e.key === 'ArrowLeft' || e.key === 'a') {
    current = (current - 1 + albums.length) % albums.length; arrange();
  } else if (e.key === 'ArrowRight' || e.key === 'd') {
    current = (current + 1) % albums.length; arrange();
  }
});

// Toggle expanded panel
function toggleExpanded() {
  if (expandedPanel.classList.contains('open')) {
    closeExpandedView();
  } else {
    openExpandedViewForAlbum(albums[current].id);
  }
}

// Utility: check if image exists by attempting to load it (resolves true/false)
function imageExists(url, timeout = 3000) {
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
      if (!settled) {
        settled = true;
        resolve(false);
      }
    };
    img.onload = () => { if (!settled) { settled = true; resolve(true); } };
    img.onerror = () => { if (!settled) { settled = true; resolve(false); } };
    // fallback timeout
    setTimeout(() => { if (!settled) { settled = true; resolve(false); } }, timeout);
    img.src = url;
  });
}

// Discover album images using patterns and candidate folders.
// Pattern: ph{album}s{index}{ext}
// Candidate folders: images/album{n}, images/album-{n}, images/a{n}, images (the root)
// We try extensions: .JPG .jpg .jpeg .png
// We stop when a run of misses reaches consecutiveMissLimit.
async function discoverAlbumImages(albumId) {
  const candidateFolders = [
    `images/album${albumId}`,
    `images/album-${albumId}`,
    `images/a${albumId}`,
    `images`
  ];
  const exts = ['.JPG', '.jpg', '.jpeg', '.png', '.webp'];
  const found = [];
  const maxIndex = 80;
  const consecutiveMissLimit = 5;
  let consecutiveMisses = 0;

  for (let idx = 1; idx <= maxIndex; idx++) {
    let foundForIndex = false;
    for (const folder of candidateFolders) {
      for (const ext of exts) {
        const path = `${folder}/ph${albumId}s${idx}${ext}`;
        // try imageExists
        // Note: this will attempt requests to the given paths; it's fast-failing for missing files
        // and gracefully continues. We stop after consecutive misses so we don't probe forever.
        // Prefer the first match for each index.
        // eslint-disable-next-line no-await-in-loop
        const exists = await imageExists(path, 1800);
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

// Open expanded view for a particular album id
async function openExpandedViewForAlbum(albumId) {
  expandedInner.innerHTML = '';
  expandedPanel.classList.add('open');
  expandedPanel.setAttribute('aria-hidden','false');

  // show loader
  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.textContent = 'Loading album…';
  expandedInner.appendChild(loader);

  // discover images
  const images = await discoverAlbumImages(albumId);

  // replace loader with content
  expandedInner.innerHTML = '';
  if (images.length === 0) {
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

    // scroll to center on the photo matching current album if applicable (we'll center on first)
    requestAnimationFrame(() => {
      const node = expandedInner.children[0];
      if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      expandedInner.focus();
    });
  }
}

// close expanded panel
function closeExpandedView() {
  expandedPanel.classList.remove('open');
  expandedPanel.setAttribute('aria-hidden','true');
  // optional subtle animation on center card
  const centerCard = cards[current];
  if (centerCard) {
    centerCard.animate([{ transform: centerCard.style.transform }, { transform: centerCard.style.transform + ' scale(1.06)' }, { transform: centerCard.style.transform }], { duration: 420, easing: 'ease-out' });
  }
}

// close button handler
closeExpanded.addEventListener('click', closeExpandedView);

// initial build
buildCarousel();

// Micro-animation for the centered album for more life
setInterval(() => {
  const centerCard = cards[current];
  if (!centerCard || expandedPanel.classList.contains('open')) return;
  centerCard.animate([
    { transform: centerCard.style.transform + ' translateY(0px)' },
    { transform: centerCard.style.transform + ' translateY(-6px)' },
    { transform: centerCard.style.transform + ' translateY(0px)' }
  ], { duration: 1400, easing: 'cubic-bezier(.2,.9,.2,1)' });
}, 3000);

// Optional: pre-warm the album covers (small optimization)
albums.forEach(a => {
  const img = new Image();
  img.src = a.cover;
});
