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
        self.carros_llegados = 0 # Contador de carros que han llegado a su destino


        # Load the map dictionary. The dictionary maps the characters in the map file to the corresponding agent.
        base_path = os.path.dirname(__file__)
        dataDictionary = json.load(open(os.path.join(base_path, "city_files/mapDictionary.json")))

        self.num_agents = N
        self.traffic_lights = []

        # Load the map file. The map file is a text file where each character represents an agent.
        with open(os.path.join(base_path, "city_files/2023_base.txt")) as baseFile:
            lines = baseFile.readlines()
            lines = [line.strip() for line in lines]  # Strip todas las líneas para evitar espacios en blanco
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

        # Buscar carreteras cerca de las esquinas para spawneo
        self.spawn_points = self.encontrar_spawn_points()
        
        # Crear los primeros 4 agentes al inicio
        for i in range(min(4, len(self.spawn_points))):
            cell = self.spawn_points[i]
            agent = Car(self, cell)

        self.running = True

    def encontrar_spawn_points(self):
        """Encuentra carreteras cerca de las esquinas para spawneo"""
        esquinas = [
            (0, 0),
            (self.width - 1, 0),
            (0, self.height - 1),
            (self.width - 1, self.height - 1)
        ]
        
        spawn_points = []
        for esquina in esquinas:
            # buscar carretera cercana a cada esquina
            x, y = esquina
            mejor_road = None
            mejor_distancia = float('inf')
            
            # buscar en un radio de 5 celdas
            for dx in range(-5, 6):
                for dy in range(-5, 6):
                    nx, ny = x + dx, y + dy
                    if (0 <= nx < self.width and 0 <= ny < self.height):
                        cell = self.grid[(nx, ny)]
                        # verificar si tiene Road
                        for agent in cell.agents:
                            if isinstance(agent, Road):
                                distancia = abs(dx) + abs(dy)
                                if distancia < mejor_distancia:
                                    mejor_distancia = distancia
                                    mejor_road = cell
                                break
            
            if mejor_road:
                spawn_points.append(mejor_road)
        
        return spawn_points if spawn_points else [self.grid[(0, 0)]]  # fallback

    def step(self):
        """Advance the model by one step."""
        
        # Crear 4 nuevos agentes cada 10 steps
        if self.steps % 10 == 0 and self.steps > 0:
            for i in range(min(4, len(self.spawn_points))):
                cell = self.spawn_points[i]
                agent = Car(self, cell)
        
        self.agents.shuffle_do("step")