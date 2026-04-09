from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from problems import ZabbixService
from gemini_model import GeminiModel
from cache_manager import CacheManager
import json

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')

@app.get("/hosts")
async def read_hosts():
    return FileResponse('static/hosts.html')

@app.get("/hosts_summary")
async def get_hosts_summary():
    return ZabbixService().get_hosts_summary()

class FetchProblemsRequest(BaseModel):
    new_response: bool | None = False
    

@app.post("/problems")
async def get_status(request: FetchProblemsRequest):

    cache_manager = CacheManager()
    cached_response = cache_manager.get()
    
    if cached_response != None and not request.new_response:
        return { "response": cached_response, "type": "cached"}
    
    problems = ZabbixService().get_problems()

    prompt = f"Explique a situação da infraestrutura evitando termos técnicos. Problemas: {json.dumps(problems)}"

    new_response = GeminiModel().generate(prompt)
    
    cache_manager.set(new_response)
    return {"response": new_response, "type": "new" }

@app.get("/problems/{hostid}")
async def get_host_problems(hostid):
    cache_manager = CacheManager(hostid)
    cached_response = cache_manager.get()
    
    if cached_response != None:
        return {"response": cached_response}
    
    problems = ZabbixService().get_problems(hostid)
    
    prompt = f"Explique a situação do host evitando termos técnicos. Problemas: {json.dumps(problems)}"
    
    new_response = GeminiModel().generate(prompt)
    
    cache_manager.set(new_response)
    
    return {"response": new_response}