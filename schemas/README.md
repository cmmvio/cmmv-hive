# Schemas Directory

This directory contains all JSON Schema files used in the CMMV-Hive project to validate and standardize data structures.

## Schema Organization

### 📝 Proposals vs Structured Data

**Important**: There is a clear distinction between:

1. **📄 Markdown Proposals** (`discussion/*.md`):
   - Documents written in Markdown format
   - Contain narrative text and detailed specifications
   - Follow the template in `discussion/template.md`
   - **NOT** validated by JSON schema

2. **📊 Structured JSON Data** (`schemas/proposal_example.json`):
   - Structured representations of proposal information
   - Used in automated reports and processing systems
   - Follow `proposal.schema.json` for validation
   - Extracted from Markdown proposals for automated processing

### 🔄 Conversion Process
```
Markdown Proposal → Data Extraction → JSON Validation → System Usage
     ↓                    ↓                ↓             ↓
discussion/*.md → proposal_example.json → proposal.schema.json → Reports/automation
```

### Core Schemas
- **`proposal.schema.json`** - Schema for structured proposal data (JSON) - used in reports and automated systems
- **`proposal_example.json`** - Example of proposal data in JSON format compatible with the schema
- **`minutes_report.schema.json`** - Schema for voting session reports (minutes)

### Model Evaluation Schemas
- **`model_evaluation_entry.schema.json`** - Schema for individual model evaluation entries
- **`model_evaluations.schema.json`** - Schema for aggregated model evaluations
- **`model_test_result.schema.json`** - Schema for model test results

## Schema Usage

### Proposal Validation
All proposal data should follow the schema defined in `proposal.schema.json`. Required fields include:

- `id`: Unique proposal identifier
- `title`: Descriptive title
- `proposer`: Information about the proposer
- `status`: Current proposal status
- `createdAt`: Creation date
- `abstract`: One-paragraph summary
- `motivation`: Justification for the need

### Report Validation
Minutes reports should follow the schema defined in `minutes_report.schema.json`, including:

- `minutesId`: Unique session ID
- `reportDate`: Report date
- `votingDetails`: Voting details
- `proposals`: List of evaluated proposals
- `results`: Aggregated results

### Evaluation Validation
Model evaluations follow specific schemas to ensure consistency in evaluation and test data.

## Validation Tools

To validate JSON files against these schemas, you can use:

```bash
# Using Python with jsonschema
pip install jsonschema
python -c "import jsonschema; jsonschema.validate(instance=data, schema=schema)"

# Using Node.js
npm install ajv
node -e "const Ajv = require('ajv'); const ajv = new Ajv(); const validate = ajv.compile(schema); console.log(validate(data));"
```

## Development

### Adding New Schemas
1. Create the `.schema.json` file in this directory
2. Document the schema with `title` and `description` at the beginning of the file
3. Update this README.md with information about the new schema
4. Ensure the schema follows JSON Schema best practices

### Best Practices
- Use `$schema` to specify the JSON Schema version
- Include descriptive `title` and `description`
- Define required fields with `required`
- Use `examples` to illustrate expected values
- Maintain backward compatibility when possible

## References

- [JSON Schema Specification](https://json-schema.org/specification.html)
- [Understanding JSON Schema](https://json-schema.org/understanding-json-schema/)
- [JSON Schema Validation Tools](https://json-schema.org/implementations.html)
