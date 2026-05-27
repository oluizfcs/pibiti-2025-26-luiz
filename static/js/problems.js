const problemsContainer = document.getElementById("problems-container");

async function updateProblems() {
    try {
        const response = await fetch("/problems_list");
        const problems = await response.json();

        if (!problems || problems.length === 0) {
            problemsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #718096;">
                    <h3>Nenhum problema encontrado</h3>
                </div>
            `;
            return;
        }

        const table = document.createElement("table");
        table.className = "host-table";

        const thead = document.createElement("thead");
        thead.innerHTML = `
            <tr>
                <th style="width: 5%"></th>
                <th style="width: 25%">Host</th>
                <th style="width: 35%">Problema</th>
                <th style="width: 15%">Gravidade</th>
                <th style="width: 10%">Reconhecido</th>
                <th style="width: 10%">Duração</th>
            </tr>
        `;
        table.append(thead);

        const tbody = document.createElement("tbody");

        problems.forEach(problem => {
            const tr = document.createElement("tr");
            tr.className = "problem-row clickable-tr";
            tr.tabIndex = 0;

            const severityNum = parseInt(problem.severity) || 0;
            tr.classList.add(`severity-${severityNum}`);

            const isAck = problem.acknowledged.toLowerCase() === "yes";
            const ackBadge = isAck
                ? `<span style="background-color: #38a169; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; display: inline-block;">Sim</span>`
                : `<span style="background-color: #e53e3e; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; display: inline-block;">Não</span>`;

            let translatedSeverity = problem.severity;
            if (translatedSeverity.includes("Not classified")) translatedSeverity = translatedSeverity.replace("Not classified", "Não classificado");
            else if (translatedSeverity.includes("Information")) translatedSeverity = translatedSeverity.replace("Information", "Informação");
            else if (translatedSeverity.includes("Warning")) translatedSeverity = translatedSeverity.replace("Warning", "Aviso");
            else if (translatedSeverity.includes("Average")) translatedSeverity = translatedSeverity.replace("Average", "Média");
            else if (translatedSeverity.includes("High")) translatedSeverity = translatedSeverity.replace("High", "Alta");
            else if (translatedSeverity.includes("Disaster")) translatedSeverity = translatedSeverity.replace("Disaster", "Desastre");

            translatedSeverity = translatedSeverity.replace("out of 5", "de 5");

            tr.innerHTML = `
                <td style="text-align: center;"><span class="chevron-icon">▶</span></td>
                <td>${problem.affected_hosts || "Desconhecido"}</td>
                <td style="text-align: left; font-weight: bold; padding-left: 5px;">${problem.name}</td>
                <td style="white-space: nowrap;">${translatedSeverity}</td>
                <td>${ackBadge}</td>
                <td style="font-size: 13px; font-weight: normal; color: #4a5568;">${problem.duration}</td>
            `;

            const detailTr = document.createElement("tr");
            detailTr.classList.add("non-clickable-tr");
            detailTr.style.display = "none";

            let acksHtml = `<p style="color: #718096; font-style: italic;">Nenhuma mensagem de reconhecimento registrada.</p>`;
            if (problem.acknowledges && problem.acknowledges.length > 0) {
                acksHtml = `<div class="ack-list">`;
                problem.acknowledges.forEach(ack => {
                    const ackDate = new Date(parseInt(ack.clock) * 1000).toLocaleString('pt-BR');
                    const messageText = ack.message ? ack.message : "Reconhecido (sem mensagem)";
                    acksHtml += `
                        <div class="ack-card">
                            <div class="ack-header">
                                <span class="ack-user">Admin ID:${ack.userid}</span>
                                <span>${ackDate}</span>
                            </div>
                            <div class="ack-message">"${messageText}"</div>
                        </div>
                    `;
                });
                acksHtml += `</div>`;
            }

            detailTr.innerHTML = `
                <td colspan="6" style="padding: 0; background-color: #fafbfc; border-top: none;">
                    <div class="detail-content">
                        <!-- Acknowledgments Section -->
                        <div class="detail-section-title">
                            Mensagens de Reconhecimento
                        </div>
                        ${acksHtml}

                        <!-- History Timeline Section -->
                        <div class="detail-section-title">
                            Histórico de Transições
                        </div>
                        <div class="timeline-container" id="timeline-${problem.objectid}">
                            <p style="color: #718096; font-style: italic;">Carregando histórico...</p>
                        </div>

                        <!-- AI Explanation Section -->
                        <div style="margin-top: 2rem;">
                            <button class="btn-check" id="btn-explain-${problem.objectid}">
                                Explicar problema
                            </button>
                            <div class="card" id="ai-box-${problem.objectid}" style="display: none;"></div>
                        </div>
                    </div>
                </td>
            `;

            tbody.append(tr);
            tbody.append(detailTr);

            let historyLoaded = false;
            tr.addEventListener("click", () => {
                const isVisible = detailTr.style.display !== "none";
                detailTr.style.display = isVisible ? "none" : "table-row";

                if (isVisible) {
                    tr.classList.remove("expanded");
                } else {
                    tr.classList.add("expanded");
                    if (!historyLoaded) {
                        loadProblemHistory(problem.objectid);
                        historyLoaded = true;
                    }
                }
            });

            const explainBtn = detailTr.querySelector(`#btn-explain-${problem.objectid}`);
            const aiBox = detailTr.querySelector(`#ai-box-${problem.objectid}`);

            explainBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                loadAIExplanation(problem.objectid, explainBtn, aiBox);
            });
        });

        table.append(tbody);
        problemsContainer.innerHTML = "";
        problemsContainer.append(table);
    } catch (error) {
        problemsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e53e3e;">
                <h3>Erro ao carregar lista de problemas</h3>
                <p style="margin-top: 8px; color: #e53e3e;">Não foi possível comunicar com a API do Zabbix ou com o servidor do sistema.</p>
            </div>
        `;
        console.error("Error updating problems:", error);
    }
}

async function loadProblemHistory(triggerId) {
    const timelineContainer = document.getElementById(`timeline-${triggerId}`);
    try {
        const response = await fetch(`/problem/${triggerId}/history`);
        const historyEvents = await response.json();

        if (!historyEvents || historyEvents.length === 0) {
            timelineContainer.innerHTML = `<p style="color: #718096; font-style: italic;">Nenhum histórico registrado para este gatilho.</p>`;
            return;
        }

        const timeline = document.createElement("div");
        timeline.className = "timeline";

        historyEvents.forEach(evt => {
            const dateStr = new Date(parseInt(evt.clock) * 1000).toLocaleString('pt-BR');
            const isProblem = evt.value === "1";

            const item = document.createElement("div");
            item.className = "timeline-item";
            item.innerHTML = `
                <span class="timeline-dot ${isProblem ? 'problem' : 'ok'}"></span>
                <div class="timeline-info">
                    <span>${isProblem ? 'PROBLEMA DETECTADO' : 'SITUAÇÃO NORMALIZADA'}</span>
                    <span class="timeline-date">${dateStr}</span>
                </div>
            `;
            timeline.append(item);
        });

        timelineContainer.innerHTML = "";
        timelineContainer.append(timeline);
    } catch (error) {
        timelineContainer.innerHTML = `<p style="color: #e53e3e; font-style: italic;">Erro ao carregar o histórico de transições.</p>`;
        console.error(`Error loading history for trigger ${triggerId}:`, error);
    }
}

async function loadAIExplanation(triggerId, btn, box) {
    btn.disabled = true;
    btn.textContent = "Analisando com IA...";
    box.style.display = "block";
    box.innerHTML = `<p style="color: #718096; font-style: italic;">Consultando inteligência artificial do Gemini para formular explicação e soluções...</p>`;

    try {
        const response = await fetch(`/problem/${triggerId}/explain`);
        const data = await response.json();

        box.innerHTML = marked.parse(data.response);

        btn.textContent = "Análise concluída";
    } catch (error) {
        box.innerHTML = `<p style="color: #e53e3e; font-style: italic;">Erro ao obter a análise da inteligência artificial.</p>`;
        btn.disabled = false;
        btn.textContent = "Tentar Explicar Novamente com IA";
        console.error("AI Explanation fetch failed:", error);
    }
}

const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;
document.head.appendChild(styleSheet);

updateProblems();
