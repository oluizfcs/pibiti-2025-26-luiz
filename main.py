from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from problems import ZabbixService
from gemini_model import GeminiModel
from cache_manager import CacheManager
import json

app = FastAPI()
cache_manager = CacheManager()

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')

class FetchProblemsRequest(BaseModel):
    new_response: bool | None = False
    

@app.post("/problems")
async def get_status(request: FetchProblemsRequest):

    cached_response = cache_manager.get()
    
    if cached_response != None and not request.new_response:
        return { "response": cached_response, "type": "cached"}
    
    problems = ZabbixService().get_problems()

    prompt = f"Explique a situação da infraestrutura evitando termos técnicos. Problemas: {json.dumps(problems)}"

    new_response = GeminiModel().generate(prompt)
    
    cache_manager.set(new_response)
    return {"response": new_response, "type": "new" }