from fastapi import FastAPI, Request, Query
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from problems import ZabbixService
from gemini_model import GeminiModel
from cache_manager import CacheManager
from typing import List
import json

from schemas import HostSummaryModel, AIResponseModel

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse(
        request=request, name="pages/index.html", context={"title": "Resumo - Estado da infraestrutura"}
    )

@app.get("/hosts", response_class=HTMLResponse)
async def read_hosts(request: Request):
    return templates.TemplateResponse(
        request=request, name="pages/hosts.html", context={"title": "Hosts - Estado da infraestrutura"}
    )

@app.get("/problems", response_class=HTMLResponse)
async def read_problems(request: Request):
    return templates.TemplateResponse(
        request=request, name="pages/problems.html", context={"title": "Problemas - Estado da infraestrutura"}
    )

@app.get("/problems_list")
async def get_problems_list():
    return ZabbixService().get_problems()

@app.get("/problem/{trigger_id}/history")
async def get_problem_history(trigger_id: str):
    return ZabbixService().get_problem_history(trigger_id)

@app.get("/problem/{trigger_id}/explain", response_model=AIResponseModel)
async def explain_problem(trigger_id: str):
    cache_manager = CacheManager(f"explain_{trigger_id}")
    cached_response = cache_manager.get()
    
    if cached_response is not None:
        return AIResponseModel(response=cached_response, type="cached")
    
    problems = ZabbixService().get_problems()
    target_problem = next((p for p in problems if p["objectid"] == trigger_id), None)
    
    if not target_problem:
        return AIResponseModel(response="Problema não encontrado ou já resolvido.", type="new")
        
    prompt = (
        f"Houve um problema na infraestrutura de TI, explique-o brevemente evitando termos técnicos. Problema: {json.dumps(target_problem)}"
    )
    new_response_text = GeminiModel().generate(prompt)
    cache_manager.set(new_response_text)
    return AIResponseModel(response=new_response_text, type="new")

@app.get("/problems/all", response_model=AIResponseModel)
async def get_status(new_response: bool = Query(False)):
    cache_manager = CacheManager()
    cached_response = cache_manager.get()
    
    if cached_response != None and not new_response:
        return AIResponseModel(response=cached_response, type="cached")
    
    problems = ZabbixService().get_problems()
    prompt = f"Explique a situação da infraestrutura evitando termos técnicos. Problemas: {json.dumps(problems)}"
    new_response_text = GeminiModel().generate(prompt)
    
    cache_manager.set(new_response_text)
    return AIResponseModel(response=new_response_text, type="new")


@app.get("/problems/{hostid}", response_model=AIResponseModel)
async def get_host_problems(hostid: str):
    cache_manager = CacheManager(hostid)
    cached_response = cache_manager.get()
    
    if cached_response != None:
        return AIResponseModel(response=cached_response, type="cached")
    
    problems = ZabbixService().get_problems(hostid)
    prompt = f"Explique a situação do host evitando termos técnicos. Problemas: {json.dumps(problems)}"
    new_response_text = GeminiModel().generate(prompt)
    
    cache_manager.set(new_response_text)
    return AIResponseModel(response=new_response_text, type="new")

@app.get("/hosts_summary", response_model=List[HostSummaryModel])
async def get_hosts_summary():
    return ZabbixService().get_hosts_summary()