const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Load environment variables from .env file
function loadEnvironment() {
    const envPath = path.join(__dirname, '..', '..', '..', '..', '.env');
    const envExists = fs.existsSync(envPath);

    console.log(`[ENV] Checking for .env file at: ${envPath}`);

    if (envExists) {
        console.log(`[ENV] Loading .env file...`);
        try {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const envLines = envContent.split('\n');

            envLines.forEach(line => {
                line = line.trim();
                if (line && !line.startsWith('#')) {
                    const [key, value] = line.split('=');
                    if (key && value) {
                        process.env[key.trim()] = value.trim();
                        console.log(`[ENV] Loaded: ${key.trim()}`);
                    }
                }
            });

            console.log(`[ENV] ✅ Environment variables loaded successfully`);
        } catch (error) {
            console.error(`[ENV] ❌ Error reading .env file:`, error.message);
        }
    } else {
        console.log(`[ENV] ⚠️  No .env file found. Aider models will not work without API keys.`);
        console.log(`[ENV] Create a .env file in the project root with your API keys.`);
    }
}

// Validate required API keys for aider models
function validateApiKeys() {
    const requiredKeys = [
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY',
        'GEMINI_API_KEY',
        'XAI_API_KEY',
        'DEEPSEEK_API_KEY',
        'GROQ_API_KEY'
    ];

    const missingKeys = [];
    const availableKeys = [];

    requiredKeys.forEach(key => {
        if (process.env[key]) {
            availableKeys.push(key);
        } else {
            missingKeys.push(key);
        }
    });

    console.log(`[ENV] API Keys Status:`);
    console.log(`[ENV] ✅ Available: ${availableKeys.join(', ')}`);

    if (missingKeys.length > 0) {
        console.log(`[ENV] ❌ Missing: ${missingKeys.join(', ')}`);
        console.log(`[ENV] Some aider models will not be available without these keys.`);
    }

    return { availableKeys, missingKeys };
}

// Initialize environment
loadEnvironment();
const keyStatus = validateApiKeys();

// Test API connectivity with simple models (one per provider)
async function testApiConnectivity() {
    // Check cache first
    const cachedResults = loadApiCache();
    if (cachedResults) {
        const workingModels = getModelsFromProviders(cachedResults.workingProviders);
        console.log(`[API CACHE] ✅ Using cached working providers: ${cachedResults.workingProviders.join(', ')}`);
        console.log(`[API CACHE] 📋 Available models from cache: ${workingModels.length} models`);
        return {
            workingApis: workingModels,
            failedApis: [],
            fromCache: true
        };
    }

    console.log(`[API TEST] 🧪 Testing API connectivity with simple models (one per provider)...`);

    // Test only one model per provider
    const testModels = {
        'openai': { model: 'openai/gpt-5-nano', key: 'OPENAI_API_KEY' },
        'anthropic': { model: 'anthropic/claude-3-5-haiku-latest', key: 'ANTHROPIC_API_KEY' },
        'gemini': { model: 'gemini/gemini-2.0-flash-lite', key: 'GEMINI_API_KEY' },
        'xai': { model: 'xai/grok-3-mini', key: 'XAI_API_KEY' },
        'deepseek': { model: 'deepseek-chat', key: 'DEEPSEEK_API_KEY' },
        'groq': { model: 'groq/openai/gpt-oss-20b', key: 'GROQ_API_KEY' }
    };

    const workingProviders = [];
    const failedProviders = [];

    for (const [provider, config] of Object.entries(testModels)) {
        const apiKey = process.env[config.key];

        if (!apiKey) {
            console.log(`[API TEST] ⏭️  Skipping ${provider} - No API key for ${config.key}`);
            failedProviders.push({ provider, reason: `Missing ${config.key}` });
            continue;
        }

        console.log(`[API TEST] 🔍 Testing ${provider} provider with ${config.model}...`);

        try {
            const testPrompt = "Responda apenas 'OK' para confirmar que a API está funcionando.";
            const response = await callLLMViaAider(config.model, testPrompt);

            if (response && !response.includes('❌')) {
                console.log(`[API TEST] ✅ ${provider} provider - WORKING`);
                workingProviders.push(provider);
            } else {
                console.log(`[API TEST] ❌ ${provider} provider - FAILED: ${response}`);
                failedProviders.push({ provider, reason: response });
            }
        } catch (error) {
            console.log(`[API TEST] ❌ ${provider} provider - ERROR: ${error.message}`);
            failedProviders.push({ provider, reason: error.message });
        }

        // Small delay between tests to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Save results to cache
    saveApiCache(workingProviders, failedProviders);

    // Get all models for working providers
    const workingModels = getModelsFromProviders(workingProviders);

    console.log(`\n[API TEST] 📊 Test Results Summary:`);
    console.log(`[API TEST] ✅ Working Providers (${workingProviders.length}): ${workingProviders.join(', ')}`);
    console.log(`[API TEST] 📋 Available Models (${workingModels.length}): ${workingModels.join(', ')}`);

    if (failedProviders.length > 0) {
        console.log(`[API TEST] ❌ Failed Providers (${failedProviders.length}):`);
        failedProviders.forEach(({ provider, reason }) => {
            console.log(`[API TEST]   - ${provider}: ${reason}`);
        });
    }

    return {
        workingApis: workingModels,
        failedApis: failedProviders.map(f => ({ model: f.provider, error: f.reason })),
        fromCache: false
    };
}

// Store working APIs globally
let WORKING_APIS = [];

// API test cache configuration
const API_CACHE_FILE = path.join(__dirname, 'api-test-cache.json');
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Provider to models mapping
const PROVIDER_MODELS = {
    'openai': ['openai/gpt-5-nano', 'openai/gpt-5-mini', 'openai/gpt-4o'],
    'anthropic': ['anthropic/claude-3-7-sonnet-latest', 'anthropic/claude-3-5-haiku-latest', 'anthropic/claude-opus-4-1-20250805'],
    'gemini': ['gemini/gemini-2.5-pro', 'gemini/gemini-2.5-flash', 'gemini/gemini-2.5-flash-lite', 'gemini/gemini-2.0-flash', 'gemini/gemini-2.0-flash-lite'],
    'xai': ['xai/grok-3', 'xai/grok-3-mini', 'xai/grok-4', 'xai/grok-code-fast-1'],
    'deepseek': ['deepseek-chat'],
    'groq': ['groq/openai/gpt-oss-20b', 'groq/openai/gpt-oss-120b', 'groq/qwen/qwen3-32b']
};

// Load API test cache
function loadApiCache() {
    try {
        if (fs.existsSync(API_CACHE_FILE)) {
            const cacheData = JSON.parse(fs.readFileSync(API_CACHE_FILE, 'utf8'));
            const now = Date.now();

            if (cacheData.timestamp && (now - cacheData.timestamp) < CACHE_DURATION) {
                console.log(`[API CACHE] 📋 Using cached results from ${new Date(cacheData.timestamp).toLocaleString()}`);
                return cacheData;
            } else {
                console.log(`[API CACHE] ⏰ Cache expired (${Math.round((now - cacheData.timestamp) / 60000)} minutes ago)`);
            }
        } else {
            console.log(`[API CACHE] 📄 No cache file found, will create new one`);
        }
    } catch (error) {
        console.log(`[API CACHE] ❌ Error loading cache: ${error.message}`);
    }
    return null;
}

// Save API test results to cache
function saveApiCache(workingProviders, failedProviders) {
    try {
        const cacheData = {
            timestamp: Date.now(),
            workingProviders,
            failedProviders,
            lastTest: new Date().toISOString()
        };

        fs.writeFileSync(API_CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf8');
        console.log(`[API CACHE] 💾 Results saved to cache`);
    } catch (error) {
        console.log(`[API CACHE] ❌ Error saving cache: ${error.message}`);
    }
}

// Get all models for working providers
function getModelsFromProviders(workingProviders) {
    const workingModels = [];

    Object.entries(PROVIDER_MODELS).forEach(([provider, models]) => {
        if (workingProviders.includes(provider)) {
            workingModels.push(...models);
        }
    });

    return workingModels;
}

// Update model categories based on working APIs
function updateAvailableModels(workingApis) {
    console.log(`[API TEST] 🔄 Updating available models based on working APIs...`);

    // Filter generals to only include working APIs + cursor-agent models
    const workingGenerals = MODEL_CATEGORIES.generals.filter(model => {
        return MODEL_CATEGORIES.cursor_models.includes(model) || workingApis.includes(model);
    });

    // Filter BIP-specific models
    const workingBipSpecific = MODEL_CATEGORIES.bip_specific.filter(model => {
        return MODEL_CATEGORIES.cursor_models.includes(model) || model === 'auto' || workingApis.includes(model);
    });

    // Update categories
    MODEL_CATEGORIES.generals = workingGenerals;
    MODEL_CATEGORIES.bip_specific = workingBipSpecific;

    console.log(`[API TEST] ✅ Updated generals: ${workingGenerals.join(', ')}`);
    console.log(`[API TEST] ✅ Updated BIP-specific: ${workingBipSpecific.join(', ')}`);

    WORKING_APIS = workingApis;
}

// Initialize API testing (run after a short delay to let server start)
setTimeout(async () => {
    try {
        const { workingApis, failedApis, fromCache } = await testApiConnectivity();
        updateAvailableModels(workingApis);

        const cacheInfo = fromCache ? ' (from cache)' : ' (fresh test)';
        console.log(`\n[SYSTEM] 🚀 Server fully initialized with ${workingApis.length} working APIs${cacheInfo}`);
        console.log(`[SYSTEM] 📋 Available for chat: cursor-agent + ${workingApis.length} aider models`);

        if (!fromCache) {
            console.log(`[SYSTEM] ⏰ Next API test will run in 1 hour or on manual refresh`);
        }

    } catch (err) {
        console.error(`[API TEST] Error during API testing:`, err);
        console.log(`[SYSTEM] ⚠️  Server running with cursor-agent only (no aider APIs tested)`);
    }
}, 2000);

// Model categorization: cursor-agent vs aider
const MODEL_CATEGORIES = {
    // Always use cursor-agent 'auto' for initial analysis
    initial_analysis: 'auto',

    // Cursor-agent models (built-in Cursor)
    cursor_models: ['gpt-5', 'sonnet-4', 'opus-4.1'],

    // Aider models (external API calls)
    aider_models: {
        // OpenAI
        'openai/gpt-5-nano': { provider: 'openai', key: 'OPENAI_API_KEY', model: 'gpt-5-nano' },
        'openai/gpt-5-mini': { provider: 'openai', key: 'OPENAI_API_KEY', model: 'gpt-5-mini' },
        'openai/gpt-4o': { provider: 'openai', key: 'OPENAI_API_KEY', model: 'gpt-4o' },

        // Anthropic
        'anthropic/claude-3-7-sonnet-latest': { provider: 'anthropic', key: 'ANTHROPIC_API_KEY', model: 'claude-3-7-sonnet-latest' },
        'anthropic/claude-3-5-haiku-latest': { provider: 'anthropic', key: 'ANTHROPIC_API_KEY', model: 'claude-3-5-haiku-latest' },
        'anthropic/claude-opus-4-1-20250805': { provider: 'anthropic', key: 'ANTHROPIC_API_KEY', model: 'claude-opus-4-1-20250805' },

        // Gemini
        'gemini/gemini-2.5-pro': { provider: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-2.5-pro' },
        'gemini/gemini-2.5-flash': { provider: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-2.5-flash' },
        'gemini/gemini-2.5-flash-lite': { provider: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-2.5-flash-lite' },
        'gemini/gemini-2.0-flash': { provider: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-2.0-flash' },
        'gemini/gemini-2.0-flash-lite': { provider: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-2.0-flash-lite' },

        // xAI
        'xai/grok-3': { provider: 'xai', key: 'XAI_API_KEY', model: 'grok-3' },
        'xai/grok-3-mini': { provider: 'xai', key: 'XAI_API_KEY', model: 'grok-3-mini' },
        'xai/grok-4': { provider: 'xai', key: 'XAI_API_KEY', model: 'grok-4' },
        'xai/grok-code-fast-1': { provider: 'xai', key: 'XAI_API_KEY', model: 'grok-code-fast-1' },

        // DeepSeek
        'deepseek-chat': { provider: 'deepseek', key: 'DEEPSEEK_API_KEY', model: 'deepseek-chat' },

        // Groq
        'groq/openai/gpt-oss-20b': { provider: 'groq', key: 'GROQ_API_KEY', model: 'openai/gpt-oss-20b' },
        'groq/openai/gpt-oss-120b': { provider: 'groq', key: 'GROQ_API_KEY', model: 'openai/gpt-oss-120b' },
        'groq/meta-llama/llama-4-scout-17b-16e-instruct': { provider: 'groq', key: 'GROQ_API_KEY', model: 'meta-llama/llama-4-scout-17b-16e-instruct' },
        'groq/meta-llama/llama-4-maverick-17b-128e-instruct': { provider: 'groq', key: 'GROQ_API_KEY', model: 'meta-llama/llama-4-maverick-17b-128e-instruct' },
        'groq/qwen/qwen3-32b': { provider: 'groq', key: 'GROQ_API_KEY', model: 'qwen/qwen3-32b' }
    },

    // Model selection for different tasks
    generals: ['gpt-5', 'sonnet-4', 'opus-4.1', 'anthropic/claude-3-7-sonnet-latest', 'openai/gpt-4o', 'xai/grok-4'],
    bip_specific: ['auto', 'gpt-5', 'openai/gpt-5-mini', 'gemini/gemini-2.5-pro', 'deepseek-chat']
};

// Determine if model should use cursor-agent or aider
function shouldUseCursorAgent(modelId) {
    return MODEL_CATEGORIES.cursor_models.includes(modelId) || modelId === 'auto';
}

// LLM call helper via aider CLI
async function callLLMViaAider(modelId, prompt) {
    const { spawn } = require('child_process');

    console.log(`[AIDER DEBUG] Starting interaction with model: ${modelId}`);

    const modelConfig = MODEL_CATEGORIES.aider_models[modelId];
    if (!modelConfig) {
        return `❌ Modelo ${modelId} não encontrado na configuração do aider.`;
    }

    const apiKey = process.env[modelConfig.key];
    if (!apiKey) {
        console.log(`[AIDER DEBUG] Missing API key: ${modelConfig.key}`);
        return `❌ API key ${modelConfig.key} não encontrada. Configure no arquivo .env para usar este modelo.`;
    }

    try {
        return new Promise((resolve, reject) => {
            const command = 'aider';
            const args = [
                '--model', modelConfig.model,
                '--api-key', `${modelConfig.provider}=${apiKey}`,
                '--no-pretty',
                '--yes',
                '--message', prompt
            ];

            console.log(`[AIDER DEBUG] Executing: ${command} --model ${modelConfig.model} --api-key ${modelConfig.provider}=***`);

            const aiderProcess = spawn(command, args);

            let stdout = '';
            let stderr = '';
            let isResolved = false;

            const timeout = setTimeout(() => {
                if (!isResolved) {
                    console.log(`[AIDER DEBUG] TIMEOUT after 60 seconds`);
                    aiderProcess.kill('SIGTERM');
                    isResolved = true;
                    resolve('⏰ A resposta do aider demorou muito. Tente novamente.');
                }
            }, 60000);

            aiderProcess.stdout.on('data', (data) => {
                const chunk = data.toString();
                stdout += chunk;
                console.log(`[AIDER DEBUG] STDOUT: ${chunk.trim()}`);
            });

            aiderProcess.stderr.on('data', (data) => {
                const chunk = data.toString();
                stderr += chunk;
                console.log(`[AIDER DEBUG] STDERR: ${chunk.trim()}`);
            });

            aiderProcess.on('close', (code) => {
                if (isResolved) return;
                isResolved = true;
                clearTimeout(timeout);

                console.log(`[AIDER DEBUG] Process closed with code: ${code}`);
                console.log(`[AIDER DEBUG] Final STDOUT: "${stdout}"`);
                console.log(`[AIDER DEBUG] Final STDERR: "${stderr}"`);

                if (code !== 0) {
                    resolve(`❌ Aider falhou (código ${code}): ${stderr || 'Sem detalhes'}`);
                    return;
                }

                const response = stdout.trim();
                if (response) {
                    console.log(`[AIDER DEBUG] SUCCESS - Response length: ${response.length}`);
                    resolve(response);
                } else {
                    resolve('❌ Aider não retornou resposta.');
                }
            });

            aiderProcess.on('error', (error) => {
                if (isResolved) return;
                isResolved = true;
                clearTimeout(timeout);
                console.log(`[AIDER DEBUG] SPAWN ERROR: ${error.message}`);
                resolve('❌ Erro ao iniciar aider. Verifique se está instalado.');
            });
        });
    } catch (err) {
        console.log(`[AIDER ERROR]: ${err?.message || err}`);
        return '❌ Erro interno do aider.';
    }
}

// Main LLM call dispatcher - decides between cursor-agent and aider
async function callLLM(modelId, prompt) {
    const systemPrompt = 'Você é um modelo auxiliando na discussão do BIP-05 (UMICP). Responda em PT-BR, de forma objetiva e útil, mantendo o contexto do tópico.';
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    // Decide which method to use
    if (shouldUseCursorAgent(modelId)) {
        console.log(`[LLM DEBUG] Using cursor-agent for model: ${modelId}`);
        return await callLLMViaCursorAgent(modelId, fullPrompt);
    } else {
        console.log(`[LLM DEBUG] Using aider for model: ${modelId}`);
        return await callLLMViaAider(modelId, fullPrompt);
    }
}

// LLM call helper using cursor-agent
async function callLLMViaCursorAgent(modelId, fullPrompt) {
    const { spawn } = require('child_process');

    try {
        console.log(`[CURSOR-AGENT DEBUG] Starting interaction with model: ${modelId}`);
        console.log(`[CURSOR-AGENT DEBUG] Full prompt length: ${fullPrompt.length} characters`);

        const command = 'cursor-agent';
        const args = [
            '--print',
            '--output-format', 'text',
            '--model', modelId,
            '-p', fullPrompt
        ];

        console.log(`[CURSOR-AGENT DEBUG] Executing command: ${command}`);
        console.log(`[CURSOR-AGENT DEBUG] Args:`, args);
        console.log(`[CURSOR-AGENT DEBUG] Command line would be: ${command} ${args.map(arg => `"${arg}"`).join(' ')}`);

        return new Promise((resolve, reject) => {
            const cursorAgent = spawn(command, args, {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';
            let isResolved = false;
            let dataReceived = false;

            // Set timeout to avoid hanging
            const timeout = setTimeout(async () => {
                if (!isResolved) {
                    console.log(`[CURSOR-AGENT DEBUG] TIMEOUT after 60 seconds`);
                    console.log(`[CURSOR-AGENT DEBUG] Data received: ${dataReceived}`);
                    console.log(`[CURSOR-AGENT DEBUG] STDOUT so far: "${stdout}"`);
                    console.log(`[CURSOR-AGENT DEBUG] STDERR so far: "${stderr}"`);
                    cursorAgent.kill('SIGTERM');
                    isResolved = true;

                    // Try with 'auto' model as fallback if original model failed
                    if (modelId !== 'auto') {
                        console.log(`[CURSOR-AGENT DEBUG] Trying fallback with 'auto' model...`);
                        try {
                            const fallbackResult = await callLLM('auto', prompt);
                            resolve(fallbackResult);
                            return;
                        } catch (fallbackError) {
                            console.log(`[CURSOR-AGENT DEBUG] Fallback also failed: ${fallbackError}`);
                        }
                    }

                    resolve('⏰ A resposta demorou muito para ser processada. Tente novamente em alguns instantes.');
                }
            }, 60000); // 60 second timeout, then try fallback

            cursorAgent.stdout.on('data', (data) => {
                dataReceived = true;
                const chunk = data.toString();
                stdout += chunk;
                console.log(`[CURSOR-AGENT DEBUG] STDOUT chunk: "${chunk}"`);
                console.log(`[CURSOR-AGENT DEBUG] Total STDOUT so far: "${stdout}"`);
            });

            cursorAgent.stderr.on('data', (data) => {
                dataReceived = true;
                const chunk = data.toString();
                stderr += chunk;
                console.log(`[CURSOR-AGENT DEBUG] STDERR chunk: "${chunk}"`);
                console.log(`[CURSOR-AGENT DEBUG] Total STDERR so far: "${stderr}"`);
            });

            cursorAgent.on('spawn', () => {
                console.log(`[CURSOR-AGENT DEBUG] Process spawned successfully with PID: ${cursorAgent.pid}`);
            });

            cursorAgent.on('close', (code, signal) => {
                if (isResolved) {
                    console.log(`[CURSOR-AGENT DEBUG] Process already resolved, ignoring close event`);
                    return;
                }
                isResolved = true;
                clearTimeout(timeout);

                console.log(`[CURSOR-AGENT DEBUG] Process closed with code: ${code}, signal: ${signal}`);
                console.log(`[CURSOR-AGENT DEBUG] Data received during execution: ${dataReceived}`);
                console.log(`[CURSOR-AGENT DEBUG] Final STDOUT: "${stdout}"`);
                console.log(`[CURSOR-AGENT DEBUG] Final STDERR: "${stderr}"`);

                if (code !== 0) {
                    console.log(`[CURSOR-AGENT DEBUG] Non-zero exit code: ${code}`);
                    return resolve(`❌ cursor-agent falhou (código ${code}): ${stderr || 'Sem detalhes'}`);
                }

                if (!stdout.trim()) {
                    console.log(`[CURSOR-AGENT DEBUG] Empty or whitespace-only output`);
                    return resolve('❌ cursor-agent não retornou resposta. Verifique se o modelo está disponível.');
                }

                // For text format, just return the stdout content
                const response = stdout.trim();
                console.log(`[CURSOR-AGENT DEBUG] SUCCESS - Response length: ${response.length}`);
                console.log(`[CURSOR-AGENT DEBUG] SUCCESS - Response preview: "${response.slice(0, 200)}${response.length > 200 ? '...' : ''}"`);
                resolve(response);
            });

            cursorAgent.on('error', (error) => {
                if (isResolved) {
                    console.log(`[CURSOR-AGENT DEBUG] Process already resolved, ignoring error event`);
        return;
      }
                isResolved = true;
                clearTimeout(timeout);
                console.log(`[CURSOR-AGENT DEBUG] SPAWN ERROR: ${error.message}`);
                console.log(`[CURSOR-AGENT DEBUG] Error details:`, error);
                resolve('❌ Erro ao iniciar cursor-agent. Verifique se está instalado e autenticado.');
            });

            // Log additional process info
            setTimeout(() => {
                if (!isResolved) {
                    console.log(`[CURSOR-AGENT DEBUG] Process still running after 10 seconds...`);
                    console.log(`[CURSOR-AGENT DEBUG] PID: ${cursorAgent.pid}`);
                    console.log(`[CURSOR-AGENT DEBUG] Data received so far: ${dataReceived}`);
                }
            }, 10000);
        });
    } catch (err) {
        console.log(`[LLM ERROR]: ${err?.message || err}`);
        return '❌ Erro interno do sistema. Tente novamente em alguns instantes.';
    }
}


// Intelligent model selection based on text content and context
function selectAppropriateModel(text, context = 'general') {
    const lowerText = text.toLowerCase();

    // Check for explicit model requests in text
    const modelRequest = lowerText.match(/use\s+([\w.-]+)|modelo\s+([\w.-]+)|chame\s+([\w.-]+)|ask\s+([\w.-]+)/);
    if (modelRequest) {
        const requestedModel = modelRequest[1] || modelRequest[2] || modelRequest[3] || modelRequest[4];
        if (MODEL_CATEGORIES.generals.includes(requestedModel) ||
            MODEL_CATEGORIES.bip_specific.includes(requestedModel)) {
            return requestedModel;
        }
    }

    // Check for indicators of complex tasks requiring general models
    const complexIndicators = [
        'analis', 'analyz', 'review', 'audit', 'security', 'architect',
        'design', 'implement', 'complex', 'detailed', 'comprehensive',
        'avaliar', 'revisar', 'arquitetura', 'implementar', 'complexo',
        'detalhado', 'abrangente', 'profundo'
    ];

    const hasComplexIndicators = complexIndicators.some(indicator =>
        lowerText.includes(indicator)
    );

    if (hasComplexIndicators) {
        // Random selection from generals
        const generals = MODEL_CATEGORIES.generals;
        return generals[Math.floor(Math.random() * generals.length)];
    }

    // Check for BIP-specific context
    if (context === 'bip' || lowerText.includes('bip') || lowerText.includes('proposal')) {
        const bipModels = MODEL_CATEGORIES.bip_specific;
        return bipModels[Math.floor(Math.random() * bipModels.length)];
    }

    // Default to small models for simple interactions
    const smallModels = MODEL_CATEGORIES.small;
    return smallModels[Math.floor(Math.random() * smallModels.length)];
}

function buildPromptFromContext(userText, issuesData) {
    const recent = [];
    try {
        const all = [];
        (issuesData.issues || []).forEach(issue => {
            (issue.comments || []).forEach(c => all.push(c));
        });
        all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const last = all.slice(0, 5).reverse();
        last.forEach(c => {
            recent.push(`- ${c.author}: ${c.body?.slice(0, 240) || ''}`);
        });
    } catch {}

    return [
        'Contexto recente:',
        recent.length ? recent.join('\n') : '(sem histórico recente)',
        '',
        `Mensagem do usuário: ${userText}`,
        '',
        'Tarefa: responda de forma curta (2-5 linhas), objetiva, e focada no assunto.'
    ].join('\n');
}

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Paths
const issuesFile = path.join(__dirname, '..', 'issues.json');
const bipFile = path.join(__dirname, '..', 'BIP-05-054-universal-matrix-protocol.md');
const implementationFile = path.join(__dirname, '..', 'implementation-plan.md');
const inventoryFile = path.join(__dirname, '..', '..', '..', '..', 'scripts', 'mcp', 'cursor_model_inventory.yml');

// Session context for simple responses
let sessionContext = [];

// Middleware to parse JSON request bodies
app.use(express.json());

// API endpoint to check working APIs
app.get('/api/status', (req, res) => {
    // Load cache info
    const cacheInfo = loadApiCache();

    res.json({
        working_apis: WORKING_APIS,
        available_models: {
            cursor_agent: MODEL_CATEGORIES.cursor_models,
            aider: WORKING_APIS,
            generals: MODEL_CATEGORIES.generals,
            bip_specific: MODEL_CATEGORIES.bip_specific
        },
        api_keys_status: keyStatus,
        cache_info: cacheInfo ? {
            last_test: cacheInfo.lastTest,
            from_cache: true,
            expires_in_minutes: Math.max(0, Math.round((CACHE_DURATION - (Date.now() - cacheInfo.timestamp)) / 60000))
        } : { from_cache: false }
    });
});

// API endpoint to force re-test APIs
app.post('/api/retest', async (req, res) => {
    try {
        console.log(`[API TEST] 🔄 Manual retest requested`);

        // Delete cache to force fresh test
        if (fs.existsSync(API_CACHE_FILE)) {
            fs.unlinkSync(API_CACHE_FILE);
            console.log(`[API CACHE] 🗑️  Cache file deleted`);
        }

        // Run fresh test
        const { workingApis, failedApis, fromCache } = await testApiConnectivity();
        updateAvailableModels(workingApis);

        res.json({
            success: true,
            message: 'API retest completed',
            working_apis: workingApis,
            failed_apis: failedApis,
            from_cache: fromCache
        });

    } catch (error) {
        console.error(`[API TEST] Error during manual retest:`, error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Serve static files (index.html, style.css)
app.use(express.static(__dirname));

// Simple REST endpoint for posting comments
app.post('/api/comment', async (req, res) => {
    const { model, text } = req.body;

    try {
        const selectedModel = model || selectAppropriateModel(text || '', 'bip');
        console.log(`[DEBUG] Selected model: ${selectedModel} (requested: ${model || 'auto'})`);

        const issuesData = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));
        const prompt = buildPromptFromContext(text || 'Sem texto do usuário', issuesData);
        const llmText = await callLLM(selectedModel, prompt);
        const bodyText = llmText || (text ? `Recebido: "${text}"` : `Participação registrada por ${selectedModel}.`);

        const comment = {
            author: selectedModel,
            created_at: new Date().toISOString(),
            locale: 'pt-BR',
            body: bodyText,
            body_original: bodyText
        };

        if (issuesData.issues && issuesData.issues.length > 0) {
            issuesData.issues[0].comments.push(comment);
  } else {
            issuesData.issues = [{ id: 1, title: 'Main Thread', comments: [comment] }];
        }

        fs.writeFileSync(issuesFile, JSON.stringify(issuesData, null, 2), 'utf8');

        res.status(200).json({
            success: true,
            message: `Comentário publicado por ${selectedModel}`,
            comment: bodyText
        });
    } catch (error) {
        console.error('Error in /api/comment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create WebSocket server and attach it to the HTTP server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

// Function to send issues data to all connected clients
function broadcastIssues() {
  if (clients.size === 0) return;

    console.log(`[DEBUG] Broadcasting issues to ${clients.size} client(s).`);

  fs.readFile(issuesFile, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading issues.json:', err);
      return;
    }

    try {
            const originalData = JSON.parse(data);

            // --- Data Transformation ---
            // 1. Collect all comments from all issues into a single array.
            let allComments = [];
            if (originalData.issues && Array.isArray(originalData.issues)) {
                originalData.issues.forEach(issue => {
                    if (issue.comments && Array.isArray(issue.comments)) {
                        // Add issue context to each comment if needed later
                        const commentsWithContext = issue.comments.map(c => ({...c, issueId: issue.id, issueTitle: issue.title}));
                        allComments.push(...commentsWithContext);
                    }
                });
            }

            // 2. Sort all comments by date.
            allComments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            // 3. Create a simplified payload for the client.
            const simplifiedPayload = {
                master_comment: originalData.master_comment, // Keep the master comment separate
                comments: allComments
            };
            // --- End Transformation ---

      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(simplifiedPayload));
        }
      });
    } catch (parseErr) {
            console.error('Error parsing or transforming issues.json:', parseErr);
    }
  });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.add(ws);

  // Send current issues data immediately
  broadcastIssues();

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });

    ws.on('message', (message) => {
        try {
            const rawMessage = message.toString();
            console.log(`[DEBUG] Received WebSocket message from client: ${rawMessage}`);

            const data = JSON.parse(rawMessage);
            if (data.type === 'user_comment' && data.text) {
                handleUserComment(data.text);
            }
        } catch (e) {
            console.error('Failed to parse incoming message or invalid format:', message);
        }
    });
});

async function handleUserComment(text) {
    console.log(`[DEBUG] Handling user comment: "${text}"`);
    const lowerText = text.toLowerCase();

    // Detect action type based on user intent
    if (isGeneralContributionRequest(lowerText)) {
        // Resposta de general: adiciona ao issues.json e responde no chat
        await handleGeneralContribution(text);
    } else if (isSummaryRequest(lowerText)) {
        // Resumo da conversa: gera arquivo de resumo
        await handleSummaryRequest(text);
    } else {
        // Resposta simples: só responde no chat, não adiciona ao issues.json
        await handleSimpleResponse(text);
    }
}

function isGeneralContributionRequest(text) {
    const generalTriggers = [
        'contribuição', 'contribution', 'contribuir', 'contribute',
        'adicionar ao bip', 'add to bip', 'general opinion', 'opinião do general',
        'feedback oficial', 'official feedback', 'para o issues', 'to issues',
        'registrar discussão', 'record discussion', 'documentar', 'document'
    ];

    return generalTriggers.some(trigger => text.includes(trigger));
}

function isSummaryRequest(text) {
    const summaryTriggers = [
        'resumo', 'summary', 'resumir', 'summarize',
        'pontos principais', 'main points', 'consenso', 'consensus',
        'gerar resumo', 'generate summary', 'synthesis', 'síntese'
    ];

    return summaryTriggers.some(trigger => text.includes(trigger));
}

async function handleSimpleResponse(text) {
    console.log(`[DEBUG] Handling simple response for: "${text}"`);

    // Add to session context
    sessionContext.push({
        role: 'user',
        content: text,
        timestamp: new Date().toISOString()
    });

    // Keep only last 10 messages in context
    if (sessionContext.length > 10) {
        sessionContext = sessionContext.slice(-10);
    }

    // Always use 'auto' model for simple interactions
    const selectedModel = 'auto';

    // Send typing indicator
    broadcastChatMessage({
        type: 'typing',
        author: selectedModel,
        message: '',
        timestamp: new Date().toISOString()
    });

    // Build prompt with session context
    const contextPrompt = buildSessionPrompt(text);

    try {
        const response = await callLLM(selectedModel, contextPrompt);

        // Stop typing indicator
        broadcastChatMessage({
            type: 'stop_typing',
            author: selectedModel,
            message: '',
            timestamp: new Date().toISOString()
        });

        if (response) {
            // Add response to session context
            sessionContext.push({
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString(),
                model: selectedModel
            });

            // Send response directly to chat (not to issues.json)
            broadcastChatMessage({
                type: 'simple_response',
                author: selectedModel,
                message: response,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error(`Error in simple response:`, error);

        // Stop typing indicator on error
        broadcastChatMessage({
            type: 'stop_typing',
            author: selectedModel,
            message: '',
            timestamp: new Date().toISOString()
        });

        broadcastChatMessage({
            type: 'error',
            message: `Erro ao gerar resposta: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}

async function handleGeneralContribution(text) {
    console.log(`[DEBUG] Handling general contribution for: "${text}"`);

    try {
        // Step 1: Initial analysis with 'auto' model
        console.log(`[DEBUG] Step 1: Initial analysis with 'auto' model`);

        broadcastChatMessage({
            type: 'typing',
            author: 'auto (análise)',
            message: '',
            timestamp: new Date().toISOString()
        });

        const analysisPrompt = `Analise esta solicitação de contribuição para o BIP-05 e determine:
1. Que tipo de contribuição é necessária?
2. Qual modelo seria mais adequado para esta tarefa?
3. Que aspectos específicos devem ser abordados?

Solicitação: "${text}"

Responda de forma estruturada indicando o modelo recomendado e os pontos principais a abordar.`;

        const analysis = await callLLM('auto', analysisPrompt);

        broadcastChatMessage({
            type: 'stop_typing',
            author: 'auto (análise)',
            message: '',
            timestamp: new Date().toISOString()
        });

        // Send analysis result to chat
        broadcastChatMessage({
            type: 'simple_response',
            author: '🔍 auto (análise)',
            message: analysis,
            timestamp: new Date().toISOString()
        });

        // Step 2: Select appropriate model for execution
        const generals = MODEL_CATEGORIES.generals;
        const selectedGeneral = generals[Math.floor(Math.random() * generals.length)];

        console.log(`[DEBUG] Step 2: Executing with selected model: ${selectedGeneral}`);

        // Send typing indicator for execution model
        broadcastChatMessage({
            type: 'typing',
            author: selectedGeneral,
            message: '',
            timestamp: new Date().toISOString()
        });

        // Build comprehensive prompt with BIP context + analysis
        const fullPrompt = await buildGeneralContributionPrompt(text, analysis);

        const response = await callLLM(selectedGeneral, fullPrompt);

        // Stop typing indicator
        broadcastChatMessage({
            type: 'stop_typing',
            author: selectedGeneral,
            message: '',
            timestamp: new Date().toISOString()
        });

        if (response) {
            // Add to issues.json
            const comment = {
                author: selectedGeneral,
                created_at: new Date().toISOString(),
                locale: 'pt-BR',
                body: response,
                body_original: response
            };

            const issuesData = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));
            if (issuesData.issues && issuesData.issues.length > 0) {
                issuesData.issues[0].comments.push(comment);
            } else {
                issuesData.issues = [{ id: 1, title: 'Main Thread', comments: [comment] }];
            }

            fs.writeFileSync(issuesFile, JSON.stringify(issuesData, null, 2), 'utf8');

            // Also send to chat
            broadcastChatMessage({
                type: 'general_contribution',
                author: selectedGeneral,
                message: response,
                timestamp: new Date().toISOString(),
                added_to_issues: true
            });
        }
    } catch (error) {
        console.error(`Error in general contribution:`, error);

        // Stop any active typing indicators
        broadcastChatMessage({
            type: 'stop_typing',
            author: 'system',
            message: '',
            timestamp: new Date().toISOString()
        });

        broadcastChatMessage({
            type: 'error',
            message: `Erro ao gerar contribuição: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}

async function handleSummaryRequest(text) {
    console.log(`[DEBUG] Handling summary request for: "${text}"`);

    // Use a general model for summary
    const selectedModel = MODEL_CATEGORIES.generals[0]; // Use first general for consistency

    // Send typing indicator
    broadcastChatMessage({
        type: 'typing',
        author: selectedModel,
        message: '',
        timestamp: new Date().toISOString()
    });

    try {
        // Read all discussions from issues.json
        const issuesData = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));

        // Build summary prompt
        const summaryPrompt = buildSummaryPrompt(issuesData);

        const summary = await callLLM(selectedModel, summaryPrompt);

        // Stop typing indicator
        broadcastChatMessage({
            type: 'stop_typing',
            author: selectedModel,
            message: '',
            timestamp: new Date().toISOString()
        });

        if (summary) {
            // Generate summary file
            const summaryFile = path.join(__dirname, '..', 'discussion-summary.md');
            const summaryContent = `# Resumo das Discussões BIP-05\n\n**Gerado em:** ${new Date().toISOString()}\n**Modelo:** ${selectedModel}\n\n---\n\n${summary}`;

            fs.writeFileSync(summaryFile, summaryContent, 'utf8');

            // Send confirmation to chat
            broadcastChatMessage({
                type: 'summary_generated',
                author: selectedModel,
                message: `Resumo das discussões gerado com sucesso! Arquivo salvo em: discussion-summary.md\n\n**Principais pontos:**\n${summary.slice(0, 500)}...`,
                timestamp: new Date().toISOString(),
                file_generated: 'discussion-summary.md'
            });
        }
    } catch (error) {
        console.error(`Error generating summary:`, error);

        // Stop typing indicator on error
        broadcastChatMessage({
            type: 'stop_typing',
            author: selectedModel,
            message: '',
            timestamp: new Date().toISOString()
        });

        broadcastChatMessage({
            type: 'error',
            message: `Erro ao gerar resumo: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}

function buildSessionPrompt(userText) {
    const contextMessages = sessionContext.slice(-6); // Last 6 messages

    let prompt = `Você é um assistente especializado em BIP-05 (Universal Matrix Protocol). Responda de forma direta e objetiva em português.\n\n`;

    if (contextMessages.length > 0) {
        prompt += `Contexto da conversa:\n`;
        contextMessages.forEach(msg => {
            const role = msg.role === 'user' ? 'Master' : `${msg.model || 'Assistant'}`;
            prompt += `- ${role}: ${msg.content}\n`;
        });
        prompt += `\n`;
    }

    prompt += `Pergunta atual: ${userText}\n\nResponda de forma clara e concisa (máximo 3 parágrafos):`;

    return prompt;
}

async function buildGeneralContributionPrompt(userText, analysis = null) {
    // Read BIP and implementation files
    const bipContent = fs.readFileSync(bipFile, 'utf8');
    const implementationContent = fs.readFileSync(implementationFile, 'utf8');
    const issuesData = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));

    // Get recent discussions
    const recentComments = [];
    (issuesData.issues || []).forEach(issue => {
        (issue.comments || []).slice(-5).forEach(c => {
            recentComments.push(`${c.author}: ${c.body}`);
        });
    });

    let prompt = `Você é um modelo AI expert contribuindo para a discussão oficial do BIP-05 (Universal Matrix Protocol).

**CONTEXTO COMPLETO DO BIP:**
${bipContent}

**PLANO DE IMPLEMENTAÇÃO:**
${implementationContent}

**DISCUSSÕES RECENTES:**
${recentComments.join('\n')}

**SOLICITAÇÃO DO MASTER:**
${userText}`;

    if (analysis) {
        prompt += `

**ANÁLISE PRELIMINAR:**
${analysis}`;
    }

    prompt += `

**INSTRUÇÕES:**
1. Forneça uma contribuição técnica substantiva para a discussão
2. Responda em português E inglês (formato: PT: ... / EN: ...)
3. Seja específico e técnico, focando em implementação
4. Considere o contexto das discussões anteriores
5. Sugira melhorias concretas quando relevante
6. Se há análise preliminar, use-a como guia mas desenvolva pontos adicionais

**SUA CONTRIBUIÇÃO OFICIAL:**`;

    return prompt;
}

function buildSummaryPrompt(issuesData) {
    const allComments = [];
    (issuesData.issues || []).forEach(issue => {
        allComments.push(`## ${issue.title}`);
        (issue.comments || []).forEach(c => {
            allComments.push(`**${c.author}:** ${c.body}`);
        });
        allComments.push('---');
    });

    return `Você é um expert técnico analisando todas as discussões do BIP-05 (Universal Matrix Protocol).

**MASTER COMMENT:**
${issuesData.master_comment?.body || 'N/A'}

**TODAS AS DISCUSSÕES:**
${allComments.join('\n')}

**TAREFA:**
Gere um resumo executivo completo com:

1. **PRINCIPAIS PONTOS DE CONSENSO** - O que todos concordam
2. **RECOMENDAÇÕES TÉCNICAS CONSOLIDADAS** - Principais especificações acordadas
3. **QUESTÕES EM ABERTO** - Pontos que precisam ser decididos
4. **PRÓXIMOS PASSOS** - Direcionamento claro para implementação
5. **PARTICIPANTES E CONTRIBUIÇÕES** - Quem contribuiu com o quê

Seja objetivo, técnico e forneça um resumo acionável para o modelo que irá implementar o BIP.

**RESUMO EXECUTIVO:**`;
}

// Function to broadcast messages to chat only (not issues.json)
function broadcastChatMessage(message) {
    const payload = {
        type: 'chat_message',
        data: message
    };

    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(payload));
        }
    });
}

// Legacy functions removed - using new action-based system

function addCommentToFile(text, author) {
    try {
        const issuesData = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));
        const comment = {
            author: author,
            created_at: new Date().toISOString(),
            locale: "pt-BR",
            body: text,
            body_original: text
        };

        if (issuesData.issues && issuesData.issues.length > 0) {
            issuesData.issues[0].comments.push(comment);
        } else {
            issuesData.issues = [{ id: 1, title: "Main Thread", comments: [comment] }];
        }

        fs.writeFileSync(issuesFile, JSON.stringify(issuesData, null, 2), 'utf8');
        console.log(`New comment from "${author}" was added to the main thread.`);
    } catch (error) {
        console.error(`Error adding comment for author ${author}:`, error);
    }
}

// Watch for file changes
let fileWatcher = null;
let debounceTimeout = null;

function startFileWatcher() {
  if (fileWatcher) {
    fileWatcher.close();
  }

  fileWatcher = fs.watch(issuesFile, { persistent: true }, (eventType) => {
    if (eventType === 'change') {
            console.log('issues.json changed, queueing broadcast...');

            // Clear the previous timeout if a new change event comes in
            clearTimeout(debounceTimeout);

            // Set a new timeout
            debounceTimeout = setTimeout(() => {
                console.log('Debounce timer elapsed, now broadcasting.');
                broadcastIssues();
            }, 150); // Increased delay slightly for more stability
    }
  });

  console.log('File watcher started for:', issuesFile);
}

// Initial broadcast and start watching
setTimeout(() => {
  broadcastIssues();
  startFileWatcher();
}, 1000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  if (fileWatcher) {
    fileWatcher.close();
  }
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
    console.log(`API endpoint: http://localhost:${PORT}/api/comment`);
  console.log(`Monitoring: ${issuesFile}`);
});
