import * as THREE from './vendor/three.module.js';
import { PointerLockControls } from './vendor/PointerLockControls.js';

const isMobile = ('ontouchstart' in window) || (new URLSearchParams(window.location.search).has('mobile'));

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

// --- Controls Setup ---
let controls;
if (!isMobile) {
    // Desktop: Pointer Lock Controls
    controls = new PointerLockControls(camera, document.body);
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');
    instructions.addEventListener('click', () => controls.lock());
    controls.addEventListener('lock', () => {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });
    controls.addEventListener('unlock', () => {
        blocker.style.display = 'block';
        instructions.style.display = '';
    });
    scene.add(controls.getObject());
} else {
    // Mobile: Show touch controls and hide desktop ones
    document.getElementById('touch-controls').style.display = 'flex';
    document.getElementById('blocker').style.display = 'none';
}

// --- Block Interaction Logic ---
const raycaster = new THREE.Raycaster();

function removeBlock() {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const intersects = raycaster.intersectObjects(cubes);
    if (intersects.length > 0 && intersects[0].object.isMesh) {
        scene.remove(intersects[0].object);
        cubes.splice(cubes.indexOf(intersects[0].object), 1);
    }
}

function placeBlock() {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const intersects = raycaster.intersectObjects(cubes);
    if (intersects.length > 0 && intersects[0].object.isMesh) {
        const newCube = new THREE.Mesh(cubeGeo, cubeMat);
        newCube.position.copy(intersects[0].object.position).add(intersects[0].face.normal);
        scene.add(newCube);
        cubes.push(newCube);
    }
}

// --- Input Handling ---
// Keyboard
const keys = {};
document.addEventListener('keydown', (event) => { keys[event.code] = true; });
document.addEventListener('keyup', (event) => { keys[event.code] = false; });

// Mouse (Desktop)
document.addEventListener('mousedown', (event) => {
    if (isMobile || !controls.isLocked) return;
    if (event.button === 0) removeBlock();
    if (event.button === 2) placeBlock();
});

// Touch
if (isMobile) {
    // Joystick
    const joystick = document.getElementById('joystick');
    const joystickThumb = document.getElementById('joystick-thumb');
    let joystickActive = false;
    const joystickVector = new THREE.Vector2();
    joystick.addEventListener('touchstart', (e) => { e.preventDefault(); joystickActive = true; }, { passive: false });
    joystick.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!joystickActive) return;
        const touch = e.changedTouches[0];
        const rect = joystick.getBoundingClientRect();
        const joystickRadius = rect.width / 2;
        joystickVector.set(touch.clientX - (rect.left + joystickRadius), touch.clientY - (rect.top + joystickRadius));
        if (joystickVector.length() > joystickRadius) joystickVector.setLength(joystickRadius);
        joystickThumb.style.transform = `translate(${joystickVector.x}px, ${joystickVector.y}px)`;
    }, { passive: false });
    const endJoystick = (e) => {
        e.preventDefault();
        joystickActive = false;
        joystickVector.set(0, 0);
        joystickThumb.style.transform = 'translate(0px, 0px)';
    };
    joystick.addEventListener('touchend', endJoystick);
    joystick.addEventListener('touchcancel', endJoystick);

    // Action Buttons
    document.getElementById('place-block-button').addEventListener('touchstart', (e) => { e.preventDefault(); placeBlock(); });
    document.getElementById('remove-block-button').addEventListener('touchstart', (e) => { e.preventDefault(); removeBlock(); });

    // Look Controls
    let lookTouch = { active: false, id: -1, lastX: 0, lastY: 0 };
    renderer.domElement.addEventListener('touchstart', (e) => {
        if (e.target.parentElement.id.includes('joystick') || e.target.id.includes('button')) return;
        if (!lookTouch.active) {
            const touch = e.changedTouches[0];
            lookTouch.active = true;
            lookTouch.id = touch.identifier;
            lookTouch.lastX = touch.clientX;
            lookTouch.lastY = touch.clientY;
        }
    });
    renderer.domElement.addEventListener('touchmove', (e) => {
        if (!lookTouch.active) return;
        let touch = null;
        for (let i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === lookTouch.id) touch = e.changedTouches[i];
        if (!touch) return;
        const deltaX = touch.clientX - lookTouch.lastX;
        const deltaY = touch.clientY - lookTouch.lastY;
        lookTouch.lastX = touch.clientX;
        lookTouch.lastY = touch.clientY;
        camera.rotation.y -= deltaX * 0.002;
        camera.rotation.x -= deltaY * 0.002;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    });
    const endLook = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === lookTouch.id) {
                lookTouch.active = false;
                lookTouch.id = -1;
                break;
            }
        }
    };
    renderer.domElement.addEventListener('touchend', endLook);
    renderer.domElement.addEventListener('touchcancel', endLook);
}

// --- Animation Loop ---
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    if (!isMobile && controls.isLocked === true) {
        // Desktop movement
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        direction.z = Number(keys['KeyW']) - Number(keys['KeyS']);
        direction.x = Number(keys['KeyD']) - Number(keys['KeyA']);
        direction.normalize();
        if (keys['KeyW'] || keys['KeyS']) velocity.z -= direction.z * 400.0 * delta;
        if (keys['KeyA'] || keys['KeyD']) velocity.x -= direction.x * 400.0 * delta;
        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
    } else if (isMobile) {
        // Mobile movement
        if (joystickActive) {
            const speed = 4.0;
            const joystickRadius = document.getElementById('joystick').offsetWidth / 2;
            if (joystickRadius > 0) {
                const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
                forward.y = 0;
                right.y = 0;
                forward.normalize();
                right.normalize();
                const moveVector = new THREE.Vector3();
                moveVector.addScaledVector(forward, -joystickVector.y / joystickRadius);
                moveVector.addScaledVector(right, joystickVector.x / joystickRadius);
                if (moveVector.length() > 0) {
                     camera.position.addScaledVector(moveVector.normalize(), speed * delta);
                }
            }
        }
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
