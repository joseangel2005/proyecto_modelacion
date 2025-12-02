/*
 * Base program for a 3D scene that connects to an API to get the movement
 * of agents.
 * The scene shows colored cubes
 *
 * Gilberto Echeverria
 * 2025-11-08
 */


'use strict';

import * as twgl from 'twgl-base.js';
import GUI from 'lil-gui';
import { M4 } from '../libs/3d-lib';
import { Scene3D } from '../libs/scene3d';
import { Light3D } from '../libs/light3d';
import { Object3D } from '../libs/object3d';
import { Camera3D } from '../libs/camera3d';

// Functions and arrays for the communication with the API
import {
  agents, obstacles, initAgentsModel,
  update, getAgents, getObstacles, getRoads, roads,
  getTrafficLights,
  getDestination,
  destination, trafficLight
} from '../libs/api_connection.js';

// Define the shader code, using GLSL 3.00
import vsGLSL from '../assets/shaders/vs_color.glsl?raw';
import fsGLSL from '../assets/shaders/fs_color.glsl?raw';
import destinationBuilding from '../assets/models/edificio.obj?raw';
import semaforo from '../assets/models/semaforo.obj?raw'
import carros from '../assets/models/CarLeft.obj?raw'
import arboles from '../assets/models/TreeNew.obj?raw'
import roadTextureImage from '../assets/textures/calletextura.jpg';
import wheels from '../assets/models/llantasPair.obj?raw'

//import semaforo from '../assets/models/light_traffic_signal.obj?raw';

const scene = new Scene3D();

/*
// Variable for the scene settings
const settings = {
    // Speed in degrees
    rotationSpeed: {
        x: 0,
        y: 0,
        z: 0,
    },
};
*/


// Global variables
let colorProgramInfo = undefined;
let gl = undefined;
const duration = 1000; // ms
let elapsed = 0;
let then = 0;
let roadTexture;

const MAX_TRAFFIC_LIGHTS = 24;
let activeTraffcLightsPositions = new Float32Array(MAX_TRAFFIC_LIGHTS * 3);
let activeTraffcLightsColors = new Float32Array(MAX_TRAFFIC_LIGHTS * 3);
let activeTrafficLightCount = 0;
const TRAFFIC_LIGHT_MAX_RADIUS = 1.0;

// Main function is async to be able to make the requests
async function main() {
  // Setup the canvas area
  const canvas = document.querySelector('canvas');
  gl = canvas.getContext('webgl2');
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  roadTexture = twgl.createTexture(gl, {
    src: roadTextureImage
  });


  // Prepare the program with the shaders
  colorProgramInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);

  // Initialize the agents model
  await initAgentsModel();

  // Get the agents and obstacles
  await getAgents();
  await getObstacles();
  await getTrafficLights();
  await getDestination();
  await getRoads();


  // Initialize the scene
  setupScene();

  // Position the objects in the scene
  setupObjects(scene, gl, colorProgramInfo);

  // Prepare the user interface
  setupUI();

  // Fisrt call to the drawing loop
  drawScene();
}



function setupScene() {
  let camera = new Camera3D(0,
    10,             // Distance to target
    4,              // Azimut
    0.8,              // Elevation
    [0, 0, 10],
    [0, 0, 0]);
  // These values are empyrical.
  // Maybe find a better way to determine them
  camera.panOffset = [0, 8, 0];
  scene.setCamera(camera);
  scene.camera.setupControls();
}

function setupObjects(scene, gl, programInfo) {

  let light = new Light3D(0, [3, 3, 5],              // Position
                               [0.3, 0.3, 0.3, 1.0],   // Ambient
                               [1.0, 1.0, 1.0, 1.0],   // Diffuse
                               [1.0, 1.0, 1.0, 1.0]);  // Specular
  scene.addLight(light);

  // Create VAOs for the different shapes
  const baseCube = new Object3D(-1);
  baseCube.prepareVAO(gl, programInfo);

  // Modelo para semaforos
  const baseSemaforos = new Object3D(-2);
  baseSemaforos.prepareVAO(gl, programInfo, semaforo);

  const baseDestination = new Object3D(-3);
  baseDestination.prepareVAO(gl, programInfo, destinationBuilding);

  const baseCar = new Object3D(-4);
  baseCar.prepareVAO(gl, programInfo, carros);

  const basetree = new Object3D(-5);
  basetree.prepareVAO(gl, programInfo, arboles);

  const baseWheelPair = new Object3D(-6);
  baseWheelPair.prepareVAO(gl, programInfo, wheels);

  
  // //A scaled cube to use as the ground
  // const ground = new Object3D(-3, [14, 0, 14]);
  // ground.arrays = baseCube.arrays;
  // ground.bufferInfo = baseCube.bufferInfo;
  // ground.vao = baseCube.vao;
  // ground.scale = {x: 50, y: 0.1, z: 50};
  // ground.color = [0.6, 0.6, 0.6, 1];
  // scene.addObject(ground);
  

  // Copy the properties of the base objects
  for (const agent of agents) {
    agent.arrays = baseCar.arrays;
    agent.bufferInfo = baseCar.bufferInfo;
    agent.vao = baseCar.vao;
    agent.scale = { x: 0.3, y: 0.3, z: 0.3 };
    const p = agent.posArray;
    agent.prevPos = [p[0], p[1], p[2]];
    agent.nextPos = [p[0], p[1], p[2]];   // al inicio están en el mismo lugar
   // console.log(agent);
    scene.addObject(agent);

  //   agent.axles = [];

  // // Solo necesitamos offsets en Y y Z (adelante/atrás),
  // // el modelo ya trae la separación en X.
  // const axleOffsets = [
  //   { name: 'front', offset: [0.0, -0.7,  0.35] }, // Eje delantero
  //   { name: 'rear',  offset: [0.0, -0.7, -0.35] }, // Eje trasero
  // ];

  // for (const a of axleOffsets) {
  //   const axle = new Object3D(-10);
  //   axle.arrays = baseWheelPair.arrays;
  //   axle.bufferInfo = baseWheelPair.bufferInfo;
  //   axle.vao = baseWheelPair.vao;

  //   axle.scale = { x: 0.15, y: 0.15, z: 0.15 }; // ajusta al tamaño del carro
  //   axle.color = [0.1, 0.1, 0.1, 1];            // color de llanta
  //   axle.parentAgent = agent;
  //   axle.localOffset = a.offset;
  //   axle.spin = 0;                               // ángulo de giro
  //   axle.isAxle = true;

  //   agent.axles.push(axle);
  //   scene.addObject(axle);
  //}
  }

  // Copy the properties of the base objects
  for (const o of obstacles) {
    o.arrays = basetree.arrays;
    o.bufferInfo = basetree.bufferInfo;
    o.vao = basetree.vao;
    o.scale = { x: 0.55, y: 1.0, z: 0.55 };
    o.color = [0, 1, 0, 1.0];
    scene.addObject(o);
  }

  for (const d of destination) {
    d.arrays = baseDestination.arrays;
    d.bufferInfo = baseDestination.bufferInfo;
    d.vao = baseDestination.vao;
    d.scale = { x: 0.017, y: 0.03, z: 0.017 };
    //d.color = [0.647, 0.165, 0.165, 1];
    scene.addObject(d);
  }

  // for (const r of roads) {
  //   r.arrays = baseCube.arrays;
  //   r.bufferInfo = baseCube.bufferInfo;
  //   r.vao = baseCube.vao;
  //   r.scale = {x: 50, y: 0.1, z: 50};
  //   r.color = [0.6, 0.6, 0.6, 1];
  //   scene.addObject(r);
  // }

  for (const agent of roads) {
    agent.arrays = baseCube.arrays;
    agent.bufferInfo = baseCube.bufferInfo;
    agent.vao = baseCube.vao;
    agent.scale = { x: 0.5, y: 0.1, z: 0.5 };
    agent.color = [0.6, 0.6, 0.6, 1];
    agent.texture = roadTexture;  
    scene.addObject(agent);
  }

  for (const tl of trafficLight) {
    tl.arrays = baseSemaforos.arrays;
    tl.bufferInfo = baseSemaforos.bufferInfo;
    tl.vao = baseSemaforos.vao;
    tl.scale = { x: 0.3, y: 0.3, z: 0.3 };
     let baseColor;
  if (tl.state === 0)       baseColor = [1, 0, 0, 1];     // rojo
  else if (tl.state === 1)  baseColor = [0, 1, 0, 1];     // verde
  else if (tl.state === 2)  baseColor = [1, 1, 0, 1];     // amarillo
  else                      baseColor = [1, 1, 1, 1];     // blanco

  tl.color = baseColor;

  tl.isTrafficLight = true;
  tl.emissiveColor = baseColor;   // si quieres que brille del mismo color

    scene.addObject(tl);
  }

}

function updateAxles(fract) {
  const wheelRadius = 0.15;  // aprox., ajústalo a tu modelo

  for (const agent of agents) {
    if (!agent.prevPos || !agent.nextPos || !agent.axles) continue;

    const dx = agent.nextPos[0] - agent.prevPos[0];
    const dy = agent.nextPos[1] - agent.prevPos[1];
    const dz = agent.nextPos[2] - agent.prevPos[2];

    const t = Math.min((agent.t ?? 0) + fract, 1.0);
    const x = agent.prevPos[0] + dx * t;
    const y = agent.prevPos[1] + dy * t;
    const z = agent.prevPos[2] + dz * t;

    // Rumbo del carro (eje Y)
    const heading = Math.atan2(dx, dz);

    // Distancia recorrida aprox en este frame
    const dist = Math.sqrt(dx*dx + dz*dz) * fract;
    const deltaSpin = (wheelRadius > 0) ? dist / wheelRadius : 0;

    for (const axle of agent.axles) {
      axle.spin = (axle.spin || 0) + deltaSpin;

      // Rotación: giro de llantas + rumbo del carro
      axle.rotRad = axle.rotRad || { x: 0, y: 0, z: 0 };

      // Asumiendo que la rueda gira con eje en Z o X:
      // Si en tu modelo gira sobre X:
      axle.rotRad.x = axle.spin;
      // Si en tu modelo gira sobre Z, usa:
      // axle.rotRad.z = axle.spin;

      axle.rotRad.y = heading; // que apunten como el carro

      const [ox, oy, oz] = axle.localOffset;

      // Offset rotado por el heading (rotación en Y)
      const ax = x + ox * Math.cos(heading) - oz * Math.sin(heading);
      const az = z + ox * Math.sin(heading) + oz * Math.cos(heading);

      axle.posArray[0] = ax;
      axle.posArray[1] = y + oy;
      axle.posArray[2] = az;
    }
  }
}

// Draw an object with its corresponding transformations
function drawObject(gl, programInfo, object, viewProjectionMatrix, fract) {
  // Prepare the vector for translation and scale
  let v3_tra;
  if (object.prevPos && object.nextPos) {
    
    const x = object.prevPos[0] + (object.nextPos[0] - object.prevPos[0]) * fract;
    const y = object.prevPos[1] + (object.nextPos[1] - object.prevPos[1]) * fract;
    const z = object.prevPos[2] + (object.nextPos[2] - object.prevPos[2]) * fract;
    v3_tra = [x, y, z];
    if(object.id == 601){
      //console.log("prevPos:", object.prevPos, "nextPos:", object.nextPos, "ve_tra:", v3_tra);
      console.log("fract:", fract, "ve_tra:", v3_tra);

    }
  } else {
    v3_tra = object.posArray;
  }

  

  //v3_tra = object.posArray;
  let v3_sca = object.scaArray;

  /*
  // Animate the rotation of the objects
  object.rotDeg.x = (object.rotDeg.x + settings.rotationSpeed.x * fract) % 360;
  object.rotDeg.y = (object.rotDeg.y + settings.rotationSpeed.y * fract) % 360;
  object.rotDeg.z = (object.rotDeg.z + settings.rotationSpeed.z * fract) % 360;
  object.rotRad.x = object.rotDeg.x * Math.PI / 180;
  object.rotRad.y = object.rotDeg.y * Math.PI / 180;
  object.rotRad.z = object.rotDeg.z * Math.PI / 180;
  */

  if (object.prevPos && object.nextPos) {
  const dx = object.nextPos[0] - object.prevPos[0];
  const dz = object.nextPos[2] - object.prevPos[2];

  // evita dividir entre 0: sólo si realmente hay movimiento
  if (Math.abs(dx) > 1e-4 || Math.abs(dz) > 1e-4) {
    // si tu carro "apunta" originalmente al eje +Z, esto funciona:
    object.rotRad.y = Math.atan2(dx, dz);
  }
}

  // Create the individual transform matrices
  const scaMat = M4.scale(v3_sca);
  const rotXMat = M4.rotationX(object.rotRad.x);
  const rotYMat = M4.rotationY(object.rotRad.y);
  const rotZMat = M4.rotationZ(object.rotRad.z);
  const traMat = M4.translation(v3_tra);

  // Create the composite matrix with all transformations
  let transforms = M4.identity();
  transforms = M4.multiply(scaMat, transforms);
  transforms = M4.multiply(rotXMat, transforms);
  transforms = M4.multiply(rotYMat, transforms);
  transforms = M4.multiply(rotZMat, transforms);
  transforms = M4.multiply(traMat, transforms);

  object.matrix = transforms;

  // Apply the projection to the final matrix for the
  // World-View-Projection
  const wvpMat = M4.multiply(viewProjectionMatrix, transforms);
  const normalMat = M4.transpose(M4.inverse(object.matrix));


  const defaultShininess = 32.0;

  // Model uniforms
  let objectUniforms = {
    u_transforms: wvpMat,
    u_color: object.color,

    u_world: object.matrix,
    u_worldInverseTransform: normalMat,
    u_worldViewProjection: wvpMat,

    u_ambientColor: object.color,
    u_diffuseColor: object.color,
    u_specularColor: object.color,
    u_shininess: object.shininess ?? defaultShininess,

    u_texture: object.texture,
    u_useTexture: !!object.texture,

    u_isTrafficLight: !!object.isTrafficLight,
    u_emissiveColor: object.emissiveColor || [0, 0, 0, 1],
  }
  twgl.setUniforms(programInfo, objectUniforms);

  gl.bindVertexArray(object.vao);
  twgl.drawBufferInfo(gl, object.bufferInfo);
}

// Function to do the actual display of the objects
async function drawScene() {
  // Compute time elapsed since last frame
  let now = Date.now();
  let deltaTime = now - then;
  elapsed += deltaTime;
  let fract = Math.min(1.0, elapsed / duration);
  then = now;

  // Clear the canvas
  gl.clearColor(0, 0.4, 0.8, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // tell webgl to cull faces
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  scene.camera.checkKeys();
  //console.log(scene.camera);
  const viewProjectionMatrix = setupViewProjection(gl);

  //updateAxles(fract);

  // Draw the objects
  gl.useProgram(colorProgramInfo.program);

  activeTrafficLightCount = 0;

  for (const tl of trafficLight) {
    if (!tl.isTrafficLight) continue;
    if (activeTrafficLightCount >= MAX_TRAFFIC_LIGHTS) break;

    const i = activeTrafficLightCount;

    // 👇 ACTUALIZAR COLOR SEGÚN EL ESTADO *CADA FRAME*
    let baseColor;
    if (tl.state === 0)       baseColor = [1, 0, 0, 1];     // rojo
    else if (tl.state === 1)  baseColor = [0, 1, 0, 1];     // verde
    else if (tl.state === 2)  baseColor = [1, 1, 0, 1];     // amarillo
    else                      baseColor = [1, 1, 1, 1];     // blanco / default

    // esto afecta:
    //  - el modelo del semáforo (u_color, u_emissiveColor en drawObject)
    //  - el halo en el piso (u_trafficLightColors)
    tl.color = baseColor;
    tl.emissiveColor = baseColor;

    const pos = tl.posArray || tl.position || tl.pos || [0, 0, 0];

    activeTraffcLightsPositions[i * 3 + 0] = pos[0];
    activeTraffcLightsPositions[i * 3 + 1] = pos[1];
    activeTraffcLightsPositions[i * 3 + 2] = pos[2];

    const c = tl.emissiveColor || tl.color || [1, 1, 1, 1];
    activeTraffcLightsColors[i * 3 + 0] = c[0];
    activeTraffcLightsColors[i * 3 + 1] = c[1];
    activeTraffcLightsColors[i * 3 + 2] = c[2];

    activeTrafficLightCount++;
  }

  // console.log(trafficLight[0]);
//   console.log("trafficLightCount", activeTrafficLightCount);
// console.log("first TL pos", 
//   activeTraffcLightsPositions[0],
//   activeTraffcLightsPositions[1],
//   activeTraffcLightsPositions[2]
// );

  const MAX_LIGHTS = 2;
  const activeLights = scene.lights.slice(0, MAX_LIGHTS);

  // Flatten de los datos de luces
  const lightPositions = activeLights.map(l => l.posArray).flat();
  const ambientLights  = activeLights.map(l => l.ambient).flat();
  const diffuseLights  = activeLights.map(l => l.diffuse).flat();
  const specularLights = activeLights.map(l => l.specular).flat();

  let globalUniforms = {
    u_viewWorldPosition: scene.camera.posArray,
    u_lightWorldPosition: lightPositions,
    u_ambientLight: ambientLights,
    u_diffuseLight: diffuseLights,
    u_specularLight: specularLights,

    u_trafficLightCount: activeTrafficLightCount,
    u_trafficLightPositions: activeTraffcLightsPositions,
    u_trafficLightColors: activeTraffcLightsColors,
    u_trafficLightMaxRadius: TRAFFIC_LIGHT_MAX_RADIUS,
  };
    twgl.setUniforms(colorProgramInfo, globalUniforms);

  for (let object of scene.objects) {
    drawObject(gl, colorProgramInfo, object, viewProjectionMatrix, fract);
  }

  if (elapsed >= duration) {
    elapsed = 0;
    await update();
  }

  requestAnimationFrame(drawScene);
}

function setupViewProjection(gl) {
  // Field of view of 60 degrees vertically, in radians
  const fov = 60 * Math.PI / 180;
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

  // Matrices for the world view
  const projectionMatrix = M4.perspective(fov, aspect, 1, 200);

  const cameraPosition = scene.camera.posArray;
  const target = scene.camera.targetArray;
  const up = [0, 1, 0];

  const cameraMatrix = M4.lookAt(cameraPosition, target, up);
  const viewMatrix = M4.inverse(cameraMatrix);
  const viewProjectionMatrix = M4.multiply(projectionMatrix, viewMatrix);

  return viewProjectionMatrix;
}

// Setup a ui.
function setupUI() {

  // const gui = new GUI();
  // const lightFolder = gui.addFolder('Lights:');
  // lightFolder.add(settings, 'maxDistance', 0, 200);


  // const gui = new GUI();

  // // Settings for the animation
  // const animFolder = gui.addFolder('Animation:');
  // animFolder.add( settings.rotationSpeed, 'x', 0, 360)
  //     .decimals(2)
  // animFolder.add( settings.rotationSpeed, 'y', 0, 360)
  //     .decimals(2)
  // animFolder.add( settings.rotationSpeed, 'z', 0, 360)
  //     .decimals(2)

}

main();