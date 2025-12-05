# Reto Movilidad Urbana
Proyecto de modelación de sistemas multiagentes con gráficas computacionales TC2008B.302
- Descripcion:
En el desarrollo de este proyecto se realizara una grafica gráfica en 3D de tráfico urbano con sistemas multiagentes, en donde se modelen el comportamiento de  automóviles y su interacción en entornos urbanos. 
- Nombre de los integrantes: 
  . Rebeca Dávila Araiza
  . Jose Angel De La Cruz Alonso

  [Video de la simulacion](https://drive.google.com/file/d/18-djgsqUN-M9Oj3pxzoy3xDycT-NyNnz/view?usp=sharing)

  (El video se ve cortado al ejecutar el programa mientras grababa, pero los carros se mueven de forma fluida en la simulacion al ejecutarla)

## Instalación del proyecto
#### 1. Clonar el repositorio
   ```
   git clone git@github.com:joseangel2005/proyecto_modelacion.git
   ```

#### 2. Crear Entorno virtual agents
  ```
   python -m venv .agents
   ```
#### 3. Activar el entorno virtual
   ```
   source .agents/bin/activate (En Mac o Linux)
    ./.agents/Scripts/activate (En Windows)
    deactivate (Para desactivar)
   ```
#### 4. Instalar dependencias
  ```
  pip install -U "mesa[all]" (dependencias de mesa)
  npm install (dependencias de node)
  ```

## Ejecución del proyecto

### Ejecución de la simulacion en solara
#### 1. Activar el entorno virtual
   ```
   source .agents/bin/activate (En Mac o Linux)
    ./.agents/Scripts/activate (En Windows)
   ```

#### 2. Ingresar a las siguientes carpetas
  ```
    cd AgentsVisualization
    cd Server
    cd agentsServer
  ```
#### 3. Correr el programa de solara
   ```
    solara run app.py
   ```

### Ejecución de la simulacion en 3D
#### 1. Activar el entorno virtual en dos terminales diferentes (una para el front end y la otra para mesa)
   ```
   source .agents/bin/activate (En Mac o Linux)
    ./.agents/Scripts/activate (En Windows)
   ```

#### 2. Ingresar a las siguientes carpetas
Terminal Front End
  ```
    cd AgentsVisualization
  ```
Terminal mesa
   ```
    cd AgentsVisualization
    cd Server
    cd agentsServer
  ```
#### 3. Correr el programa
Primero en la terminal de Front End se ejecuta el programa:
   ```
    npx vite
  ```
Una vez que la terminal te de el link local, copia el siguiente link en el navegador que gustes (Mozilla FireFox es recomendable)
   ```
    http://localhost:5173/visualization/index.html
  ```
Luego en la terminal para mesa, ejecuta el siguiente comando:
```
  python3 agents_server.py  
```
En cuanto se ejecute el archivo agents_server.py en la terminal, haz refresh en el navegador para ver la simulación.
