const textSection = document.getElementById("infrastructure-summary");
const overviewSection = document.getElementById("problems-overview");

async function getResponse(newResponse) {
    try {
        const response = await fetch("/problems/all?new_response=false");
        const data = await response.json();

        return data.response

    } catch (error) {
        textSection.textContent = "Não foi possível analisar a infraestrutura no momento, tente novamente mais tarde.";
    }
}

async function updateText() {
    textSection.style.display = "block";
    textSection.textContent = "Analisando...";

    response = await getResponse(false);

    textSection.innerHTML = marked.parse(response);
}


if (overviewSection) {
    updateProblemsOverview();
}

async function updateProblemsOverview() {
    try {
        const response = await fetch("/hosts_summary");
        const hosts = await response.json();
        
        let total = 0;
        let unack = 0;

        if (hosts && hosts.length > 0) {
            hosts.forEach(h => {
                total += h.problem_count;
                unack += h.problem_count_unacknowledged;
            });
        }
        
        document.getElementById("total-problems-count").textContent = total;
        document.getElementById("unack-problems-count").textContent = unack;
        
        overviewSection.style.display = "flex";
        
    } catch (e) {
        console.error("Erro ao tentar ler o resumo de problemas");
    }
}
