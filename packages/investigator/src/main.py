from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Investigator")

class Scene(BaseModel):
    id: str
    title: str

scenes: List[Scene] = []

class CreateRequest(BaseModel):
    title: str

class OpenRequest(BaseModel):
    sceneId: str

@app.post("/scene/create", response_model=Scene)
def create_scene(req: CreateRequest) -> Scene:
    scene = Scene(id=str(len(scenes)+1), title=req.title)
    scenes.append(scene)
    return scene

@app.post("/scene/open", response_model=Scene)
def open_scene(req: OpenRequest) -> Scene:
    for s in scenes:
        if s.id == req.sceneId:
            return s
    raise ValueError("scene not found")
