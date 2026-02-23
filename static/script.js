const textSection = document.querySelector("section");

async function getResponse(newResponse) {
    try {
        const response = await fetch("/problems", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: `{"new_response":${newResponse}}`
        });

        const data = await response.json();
        
        return data.response

    } catch (error) {
        textSection.textContent = "Não foi possível analisar a infraestrutura no momento, tente novamente mais tarde.";
    }
}

async function updateText() {
    textSection.textContent = "Analisando...";

    response = await getResponse(false);

    textSection.innerHTML = marked.parse(response);
}

updateText()
