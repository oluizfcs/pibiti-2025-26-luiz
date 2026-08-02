const problemsContainer = document.getElementById("problems");
const dialog = document.getElementById("explanation-dialog");

async function updateProblems() {
    try {
        const response = await fetch("/problems_list");
        const problems = await response.json();

        if (!problems || problems.length === 0) {
            problemsContainer.textContent = "Nenhum problema encontrado.";
            return;
        }

        const table = document.createElement("table");

        table.innerHTML = `
            <caption>Lista de Problemas</caption>
            <thead>
                <tr>
                    <th scope="col">Host</th>
                    <th scope="col">Problema</th>
                    <th scope="col">Gravidade</th>
                    <th scope="col">Duração</th>
                    <th scope="col">Reconhecido</th>
                    <th scope="col">Aconteceu antes?</th>
                    <th scope="col">Ação</th>
                </tr>
            </thead>
        `;

        const tbody = document.createElement("tbody");

        problems.forEach(problem => {
            const tr = document.createElement("tr");
            tr.className = "problem-row";
            tr.id = "problem" + problem.objectid;

            const severityNum = parseInt(problem.severity) || 0;
            tr.classList.add(`severity-${severityNum}`);

            const isAck = problem.acknowledged.toLowerCase() === "yes";
            const ackBadge = isAck
                ? `<span style="background-color: #007a39; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; display: inline-block;">Sim</span>`
                : `<span style="background-color: #b40202; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; display: inline-block;">Não</span>`;

            let translatedSeverity = problem.severity;
            if (translatedSeverity.includes("Not classified")) translatedSeverity = "Não classificado";
            else if (translatedSeverity.includes("Information")) translatedSeverity = "Informação";
            else if (translatedSeverity.includes("Warning")) translatedSeverity = "Aviso";
            else if (translatedSeverity.includes("Average")) translatedSeverity = "Média";
            else if (translatedSeverity.includes("High")) translatedSeverity = "Alta";
            else if (translatedSeverity.includes("Disaster")) translatedSeverity = "Desastre";

            tr.innerHTML = `
                <td data-label="Host">${problem.affected_hosts || "Desconhecido"}</td>
                <td data-label="Problema">${problem.name}</td>
                <td data-label="Gravidade">${translatedSeverity}</td>
                <td data-label="Duração">${dateFns.formatDistanceToNow(new Date(problem.clock * 1000), { locale: dateFns.locale.pt })}</td>
                <td data-label="Reconhecido">${ackBadge}</td>
                <td data-label="Aconteceu antes?" class="history"></td>
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
                        <span class="sr-only">Explicar problema</span>
                    </button>
                </td>
            `;

            loadProblemHistory(problem.objectid, tr.querySelector(".history"));

            const openDialogBtn = tr.querySelector(".btn-toggle");
            const explanationBox = document.getElementById("explanation-box");

            openDialogBtn.addEventListener("click", async () => {

                dialog.showModal();
                dialog.querySelector(".btn-check").focus();
                explanationBox.innerHTML = `Carregando explicação...`;
                // return;
                try {
                    const response = await fetch(`/problem/${problem.objectid}/explain`);
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
        problemsContainer.innerHTML = "";
        problemsContainer.append(table);
    } catch (error) {
        problemsContainer.innerHTML = `
            <p class="overview-text status-danger">Não foi possível comunicar com o sistema de monitoramento Zabbix. Tente novamente mais tarde.</p>
        `;
        console.error("Error updating problems:", error);
    }
}

async function loadProblemHistory(triggerId, timelineContainer) {
    try {
        const response = await fetch(`/problem/${triggerId}/history`);
        const historyEvents = await response.json();

        let textoResultante = "";

        if (!historyEvents || historyEvents.length < 3) {
            textoResultante = "Não";
        } else {
            const dataResolvida = new Date(historyEvents[1].clock * 1000);

            const dataDetectadaAnterior = new Date(historyEvents[2].clock * 1000);

            const tempoAtivoAnterior = dateFns.formatDistance(dataDetectadaAnterior, dataResolvida, {
                locale: dateFns.locale.pt
            });

            textoResultante = `Sim, foi resolvido em ${tempoAtivoAnterior}.`;
        }

        timelineContainer.textContent = textoResultante;
    } catch (error) {
        timelineContainer.textContent = "Erro";
        console.error("Erro ao carregar o histórico:", error);
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

updateProblems();
