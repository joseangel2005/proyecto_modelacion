/*
 * Functions to connect to an external API to get the coordinates of agents
 *
 * Gilberto Echeverria
 * 2025-11-08
 */


'use strict';

import { Object3D } from '../libs/object3d';

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

            // Log the agent positions
            //console.log("getAgents positions: ", result.positions)

            // Check if the agents array is empty
            if (agents.length == 0) {
                // Create new agents and add them to the agents array
                for (const agent of result.positions) {
                    const newAgent = new Object3D(agent.id, [agent.x, agent.y, agent.z]);
                    // Store the initial position
                    newAgent['oldPosArray'] = newAgent.posArray;
                    agents.push(newAgent);
                }
                // Log the agents array
                //console.log("Agents:", agents);

            } else {
                // Update the positions of existing agents
                for (const agent of result.positions) {
                    const current_agent = agents.find((object3d) => object3d.id == agent.id);

                    // Check if the agent exists in the agents array
                    if(current_agent != undefined){
                        // Update the agent's position
                        current_agent.oldPosArray = current_agent.posArray;
                        current_agent.position = {x: agent.x, y: agent.y - 0.5, z: agent.z};

                        const dx = current_agent.posArray[0] - current_agent.oldPosArray[0];
                        const dz = current_agent.posArray[2] - current_agent.oldPosArray[2];

                        current_agent.isStopped = (Math.abs(dx) < 0.001 && Math.abs(dz) < 0.001);
                    }

                    //console.log("OLD: ", current_agent.oldPosArray,
                    //            " NEW: ", current_agent.posArray);
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
                if (!tl.light) continue;   // por si aún no se creó la luz

                let baseColor;
                if (tl.state === 0)       baseColor = [1, 0, 0, 1];    // rojo
                else if (tl.state === 1)  baseColor = [0, 1, 0, 1];    // verde
                else if (tl.state === 2)  baseColor = [1, 1, 0, 1];    // amarillo
                else                      baseColor = [1, 1, 1, 1];    // blanco

                tl.color = baseColor;

                // Escalamos el color para ambient/diffuse/specular
                tl.light.ambient  = [
                    0.1 * baseColor[0],
                    0.1 * baseColor[1],
                    0.1 * baseColor[2],
                    1.0
                ];

                tl.light.diffuse  = [
                    0.6 * baseColor[0],
                    0.6 * baseColor[1],
                    0.6 * baseColor[2],
                    1.0
                ];

                tl.light.specular = [
                    baseColor[0],
                    baseColor[1],
                    baseColor[2],
                    1.0
                ];
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