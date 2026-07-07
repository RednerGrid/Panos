const container = document.getElementById("viewer");

let panoramas = [];
let currentPanoIndex = 0;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  1,
  2000
);

const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const geometry = new THREE.SphereGeometry(500, 128, 64);
geometry.scale(-1, 1, 1);

const loader = new THREE.TextureLoader();

const material = new THREE.MeshBasicMaterial({
  map: null
});

const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

let lon = 0;
let lat = 0;

let isDown = false;
let startX = 0;
let startY = 0;

async function init() {
  const response = await fetch("panos/manifest.json");
  const files = await response.json();

  panoramas = files.map(file => `panos/${file}`);

  if (panoramas.length === 0) {
    console.error("Нет панорам в manifest.json");
    return;
  }

  loadPanorama(0);
  animate();
}

function loadPanorama(index) {
  currentPanoIndex = (index + panoramas.length) % panoramas.length;

  loader.load(panoramas[currentPanoIndex], (newTexture) => {
    if (material.map) {
      material.map.dispose();
    }

    material.map = newTexture;
    material.needsUpdate = true;
  });
}

document.getElementById("prevPano").addEventListener("click", () => {
  loadPanorama(currentPanoIndex - 1);
});

document.getElementById("nextPano").addEventListener("click", () => {
  loadPanorama(currentPanoIndex + 1);
});

container.addEventListener("pointerdown", (e) => {
  e.preventDefault();

  isDown = true;
  startX = e.clientX;
  startY = e.clientY;

  container.setPointerCapture(e.pointerId);
});

container.addEventListener("pointermove", (e) => {
  e.preventDefault();

  if (!isDown) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  lon -= dx * 0.18;
  lat += dy * 0.18;

  startX = e.clientX;
  startY = e.clientY;
});

container.addEventListener("pointerup", (e) => {
  e.preventDefault();

  isDown = false;

  if (container.hasPointerCapture(e.pointerId)) {
    container.releasePointerCapture(e.pointerId);
  }
});

container.addEventListener("pointercancel", () => {
  isDown = false;
});

window.addEventListener("wheel", (e) => {
  e.preventDefault();

  camera.fov += e.deltaY * 0.03;
  camera.fov = Math.max(35, Math.min(90, camera.fov));
  camera.updateProjectionMatrix();
}, { passive: false });

function animate() {
  requestAnimationFrame(animate);

  lat = Math.max(-45, Math.min(45, lat));

  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon);

  camera.lookAt(
    500 * Math.sin(phi) * Math.cos(theta),
    500 * Math.cos(phi),
    500 * Math.sin(phi) * Math.sin(theta)
  );

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
