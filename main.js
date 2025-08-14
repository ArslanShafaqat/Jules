import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.141.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.141.0/examples/jsm/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x00001a);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 1.8, 5);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 1, 0);
scene.add(directionalLight);

const cubes = [];
const planeSize = 10;
const cubeSize = 1;
const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
const cubeMat = new THREE.MeshStandardMaterial({ color: 0x888888 });

for (let i = 0; i < planeSize; i++) {
    for (let j = 0; j < planeSize; j++) {
        const cube = new THREE.Mesh(cubeGeo, cubeMat);
        cube.position.set(i * cubeSize, 0, j * cubeSize);
        scene.add(cube);
        cubes.push(cube);
    }
}

// Pointer Lock Controls
const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

const controls = new PointerLockControls(camera, document.body);

instructions.addEventListener('click', function () {
    controls.lock();
});

controls.addEventListener('lock', function () {
    instructions.style.display = 'none';
    blocker.style.display = 'none';
});

controls.addEventListener('unlock', function () {
    blocker.style.display = 'block';
    instructions.style.display = '';
});

scene.add(controls.getObject());

// Keyboard controls
const keys = {};
document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
});
document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
});

// Raycaster for block interaction
const raycaster = new THREE.Raycaster();

document.addEventListener('mousedown', (event) => {
    if (!controls.isLocked) return;

    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const intersects = raycaster.intersectObjects(cubes);

    if (intersects.length > 0) {
        const intersected = intersects[0];

        if (event.button === 0) { // Left-click: remove block
            if (intersected.object.isMesh) {
                scene.remove(intersected.object);
                cubes.splice(cubes.indexOf(intersected.object), 1);
            }
        } else if (event.button === 2) { // Right-click: place block
            if (intersected.object.isMesh) {
                const newCube = new THREE.Mesh(cubeGeo, cubeMat);
                const newPos = intersected.object.position.clone();
                newPos.add(intersected.face.normal);
                newCube.position.copy(newPos);
                scene.add(newCube);
                cubes.push(newCube);
            }
        }
    }
});


let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    if (controls.isLocked === true) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(keys['KeyW']) - Number(keys['KeyS']);
        direction.x = Number(keys['KeyD']) - Number(keys['KeyA']);
        direction.normalize();

        if (keys['KeyW'] || keys['KeyS']) velocity.z -= direction.z * 400.0 * delta;
        if (keys['KeyA'] || keys['KeyD']) velocity.x -= direction.x * 400.0 * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
    }

    prevTime = time;
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
