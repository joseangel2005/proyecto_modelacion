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
import { Object3D, Car3D } from '../libs/object3d';
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
import vsTextureGLSL from "../assets/shaders/vs_flat_textures.glsl?raw";
import fsTextureGLSL from "../assets/shaders/fs_flat_textures.glsl?raw";

import destinationBuilding from '../assets/models/edificio.obj?raw';
import semaforo from '../assets/models/semaforo.obj?raw'
import carros from '../assets/models/Car-nowheels.obj?raw'
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
const duration = 500; // ms
let elapsed = 0;
let then = 0;
let roadTexture;
let baseCarModel;
let baseWheelPairModel; 

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
    min: gl.NEAREST,
    mag: gl.NEAREST,
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

  baseCarModel = baseCar;

  const basetree = new Object3D(-5);
  basetree.prepareVAO(gl, programInfo, arboles);

  const baseWheelPair = new Object3D(-6);
  baseWheelPair.prepareVAO(gl, programInfo, wheels);

  baseWheelPairModel = baseWheelPair;

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
    scene.addObject(d);
  }

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
  tl.emissiveColor = baseColor; 

    scene.addObject(tl);
  }

  createCarObjects();

}

// Function to synchronize car objects in the scene with the cars array in the API connection
function createCarObjects() {

  const aliveCars = new Set(agents.map(car => car.id));

  // Remove cars that are no longer present
  scene.objects = scene.objects.filter(obj => {
    if (!obj.isCar) return true; // if an object is not a car, keep it 
    return aliveCars.has(obj.id); // keep only cars that haven't get to their destination
  });

  for (let i = 0; i < agents.length; i++) {
    let car = agents[i];

    // Por si por alguna razón quedó algún Object3D viejo, lo convertimos a Car3D
    if (!(car instanceof Car3D)) {
      const newCar = new Car3D(car.id, car.posArray);
      // copiar estado básico
      newCar.serverPos = car.serverPos || [...car.posArray];
      newCar.oldServerPos = car.oldServerPos || [...car.posArray];
      agents[i] = newCar;
      car = newCar;
    }

    // Asignar el modelo del carro
    if (baseCarModel) {
      car.setupFromBase(baseCarModel);
    }

    // Crear llantas si aún no existen
    if (baseWheelPairModel) {
      car.addAxlesFromBase(baseWheelPairModel, scene);
    }

    // Agregar el carro a la escena si no está
    if (!scene.objects.includes(car)) {
      scene.addObject(car);
    }
  }
}

function updateAxles(fract) {
  const wheelRadius = 0.15;

  for (const agent of agents) {
    if (!agent.axles || !agent.oldServerPos || !agent.serverPos) continue;

    const a = agent.oldServerPos || agent.serverPos;
    const b = agent.serverPos;

    const carInterpPos = [
      a[0] + (b[0] - a[0]) * fract,
      0.1,
      a[2] + (b[2] - a[2]) * fract,
    ];

    agent.setPosition(carInterpPos);

    const dx = b[0] - a[0];
    const dz = b[2] - a[2];

    const seMueve = 1e-4;
    if (Math.abs(dx) > seMueve || Math.abs(dz) > seMueve) {
      const heading = Math.atan2(dx, dz);
      agent.rotRad.y = heading;
    }

    const dist = Math.sqrt(dx * dx + dz * dz) * fract;
    const deltaSpin = (wheelRadius > 0) ? dist / wheelRadius : 0;

    for (const axle of agent.axles) {
      axle.spin = (axle.spin || 0) + deltaSpin;
      axle.rotRad = axle.rotRad || { x: 0, y: 0, z: 0 };
      axle.rotRad.x = axle.spin;
      axle.rotRad.y = 0; // opcional
    }
  }
}

// Draw an object with its corresponding transformations
function drawObject(gl, programInfo, object, viewProjectionMatrix, fract) {

  let transforms;

  if (object.isAxle && object.parentAgent) {
    const parent = object.parentAgent;

    // Matriz del carro
    const p_rotXMat = M4.rotationX(parent.rotRad.x);
    const p_rotYMat = M4.rotationY(parent.rotRad.y);
    const p_rotZMat = M4.rotationZ(parent.rotRad.z);
    const p_traMat = M4.translation(parent.posArray);

    let parentMat = M4.identity();
    parentMat = M4.multiply(p_rotXMat, parentMat);
    parentMat = M4.multiply(p_rotYMat, parentMat);
    parentMat = M4.multiply(p_rotZMat, parentMat);
    parentMat = M4.multiply(p_traMat, parentMat);

    // Matriz SOLO de las llantas
    const v3_localTra = object.localOffset || [0, 0, 0];
    const c_scaMat = M4.scale(object.scaArray);
    const c_rotXMat = M4.rotationX(object.rotRad.x); // spin
    const c_rotYMat = M4.rotationY(object.rotRad.y); // por si después quieres dirección
    const c_rotZMat = M4.rotationZ(object.rotRad.z);
    const c_traMat = M4.translation(v3_localTra);

    let childMat = M4.identity();
    childMat = M4.multiply(c_scaMat, childMat);
    childMat = M4.multiply(c_rotXMat, childMat);
    childMat = M4.multiply(c_rotYMat, childMat);
    childMat = M4.multiply(c_rotZMat, childMat);
    childMat = M4.multiply(c_traMat, childMat);

    //Mundo = Carro * LocalLlantas
    transforms = M4.multiply(parentMat, childMat);

  } else {
    // Cualquier objeto de scene
    const v3_tra = object.posArray;
    const v3_sca = object.scaArray;

    const scaMat = M4.scale(v3_sca);
    const rotXMat = M4.rotationX(object.rotRad.x);
    const rotYMat = M4.rotationY(object.rotRad.y);
    const rotZMat = M4.rotationZ(object.rotRad.z);
    const traMat = M4.translation(v3_tra);

    transforms = M4.identity();
    transforms = M4.multiply(scaMat, transforms);
    transforms = M4.multiply(rotXMat, transforms);
    transforms = M4.multiply(rotYMat, transforms);
    transforms = M4.multiply(rotZMat, transforms);
    transforms = M4.multiply(traMat, transforms);
  }

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

  updateAxles(fract);

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
    createCarObjects();
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