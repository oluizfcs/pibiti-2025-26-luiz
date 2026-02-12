from zabbix_utils import ZabbixAPI
import json
from datetime import datetime
import constants

class ZabbixService:

    severities = {
        "0": "Not classified",
        "1": "Information",
        "2": "Warning",
        "3": "Average",
        "4": "High",
        "5": "Disaster"
    }

    def __init__(self):
        self.api = ZabbixAPI(url="localhost/zabbix")
        self.api.login(token=constants.ZABBIX_API_KEY)
    
    def get_problems(self):
        problems = self.api.problem.get(
            hostids=self._get_enabled_hosts_ids(),
            output=[
                "objectid",
                "name",
                "severity",
                "clock",
                "acknowledged"
            ],
            sortfield=["eventid"],
            sortorder="DESC",
            source=0, # triggers only
            suppressed=False
        )
        
        self._add_hostnames(problems)
        
        return problems
    
    def _get_enabled_hosts_ids(self):
        hosts = self.api.host.get(output=["status"])
        enabled_hostids = []

        for host in hosts:
            if host["status"] == "0":
                enabled_hostids.append(host["hostid"])
        
        return enabled_hostids
    

    def _add_hostnames(self, problems):
        objectids = []

        for problem in problems:
            objectids.append(problem["objectid"])
            problem["acknowledged"] = "no" if problem["acknowledged"] != "1" else "yes"
            problem["duration"] = self._convert_timestamp_to_string(int(problem.pop("clock")))
            problem["severity"] +=  f" out of 5 ({ZabbixService.severities[problem["severity"]]})"
            
        triggers = self.api.trigger.get(
            triggerids=objectids,
            output="",
            selectHosts=["host"]
        )
        
        for trigger in triggers:
            affected_hosts = []
            for host in trigger["hosts"]:
                affected_hosts.append(host["host"])
            trigger["hosts"] = ", ".join(affected_hosts)

        for problem in problems:
            for trigger in triggers:
                if trigger["triggerid"] == problem["objectid"]:
                    problem["affected_hosts"] = trigger["hosts"]
    
    def _convert_timestamp_to_string(self, timestamp):
        duration = datetime.now() - datetime.fromtimestamp(timestamp)
        
        hours = duration.seconds // 3600
        minutes = (duration.seconds // 60) % 60
        seconds = duration.seconds % 60
        
        parts = []
        if duration.days > 0:
            parts.append(f"{duration.days} {"days" if duration.days > 1 else "day"}")
        if hours > 0:
            parts.append(f"{hours} {"hours" if hours > 1 else "hour"}")
        if minutes > 0:
            parts.append(f"{minutes} {"minutes" if minutes > 1 else "minute"}")
        if seconds > 0:
            parts.append(f"{seconds} {"seconds" if seconds > 1 else "second"}")
            
        return ", ".join(parts)
