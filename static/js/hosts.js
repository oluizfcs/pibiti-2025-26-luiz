const hostsSection = document.getElementById("hosts-summary");

async function updateHostsSummary() {
    try {
        const response = await fetch("/hosts_summary");
        const hosts = await response.json();

        if (!hosts || hosts.length === 0) {
            hostsSection.textContent = "Nenhum host encontrado.";
            return;
        }

        const table = document.createElement("table");
        table.className = "host-table";

        const thead = document.createElement("thead");
        thead.innerHTML = `
            <tr>
                <th>Host</th>
                <th>Problemas</th>
                <th>Problemas não reconhecidos</th>
                <th>Gravidade</th>
            </tr>
        `;
        table.append(thead);

        const tbody = document.createElement("tbody");

        hosts.forEach(host => {
            const tr = document.createElement("tr");
            tr.classList.add("clickable-tr");

            tr.classList.add(`severity-${host.highest_severity}`);

            switch (host.highest_severity) {
                case 0:
                    host.highest_severity = 'Não classificado';
                    break;
                case 1:
                    host.highest_severity = 'Informação';
                    break;
                case 2:
                    host.highest_severity = 'Aviso';
                    break;
                case 3:
                    host.highest_severity = 'Média';
                    break;
                case 4:
                    host.highest_severity = 'Alta';
                    break;
                case 5:
                    host.highest_severity = 'Desastre';
                    break;
            }

            tr.innerHTML = `
            <td>${host.name}</td>
            <td>${host.problem_count}</td>
            <td>${host.problem_count_unacknowledged}</td>
            <td>${host.highest_severity}</td>
            `;

            tbody.append(tr);

            const modal = document.getElementById("modal");
            const hostSummaryDiv = modal.querySelector("div");

            modal.classList.add("card");
            modal.style.maxWidth = "50%";
            modal.style.maxHeight = "70%";

            tr.addEventListener("click", () => {
                hostSummaryDiv.textContent = "Analisando situação...";

                getHostExplanation(hostSummaryDiv, host.hostid);

                modal.querySelector("h1").textContent = host.name;
                if (host.interface) {
                    modal.querySelector("p").innerHTML = `<b>IP:</b> ${host.interface.ip}`;
                    modal.querySelectorAll("p")[1].innerHTML = `<b>Porta:</b> ${host.interface.port}`;
                }

                modal.showModal();
            });
        });

        table.append(tbody);

        hostsSection.innerHTML = "";
        hostsSection.append(table);
    } catch (error) {
        hostsSection.textContent = "Erro ao carregar o resumo dos hosts.";
        console.log(error);
    }
}

async function getHostExplanation(element, hostid) {
    const response = await fetch("/problems/" + hostid);

    const data = await response.json();

    element.innerHTML = marked.parse(data.response);
}

updateHostsSummary();
