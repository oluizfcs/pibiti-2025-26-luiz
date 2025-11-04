from zabbix_utils import ZabbixAPI
import json

api = ZabbixAPI(url="localhost/zabbix")
api.login(user="Admin", password="zabbix")

hosts = api.host.get(
    output=["status"]
)

# print(json.dumps(hosts, indent=4))

enabled_hostids = []

for host in hosts:
    if host["status"] == "0":
        enabled_hostids.append(host["hostid"])

# print(enabled_hostids)

problems = api.problem.get(
    hostids=enabled_hostids,
    output=[
        "objectid",
        "name",
        "severity"
    ],
    source=0
)

# print(json.dumps(problems, indent=4))

objectids = []

for problem in problems:
    objectids.append(problem["objectid"])

# print(objectids)

triggers = api.trigger.get(
    triggerids=objectids,
    output="",
    selectHosts=["host"]
)

# print(json.dumps(triggers, indent=4))

triggerid_host = {}

for trigger in triggers:                               # ver depois
    triggerid_host[trigger['triggerid']] = trigger['hosts'][0]['host']

# print(triggerid_host)

for problem in problems:
    print("Problema: " + problem['name'])
    print("Gravidade: " + problem['severity'])
    print("Host: " + triggerid_host[problem['objectid']] + "\n")

api.logout()
