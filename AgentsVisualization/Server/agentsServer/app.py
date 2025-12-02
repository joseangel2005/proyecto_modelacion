from randomAgents.agent import *
from randomAgents.model import CityModel

from mesa.visualization import Slider, SolaraViz, make_space_component
from mesa.visualization.components import AgentPortrayalStyle


def agent_portrayal(agent):

    if agent is None:
        return

    portrayal = AgentPortrayalStyle(
        marker="s",
    )

    if isinstance(agent, Road):
        portrayal.color = "#aaa" #color gris para la carretera

    if isinstance(agent, Destination):
        portrayal.color = "lightgreen" # color vverde ligero para el destino

    if isinstance(agent, Traffic_Light):
        if agent.state == 0:
            portrayal.color = "red" # color  rojo para el semaforo
        elif agent.state == 1:
            portrayal.color = "green" # color verde para el semaforo
        elif agent.state == 2:
            portrayal.color = "yellow" # color amarillo para el semaforo

    if isinstance(agent, Obstacle):
        portrayal.color = "#555" 
    
    # Añadir visualización para los carros
    if isinstance(agent, Car):
        portrayal.color = "blue"
        portrayal.size = 20  
    return portrayal


def post_process(ax):
    ax.set_aspect("equal")


model_params = {
    "N":4,# numero de carros
    "seed": {
        "type": "InputText",
        "value": 42,
        "label": "Random Seed",
    },
}

model = CityModel(model_params["N"])

space_component = make_space_component(
    agent_portrayal, draw_grid=False, post_process=post_process
)

page = SolaraViz(
    model,
    components=[space_component],
    model_params=model_params,
    name="Random Model",
)