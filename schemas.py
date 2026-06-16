from pydantic import BaseModel
from typing import List, Optional

class HostInterfaceModel(BaseModel):
    hostid: str
    ip: str
    port: str
    available: str

class HostSummaryModel(BaseModel):
    hostid: str
    name: str
    hostgroups: str
    problem_count: int
    problem_count_unacknowledged: int
    highest_severity: int
    interface: Optional[HostInterfaceModel] = None

class AIResponseModel(BaseModel):
    response: str
    type: str = "new"