const images = [
  'images/photo1.JPG',
  'images/photo2.JPG',
  'images/photo3.jpg'
];

let current = 0;
const imgEl = document.getElementById('main-image');

function showImage(index) {
  imgEl.src = images[index];
}

document.getElementById('prev').onclick = () => {
  current = (current - 1 + images.length) % images.length;
  showImage(current);
};

document.getElementById('next').onclick = () => {
  current = (current + 1) % images.length;
  showImage(current);
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a') {
    current = (current - 1 + images.length) % images.length;
    showImage(current);
  } else if (e.key === 'ArrowRight' || e.key === 'd') {
    current = (current + 1) % images.length;
    showImage(current);
  }
});
