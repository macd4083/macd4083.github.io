// Node script to generate images/manifest.json from your local repository image files.
// Usage (from repo root):
//   node tools/generate-manifest.js
//
// This scans the images/ directory recursively and finds files that match the patterns
// - cover images: photo1, photo2, photo3 (used as album covers if present)
// - album images: ph<albumId>s<index> e.g. ph2s1.jpg
//
// It writes images/manifest.json containing an "albums" mapping and "albumOrder" array.
// If you keep your images organized in subfolders, this generator will find them and produce a reliable manifest
// so the browser-side script can load album contents quickly without probing.

const fs = require('fs').promises;
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'images');
const OUT_FILE = path.join(IMAGES_DIR, 'manifest.json');

async function walk(dir) {
  let results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      results = results.concat(await walk(full));
    } else if (ent.isFile()) {
      results.push(full);
    }
  }
  return results;
}

function rel(p) {
  return p.split(path.sep).join('/').replace(/^\/+/, '');
}

(async () => {
  try {
    const files = await walk(IMAGES_DIR);
    const albums = {};
    const albumSet = new Set();

    // regex patterns
    const coverRe = /^photo([1-9])\.(jpe?g|png|webp)$/i;
    const albumPhotoRe = /^ph(\d+)s(\d+)\.(jpe?g|png|webp)$/i;

    for (const f of files) {
      const fname = path.basename(f);
      const relpath = rel(path.relative(path.join(__dirname, '..'), f));
      // try cover
      const cov = fname.match(coverRe);
      if (cov) {
        const id = Number(cov[1]);
        albums[id] = albums[id] || { title: `Album ${id}`, cover: relpath, images: [] };
        albums[id].cover = relpath; // prefer cover if found
        albumSet.add(id);
        continue;
      }
      // try album photo pattern
      const m = fname.match(albumPhotoRe);
      if (m) {
        const id = Number(m[1]);
        albums[id] = albums[id] || { title: `Album ${id}`, cover: `images/photo${id}.JPG`, images: [] };
        albums[id].images.push(relpath);
        albumSet.add(id);
        continue;
      }
      // fallback: detect if file is inside a folder named albumX or aX
      const dirs = path.dirname(path.relative(path.join(__dirname, '..'), f)).split(path.sep);
      for (const d of dirs) {
        const dmatch = d.match(/^album-?(\d+)$/i) || d.match(/^a(\d+)$/i);
        if (dmatch) {
          const id = Number(dmatch[1]);
          albums[id] = albums[id] || { title: `Album ${id}`, cover: `images/photo${id}.JPG`, images: [] };
          albums[id].images.push(relpath);
          albumSet.add(id);
          break;
        }
      }
    }

    // sort images per album by filename (natural sort)
    for (const id of Object.keys(albums)) {
      albums[id].images.sort((a,b)=> a.localeCompare(b, undefined, {numeric:true, sensitivity:'base'}));
    }

    const albumOrder = Array.from(albumSet).sort((a,b)=>a-b);
    // Ensure at least cover-only albums for 1..3 if not found
    for (let i=1;i<=3;i++){
      if (!albums[i]) {
        const coverCandidateUpper = `images/photo${i}.JPG`;
        const coverCandidateLower = `images/photo${i}.jpg`;
        const cover = (await exists(path.join(IMAGES_DIR, `photo${i}.JPG`))) ? coverCandidateUpper :
                      (await exists(path.join(IMAGES_DIR, `photo${i}.jpg`))) ? coverCandidateLower : null;
        albums[i] = albums[i] || { title: `Album ${i}`, cover: cover || `images/photo${i}.JPG`, images: [] };
        if (!albumOrder.includes(i)) albumOrder.push(i);
      }
    }

    // write manifest
    const manifest = { albumOrder: albumOrder, albums: {} };
    for (const id of albumOrder) {
      manifest.albums[String(id)] = albums[id] || { title: `Album ${id}`, cover: `images/photo${id}.JPG`, images: [] };
    }

    await fs.writeFile(OUT_FILE, JSON.stringify(manifest, null, 2), 'utf8');
    console.log('Generated manifest at', OUT_FILE);
    console.log('Album IDs:', albumOrder.join(', '));
  } catch (err) {
    console.error('Failed to generate manifest:', err);
    process.exit(1);
  }
})();

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch (e) {
    return false;
  }
}
