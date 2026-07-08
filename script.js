const container = document.getElementById("viewer");

let panoramas = [];
let currentPanoIndex = 0;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50,
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
let targetFov = 50;
camera.fov = targetFov;
camera.updateProjectionMatrix();

let isDown = false;
let startX = 0;
let startY = 0;

const activePointers = new Map();
let startPinchDistance = 0;
let startPinchFov = 50;

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

  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  container.setPointerCapture(e.pointerId);

  if (activePointers.size === 1) {
    isDown = true;
    startX = e.clientX;
    startY = e.clientY;
  }

  if (activePointers.size === 2) {
    const points = [...activePointers.values()];
    startPinchDistance = getDistance(points[0], points[1]);
    startPinchFov = targetFov;
    isDown = false;
  }
});

container.addEventListener("pointermove", (e) => {
  e.preventDefault();

  if (!activePointers.has(e.pointerId)) return;
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (activePointers.size === 2) {
    const points = [...activePointers.values()];
    const currentDistance = getDistance(points[0], points[1]);
    const zoomFactor = startPinchDistance / currentDistance;

    targetFov = startPinchFov * zoomFactor;
    targetFov = Math.max(35, Math.min(60, targetFov));
    return;
  }

  if (!isDown) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  lon -= dx * 0.18;
  lat += dy * 0.18;

  startX = e.clientX;
  startY = e.clientY;
});

container.addEventListener("pointerup", endPointer);
container.addEventListener("pointercancel", endPointer);

function endPointer(e) {
  activePointers.delete(e.pointerId);
  isDown = false;

  if (container.hasPointerCapture(e.pointerId)) {
    container.releasePointerCapture(e.pointerId);
  }
}

function getDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

window.addEventListener("wheel", (e) => {
  e.preventDefault();

  targetFov += e.deltaY * 0.03;
  targetFov = Math.max(35, Math.min(60, targetFov));
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
  camera.fov += (targetFov - camera.fov) * 0.12;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
