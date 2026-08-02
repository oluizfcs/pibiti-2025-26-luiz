const hostsContainer = document.getElementById("hosts");
const dialog = document.getElementById("explanation-dialog");

async function updateHostsSummary() {
    try {
        const response = await fetch("/hosts_summary");
        const hosts = await response.json();

        if (!hosts || hosts.length === 0) {
            hostsContainer.textContent = "Nenhum host encontrado.";
            return;
        }

        const table = document.createElement("table");
        table.innerHTML = `
            <caption>Lista de Hosts</caption>
            <thead>
                <tr>
                    <th scope="col">Host</th>
                    <th scope="col">Grupos</th>
                    <th scope="col">Problemas</th>
                    <th scope="col">Gravidade</th>
                    <th scope="col">Ação</th>
                </tr>
            </thead>
        `;

        const tbody = document.createElement("tbody");

        hosts.forEach(host => {
            const tr = document.createElement("tr");
            const trDetails = document.createElement("tr");
            const tdDetails = document.createElement("td");

            trDetails.style.display = "none";
            tdDetails.colSpan = 5;
            tr.classList.add(`severity-${host.highest_severity}`);

            let severityName = "";
            switch (host.highest_severity) {
                case 0:
                    severityName = 'Não classificado';
                    break;
                case 1:
                    severityName = 'Informação';
                    break;
                case 2:
                    severityName = 'Aviso';
                    break;
                case 3:
                    severityName = 'Média';
                    break;
                case 4:
                    severityName = 'Alta';
                    break;
                case 5:
                    severityName = 'Desastre';
                    break;
            }

            tr.innerHTML = `
                <td data-label="Host">${host.name}</td>
                <td data-label="Grupos">${host.hostgroups}</td>
                <td data-label="Problemas">${host.problem_count}</td>
                <td data-label="Gravidade">${severityName}</td>
                <td data-label="Ação">
                    <button class="btn-toggle"
                            aria-haspopup="dialog">
                        <!-- License: MIT. Made by radix-ui: https://github.com/radix-ui/icons -->
                        <svg aria-hidden="true" width="32px" height="32px" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M10 6.5C10 8.433 8.433 10 6.5 10C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5ZM9.30884 10.0159C8.53901 10.6318 7.56251 11 6.5 11C4.01472 11 2 8.98528 2 6.5C2 4.01472 4.01472 2 6.5 2C8.98528 2 11 4.01472 11 6.5C11 7.56251 10.6318 8.53901 10.0159 9.30884L12.8536 12.1464C13.0488 12.3417 13.0488 12.6583 12.8536 12.8536C12.6583 13.0488 12.3417 13.0488 12.1464 12.8536L9.30884 10.0159Z"
                            fill="#fff"
                        />
                        </svg>
                        <span class="sr-only">Explicar situação do host</span>
                    </button>
                </td>
            `;

            const openDialogBtn = tr.querySelector(".btn-toggle");
            const explanationBox = document.getElementById("explanation-box");

            openDialogBtn.addEventListener("click", async () => {

                dialog.showModal();
                dialog.querySelector(".btn-check").focus();
                explanationBox.innerHTML = `Carregando explicação...`;
                // return;
                try {
                    const response = await fetch("/problems/" + host.hostid);
                    const data = await response.json();
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    explanationBox.innerHTML = marked.parse(data.response);

                } catch (error) {
                    explanationBox.innerHTML = `<p style="color: #e53e3e; font-style: italic;">Erro ao obter a análise da inteligência artificial.</p>`;
                    console.error("AI Explanation fetch failed:", error);
                }
            });

            tbody.append(tr);
        });

        table.append(tbody);

        hostsContainer.innerHTML = "";
        hostsContainer.append(table);
    } catch (error) {
        hostsContainer.innerHTML = `
            <p class="overview-text status-danger">Não foi possível comunicar com o sistema de monitoramento Zabbix. Tente novamente mais tarde.</p>
        `;
        console.error("Error updating hosts summary:", error);
    }
}

dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;

    const buttons = dialog.querySelectorAll("button");
    const isFirst = e.shiftKey && document.activeElement === buttons[0];
    const isLast = !e.shiftKey && document.activeElement === buttons[buttons.length - 1];

    if (isFirst || isLast) {
        buttons[isFirst ? buttons.length - 1 : 0].focus();
        e.preventDefault();
    }
});

updateHostsSummary();
