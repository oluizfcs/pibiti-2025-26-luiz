# Estrutura do projeto

```
.
├── main.py              # Rotas e inicialização da aplicação FastAPI
├── problems.py          # Integração com a API do Zabbix
├── gemini_model.py      # Comunicação com o Gemini 2.5-Flash
├── cache_manager.py     # Cache em arquivo das respostas geradas
├── schemas.py           # Modelos de dados (Pydantic)
├── requirements.txt     # Dependências do projeto
├── templates/           # Páginas Jinja2 (base, hosts, problemas, resumo)
└── static/              # CSS, JavaScript e ícone
```

# Como executar

## Pré-requisitos

- Python 3.12 ou superior
- Acesso a um servidor Zabbix com API habilitada
- Chave de API do Google Gemini

## Passos

1. Crie e ative um ambiente virtual:

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

2. Instale as dependências:

   ```bash
   pip install -r requirements.txt
   ```

3. Crie um arquivo `constants.py` na raiz do projeto (ele não é versionado):

   ```python
   ZABBIX_SERVER_IP = "http://endereco-do-zabbix"
   ZABBIX_API_KEY   = "sua-chave-do-zabbix"
   GEMINI_API_KEY   = "sua-chave-do-gemini"
   ```

4. Crie o diretório de cache:

   ```bash
   mkdir -p cache
   ```

5. Inicie a aplicação:

   ```bash
   fastapi run
   ```

6. Acesse `http://localhost:8000`.

# Rotas

| Rota | Descrição |
|---|---|
| `/` | Resumo do estado da infraestrutura |
| `/hosts` | Página de hosts |
| `/problems` | Página de problemas |
| `/hosts_summary` | Resumo dos hosts em JSON |
| `/problems_list` | Lista de problemas ativos em JSON |
| `/problems/all` | Explicação geral da infraestrutura |
| `/problems/{hostid}` | Explicação da situação de um host |
| `/problem/{trigger_id}/explain` | Explicação de um problema específico |
| `/problem/{trigger_id}/history` | Histórico de um problema |
