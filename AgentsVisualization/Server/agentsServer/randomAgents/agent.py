from mesa.discrete_space import CellAgent, FixedAgent
import heapq # importamos heapq para manejar la cola de prioridad en A*


#empezaremos definiendo la clase de a*
class AStar: #clase AStar que implementa el algoritmo A* para que nuestosmros carros encuentren el camino optimo, como un tipo waze
    #definimos a nuestra funcion heuristica en donde recibimos dos celdas y calculamos la distancia manhatan entre ellas
    def heuristica(celda1, celda2):
        x1, y1 = celda1.coordinate
        x2, y2 = celda2.coordinate
        return abs(x1 - x2) + abs(y1 - y2)
    
    # definimos la funcion buscar_camino que encuentra el camino optimo usando A* hacia el objetivo mas cercano
    def buscar_camino(inicio, objetivos):
        if not objetivos:
            return []
        
        # selecciona el objetivo mas cercano usando la heuristica
        objetivo = min(objetivos, key=lambda c: AStar.heuristica(inicio, c)) # minimiza la distancia heuristica
        open_set = [(0, id(inicio), inicio)] # conjunto de nodos por explorar, usando una cola de prioridad
        came_from = {} # para rastrear el camino
        g_score = {inicio: 0}# costo desde el inicio hasta el nodo actual
        
        # loop principal de A* que expande nodos hasta encontrar el objetivo
        while open_set: 
            _, _, current = heapq.heappop(open_set) # obtiene el nodo con el costo  mas bajo
            
            if current == objetivo:
                camino = []
                while current in came_from:
                    camino.append(current)
                    current = came_from[current]
                return list(reversed(camino))
            
            # explora vecinos del nodo actual
            for vecino in current.neighborhood:
                # verifica si hay obstaculos en el vecino
                if any(isinstance(agent, Obstacle) for agent in vecino.agents): # si hay obstaculos, no se puede pasar 
                    continue
                tentative_g = g_score[current] + 1 #
                
                # si encontramos un camino mejor al vecino
                if vecino not in g_score or tentative_g < g_score[vecino]:
                    came_from[vecino] = current
                    g_score[vecino] = tentative_g
                    f_score = tentative_g + AStar.heuristica(vecino, objetivo)
                    heapq.heappush(open_set, (f_score, id(vecino), vecino))
    
        return []



class Car(CellAgent):
    """
    Agent that moves randomly.
    """
    def __init__(self, model, cell):
        """
        Creates a new random agent.
        Args:
            model: Model reference for the agent
            cell: The initial position of the agent
        """
        super().__init__(model)
        self.cell = cell
        self.direction = None  # guarda la direccion actual del carro

    def step(self):
        """ 
        Determines the new direction it will take, and then moves
        """
        # buscar la carretera en la celda actual
        road = None
        for agent in self.cell.agents:
            if isinstance(agent, Road):
                road = agent
                break
        
        # si hay carretera, actualizar la direccion
        if road is not None:
            self.direction = road.direction
        
        # si no tenemos direccion, no podemos movernos
        if self.direction is None:
            return
        
        # calcular la siguiente posicion segun la direccion
        x, y = self.cell.coordinate
        
        if self.direction == "Up":
            next_pos = (x, y + 1)
        elif self.direction == "Down":
            next_pos = (x, y - 1)
        elif self.direction == "Right":
            next_pos = (x + 1, y)
        elif self.direction == "Left":
            next_pos = (x - 1, y)
        else:
            return
        
        # verificar que la siguiente posicion este dentro del grid
        if (0 <= next_pos[0] < self.model.grid.dimensions[0] and 
            0 <= next_pos[1] < self.model.grid.dimensions[1]):
            next_cell = self.model.grid[next_pos]
            
            # verificar que no haya obstaculos en la siguiente celda
            hay_obstaculo = any(isinstance(agent, Obstacle) for agent in next_cell.agents)
            
            if hay_obstaculo:
                return
            
            # verificar semaforos: si hay semaforo rojo o amarillo, detenerse
            for agent in next_cell.agents:
                if isinstance(agent, Traffic_Light):
                    if agent.state == 0 or agent.state == 2:  # rojo o amarillo
                        return  # no moverse
            
            # si todo esta bien, moverse
            self.cell = next_cell

class Traffic_Light(FixedAgent):
    """
    Traffic light. Where the traffic lights are in the grid.
    """
    def __init__(self, model, cell, state = 0, timeToChange = 10):
        """
        Creates a new Traffic light.
        Args:
            model: Model reference for the agent
            cell: The initial position of the agent
            state: Traffic light state (0=red, 1=green, 2=yellow)
            timeToChange: After how many step should the traffic light change color 
        """
        super().__init__(model)
        self.cell = cell
        self.state = state
        self.timeToChange = timeToChange

    def step(self):
        """ 
        To change the state (green, yellow, or red) of the traffic light.
        """
        if self.model.steps % self.timeToChange == 0:
            self.state = (self.state + 1) % 3 # para cambiar entre 0,1,2 para el semaforo

class Destination(FixedAgent):
    """
    Destination agent. Where each car should go.
    """
    def __init__(self, model, cell):
        """
        Creates a new destination agent
        Args:
            model: Model reference for the agent
            cell: The initial position of the agent
        """
        super().__init__(model)
        self.cell = cell

class Obstacle(FixedAgent):
    """
    Obstacle agent. Just to add obstacles to the grid.
    """
    def __init__(self, model, cell):
        """
        Creates a new obstacle.
        
        Args:
            model: Model reference for the agent
            cell: The initial position of the agent
        """
        super().__init__(model)
        self.cell = cell

class Road(FixedAgent):
    """
    Road agent. Determines where the cars can move, and in which direction.
    """
    def __init__(self, model, cell, direction= "Left"):
        """
        Creates a new road.
        Args:
            model: Model reference for the agent
            cell: The initial position of the agent
        """
        super().__init__(model)
        self.cell = cell
        self.direction = direction