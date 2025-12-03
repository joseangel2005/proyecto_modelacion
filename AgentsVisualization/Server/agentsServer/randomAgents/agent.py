from mesa.discrete_space import CellAgent, FixedAgent # importar CellAgent y FixedAgent de mesa
import random # importar random para selecciones aleatorias
import heapq # importar heapq para la gestion de la cola de prioridad en A*

#con esta clase podemos hacer que a* tenga un mejor proposito en vez de solo contar celdas
class CalculadorCostos:
    """Clase para calcular costos de movimiento"""
    @staticmethod # lo usamos para usar directo sin crear objetos
    def calcular(celda, destino_propio=None):
        costo = 1  # costo base
        
        # contar carros en la vecindad
        carros_cercanos = 0
        for vecino in celda.neighborhood:
            carros_en_vecino = sum(1 for agent in vecino.agents if isinstance(agent, Car))
            carros_cercanos += carros_en_vecino
        
        # aplicar costo por congestion
        if carros_cercanos == 2:
            costo += 10
        elif carros_cercanos >= 3:
            costo += 20
        
        # aplicar costo por semaforo
        for agent in celda.agents:
            if isinstance(agent, Traffic_Light):
                if agent.state == 2:  # amarillo
                    costo += 30
                elif agent.state == 0:  # rojo
                    costo += 50
            # aplicar costo altisimo a destinos ajenos para que los evite
            if isinstance(agent, Destination) and celda != destino_propio:
                costo += 100000000000000000000000000000000000000000000000 
        
        return costo


class AStar: # clase para manejar la logica de A*
    @staticmethod #basicamente usamos esto para que la clase sea estatica y no haya que crear objetos 
    def heuristica(celda1, celda2): 
        x1, y1 = celda1.coordinate
        x2, y2 = celda2.coordinate
        return abs(x1 - x2) + abs(y1 - y2)
      
    @staticmethod #basicamente usamos esto para que la clase sea estatica y no haya que crear objetos
    def buscar_camino(inicio, objetivos, model, destino_propio=None): # calcula ruta optima al destino usando A* y si no hay ruta retorna lista vacia
        if not objetivos: 
            return []
        
        objetivo = random.choice(objetivos) # agarrar el destino aleatorio
        """""
        f(n) = c(n) + h(n)
        c(n) = g_score -> costo desde inicio hasta n
        h(n) = heuristica -> |x2-x1| + |y2-y1|
        """""

        open_set = [(0, id(inicio), inicio)]  # lista de nodos por explorar
        came_from = {}  
        g_score = {inicio: 0}  # c(n) inicial
        f_score = {inicio: AStar.heuristica(inicio, objetivo)}  # f(n) inicial
        
        while open_set: # mientras haya nodos por explorar
            _, _, current = heapq.heappop(open_set) # nodo con menor costo 
            
            # llegamos al objetivo/ destino
            if current == objetivo:
                camino = []
                while current in came_from:
                    camino.append(current)
                    current = came_from[current]
                return list(reversed(camino))
            
            # obtener vecinos/lugares a donde se puede mover  permitidos segun direccion de la carretera 
            vecinos_permitidos = AStar.obtener_vecinos_permitidos(current, model)
            
            for vecino in vecinos_permitidos:
                # verifica obstaculos
                if any(isinstance(agent, Obstacle) for agent in vecino.agents):
                    continue
                
                # calcular c(n) usando CalculadorCostos (ahora con destino_propio)
                costo_vecino = CalculadorCostos.calcular(vecino, destino_propio)
                tentative_g = g_score[current] + costo_vecino
                
                # buscar mejor camino 
                if vecino not in g_score or tentative_g < g_score[vecino]:
                    came_from[vecino] = current
                    g_score[vecino] = tentative_g  # c(n)
                    # f(n) = c(n) + h(n)
                    f_score_vecino = tentative_g + AStar.heuristica(vecino, objetivo)
                    heapq.heappush(open_set, (f_score_vecino, id(vecino), vecino))
        
        return [] 
    
    @staticmethod  #basicamente usamos esto para que la clase sea estatica y no haya que crear objetos
    def obtener_vecinos_permitidos(celda, model): # obtiene los vecinos permitidos segun la direccion de la carretera
        road = None 
        for agent in celda.agents:
            if isinstance(agent, Road):
                road = agent
                break
        
        if road is None: # si en dado caso no es una carretera retorna a todos las celdas vecinas para evitar errores y que se quede atascado
            return list(celda.neighborhood)
        
        # obtener la direccion de la carretera
        direccion = road.direction
        x, y = celda.coordinate
        vecinos_permitidos = []
        
        # calcular la siguiente posicion segun la direccion aprovechar los dos carriles 
        if direccion == "Up": # rotar carro 90 
            posiciones = [(x, y + 1),  # adelante
                          (x - 1, y + 1), # diagonal izquierda
                          (x + 1, y + 1)] # diagonal derecha
        elif direccion == "Down": # rotar carro 270 
            posiciones = [(x, y - 1), # abajo
                          (x - 1, y - 1), # diagonal izquierda
                          (x + 1, y - 1)] # diagonal derecha
        elif direccion == "Right": # rotar carro 0 
            posiciones = [(x + 1, y), # derecha
                          (x + 1, y + 1), # diagonal arriba
                          (x + 1, y - 1)] # diagonal abajo
        elif direccion == "Left": # rotar carro 180 
            posiciones = [(x - 1, y), # izquierda
                          (x - 1, y + 1), # diagonal arriba
                          (x - 1, y - 1)] # diagonal abajo
        else:
            return []
        
        # verificar que la posicion este dentro del grid
        for next_pos in posiciones:
            if (0 <= next_pos[0] < model.grid.dimensions[0] and 
                0 <= next_pos[1] < model.grid.dimensions[1]):
                next_cell = model.grid[next_pos]
                # verificar que no haya obstaculos
                hay_obstaculo = any(isinstance(agent, Obstacle) for agent in next_cell.agents)
                if not hay_obstaculo:
                    vecinos_permitidos.append(next_cell)
        
        return vecinos_permitidos


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
        self.cell = cell # posicion inicial del carro
        self.direction = "Right"  # direccion inicial del carro (0 grados)
        self.destino = None  # destino aleatorio del carro
        self.camino = []  # ruta calculada por A*
        self.camino_calculado = False  # para saber si ya se calculo el camino
        self.pasos_sin_mover = 0  # contador para detectar carros atascados
        self.pasos_desde_recalculo = 0  # contador para recalcular ruta

    def elegir_objetivo(self): #elegimos destino
        destinos = [agent.cell for agent in self.model.agents if isinstance(agent, Destination)]
        if destinos:
            return random.choice(destinos)
        return None
    
    def inicializar_destino(self): #asigna destino aleatorio y calcula  A*
        if not self.camino_calculado:
            self.destino = self.elegir_objetivo()
            if self.destino:
                self.camino = AStar.buscar_camino(self.cell, [self.destino], self.model, self.destino)
                self.camino_calculado = True  # marca que ya se calculo
    
    def actualizar_direccion(self, next_cell): # AQUI PARA LAS DIRECCIONES
        """
        Actualiza la direccion del carro segun el movimiento para rotacion 3D
        Up = 90 grados, Down = 270 grados, Right = 0 grados, Left = 180 grados
        """
        x_actual, y_actual = self.cell.coordinate # posicion actual
        x_next, y_next = next_cell.coordinate # siguiente posicion
        
        dx = x_next - x_actual 
        dy = y_next - y_actual
        
        # determinar direccion segun el movimiento para rotar en 3D
        if dy > 0:  # movimiento hacia arriba
            self.direction = "Up"  # rotar carro 90 grados en 3D
        elif dy < 0:  # movimiento hacia abajo
            self.direction = "Down"  # rotar carro 270 grados (o -90) en 3D
        elif dx > 0:  # movimiento hacia derecha
            self.direction = "Right"  # rotar carro 0 grados en 3D
        elif dx < 0:  # movimiento hacia izquierda
            self.direction = "Left"  # rotar carro 180 grados en 3D
    
    def obtener_carriles_alternativos(self):
        # obtener solo las diagonales para el cambio de carril
        x, y = self.cell.coordinate
        road = None
        for agent in self.cell.agents:
            if isinstance(agent, Road):
                road = agent
                break
        
        if road is None: # si en dado caso no es una carretera retorna lista vacia
            return []
        
        direccion = road.direction # obtener la direccion de la carretera
        carriles = [] # lista para almacenar las posiciones de los carriles alternativos
        
        # solo las diagonales, no el movimiento hacia adelante
        if direccion == "Up":
            carriles = [(x - 1, y + 1), (x + 1, y + 1)]  # diagonales
        elif direccion == "Down":
            carriles = [(x - 1, y - 1), (x + 1, y - 1)]  # diagonales
        elif direccion == "Right":
            carriles = [(x + 1, y + 1), (x + 1, y - 1)]  # diagonales
        elif direccion == "Left":
            carriles = [(x - 1, y + 1), (x - 1, y - 1)]  # diagonales
        
        # verificar que esten dentro del grid
        carriles_validos = []
        for pos in carriles:
            if (0 <= pos[0] < self.model.grid.dimensions[0] and 
                0 <= pos[1] < self.model.grid.dimensions[1]):
                cell = self.model.grid[pos]
                # verificar que no haya obstaculos ni destinos ajenos
                hay_obstaculo = any(isinstance(agent, Obstacle) for agent in cell.agents)
                hay_destino_ajeno = any(isinstance(agent, Destination) and cell != self.destino for agent in cell.agents)
                if not hay_obstaculo and not hay_destino_ajeno:
                    carriles_validos.append(cell)
        
        return carriles_validos

    def step(self): #definimos el paso del carro
        """ 
        Determines the new direction it will take, and then moves
        """
        # inicializar destino aleatorio si no se ha hecho
        if not self.camino_calculado:
            self.inicializar_destino()
            if not self.camino:
                return
        
        # verificar si llegamos al destino y desaparecer
        if self.cell == self.destino:
            self.model.carros_llegados += 1
            print(f"Carros que llegaron a destino: {self.model.carros_llegados}")
            self.remove()
            return
        
        # recalcular ruta cada ciertos pasos para adaptarse al trafico
        self.pasos_desde_recalculo += 1
        if self.pasos_desde_recalculo >= 7 and random.random() < 0.3: # con cada 7 pasos hay 30% de probabilidad de que los carro recalculen su ruta solo el 30 % de ellos lo hacen de manera aleatoria 
            self.pasos_desde_recalculo = 0
            if not self.camino:
                return
        
        # seguir el camino de A*
        if self.camino:
            next_cell = self.camino[0]
            
            # verificar que no haya otro carro en la siguiente celda
            hay_carro = any(isinstance(agent, Car) for agent in next_cell.agents)
            
            # verificar semaforos
            hay_semaforo_rojo = False
            for agent in next_cell.agents:
                if isinstance(agent, Traffic_Light):
                    if agent.state == 0 or agent.state == 2:  # rojo o amarillo
                        hay_semaforo_rojo = True
                        break
            
            # si hay carro bloqueando, intentar cambiar de carril
            if hay_carro and not hay_semaforo_rojo:
                carriles = self.obtener_carriles_alternativos()
                # ordenar carriles por cantidad de carros (menos carros primero)
                carriles.sort(key=lambda c: sum(1 for a in c.agents if isinstance(a, Car)))
                
                for carril in carriles:
                    # verificar que el carril este libre
                    tiene_carro = any(isinstance(agent, Car) for agent in carril.agents)
                    if not tiene_carro:
                        # actualizar direccion del carro para rotacion 3D antes de cambiar de carril
                        self.actualizar_direccion(carril)
                        # cambiar de carril
                        self.cell = carril
                        self.pasos_sin_mover = 0
                        return
                
                # si no hay carril libre, quedarse quieto
                self.pasos_sin_mover += 1
                return
            
            # si hay semaforo rojo, recalcular y quedarse quieto
            if hay_semaforo_rojo:
                self.camino = AStar.buscar_camino(self.cell, [self.destino], self.model, self.destino)
                self.pasos_sin_mover += 1
                return
            
            # actualizar direccion del carro para rotacion 3D antes de moverse
            self.actualizar_direccion(next_cell)
            self.cell = next_cell
            self.camino.pop(0)
            self.pasos_sin_mover = 0
            
class Traffic_Light(FixedAgent): #clase de semaforo
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
        super().__init__(model) # llamar al constructor de la clase padre
        self.cell = cell # posicion inicial del semaforo
        self.state = state# estado inicial del semaforo
        self.timeToChange = timeToChange # tiempo para cambiar de estado

    def step(self): # definimos el paso del semaforo
        """ 
        To change the state (green, yellow, or red) of the traffic light.
        """
        if self.model.steps % self.timeToChange == 0: #si se cumple el tiempo para cambiar de estado
            self.state = (self.state + 1) % 3

class Destination(FixedAgent): # clase de destino
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

class Obstacle(FixedAgent): # clase de obstaculo que no se mueven los edificios
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

class Road(FixedAgent): #clase de carretera
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