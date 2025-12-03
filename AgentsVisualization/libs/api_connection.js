/*
 * Functions to connect to an external API to get the coordinates of agents
 *
 * Gilberto Echeverria
 * 2025-11-08
 */


'use strict';

import { Object3D, Car3D } from '../libs/object3d';

// Define the agent server URI
const agent_server_uri = "http://localhost:8585/";

// Initialize arrays to store agents and obstacles
const agents = [];
const obstacles = [];
const roads = [];
const trafficLight = [];
const destination = []

// Define the data object
const initData = {
    NAgents: 20,
    width: 28,
    height: 28
};


/* FUNCTIONS FOR THE INTERACTION WITH THE MESA SERVER */

/*
 * Initializes the agents model by sending a POST request to the agent server.
 */
async function initAgentsModel() {
    try {
        // Send a POST request to the agent server to initialize the model
        let response = await fetch(agent_server_uri + "init", {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
            body: JSON.stringify(initData)
        });

        // Check if the response was successful
        if (response.ok) {
            // Parse the response as JSON and log the message
            let result = await response.json();
            console.log(result.message);
        }

    } catch (error) {
        // Log any errors that occur during the request
        console.log(error);
    }
}

/*
 * Retrieves the current positions of all agents from the agent server.
 */
async function getAgents() {
    try {
        // Send a GET request to the agent server to retrieve the agent positions
        let response = await fetch(agent_server_uri + "getAgents");

        // Check if the response was successful
        if (response.ok) {
            // Parse the response as JSON
            let result = await response.json();

            const positions = result.positions || [];

            const aliveCars = new Set(positions.map(car => car.id));

            for (let i = agents.length - 1; i >= 0; i--) {
                const c = agents[i];
                if (!aliveCars.has(c.id)) {
                    agents.splice(i, 1);
                }
            }

            for (const car of positions) {
                // Create an or update Object3D for each car
                const newPos = [car.x, car.y, car.z]; 

                let obj = agents.find(object3d => object3d.id === car.id);

                if (!obj) {
                    // First create the new car
                    obj = new Car3D(car.id, newPos);;
                    obj.isCar = true;
                    // Initial position
                    obj.serverPos = [...newPos];
                    obj.oldServerPos = [...newPos];

                    // obj.dirrection = car.actualDirection; // Store the direction
                    agents.push(obj);
                } else {
                    // Actualizar Car3D existente
                    if (obj.updateServerPosition) {
                        obj.updateServerPosition(newPos);
                    } else {
                        // fallback por si todavía hubiera algún Object3D viejo
                        obj.oldServerPos = obj.serverPos ? [...obj.serverPos] : [...obj.posArray];
                        obj.serverPos = [...newPos];
                    }

                    obj.setPosition(newPos);
                }
            }
        }

    } catch (error) {
        // Log any errors that occur during the request
        console.log(error);
    }
}

/*
 * Retrieves the current positions of all obstacles from the agent server.
 */
async function getObstacles() {
    try {
        // Send a GET request to the agent server to retrieve the obstacle positions
        let response = await fetch(agent_server_uri + "getObstacles");

        // Check if the response was successful
        if (response.ok) {
            // Parse the response as JSON
            let result = await response.json();

            // Create new obstacles and add them to the obstacles array
            for (const obstacle of result.positions) {
                const newObstacle = new Object3D(obstacle.id, [obstacle.x, obstacle.y-1.6, obstacle.z]);
                obstacles.push(newObstacle);
            }
            // Log the obstacles array
            //console.log("Obstacles:", obstacles);
        }

    } catch (error) {
        // Log any errors that occur during the request
        console.log(error);
    }
}

async function getTrafficLights() {
    try {
        // Send a GET request to the agent server to retrieve the obstacle positions
        let response = await fetch(agent_server_uri + "getTrafficLights");

        // Check if the response was successful
        if (response.ok) {
            // Parse the response as JSON
            let result = await response.json();

            // First time: create the lights
            if (trafficLight.length === 0) {
                for (const tl of result.positions) {
                    const newLight = new Object3D(tl.id, [tl.x, tl.y, tl.z]);
                    newLight.state = tl.state;
                    trafficLight.push(newLight);
                    const newRoad = new Object3D(tl.id, [tl.x, tl.y - 1, tl.z]);
                    roads.push(newRoad);
                }
            } 
            else {
                // Update existing lights
                for (const tl of result.positions) {
                    const existing = trafficLight.find(obj => obj.id == tl.id);

                    if (existing) {
                        existing.position = { x: tl.x, y: tl.y, z: tl.z };
                        existing.state = tl.state;
                    }
                }
            }
        }

    } catch (error) {
        // Log any errors that occur during the request
        console.log(error);
    }
}

async function getDestination() {
    try {
        // Send a GET request to the agent server to retrieve the obstacle positions
        let response = await fetch(agent_server_uri + "getDestination");

        // Check if the response was successful
        if (response.ok) {
            // Parse the response as JSON
            let result = await response.json();

            // Create new obstacles and add them to the obstacles array
            for (const Dest of result.positions) {
                const newDestination = new Object3D(Dest.id, [Dest.x, Dest.y -1, Dest.z]);
                destination.push(newDestination);
            }
            // Log the obstacles array
            //console.log("Obstacles:", obstacles);
        }

    } catch (error) {
        // Log any errors that occur during the request
        console.log(error);
    }
}

async function getRoads() {
    try {
        // Send a GET request to the agent server to retrieve the obstacle positions
        let response = await fetch(agent_server_uri + "getRoads");

        // Check if the response was successful
        if (response.ok) {
            // Parse the response as JSON
            let result = await response.json();

            // Create new obstacles and add them to the obstacles array
            for (const road of result.positions) {
                const newRoad = new Object3D(road.id, [road.x, road.y, road.z]);
                roads.push(newRoad);
            }
            // Log the obstacles array
            //console.log("Obstacles:", obstacles);
        }

    } catch (error) {
        // Log any errors that occur during the request
        console.log(error);
    }
}

/*
 * Updates the agent positions by sending a request to the agent server.
 */
async function update() {
    try {
        // Send a request to the agent server to update the agent positions
        let response = await fetch(agent_server_uri + "update");

        // Check if the response was successful
        if (response.ok) {
            // Retrieve the updated agent positions
            await getAgents();
            await getTrafficLights();
            for (const tl of trafficLight){
                let baseColor;
                if (tl.state === 0)       baseColor = [1, 0, 0, 1];    // rojo
                else if (tl.state === 1)  baseColor = [0, 1, 0, 1];    // verde
                else if (tl.state === 2)  baseColor = [1, 1, 0, 1];    // amarillo
                else                      baseColor = [1, 1, 1, 1];    // blanco

                tl.color = baseColor;
            }
            // Log a message indicating that the agents have been updated
            //console.log("Updated agents");
        }

    } catch (error) {
        // Log any errors that occur during the request
        console.log(error);
    }
}

export { agents, obstacles, trafficLight, destination, roads, initAgentsModel, update, getAgents, getObstacles, getTrafficLights, getDestination, getRoads };