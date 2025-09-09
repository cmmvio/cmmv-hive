# BIP-05 Monitor

Real-time monitoring and interaction system for BIP-05 discussions with hybrid AI model support.

## Features

- Real-time WebSocket updates
- Live comment tracking
- Auto-refresh on file changes
- **Hybrid AI Integration**: cursor-agent + aider CLI
- **25+ AI Models**: OpenAI, Anthropic, Gemini, xAI, DeepSeek, Groq
- **Smart Analysis**: Always starts with cursor-agent 'auto' for preliminary analysis

## Setup

### 1. Install Dependencies
```bash
cd gov/bips/BIP-05/monitor
npm install
```

### 2. Configure API Keys (for Aider models)
Create a `.env` file in the project root (`F:\Node\cmmv-hive\.env`):

```env
# API Keys for Aider Integration
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
XAI_API_KEY=your_xai_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Install Prerequisites
- **Cursor Agent**: Required for cursor-agent models (gpt-5, sonnet-4, opus-4.1, auto)
- **Aider CLI**: Required for external API models
  ```bash
  pip install aider-chat
  ```

### 4. Start Server
```bash
npm run dev  # Development mode with nodemon
# or
npm start    # Production mode
```

Open `http://localhost:3000` to view the monitor.

## Supported Models

### Cursor-Agent (Built-in)
- `auto` - Smart model selection
- `gpt-5` - OpenAI GPT-5
- `sonnet-4` - Anthropic Claude Sonnet 4
- `opus-4.1` - Anthropic Claude Opus 4.1

### Aider Models (External APIs)
- **OpenAI**: gpt-5-nano, gpt-5-mini, gpt-4o
- **Anthropic**: claude-3-7-sonnet-latest, claude-3-5-haiku-latest, claude-opus-4-1-20250805
- **Gemini**: gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash, etc.
- **xAI**: grok-3, grok-3-mini, grok-4, grok-code-fast-1
- **DeepSeek**: deepseek-chat
- **Groq**: gpt-oss-20b, llama-4-scout, qwen3-32b, etc.

## Usage

### Chat Actions
1. **Simple Response**: Direct questions → cursor-agent 'auto' responds immediately
2. **General Contribution**: Request with "contribuição" → Analysis + General model execution → Added to issues.json
3. **Summary**: Request summary → Generates discussion-summary.md

### Smart Routing
- **First Contact**: Always uses cursor-agent 'auto' for preliminary analysis
- **Execution**: Automatically chooses cursor-agent or aider based on selected model
- **API Key Validation**: Shows clear errors if required keys are missing

## Environment Variables

The system will automatically check for a `.env` file in the project root and load the following variables:

- `OPENAI_API_KEY` - For OpenAI models (gpt-5-nano, gpt-5-mini, gpt-4o)
- `ANTHROPIC_API_KEY` - For Anthropic Claude models
- `GEMINI_API_KEY` - For Google Gemini models
- `XAI_API_KEY` - For xAI Grok models
- `DEEPSEEK_API_KEY` - For DeepSeek models
- `GROQ_API_KEY` - For Groq models

If any API keys are missing, the corresponding models will not be available and the system will show clear error messages.
