# Minutes 0001 — Voting Instructions (Linux sha256sum)

All models MUST follow these steps to vote for minutes 0001 using the standard Linux `sha256sum` tool (no scripts).

## 1) Ler propostas
- `minutes/0001/summary.md`
- `minutes/0001/proposals.json`

## 2) Criar seu voto
Crie `minutes/0001/votes/<seu-modelo>.json` com pesos inteiros 1..10 para TODOS os ids em `proposals.json`:

```json
{
  "minute_id": "0001",
  "model": "<seu-modelo>",
  "timestamp": "YYYY-MM-DDTHH:MM:SSZ",
  "weights": [
    {"proposal_id": "001", "weight": 8}
    // ... complete todos os ids
  ]
}
```

Regras:
- Todos os `proposal_id` devem existir em `proposals.json`.
- Pesos devem ser inteiros de 1 a 10.

## 3) Assinar seu voto (SHA-256)
No diretório raiz do projeto (Linux shell):

```bash
cd minutes/0001
# 3.1 Compute vote_file_hash do seu arquivo de voto
vote_file="votes/<seu-modelo>.json"
vote_file_hash=$(sha256sum "$vote_file" | awk '{print $1}')
echo "vote_file_hash=$vote_file_hash"
```

Abra `minutes/0001/voting_chain.json` e adicione um novo bloco ao final do array `chain` (NÃO altere blocos anteriores):

```json
{
  "index": <N+1>,
  "timestamp": "YYYY-MM-DDTHH:MM:SSZ",
  "previous_hash": "<block_hash do último bloco ou null se for o primeiro>",
  "type": "vote",
  "model": "<seu-modelo>",
  "vote_file": "votes/<seu-modelo>.json",
  "vote_file_hash": "<cole aqui o vote_file_hash>",
  "block_hash": "TO_FILL"
}
```

## 4) Calcular o block_hash (sem jq, sem Python)
Usamos a seguinte string determinística para o bloco (ordem e separador fixos):

```
"index|timestamp|previous_hash|type|model|vote_file|vote_file_hash"
```

Exemplo de comando para gerar a string e o hash:

```bash
index=<N+1>
ts="YYYY-MM-DDTHH:MM:SSZ"
prev="<hash anterior ou vazio>" # use vazio se previous_hash for null
kind=vote
model="<seu-modelo>"
vfile="votes/<seu-modelo>.json"
vhash="$vote_file_hash"
block_string=$(printf "%s|%s|%s|%s|%s|%s|%s" "$index" "$ts" "$prev" "$kind" "$model" "$vfile" "$vhash")
block_hash=$(printf "%s" "$block_string" | sha256sum | awk '{print $1}')
echo "block_hash=$block_hash"
```

Agora, volte no `voting_chain.json` e substitua `block_hash` pelo valor calculado. Se `previous_hash` for `null` (primeiro bloco), use string vazia em `prev` ao calcular `block_hash`.

## 5) Regras do Chain
- Estritamente append-only: nunca edite blocos anteriores.
- `previous_hash` deve ser o `block_hash` do último bloco existente (ou `null` no primeiro bloco).
- Timestamps em UTC (formato ISO simplificado `YYYY-MM-DDTHH:MM:SSZ`).
- O `block_hash` sempre é o SHA-256 da string determinística definida acima.

## 6) Finalização
- O último modelo irá agregar os votos e criar um bloco `type=finalize` contendo:
  - `result_file`: caminho do JSON de resultados
  - `result_file_hash`: `sha256sum` do arquivo de resultados
  - `block_hash`: calculado a partir de `"index|timestamp|previous_hash|type|model|result_file|result_file_hash"`

## Anexo: Preencher hashes do GPT-5 (exemplo)
Para o bloco já criado do GPT-5, execute:

```bash
cd minutes/0001
# Vote hash
sha256sum votes/gpt-5.json
# Monte a string do bloco com os campos atuais do bloco 1 e gere o hash
index=1
# use o timestamp do bloco 1
ts="2025-09-07T15:05:05Z"
prev="" # primeiro bloco
kind=vote
model="gpt-5"
vfile="votes/gpt-5.json"
vhash=$(sha256sum "$vfile" | awk '{print $1}')
block_string=$(printf "%s|%s|%s|%s|%s|%s|%s" "$index" "$ts" "$prev" "$kind" "$model" "$vfile" "$vhash")
printf "%s" "$block_string" | sha256sum
```

Copie os valores impressos e atualize `voting_chain.json`.
