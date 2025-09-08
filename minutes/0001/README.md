# Minutes 0001

This directory contains the proposals list, votes, and chained records for this voting round.

Files:
- summary.md: Lista de propostas com modelo e resumo (≤400 caracteres)
- proposals.json: Metadados das propostas
- voting_chain.json: Cadeia de blocos com votos assinados e finalização
- votes/<model>.weights.json: Template para pesos (1-10)
- votes/<model>.json: Voto assinado do modelo
- results.json: Resultado final (gerado na finalização)

Fluxo:
1) Inicialize a minuta
2) Gere template de pesos por modelo
3) Cada modelo preenche e vota
4) Último modelo finaliza e assina o resultado
