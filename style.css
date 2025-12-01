/* Basic layout */
* { box-sizing: border-box; }
body { font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; margin:0; background:#111; color:#eee; }

/* Hero / bio (kept simple) */
.hero { height:200px; display:flex; align-items:center; justify-content:center; background:linear-gradient(180deg,#222,#111); }
.profile-pic { height:120px; width:120px; border-radius:50%; object-fit:cover; border:4px solid #333; }
.bio { background:#fff; color:#111; padding:28px; text-align:center; }

/* Slideshow section */
.slideshow-section { position:relative; padding:48px 16px 80px; background:linear-gradient(180deg,#0f0f12, #070708); overflow:visible; --carousel-height:420px; }
.controls { position:absolute; top:16px; right:16px; display:flex; gap:8px; z-index:50; }
.control-btn { background:rgba(255,255,255,0.06); color:#fff; border:0; padding:8px 12px; border-radius:8px; font-size:18px; cursor:pointer; backdrop-filter: blur(6px); transition:transform .18s ease, background .18s; }
.control-btn:hover { transform:translateY(-2px); background:rgba(255,255,255,0.1); }

/* Carousel container */
.carousel { position:relative; height:var(--carousel-height); width:100%; max-width:1100px; margin:0 auto; perspective:1400px; -webkit-perspective:1400px; }

/* Card (an album thumbnail) */
.card {
  position:absolute;
  top:50%;
  left:50%;
  transform-style:preserve-3d;
  transform-origin:center center;
  transition: transform 800ms cubic-bezier(.2,.95,.15,1), filter 400ms ease, opacity 400ms ease;
  width:320px;
  height:200px;
  border-radius:14px;
  overflow:hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.7);
  cursor:pointer;
  will-change: transform, filter;
  -webkit-tap-highlight-color: transparent;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#000;
}

/* Image inside card */
.card img { width:100%; height:100%; object-fit:cover; display:block; }

/* Styling for non-center cards */
.card.behind { filter: blur(1px) saturate(.85) contrast(.95); opacity:0.9; }
.card.far-behind { filter: blur(2px) saturate(.75) contrast(.9) brightness(.8); opacity:0.75; transform-origin:center center; }

/* Center card emphasis */
.card.center {
  transform: translate(-50%,-50%) translateZ(140px) scale(1.03) rotateY(0deg) !important;
  box-shadow: 0 40px 80px rgba(0,0,0,0.85);
  z-index: 999;
  filter: none;
}

/* Small label overlay */
.card .label {
  position:absolute; bottom:10px; left:12px; right:12px;
  color:#fff; font-weight:600; text-shadow:0 2px 8px rgba(0,0,0,0.7);
  font-size:14px; pointer-events:none;
}

/* Expanded panel (collapses/expands) */
.expanded-panel {
  position:relative;
  max-width:1100px;
  margin:18px auto 0;
  height:0;
  overflow:hidden;
  transition: height 700ms cubic-bezier(.2,.9,.2,1), opacity 400ms ease;
  opacity:0;
  border-radius:12px;
  background:linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
  box-shadow: 0 30px 80px rgba(0,0,0,0.6);
  padding: 0 0 10px 0;
}

/* inner scroll area when expanded */
.expanded-panel.open {
  height:420px;
  opacity:1;
}
.expanded-inner {
  height:100%;
  overflow-y:auto;
  padding:18px;
  display:flex;
  gap:12px;
  flex-direction:column;
  scroll-behavior:smooth;
}

/* Expanded images */
.expanded-inner .expanded-item {
  height:360px;
  border-radius:10px;
  overflow:hidden;
  background:#000;
  box-shadow: 0 10px 40px rgba(0,0,0,0.6);
  transform-origin:center center;
  transition: transform 400ms ease;
}
.expanded-inner .expanded-item img { width:100%; height:100%; object-fit:cover; display:block; }

/* Loader text */
.expanded-inner .loader {
  color: #ddd;
  font-size: 16px;
  text-align:center;
  padding:28px 0;
}

/* Close button */
.close-expanded {
  position:absolute;
  right:14px; top:10px;
  background:rgba(0,0,0,0.45);
  color:#fff; border:0; padding:8px 12px; border-radius:8px; cursor:pointer;
  z-index:60; transform:translateY(-6px);
}

/* Responsive tweaks */
@media (max-width:760px) {
  .card { width:260px; height:160px; }
  .carousel { --carousel-height:300px; }
  .expanded-panel.open { height:320px; }
  .expanded-inner .expanded-item { height:260px; }
}
