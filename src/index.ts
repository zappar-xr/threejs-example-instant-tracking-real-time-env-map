/* eslint-disable no-param-reassign */
/// Zappar for ThreeJS Examples
/// Instant Tracking 3D Model

// In this example we track a 3D model using instant world tracking

import * as THREE from 'three';
import * as ZapparThree from '@zappar/zappar-threejs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// Medieval Mug - HCardoso |  License: CC Attribution | https://sketchfab.com/3d-models/medieval-mug-b2d21e561b804557b7f713555bb638c2
import model from '../assets/mug.glb';
import './index.sass';
// The SDK is supported on many different browsers, but there are some that
// don't provide camera access. This function detects if the browser is supported
// For more information on support, check out the readme over at
// https://www.npmjs.com/package/@zappar/zappar-threejs
if (ZapparThree.browserIncompatible()) {
  // The browserIncompatibleUI() function shows a full-page dialog that informs the user
  // they're using an unsupported browser, and provides a button to 'copy' the current page
  // URL so they can 'paste' it into the address bar of a compatible alternative.
  ZapparThree.browserIncompatibleUI();

  // If the browser is not compatible, we can avoid setting up the rest of the page
  // so we throw an exception here.
  throw new Error('Unsupported browser');
}

// ZapparThree provides a LoadingManager that shows a progress bar while
// the assets are downloaded. You can use this if it's helpful, or use
// your own loading UI - it's up to you :-)
const manager = new ZapparThree.LoadingManager();

// Construct our ThreeJS renderer and scene as usual
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
document.body.appendChild(renderer.domElement);

const placeButton = document.getElementById('tap-to-place') || document.createElement('div');

// As with a normal ThreeJS scene, resize the canvas if the window resizes
renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Create a Zappar camera that we'll use instead of a ThreeJS camera
const camera = new ZapparThree.Camera();
camera.poseMode = ZapparThree.CameraPoseMode.AnchorOrigin;

// Set sRGB encoding for the renderer and the camera.
renderer.outputEncoding = THREE.sRGBEncoding;
camera.backgroundTexture.encoding = THREE.sRGBEncoding;
renderer.physicallyCorrectLights = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

// In order to use camera and motion data, we need to ask the users for permission
// The Zappar library comes with some UI to help with that, so let's use it
ZapparThree.permissionRequestUI().then((granted) => {
  // If the user granted us the permissions we need then we can start the camera
  // Otherwise let's them know that it's necessary with Zappar's permission denied UI
  if (granted) camera.start();
  else ZapparThree.permissionDeniedUI();
});

// The Zappar component needs to know our WebGL context, so set it like this:
ZapparThree.glContextSet(renderer.getContext());

// Set the background of our scene to be the camera background texture
// that's provided by the Zappar camera
scene.background = camera.backgroundTexture;

// Create an InstantWorldTracker and wrap it in an InstantWorldAnchorGroup for us
// to put our ThreeJS content into
const instantTracker = new ZapparThree.InstantWorldTracker();
const instantTrackerGroup = new ZapparThree.InstantWorldAnchorGroup(camera, instantTracker);

// Add our instant tracker group into the ThreeJS scene
scene.add(instantTrackerGroup);

// Load a 3D model to place within our group (using ThreeJS's GLTF loader)
// Pass our loading manager in to ensure the progress bar works correctly
const gltfLoader = new GLTFLoader(manager);

gltfLoader.load(model, (gltf) => {
  // Show the placement button.
  placeButton.style.display = 'block';

  gltf.scene.rotation.y = Math.PI / 2.5;
  gltf.scene.scale.multiplyScalar(1.2);

  // Ensure that the meshes cast shadows.
  gltf.scene.traverse((node : any) => {
    if (node.isMesh) { node.castShadow = true; }
  });

  // Now the model has been loaded, we can add it to our instant_tracker_group
  instantTrackerGroup.add(gltf.scene);
}, undefined, () => {
  console.log('An error ocurred loading the GLTF model');
});

// Create a directional light which will cast our shadows.
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(0, 30, 0);
dirLight.lookAt(0, 0, 0);
dirLight.castShadow = true;
dirLight.shadow.bias = 0.001;

const shadowDistance = 4;
dirLight.shadow.camera.top = shadowDistance;
dirLight.shadow.camera.bottom = -shadowDistance;
dirLight.shadow.camera.left = -shadowDistance;
dirLight.shadow.camera.right = shadowDistance;

dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 50;
dirLight.shadow.radius = 2;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;

instantTrackerGroup.add(dirLight);

// And then a little ambient light to brighten the model up a bit
const ambientLight = new THREE.AmbientLight('white', 0.6);
instantTrackerGroup.add(ambientLight);

// Set up the real time environment map
const environmentMap = new ZapparThree.CameraEnvironmentMap();
scene.environment = environmentMap.environmentMap;

// Create a plane which will receive the shadows.
const plane = new THREE.Mesh(
  new THREE.PlaneBufferGeometry(window.innerWidth, window.innerHeight),
  new THREE.ShadowMaterial({ opacity: 0.2 }),
);
plane.receiveShadow = true;
plane.rotation.x = -Math.PI / 2;

// Add it to the instrant_tracker_group.
instantTrackerGroup.add(plane);

// When the experience loads we'll let the user choose a place in their room for
// the content to appear using setAnchorPoseFromCameraOffset (see below)
// The user can confirm the location by tapping on the screen
let hasPlaced = false;
placeButton.addEventListener('click', () => {
  hasPlaced = true;
  placeButton.remove();
});

// Use a function to render our scene as usual
function render(): void {
  if (!hasPlaced) {
    // If the user hasn't chosen a place in their room yet, update the instant tracker
    // to be directly in front of the user
    instantTrackerGroup.setAnchorPoseFromCameraOffset(0, 0, -2);
  }

  environmentMap.update(renderer, camera);
  // The Zappar camera must have updateFrame called every frame
  camera.updateFrame(renderer);

  // Draw the ThreeJS scene in the usual way, but using the Zappar camera
  renderer.render(scene, camera);

  // Call render() again next frame
  requestAnimationFrame(render);
}

// Start things off
render();
