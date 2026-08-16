const overviewSection = document.getElementById("problems-overview");
const aiSummarySection = document.getElementById("ai-summary-section");
const explainBtn = document.getElementById("explain-btn");

async function getResponse(newResponse) {
    try {
        const response = await fetch("/problems/all?new_response=false");
        const data = await response.json();

        return data.response

    } catch (error) {
        aiSummarySection.textContent = "Não foi possível analisar a infraestrutura no momento, tente novamente mais tarde.";
    }
}

async function updateText() {    
    response = await getResponse(false);
    await new Promise(resolve => setTimeout(resolve, 2000));
    aiSummarySection.innerHTML = "<h2>Análise detalhada da inteligência artificial:</h2>" + marked.parse(response);
}

explainBtn.addEventListener("click", () => {
    aiSummarySection.textContent = "Carregando explicação...";
    updateText();
});

if (overviewSection) {
    updateProblemsOverview();
}

async function updateProblemsOverview() {
    const overviewSection = document.getElementById("problems-overview");

    try {
        const response = await fetch("/hosts_summary");
        if (!response.ok) {
            overviewSection.innerHTML = `<p class="overview-text status-danger">Não foi possível comunicar com o sistema de monitoramento Zabbix. Tente novamente mais tarde.</p>`;
            overviewSection.style.display = "block";
            return;
        }

        const hosts = await response.json();

        const total = hosts ? hosts.reduce((sum, h) => sum + (h.problem_count || 0), 0) : 0;
        const unack = hosts ? hosts.reduce((sum, h) => sum + (h.problem_count_unacknowledged || 0), 0) : 0;
        // const total = 0;
        // const unack = 0;

        let message = "";
        let alertClass = "";

        if (total === 0) {
            message = "Excelente! A nossa infraestrutura está operando normalmente e nenhum problema foi detectado no momento.";
            alertClass = "status-success";
        } else if (unack === 0) {
            const termoProblema = total === 1 ? "problema ativo" : "problemas ativos";
            message = `Atenção: a nossa infraestrutura está enfrentando <b>${total} ${termoProblema}</b>, mas todos já foram reconhecidos pela equipe técnica.`;
            alertClass = "status-warning";
        } else {
            const termoProblema = total === 1 ? "problema" : "problemas";
            const termoDeste = unack === 1 ? "deste ainda não foi marcado" : "destes ainda não foram marcados";
            message = `Alerta: a nossa infraestrutura está enfrentando <b>${total} ${termoProblema}</b>, onde ${unack} ${termoDeste} como reconhecido pelos administradores.`;
            alertClass = "status-danger";
        }

        overviewSection.innerHTML = `<p class="overview-text ${alertClass}">${message}</p>`;
        overviewSection.style.display = "block";

        document.querySelector("button[class=btn-check]").closest("div").style.display = 'block';
    } catch (e) {
        console.error("Erro ao tentar ler o resumo de problemas:", e);
        overviewSection.innerHTML = `<p class="overview-text status-danger">Não foi possível carregar o resumo da infraestrutura neste momento.</p>`;
        overviewSection.style.display = "block";
    }
}
