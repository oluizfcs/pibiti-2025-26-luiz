from zabbix_utils import ZabbixAPI
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
        self.api = ZabbixAPI(url=constants.ZABBIX_SERVER_IP + "/zabbix")
        self.api.login(token=constants.ZABBIX_API_KEY)
    
    def get_problems(self, hostids = None):
        
        if hostids == None:
            hostids = self._get_enabled_hosts_ids()
            
        problems = self.api.problem.get(
            hostids=hostids,
            output=[
                "eventid",
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

    def get_problem_history(self, trigger_id):
        events = self.api.event.get(
            objectids=[trigger_id],
            source=0, # triggers
            output=["eventid", "clock", "value", "severity"],
            selectAcknowledges="extend",
            sortfield=["clock"],
            sortorder="DESC",
            limit=5
        )
        return events
    
    def get_hosts_summary(self):
        hosts = self.api.host.get(output=["status", "name"], selectHostGroups=["groupid", "name"])
        enabled_hosts = {
            h["hostid"]: {
                "hostid": h["hostid"], 
                "name": h["name"], 
                "hostgroups": ", ".join([g["name"] for g in h["hostgroups"]]), 
                "problem_count": 0, 
                "problem_count_unacknowledged": 0, 
                "highest_severity": 0
            } 
            for h in hosts if h["status"] == "0"
        }

        hosts_interfaces = self.api.hostinterface.get(output=["hostid", "ip", "port", "available"])
        
        for interface in hosts_interfaces:
            if interface["hostid"] in enabled_hosts:
                enabled_hosts[interface["hostid"]]["interface"] = interface
        
        if not enabled_hosts:
            return []

        problems = self.api.problem.get(
            hostids=list(enabled_hosts.keys()),
            output=["objectid", "severity", "acknowledged"],
            source=0,
            suppressed=False
        )

        objectids = [p["objectid"] for p in problems]
        if objectids:
            triggers = self.api.trigger.get(
                triggerids=objectids,
                output=["triggerid"],
                selectHosts=["hostid"]
            )

            trigger_to_hosts = {}
            for trigger in triggers:
                trigger_to_hosts[trigger["triggerid"]] = [h["hostid"] for h in trigger["hosts"]]

            for problem in problems:
                severity = int(problem["severity"])
                triggerid = problem["objectid"]
                acknowledged = problem["acknowledged"] == "1"
                hostids = trigger_to_hosts.get(triggerid, [])
                for hostid in hostids:
                    if hostid in enabled_hosts:
                        enabled_hosts[hostid]["problem_count"] += 1
                        if not acknowledged:
                            enabled_hosts[hostid]["problem_count_unacknowledged"] += 1
                        if severity > enabled_hosts[hostid]["highest_severity"]:
                            enabled_hosts[hostid]["highest_severity"] = severity

        sorted_hosts = sorted(enabled_hosts.values(), key=lambda h: (h["highest_severity"], h["problem_count"]), reverse=True)
        return sorted_hosts

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
            problem["clock"] = int(problem["clock"])
            problem["duration"] = self._convert_timestamp_to_string(problem["clock"])
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
