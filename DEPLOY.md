# Operação e API — oficina-avaliador

Runbook do avaliador de problemas de pesquisa da oficina do PPGDI/UNICAP.
Cobre commit, deploy na VPS, criação de domínio, certificado TLS e o mapeamento
completo da API.

> **Este repositório é público.** Nenhuma credencial aparece aqui — só o lugar
> onde ela vive. Antes de colar qualquer coisa neste arquivo, lembre que ele
> está em `github.com/edilsonfs/oficina-avaliador`, aberto para qualquer pessoa.

---

## 1. Onde tudo mora

| O quê | Valor |
| --- | --- |
| Produção | <https://oficina.lexcode.tech> |
| Repositório | `github.com/edilsonfs/oficina-avaliador` (público, branch `main`) |
| Fonte local | `C:\Users\Diego\Projetos\oficina-avaliador` |
| VPS | `187.77.228.24` (Hostinger) |
| Painel Dokploy | `http://187.77.228.24:3000` |
| Projeto no Dokploy | `oficina-ppgdi` — `projectId: q5y5f6i8l-VN2WzilLGk6` |
| Aplicação | `oficina-avaliador` — `applicationId: Jr3ZIhVJhtrNG5_7voxbu` |
| Nome no Swarm | `app-connect-open-source-hard-drive-yjwd73` |
| Build | `dockerfile` (`Dockerfile` na raiz), porta `8080` |
| Volume | `oficina-avaliador-data` → `/app/data` (SQLite; sobrevive a redeploy) |
| DNS | zona `lexcode.tech` na **Hostinger** (nameservers `dns-parking.com`) |

O `applicationId` também está versionado em `.dokploy-app-id`.

### Onde estão as credenciais

Nenhuma no repositório. Todas em `~/Downloads/Chaves VPS e Dokploy.txt`, nesta
ordem: chave SSH da VPS, `HOSTINGER_API_TOKEN` (dentro de um bloco `mcpServers`),
deploy key SSH do Dokploy, **token da API do Dokploy na linha 71**, URL do painel
e chave da API DeepSeek. O `ADMIN_TOKEN` fica apenas no *Environment* do app no
Dokploy.

---

## 2. Commit e push

Duas contas GitHub estão autenticadas nesta máquina (`edilsonfs` e
`edilsonfsilva`). A dona deste repositório é `edilsonfs`, e **o push só funciona
com o credential helper apontado para ela**:

```bash
cd ~/Projetos/oficina-avaliador
git config credential.https://github.com.username edilsonfs   # uma vez por clone
```

Fluxo normal:

```bash
git status -sb
git add -A
git commit -m "Mensagem no imperativo, dizendo o porquê"
git push origin main
```

No Windows o Git avisa `LF will be replaced by CRLF`. É esperado e inofensivo;
para silenciar num commit pontual: `git -c core.safecrlf=false commit ...`.

> **Push não faz deploy.** O app usa `sourceType: git` com `customGitUrl`, sem
> webhook. Depois do push é obrigatório disparar o deploy (seção 3).

---

## 3. Deploy

### 3.1 Pelo painel

<http://187.77.228.24:3000> → projeto `oficina-ppgdi` → app `oficina-avaliador`
→ **Deploy**. O Dokploy faz `git pull` e reconstrói a imagem.

### 3.2 Pela API (o caminho usado na prática)

```bash
TOKEN="<token do Dokploy — linha 71 do arquivo de chaves>"
APP=Jr3ZIhVJhtrNG5_7voxbu

curl -X POST "http://187.77.228.24:3000/api/application.deploy" \
  -H "x-api-key: $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"applicationId\":\"$APP\",\"title\":\"O que mudou\"}"
```

Acompanhar até `done` (leva ~40 s; passa por `running`):

```bash
curl -s "http://187.77.228.24:3000/api/application.one?applicationId=$APP" \
  -H "x-api-key: $TOKEN" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['applicationStatus'])"
```

### 3.3 Verificar depois de subir

```bash
curl -s https://oficina.lexcode.tech/health
# {"ok":true,"servico":"oficina-avaliador","modelo":"deepseek-v4-flash",
#  "chave_configurada":true,"criterios":11,"peso_total":100,"niveis":4}
```

`chave_configurada:false` significa `DEEPSEEK_API_KEY` ausente no *Environment* —
o app sobe e responde, mas toda submissão devolve `502`.

### 3.4 O IP do painel

É **`187.77.228.24:3000`**, e não o `177.7.47.50` gravado na skill
`deploy-dokploy-hostinger` nem na nota
`02-Areas/Tecnologia-e-Automacao/Deploy-VPS-Hostinger-Dokploy.md` do segundo
cérebro. Usar o IP errado devolve `{"message":"Unauthorized"}` — token válido,
servidor errado.

### 3.5 SSH na VPS

`ssh root@187.77.228.24` (chave `~/.ssh/id_ed25519`) **abre o handshake TCP mas
trava no banner exchange** quando a origem é a rede da UNICAP: a porta 22 é
filtrada mesmo com o SYN/ACK passando. Todo diagnóstico precisa ser feito pela
API do Dokploy:

```bash
NAME=app-connect-open-source-hard-drive-yjwd73
curl -s "http://187.77.228.24:3000/api/docker.getContainersByAppNameMatch?appName=$NAME" \
  -H "x-api-key: $TOKEN"
curl -s "http://187.77.228.24:3000/api/docker.getConfig?containerId=<id>" \
  -H "x-api-key: $TOKEN"   # inspect completo, inclui State.Health.Log
```

---

## 4. Domínio novo na VPS

Dois passos independentes: **registro DNS** na Hostinger e **domínio** no
Dokploy. O Traefik só emite o certificado depois que o DNS já resolve para a
VPS — faça nesta ordem.

### 4.1 Registro A na Hostinger

```bash
curl -X PUT "https://developers.hostinger.com/api/dns/v1/zones/lexcode.tech" \
  -H "Authorization: Bearer <HOSTINGER_API_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{"overwrite":false,
       "zone":[{"name":"<subdominio>","type":"A","ttl":300,
                "records":[{"content":"187.77.228.24"}]}]}'
```

`overwrite:false` preserva o resto da zona. Propaga em segundos. Conferir:

```bash
nslookup <subdominio>.lexcode.tech 8.8.8.8   # deve devolver 187.77.228.24
```

### 4.2 Domínio e certificado no Dokploy

```bash
curl -X POST "http://187.77.228.24:3000/api/domain.create" \
  -H "x-api-key: $TOKEN" -H 'Content-Type: application/json' \
  -d '{"applicationId":"<applicationId>",
       "host":"<subdominio>.lexcode.tech",
       "path":"/",
       "port":8080,
       "https":true,
       "certificateType":"letsencrypt"}'
```

`certificateType: "letsencrypt"` é o que dispara a emissão: o Traefik resolve o
desafio ACME sozinho, sem `certbot` e sem tocar na VPS por SSH. **Não existe
passo manual de certificado**, e a renovação também é automática.

Configuração em vigor neste app, lida do painel:

| Campo | Valor |
| --- | --- |
| host | `oficina.lexcode.tech` |
| path | `/` |
| port | `8080` |
| https | `true` |
| certificateType | `letsencrypt` |

Conferir o certificado que está sendo servido:

```bash
echo | openssl s_client -connect <dominio>:443 -servername <dominio> 2>/dev/null \
  | openssl x509 -noout -issuer -subject -dates
```

Hoje: emissor `Let's Encrypt CN=YR2`, `CN=oficina.lexcode.tech`, válido de
15/08/2026 a 13/11/2026. HTTP responde `301` para HTTPS.

### 4.3 Armadilha de healthcheck (custou um 502 em outro app)

`HEALTHCHECK CMD wget http://localhost/...` em imagem Alpine **quebra**:
`localhost` resolve para `::1` antes de `127.0.0.1`, o nginx só escuta IPv4, o
wget toma *connection refused*, o orquestrador recicla o container a cada
~30–60 s e o Traefik nunca vê backend saudável → **502 constante mesmo com build
`done` e certificado válido**. Use sempre `127.0.0.1`. O `Dockerfile` deste app
já faz isso, via `fetch('http://127.0.0.1:8080/health')`.

---

## 5. Variáveis de ambiente

Definidas no *Environment* do app, no painel. Estão configuradas em produção:
`DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `DEEPSEEK_BASE_URL`, `PORT`, `DATA_DIR`,
`NODE_ENV`, `ADMIN_TOKEN`.

| Variável | Padrão no código | Para que serve |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | — (obrigatória) | sem ela toda submissão devolve `502` |
| `DEEPSEEK_MODEL` | `deepseek-v4-flash` | o `flash` julga igual ao `pro` nesta rubrica, em metade do tempo |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | — |
| `PORT` | `8080` | precisa casar com a porta do domínio |
| `DATA_DIR` | `./data` (`/app/data` na imagem) | precisa apontar para o volume, ou o banco some no redeploy |
| `ADMIN_USUARIO` | `admin` | login do painel `/admin.html` |
| `ADMIN_SENHA` | ver `.env.example` | idem — **troque este padrão**, veja a nota abaixo |
| `CODIGO_OFICINA` | `UNICAP` | código que os participantes digitam |
| `ADMIN_TOKEN` | — | autoriza `POST /api/admin/reset` sem sessão |

> **Pendência de segurança.** `ADMIN_USUARIO`, `ADMIN_SENHA` e `CODIGO_OFICINA`
> **não estão definidas em produção**, então valem os padrões do código — e esses
> padrões estão escritos em `.env.example`, que é público. Ou seja, a senha do
> painel administrativo pode ser lida por qualquer pessoa no GitHub. Defina as
> três no *Environment* do Dokploy com valores novos e troque os exemplos do
> `.env.example` por placeholders.

---

## 6. Mapeamento da API

Base: `https://oficina.lexcode.tech`. Todas as respostas são JSON. Corpo de
requisição limitado a 256 kB. Erros seguem `{"erro":"mensagem"}`.

Cabeçalhos aplicados a todas as respostas: `Content-Security-Policy`,
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: no-referrer`, `Strict-Transport-Security` e, em `/api/*` e
`/health`, `Cache-Control: no-store`.

### 6.1 Públicas

#### `GET /health`

Sem autenticação. Usada pelo `HEALTHCHECK` do container.

```json
{"ok":true,"servico":"oficina-avaliador","modelo":"deepseek-v4-flash",
 "chave_configurada":true,"criterios":11,"peso_total":100,"niveis":4}
```

#### `GET /api/rubrica`

A rubrica inteira — é daqui que o front-end tira títulos, pesos, faixa-alvo e
escada. Nenhum número de calibragem é repetido no HTML.

```json
{"peso_total":100,
 "medidas":{"pergunta_alvo":40,"pergunta_limite":55,
            "enunciado_alvo":110,"enunciado_limite":160},
 "limiar_selo":8.5,
 "nivel_minimo_selo":3,
 "niveis":[{"nivel":1,"rotulo":"Área temática","descricao":"..."}],
 "criterios":[{"id":"concisao","titulo":"Concisão do enunciado","peso":10,
               "pergunta":"...",
               "ancoras":{"atendido":"...","parcial":"...","nao_atendido":"..."},
               "medido":true,"critico":true}]}
```

`medido: true` = contado em código, não julgado pelo modelo (só `concisao`).
`critico: true` = zerar impede o selo (8 dos 11 critérios).

---

### 6.2 Participante

#### `POST /api/equipes`

Cria o participante e devolve o `id` que autentica as demais chamadas.

Requisição: `{"nome":"Nome Completo","email":"pessoa@exemplo.com","codigo":"UNICAP"}`

| Status | Quando |
| --- | --- |
| `201` | `{"id":"a1b2c3d4","nome":"Nome Completo","criado_em":"2026-09-14T11:04:07.221Z"}` |
| `400` | nome com menos de 3 caracteres, ou e-mail inválido |
| `403` | código da oficina incorreto |

#### `GET /api/equipes/:id`

Participante e histórico completo de versões.

```json
{"equipe":{"id":"a1b2c3d4","nome":"...","email":"...","criado_em":"..."},
 "historico":[{"id":41,"versao":3,"texto":"...","nota":7.4,"nivel":3,
               "palavras":58,"bem_delimitado":false,
               "avaliacoes":[],"resumo":{},"diff":{},
               "criado_em":"2026-09-14T11:04:07.221Z"}]}
```

`404` se o `id` não existe — o front-end usa isso para devolver a pessoa ao login
preservando o rascunho, o que acontece após um reset entre turmas.

#### `POST /api/equipes/:id/submissoes`

O endpoint principal. Chama o modelo, calcula nota, nível e diff, e persiste.
**Leva ~35 s**, quase tudo esperando o modelo.

Requisição: `{"texto":"Como se dá ...? Observam-se ..."}`

Resposta `200`, resumida:

```json
{"versao":2,
 "resumo":{"nota":8.8,"pontos":88,"rotulo":"Quase lá","classe":"bom",
           "nivel":{"nivel":4,"rotulo":"Problema pesquisável","total":4,
                    "proximo":null,"faltando":[]},
           "bem_delimitado":true,"limiar_selo":8.5,"nivel_minimo_selo":3,
           "selo_bloqueado_por":null,"criticos_pendentes":[],
           "total_atendidos":9,"total_parciais":2,"total_nao_atendidos":0},
 "medida":{"palavras":65,"frases":3,"perguntas":1,
           "palavras_pergunta":20,"emendas":0},
 "delta_nota":6.1,"nota_anterior":2.7,
 "avaliacoes":[{"criterio":"concisao","status":"atendido",
                "evidencia":"...","diagnostico":"...","sugestao":""}],
 "diff":{"conquistas":[],"regressoes":[],"pendentes":[]},
 "erros_novos":[],"comentario_geral":"..."}
```

`selo_bloqueado_por` vale `null`, `"criticos"`, `"nota"` ou `"nivel"` — nessa
ordem de precedência, e é o que a tela usa para dizer o que falta.

| Status | Quando |
| --- | --- |
| `200` | avaliado |
| `400` | texto com menos de 40 ou mais de 6000 caracteres |
| `404` | participante inexistente |
| `429` | reenvio em menos de 5 s (trava anti-duplo-clique, por participante) |
| `502` | falha ao chamar o modelo — a vez do participante **não** é consumida |

---

### 6.3 Administração

Sessão por token: `POST /api/admin/login` devolve um token que vale **8 h** e
viaja no cabeçalho `x-admin-session`. As sessões ficam em memória — **um redeploy
derruba todo mundo**.

#### `POST /api/admin/login`

`{"usuario":"admin","senha":"..."}` →
`200 {"token":"<hex>","expira_em":"2026-09-14T19:04:07.221Z"}`.
`401` com usuário ou senha errados; a comparação é feita em tempo constante.

#### `POST /api/admin/logout`

Exige `x-admin-session`. → `200 {"ok":true}`

#### `GET /api/admin/dashboard`

Exige `x-admin-session`. Estatísticas, ranking e participantes.

```json
{"estatisticas":{"total_participantes":3,"participantes_ativos":2,
   "sem_submissao":1,"total_submissoes":16,"media_versoes":8,
   "media_nota_inicial":4.9,"media_nota_final":7.3,"media_evolucao":2.4,
   "bem_delimitados":1,"melhoraram":2,"pioraram":0,
   "media_palavras_inicial":41,"media_palavras_final":58,
   "distribuicao_niveis":{"1":0,"2":1,"3":1,"4":0},
   "medidos":2,"no_nivel_4":0},
 "ranking":[{"posicao":1,"nome":"...","equipe_id":"a1b2c3d4",
             "melhor_nota":9.7,"submissoes":7,"bem_delimitado":true}],
 "participantes":[{"equipe_id":"a1b2c3d4","nome":"...","email":"...",
   "versoes":7,"nota_inicial":5.1,"nota_final":9.7,"evolucao":4.6,
   "nivel_final":4,"palavras_inicial":31,"palavras_final":85}],
 "gerado_em":"2026-09-14T11:04:07.221Z"}
```

Submissões anteriores à escada de nível têm `nivel_final: 0` e aparecem como `—`.

#### `GET /api/admin/participantes/:id`

Exige `x-admin-session`. Histórico completo de uma pessoa: todas as versões,
textos e vereditos. `404` se não existe.

#### `POST /api/admin/reset`

**Apaga todas as submissões e participantes.** É o reset entre turmas. Aceita
duas autorizações: sessão de admin **ou** o cabeçalho `x-admin-token`.

```bash
curl -X POST https://oficina.lexcode.tech/api/admin/reset \
  -H "x-admin-token: <ADMIN_TOKEN — está no Environment do Dokploy>"
# {"ok":true,"submissoes":16,"equipes":3}
```

`401` sem autorização. Sem `ADMIN_TOKEN` configurado, a via por token fica
desligada e só a sessão funciona.

---

## 7. Resumo das rotas

| Método | Rota | Auth | Resposta |
| --- | --- | --- | --- |
| `GET` | `/health` | — | estado do serviço |
| `GET` | `/api/rubrica` | — | critérios, medidas, níveis |
| `POST` | `/api/equipes` | código da oficina | `201` com o `id` |
| `GET` | `/api/equipes/:id` | id na URL | participante + histórico |
| `POST` | `/api/equipes/:id/submissoes` | id na URL | avaliação completa (~35 s) |
| `POST` | `/api/admin/login` | usuário e senha | token de 8 h |
| `POST` | `/api/admin/logout` | `x-admin-session` | `{"ok":true}` |
| `GET` | `/api/admin/dashboard` | `x-admin-session` | estatísticas + ranking |
| `GET` | `/api/admin/participantes/:id` | `x-admin-session` | histórico de um |
| `POST` | `/api/admin/reset` | `x-admin-session` ou `x-admin-token` | apaga tudo |

Estáticos: `/` (`public/index.html`) e `/admin.html`.

---

## 8. Endpoints do Dokploy usados

Base `http://187.77.228.24:3000/api`, cabeçalho `x-api-key`. Estilo tRPC: leitura
por `GET` com query string, escrita por `POST` com corpo JSON.

| Verificado | Endpoint | Uso |
| --- | --- | --- |
| sim | `POST /application.deploy` | dispara `git pull` + rebuild |
| sim | `GET /application.one?applicationId=` | estado, domínios, env, volumes |
| sim | `GET /project.all` | lista projetos e apps |
| sim | `GET /domain.byApplicationId?applicationId=` | domínios do app |
| sim | `GET /docker.getContainersByAppNameMatch?appName=` | containers, para diagnóstico |
| registro | `GET /docker.getConfig?containerId=` | inspect completo, inclui `State.Health.Log` |
| registro | `POST /project.create` | cria o projeto |
| registro | `POST /application.create` | cria o app no projeto |
| registro | `POST /application.saveBuildType` | define build por Dockerfile |
| registro | `POST /application.saveEnvironment` | grava as variáveis |
| registro | `POST /mounts.create` | cria o volume persistente |
| registro | `POST /domain.create` | domínio + Let's Encrypt |

"verificado" = testado nesta máquina, respondeu `200`. "registro" = executado com
sucesso na construção original (15/08/2026) e recuperado do log de comandos;
confirme a forma do corpo no painel antes de reexecutar.

---

## 9. Rotina entre turmas

1. `POST /api/admin/reset` com `x-admin-token` — zera submissões e participantes.
2. Conferir `GET /health` (`chave_configurada: true`).
3. Se trocar o código da oficina, ajustar `CODIGO_OFICINA` no *Environment* e
   **redeployar** — variável de ambiente só passa a valer no próximo deploy.
4. Divulgar o link <https://oficina.lexcode.tech>; o painel do facilitador fica
   em <https://oficina.lexcode.tech/admin.html>.

---

## 10. Diagnóstico rápido

| Sintoma | Causa provável |
| --- | --- |
| `502` em toda submissão | `DEEPSEEK_API_KEY` ausente ou inválida — ver `chave_configurada` em `/health` |
| `{"message":"Unauthorized"}` no Dokploy | IP errado do painel; é `187.77.228.24:3000` |
| `502` constante do Traefik | container reciclando — healthcheck em `localhost` numa Alpine; usar `127.0.0.1` |
| Deploy `done` mas código antigo | faltou o `git push` antes do `application.deploy` |
| "Equipe não encontrada" no navegador | sessão do navegador aponta para banco já resetado; o app devolve ao login preservando o rascunho |
| Banco vazio após deploy | `DATA_DIR` fora do volume `/app/data` |
| Nota oscilando no mesmo texto | alguém passou a pedir a nota ao modelo; ela **tem** de ser somada em `rubrica.js` |
