from mesa import Model
from mesa.discrete_space import OrthogonalMooreGrid
from .agent import *
import json
import os


class CityModel(Model):
    """
    Creates a model based on a city map.

    Args:
        N: Number of agents in the simulation
        seed: Random seed for the model
    """

    def __init__(self, N, seed=4):

        super().__init__(seed=seed)
        self.carros_llegados = 0


        # Load the map dictionary. The dictionary maps the characters in the map file to the corresponding agent.
        base_path = os.path.dirname(__file__)
        dataDictionary = json.load(open(os.path.join(base_path, "city_files/mapDictionary.json")))

        self.num_agents = N
        self.traffic_lights = []

        # Load the map file. The map file is a text file where each character represents an agent.
        with open(os.path.join(base_path, "city_files/2025_base.txt")) as baseFile:
            lines = baseFile.readlines()
            self.width = len(lines[0])
            self.height = len(lines)

            self.grid = OrthogonalMooreGrid(
                [self.width, self.height], capacity=100, torus=False
            )

            # Goes through each character in the map file and creates the corresponding agent.
            for r, row in enumerate(lines):
                for c, col in enumerate(row):

                    cell = self.grid[(c, self.height - r - 1)]

                    if col in ["v", "^", ">", "<"]:
                        agent = Road(self, cell, dataDictionary[col])

                    elif col in ["S", "s"]:
                        agent = Traffic_Light(
                            self,
                            cell,
                            0 if col == "S" else 1,
                        )
                        self.traffic_lights.append(agent)

                    elif col == "#":
                        agent = Obstacle(self, cell)

                    elif col == "D":
                        agent = Destination(self, cell)

        for y in range(self.height):
            for x in range(self.width):
                cell = self.grid[(x, y)]
                if len(cell.agents) == 0:
                    # buscar celda a la izquierda
                    if x > 0:
                        cell_izquierda = self.grid[(x - 1, y)]
                        # copiar el tipo de agente de la izquierda
                        for agent_izq in cell_izquierda.agents:
                            if isinstance(agent_izq, Road):
                                # copiar road con la misma dirección
                                agent = Road(self, cell, agent_izq.direction)
                            elif isinstance(agent_izq, Obstacle):
                                agent = Obstacle(self, cell)
                            elif isinstance(agent_izq, Destination):
                                agent = Destination(self, cell)
                            elif isinstance(agent_izq, Traffic_Light):
                                # copiar semaforo con el mismo estado
                                agent = Traffic_Light(self, cell, agent_izq.state, agent_izq.timeToChange)
                                self.traffic_lights.append(agent)

        # Guardamos las esquinas para usar después
        self.esquinas = [
            self.grid[(0, 0)], # esquina inferior izquierda                          
            self.grid[(self.width - 2, 0)], # esquina inferior derecha             
            self.grid[(0, self.height - 1)], # esquina superior izquierda            
            self.grid[(self.width - 2, self.height - 1)] # esquina superior derecha
        ]
        
        # Crear los primeros 4 agentes al inicio
        for i in range(4):
            cell = self.esquinas[i % 4]
            agent = Car(self, cell)

        self.running = True

    def step(self):
        """Advance the model by one step."""
        
        # Crear 4 nuevos agentes cada ciertos steps
        if self.steps % 10== 0 and self.steps > 0:
            for i in range(4):
                cell = self.esquinas[i % 4]
                agent = Car(self, cell)
        
        self.agents.shuffle_do("step")