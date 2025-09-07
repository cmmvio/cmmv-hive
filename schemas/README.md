# Schemas Directory

Este diretório contém todos os schemas JSON Schema utilizados no projeto CMMV-Hive para validar e padronizar estruturas de dados.

## Organização dos Schemas

### Core Schemas
- **`proposal.schema.json`** - Schema padrão para todas as propostas do projeto
- **`minutes_report.schema.json`** - Schema para relatórios de sessões de votação (minutes)

### Model Evaluation Schemas
- **`model_evaluation_entry.schema.json`** - Schema para entradas individuais de avaliação de modelos
- **`model_evaluations.schema.json`** - Schema para agregador de avaliações de modelos
- **`model_test_result.schema.json`** - Schema para resultados de testes de modelos

## Uso dos Schemas

### Validação de Propostas
Todas as propostas devem seguir o schema definido em `proposal.schema.json`. Os campos obrigatórios incluem:

- `id`: Identificador único da proposta
- `title`: Título descritivo
- `proposer`: Informações sobre o proponente
- `status`: Status atual da proposta
- `createdAt`: Data de criação
- `abstract`: Resumo de um parágrafo
- `motivation`: Justificativa da necessidade

### Validação de Relatórios
Os relatórios de minutes devem seguir o schema definido em `minutes_report.schema.json`, incluindo:

- `minutesId`: ID único da sessão
- `reportDate`: Data do relatório
- `votingDetails`: Detalhes da votação
- `proposals`: Lista de propostas avaliadas
- `results`: Resultados agregados

### Validação de Avaliações
As avaliações de modelos seguem os schemas específicos para garantir consistência nos dados de avaliação e teste.

## Ferramentas de Validação

Para validar arquivos JSON contra estes schemas, você pode usar:

```bash
# Usando Python com jsonschema
pip install jsonschema
python -c "import jsonschema; jsonschema.validate(instance=data, schema=schema)"

# Usando Node.js
npm install ajv
node -e "const Ajv = require('ajv'); const ajv = new Ajv(); const validate = ajv.compile(schema); console.log(validate(data));"
```

## Desenvolvimento

### Adicionando Novos Schemas
1. Crie o arquivo `.schema.json` neste diretório
2. Documente o schema no início do arquivo com `title` e `description`
3. Atualize este README.md com informações sobre o novo schema
4. Certifique-se de que o schema segue as melhores práticas do JSON Schema

### Boas Práticas
- Use `$schema` para especificar a versão do JSON Schema
- Inclua `title` e `description` descritivos
- Defina campos obrigatórios com `required`
- Use `examples` para ilustrar valores esperados
- Mantenha compatibilidade com versões anteriores quando possível

## Referências

- [JSON Schema Specification](https://json-schema.org/specification.html)
- [Understanding JSON Schema](https://json-schema.org/understanding-json-schema/)
- [JSON Schema Validation Tools](https://json-schema.org/implementations.html)
