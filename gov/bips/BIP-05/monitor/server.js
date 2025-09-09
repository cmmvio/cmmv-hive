const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ============================================================================
// SISTEMA DE LOGGING ROBUSTO
// ============================================================================

const LOG_FILE = path.join(__dirname, 'server-debug.log');
const ERROR_LOG_FILE = path.join(__dirname, 'server-errors.log');

function writeToLog(level, category, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        category,
        message,
        data: data ? JSON.stringify(data, null, 2) : null,
        pid: process.pid
    };

    const logLine = `[${timestamp}] [${level}] [${category}] ${message}${data ? `\nDATA: ${JSON.stringify(data, null, 2)}` : ''}\n`;

    // Write to console
    console.log(`[${level}] [${category}] ${message}`);
    if (data) console.log('DATA:', data);

    // Write to main log file
    try {
        fs.appendFileSync(LOG_FILE, logLine);
    } catch (err) {
        console.error('FATAL: Cannot write to log file:', err);
    }

    // Write errors to separate error log
    if (level === 'ERROR' || level === 'FATAL') {
        try {
            fs.appendFileSync(ERROR_LOG_FILE, logLine);
        } catch (err) {
            console.error('FATAL: Cannot write to error log file:', err);
        }
    }
}

function logInfo(category, message, data = null) {
    writeToLog('INFO', category, message, data);
}

function logWarn(category, message, data = null) {
    writeToLog('WARN', category, message, data);
}

function logError(category, message, data = null) {
    writeToLog('ERROR', category, message, data);
}

function logDebug(category, message, data = null) {
    writeToLog('DEBUG', category, message, data);
}

function logFatal(category, message, data = null) {
    writeToLog('FATAL', category, message, data);
}

// Log startup
logInfo('STARTUP', 'BIP-05 Monitor Server starting...', {
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
    cwd: process.cwd(),
    logFile: LOG_FILE,
    errorLogFile: ERROR_LOG_FILE
});

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
        'openai': { model: 'openai/gpt-4o-mini', key: 'OPENAI_API_KEY' },
        'anthropic': { model: 'anthropic/claude-3-5-haiku-latest', key: 'ANTHROPIC_API_KEY' },
        'gemini': { model: 'gemini/gemini-2.0-flash-lite', key: 'GEMINI_API_KEY' },
        'xai': { model: 'xai/grok-3-mini', key: 'XAI_API_KEY' },
        'deepseek': { model: 'deepseek/deepseek-chat', key: 'DEEPSEEK_API_KEY' },
        'groq': { model: 'groq/llama-3.1-8b-instant', key: 'GROQ_API_KEY' }
    };

    const workingProviders = [];
    const failedProviders = [];
    const costReports = [];

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
            const result = await callLLMViaAider(config.model, testPrompt);

            // Handle new response format with cost information
            const response = typeof result === 'object' ? result.response : result;
            const costInfo = typeof result === 'object' ? result.costInfo : null;

            if (response && !response.includes('❌')) {
                console.log(`[API TEST] ✅ ${provider} provider - WORKING`);
                workingProviders.push(provider);

                // Store cost information if available
                if (costInfo) {
                    costReports.push({
                        provider: provider,
                        model: config.model,
                        ...costInfo,
                        testTimestamp: new Date().toISOString()
                    });

                    if (costInfo.hasCostData) {
                        console.log(`[API TEST] 💰 Cost data captured for ${provider}:`);
                        console.log(`[API TEST]   - Input tokens: ${costInfo.inputTokens || 'N/A'}`);
                        console.log(`[API TEST]   - Output tokens: ${costInfo.outputTokens || 'N/A'}`);
                        console.log(`[API TEST]   - Total cost: $${costInfo.totalCost || 'N/A'}`);
                    }
                }
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
    saveApiCache(workingProviders, failedProviders, costReports);

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

// Provider to models mapping - comprehensive list from MODELS_CHECKLIST.md
const PROVIDER_MODELS = {
    'openai': [
        'gpt-4o',           // GPT-4o — multimodal reasoning
        'gpt-4o-mini',      // GPT-4o-mini — voting rationale specialist
        'o1-mini',          // O1-mini — reasoning model
        'gpt-4-turbo',      // GPT-4-turbo — high performance
        'gpt-5-mini',       // GPT-5-mini — lightweight version
        'gpt-5-nano'        // GPT-5-nano — ultra-lightweight
    ],
    'anthropic': [
        'claude-3-5-haiku-latest',    // Claude-3.5-Haiku — fast responses
        'claude-3-5-sonnet-latest',   // Claude-4-Sonnet — performance proposal
        'claude-3-opus-latest',       // Claude-4-Opus — complex reasoning
        'claude-3-7-sonnet-latest'    // Claude-3.7-Sonnet — advanced contextual understanding
    ],
    'gemini': [
        'gemini-2.0-flash-lite',      // Gemini 2.0 — lightweight
        'gemini-2.0-flash',           // Gemini 2.0 — multimodal analysis
        'gemini-2.5-pro-latest',      // Gemini 2.5 Pro — i18n/l10n
        'gemini-2.5-flash-latest'     // Gemini 2.5 Flash — fast processing
    ],
    'xai': [
        'grok-3-mini',      // Grok-3-mini — lightweight
        'grok-3',           // Grok-3 — adaptive learning consensus
        'grok-beta'         // Grok Core Fast-1 equivalent
    ],
    'deepseek': [
        'deepseek-chat',    // DeepSeek-V3 — advanced reasoning (excluding R1-0528)
        'deepseek-coder'    // DeepSeek-Coder — technical analysis
    ],
    'groq': [
        'llama-3.1-70b-versatile',    // Llama-3.1-70B — high performance
        'llama-3.1-8b-instant',       // Llama-3.1-8B — fast responses
        'llama-3.3-70b-versatile',    // Llama-3.3-70B — operational contributor
        'openai/gpt-oss-120',         // GPT-OSS-120B — high capacity open source
        'qwen/qwen3-32b'              // Qwen3-32B — operational contributor
    ]
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
function saveApiCache(workingProviders, failedProviders, costReports = []) {
    try {
        const cacheData = {
            timestamp: Date.now(),
            workingProviders,
            failedProviders,
            costReports: costReports || [],
            lastTest: new Date().toISOString(),
            // Summary statistics
            summary: {
                totalProviders: workingProviders.length + failedProviders.length,
                workingProvidersCount: workingProviders.length,
                failedProvidersCount: failedProviders.length,
                modelsWithCostData: costReports.filter(r => r.hasCostData).length,
                totalCostReports: costReports.length
            }
        };

        fs.writeFileSync(API_CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf8');
        console.log(`[API CACHE] 💾 Results saved to cache (including ${costReports.length} cost reports)`);

        if (costReports.length > 0) {
            console.log(`[API CACHE] 📊 Cost summary:`);
            console.log(`[API CACHE]   - Models with cost data: ${costReports.filter(r => r.hasCostData).length}`);
            const totalCost = costReports.reduce((sum, r) => sum + (r.totalCost || 0), 0);
            console.log(`[API CACHE]   - Total cost of tests: $${totalCost.toFixed(4)}`);
        }
    } catch (error) {
        console.log(`[API CACHE] ❌ Error saving cache: ${error.message}`);
    }
}

// Get all models for working providers with proper prefixes
function getModelsFromProviders(workingProviders) {
    const workingModels = [];

    Object.entries(PROVIDER_MODELS).forEach(([provider, models]) => {
        if (workingProviders.includes(provider)) {
            // Add provider prefix to models for frontend compatibility
            const prefixedModels = models.map(model => {
                // Only add prefix if model doesn't already have one
                if (model.includes('/')) {
                    return model;
                } else {
                    return `${provider}/${model}`;
                }
            });
            workingModels.push(...prefixedModels);
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

    // Aider models (external API calls) - comprehensive MODELS_CHECKLIST.md integration
    aider_models: {
        // OpenAI - Generals & Collaborators
        'openai/gpt-4o': { provider: 'openai', key: 'OPENAI_API_KEY', model: 'gpt-4o' },
        'openai/gpt-4o-mini': { provider: 'openai', key: 'OPENAI_API_KEY', model: 'gpt-4o-mini' },
        'openai/o1-mini': { provider: 'openai', key: 'OPENAI_API_KEY', model: 'o1-mini' },
        'openai/gpt-4-turbo': { provider: 'openai', key: 'OPENAI_API_KEY', model: 'gpt-4-turbo' },
        'openai/gpt-5-mini': { provider: 'openai', key: 'OPENAI_API_KEY', model: 'gpt-5-mini' },
        'openai/gpt-5-nano': { provider: 'openai', key: 'OPENAI_API_KEY', model: 'gpt-5-nano' },

        // Anthropic - Generals & Advanced reasoning (7 modelos principais)
        'anthropic/claude-3-5-haiku-latest': { provider: 'anthropic', key: 'ANTHROPIC_API_KEY', model: 'claude-3-5-haiku-latest' },
        'anthropic/claude-3-5-sonnet-latest': { provider: 'anthropic', key: 'ANTHROPIC_API_KEY', model: 'claude-3-5-sonnet-latest' },
        'anthropic/claude-3-opus-latest': { provider: 'anthropic', key: 'ANTHROPIC_API_KEY', model: 'claude-3-opus-latest' },
        'anthropic/claude-4-sonnet-20250514': { provider: 'anthropic', key: 'ANTHROPIC_API_KEY', model: 'claude-4-sonnet-20250514' },
        'anthropic/claude-4-opus-20250514': { provider: 'anthropic', key: 'ANTHROPIC_API_KEY', model: 'claude-4-opus-20250514' },
        'anthropic/claude-3-haiku-20240307': { provider: 'anthropic', key: 'ANTHROPIC_API_KEY', model: 'claude-3-haiku-20240307' },
        'anthropic/claude-3-7-sonnet-20250219': { provider: 'anthropic', key: 'ANTHROPIC_API_KEY', model: 'claude-3-7-sonnet-20250219' },

        // Gemini (Google) - Multimodal & i18n specialists (7 modelos principais)
        'gemini/gemini-2.0-flash': { provider: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-2.0-flash' },
        'gemini/gemini-2.5-flash': { provider: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-2.5-flash' },
        'gemini/gemini-2.5-flash-lite': { provider: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-2.5-flash-lite' },
        'gemini/gemini-1.5-flash': { provider: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-1.5-flash' },
        'gemini/gemini-1.5-flash-8b': { provider: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-1.5-flash-8b' },
        'gemini/gemini-1.5-pro': { provider: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-1.5-pro' },
        'gemini/gemini-2.5-pro-preview-05-06': { provider: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-2.5-pro-preview-05-06' },

        // xAI (Grok) - Adaptive learning & ML integration (7 modelos principais)
        'xai/grok-3-mini': { provider: 'xai', key: 'XAI_API_KEY', model: 'grok-3-mini' },
        'xai/grok-code-fast-1': { provider: 'xai', key: 'XAI_API_KEY', model: 'grok-code-fast-1' },
        'xai/grok-3': { provider: 'xai', key: 'XAI_API_KEY', model: 'grok-3' },
        'xai/grok-3-fast-beta': { provider: 'xai', key: 'XAI_API_KEY', model: 'grok-3-fast-beta' },
        'xai/grok-4': { provider: 'xai', key: 'XAI_API_KEY', model: 'grok-4' },
        'xai/grok-3-fast-latest': { provider: 'xai', key: 'XAI_API_KEY', model: 'grok-3-fast-latest' },
        'xai/grok-2': { provider: 'xai', key: 'XAI_API_KEY', model: 'grok-2' },

        // DeepSeek - Advanced reasoning (excluding R1-0528)
        'deepseek/deepseek-chat': { provider: 'deepseek', key: 'DEEPSEEK_API_KEY', model: 'deepseek-chat' },
        'deepseek/deepseek-coder': { provider: 'deepseek', key: 'DEEPSEEK_API_KEY', model: 'deepseek-coder' },

        // Groq - High performance Llama models
        // All Groq models removed due to timeouts and non-existence
    },

    // Model selection for different tasks - from MODELS_CHECKLIST.md
    generals: [
        // Cursor-agent models (built-in)
        'gpt-5', 'sonnet-4', 'opus-4.1',

        // OpenAI Generals & High-capacity (6 modelos principais)
        'openai/gpt-4o', 'openai/gpt-4-turbo', 'openai/o1-mini', 'openai/gpt-5-mini', 'openai/gpt-4o-mini', 'openai/gpt-5-nano',

        // Anthropic Generals & Advanced reasoning (7 modelos principais)
        'anthropic/claude-3-5-haiku-latest', 'anthropic/claude-3-5-sonnet-latest', 'anthropic/claude-3-opus-latest',
        'anthropic/claude-4-sonnet-20250514', 'anthropic/claude-4-opus-20250514', 'anthropic/claude-3-haiku-20240307', 'anthropic/claude-3-7-sonnet-20250219',

        // Gemini Multimodal & i18n specialists (7 modelos principais)
        'gemini/gemini-2.0-flash', 'gemini/gemini-2.5-flash', 'gemini/gemini-2.5-flash-lite',
        'gemini/gemini-1.5-flash', 'gemini/gemini-1.5-flash-8b', 'gemini/gemini-1.5-pro', 'gemini/gemini-2.5-pro-preview-05-06',

        // xAI Adaptive learning (7 modelos principais)
        'xai/grok-3-mini', 'xai/grok-code-fast-1', 'xai/grok-3', 'xai/grok-3-fast-beta', 'xai/grok-4', 'xai/grok-3-fast-latest', 'xai/grok-2',

        // DeepSeek Advanced reasoning (2 modelos principais)
        'deepseek/deepseek-chat', 'deepseek/deepseek-coder'
    ],
    bip_specific: [
        // Core models for BIP discussions
        'auto', 'gpt-5',

        // Fast response models for BIP context (equilibrados por provider)
        'openai/gpt-4o-mini', 'openai/gpt-4o', 'openai/gpt-5-mini', 'openai/gpt-5-nano', 'openai/o1-mini', 'openai/gpt-4-turbo',
        'anthropic/claude-3-5-haiku-latest', 'anthropic/claude-3-5-sonnet-latest', 'anthropic/claude-3-opus-latest', 'anthropic/claude-4-sonnet-20250514', 'anthropic/claude-4-opus-20250514',
        'gemini/gemini-2.0-flash', 'gemini/gemini-2.5-flash', 'gemini/gemini-2.5-flash-lite', 'gemini/gemini-1.5-flash', 'gemini/gemini-1.5-flash-8b',
        'xai/grok-3-mini', 'xai/grok-code-fast-1', 'xai/grok-3', 'xai/grok-3-fast-beta', 'xai/grok-4', 'xai/grok-3-fast-latest',
        'deepseek/deepseek-chat', 'deepseek/deepseek-coder'
    ]
};

// Function to extract cost information from aider responses
function extractCostInfo(aiderOutput, modelId) {
    const costInfo = {
        model: modelId,
        inputTokens: null,
        outputTokens: null,
        inputCost: null,
        outputCost: null,
        totalCost: null,
        currency: 'USD'
    };

    // Extract tokens information from aider output
    const tokensMatch = aiderOutput.match(/Tokens:\s*([\d,]+)\s*sent,\s*([\d,]+)\s*received/i);
    if (tokensMatch) {
        costInfo.inputTokens = parseInt(tokensMatch[1].replace(/,/g, ''));
        costInfo.outputTokens = parseInt(tokensMatch[2].replace(/,/g, ''));
    }

    // Extract cost information from aider output
    const costMatch = aiderOutput.match(/Cost:\s*\$?([\d.]+)\s*message,\s*\$?([\d.]+)\s*session/i);
    if (costMatch) {
        costInfo.inputCost = parseFloat(costMatch[1]);
        costInfo.totalCost = parseFloat(costMatch[2]);
    }

    // Calculate output cost if total and input costs are available
    if (costInfo.totalCost !== null && costInfo.inputCost !== null) {
        costInfo.outputCost = costInfo.totalCost - costInfo.inputCost;
    }

    return costInfo;
}

// Determine if model should use cursor-agent or aider
function shouldUseCursorAgent(modelId) {
    return MODEL_CATEGORIES.cursor_models.includes(modelId) || modelId === 'auto';
}

// LLM call helper via aider CLI
async function callLLMViaAider(modelId, prompt) {
    const { spawn } = require('child_process');

    logInfo('AIDER', 'Starting aider interaction', {
        modelId: modelId,
        promptLength: prompt.length,
        timestamp: new Date().toISOString()
    });

    const modelConfig = MODEL_CATEGORIES.aider_models[modelId];
    if (!modelConfig) {
        logError('AIDER', 'Model not found in aider configuration', {
            modelId: modelId,
            availableModels: Object.keys(MODEL_CATEGORIES.aider_models)
        });
        return `❌ Modelo ${modelId} não encontrado na configuração do aider.`;
    }

    const apiKey = process.env[modelConfig.key];
    if (!apiKey) {
        logError('AIDER', 'Missing API key for model', {
            modelId: modelId,
            requiredKey: modelConfig.key,
            provider: modelConfig.provider
        });
        return `❌ API key ${modelConfig.key} não encontrada. Configure no arquivo .env para usar este modelo.`;
    }

    logDebug('AIDER', 'Model configuration validated', {
        modelId: modelId,
        provider: modelConfig.provider,
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0
    });

    try {
        return new Promise((resolve, reject) => {
            const command = 'aider';
            // For aider, use the full model identifier (provider/model)
            const fullModelName = modelConfig.model.includes('/') ? modelConfig.model : `${modelConfig.provider}/${modelConfig.model}`;

            const AIDER_TIMEOUT_SEC = 55;

            const args = [
                '--model', fullModelName,
                '--api-key', `${modelConfig.provider}=${apiKey}`,
                '--no-pretty',
                '--yes',
                '--no-stream',
                '--exit',
                '--subtree-only',
                '--dry-run',
                '--no-auto-commits',
                '--no-dirty-commits',
                '--timeout', String(AIDER_TIMEOUT_SEC),
                '--message', prompt
            ];

            logInfo('AIDER', 'Executing aider command', {
                command: command,
                model: modelConfig.model,
                provider: modelConfig.provider,
                argsCount: args.length,
                hasApiKey: true
            });

            const aiderProcess = spawn(command, args);
            const processStartTime = Date.now();

            let stdout = '';
            let stderr = '';
            let isResolved = false;

            logDebug('AIDER', 'Aider process spawned', {
                pid: aiderProcess.pid,
                modelId: modelId,
                startTime: processStartTime
            });

            const timeout = setTimeout(() => {
                if (!isResolved) {
                    logWarn('AIDER', 'Aider process timeout after 60 seconds', {
                        modelId: modelId,
                        pid: aiderProcess.pid,
                        stdoutLength: stdout.length,
                        stderrLength: stderr.length,
                        duration: Date.now() - processStartTime
                    });
                    aiderProcess.kill('SIGTERM');
                    isResolved = true;
                    resolve('⏰ A resposta do aider demorou muito. Tente novamente.');
                }
            }, 60000);

            aiderProcess.stdout.on('data', (data) => {
                const chunk = data.toString();
                stdout += chunk;
                logDebug('AIDER', 'Received stdout chunk', {
                    modelId: modelId,
                    chunkLength: chunk.length,
                    totalStdoutLength: stdout.length,
                    chunkPreview: chunk.substring(0, 100)
                });
            });

            aiderProcess.stderr.on('data', (data) => {
                const chunk = data.toString();
                stderr += chunk;
                logDebug('AIDER', 'Received stderr chunk', {
                    modelId: modelId,
                    chunkLength: chunk.length,
                    totalStderrLength: stderr.length,
                    chunkPreview: chunk.substring(0, 100)
                });
            });

            aiderProcess.on('close', (code) => {
                if (isResolved) return;
                isResolved = true;
                clearTimeout(timeout);

                const duration = Date.now() - processStartTime;
                logInfo('AIDER', 'Aider process completed', {
                    modelId: modelId,
                    exitCode: code,
                    duration: duration,
                    stdoutLength: stdout.length,
                    stderrLength: stderr.length,
                    success: code === 0
                });

                logDebug('AIDER', 'Final aider output', {
                    modelId: modelId,
                    stdout: stdout,
                    stderr: stderr,
                    exitCode: code
                });

                if (code !== 0) {
                    resolve(`❌ Aider falhou (código ${code}): ${stderr || 'Sem detalhes'}`);
                    return;
                }

                const response = stdout.trim();
                if (response) {
                    console.log(`[AIDER DEBUG] SUCCESS - Response length: ${response.length}`);

                    // Extract cost information from the response
                    const costInfo = extractCostInfo(response, modelId);

                    // Return both response and cost information
                    const result = {
                        response: response,
                        costInfo: costInfo,
                        hasCostData: costInfo.inputTokens !== null || costInfo.totalCost !== null
                    };

                    logDebug('AIDER', 'Cost information extracted', costInfo);
                    resolve(result);
                } else {
                    resolve({
                        response: '❌ Aider não retornou resposta.',
                        costInfo: extractCostInfo('', modelId),
                        hasCostData: false
                    });
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
    // Enhanced system prompt with identity validation
    const systemPrompt = `Você é um modelo auxiliando na discussão do BIP-05 (UMICP).

IDENTIDADE CRÍTICA:
- VOCÊ É: ${modelId}
- NUNCA simule, imite ou fale em nome de outros modelos AI
- JAMAIS forneça opiniões que não sejam suas como ${modelId}
- Se questionado sobre outros modelos, responda "Consulte diretamente o modelo específico"
- SEMPRE identifique-se corretamente como ${modelId} quando relevante
- NUNCA altere arquivos no repositório

Responda em PT-BR, de forma objetiva e útil, mantendo o contexto do tópico.`;

    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    // Decide which method to use
    if (shouldUseCursorAgent(modelId)) {
        console.log(`[LLM DEBUG] Using cursor-agent for model: ${modelId}`);
        const result = await callLLMViaCursorAgent(modelId, fullPrompt);
        // Return just the response text for backward compatibility
        return typeof result === 'object' ? result.response : result;
    } else {
        console.log(`[LLM DEBUG] Using aider for model: ${modelId}`);
        const result = await callLLMViaAider(modelId, fullPrompt);
        // Return just the response text for backward compatibility
        return typeof result === 'object' ? result.response : result;
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

                    // Se temos uma resposta válida no stdout, use-a em vez de erro de timeout
                    if (stdout.trim().length > 100) { // Resposta substancial (mais de 100 chars)
                        console.log(`[CURSOR-AGENT DEBUG] Using collected stdout despite timeout (${stdout.length} chars)`);
                        resolve(stdout.trim());
                        return;
                    }

                    // Try with 'auto' model as fallback if original model failed
                    if (modelId !== 'auto') {
                        console.log(`[CURSOR-AGENT DEBUG] Trying fallback with 'auto' model...`);
                        try {
                            const fallbackResult = await callLLM('auto', fullPrompt);
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

                // Detectar se a resposta parece estar completa
                // Procura por padrões que indicam fim de resposta bem formada
                const responseEndings = [
                    'configuradas no ambiente.',
                    'no projeto.',
                    'disponíveis.',
                    'sistema.',
                    'BIP-05.',
                    'implementação.'
                ];

                if (responseEndings.some(ending => stdout.trim().endsWith(ending)) &&
                    stdout.length > 500 && // Resposta substancial
                    !isResolved) {

                    console.log(`[CURSOR-AGENT DEBUG] Response appears complete, resolving early (${stdout.length} chars)`);
                    clearTimeout(timeout);
                    isResolved = true;
                    cursorAgent.kill('SIGTERM');
                    resolve(stdout.trim());
                }
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
                    return resolve({
                        response: `❌ cursor-agent falhou (código ${code}): ${stderr || 'Sem detalhes'}`,
                        costInfo: extractCostInfo('', modelId),
                        hasCostData: false
                    });
                }

                if (!stdout.trim()) {
                    console.log(`[CURSOR-AGENT DEBUG] Empty or whitespace-only output`);
                    return resolve({
                        response: '❌ cursor-agent não retornou resposta. Verifique se o modelo está disponível.',
                        costInfo: extractCostInfo('', modelId),
                        hasCostData: false
                    });
                }

                // For text format, just return the stdout content
                const response = stdout.trim();
                console.log(`[CURSOR-AGENT DEBUG] SUCCESS - Response length: ${response.length}`);
                console.log(`[CURSOR-AGENT DEBUG] SUCCESS - Response preview: "${response.slice(0, 200)}${response.length > 200 ? '...' : ''}"`);

                // Return consistent format with cost information (placeholder for cursor-agent)
                const result = {
                    response: response,
                    costInfo: {
                        model: modelId,
                        inputTokens: null,
                        outputTokens: null,
                        inputCost: null,
                        outputCost: null,
                        totalCost: null,
                        currency: 'USD'
                    },
                    hasCostData: false
                };

                resolve(result);
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
                resolve({
                    response: '❌ Erro ao iniciar cursor-agent. Verifique se está instalado e autenticado.',
                    costInfo: extractCostInfo('', modelId),
                    hasCostData: false
                });
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

// API endpoint to get cost reports
app.get('/api/costs', (req, res) => {
    try {
        const cachedResults = loadApiCache();

        if (!cachedResults || !cachedResults.costReports) {
            return res.json({
                success: true,
                hasData: false,
                message: 'No cost data available. Run API tests first.',
                costReports: [],
                summary: {
                    totalCost: 0,
                    modelsWithData: 0,
                    totalReports: 0
                }
            });
        }

        // Calculate summary statistics
        const costReports = cachedResults.costReports || [];
        const modelsWithData = costReports.filter(r => r.hasCostData).length;
        const totalCost = costReports.reduce((sum, r) => sum + (r.totalCost || 0), 0);
        const avgCostPerModel = modelsWithData > 0 ? totalCost / modelsWithData : 0;

        // Group by provider
        const byProvider = costReports.reduce((acc, report) => {
            const provider = report.model.split('/')[0];
            if (!acc[provider]) {
                acc[provider] = {
                    models: [],
                    totalCost: 0,
                    avgCost: 0
                };
            }
            acc[provider].models.push(report);
            acc[provider].totalCost += report.totalCost || 0;
            return acc;
        }, {});

        // Calculate averages per provider
        Object.keys(byProvider).forEach(provider => {
            const providerData = byProvider[provider];
            const modelsWithData = providerData.models.filter(m => m.hasCostData).length;
            providerData.avgCost = modelsWithData > 0 ? providerData.totalCost / modelsWithData : 0;
        });

        res.json({
            success: true,
            hasData: costReports.length > 0,
            costReports: costReports,
            summary: {
                totalCost: totalCost,
                avgCostPerModel: avgCostPerModel,
                modelsWithData: modelsWithData,
                totalReports: costReports.length,
                byProvider: byProvider
            },
            lastTest: cachedResults.lastTest,
            cacheTimestamp: cachedResults.timestamp
        });

    } catch (error) {
        console.error('[API COSTS] Error retrieving cost data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API endpoint to list all active models
app.get('/api/models-list', (req, res) => {
    const allActiveModels = [
        ...MODEL_CATEGORIES.cursor_models.map(model => ({
            id: model,
            name: model,
            provider: 'cursor-agent',
            status: 'active',
            type: 'built-in'
        })),
        ...WORKING_APIS.map(model => {
            // Extract provider from model name (e.g., "anthropic/claude-3-5-haiku-latest" -> "anthropic")
            const [provider, ...nameParts] = model.split('/');
            return {
                id: model,
                name: nameParts.length > 0 ? nameParts.join('/') : model,
                provider: provider,
                status: 'active',
                type: 'external-api'
            };
        })
    ];

    res.json({
        total_models: allActiveModels.length,
        cursor_agent_models: MODEL_CATEGORIES.cursor_models.length,
        external_api_models: WORKING_APIS.length,
        models: allActiveModels,
        categories: {
            generals: MODEL_CATEGORIES.generals,
            bip_specific: MODEL_CATEGORIES.bip_specific
        },
        last_updated: new Date().toISOString()
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

// API endpoint for direct model interaction
app.post('/api/model', async (req, res) => {
    try {
        const { model_id, prompt, context, max_tokens, temperature } = req.body;

        // Validation
        if (!model_id || !prompt) {
            return res.status(400).json({
                success: false,
                error: 'model_id and prompt are required'
            });
        }

        // Check if model is available
        const allAvailableModels = [
            ...MODEL_CATEGORIES.cursor_models,
            ...WORKING_APIS,
            'auto' // Always include auto model
        ];

        if (!allAvailableModels.includes(model_id)) {
            return res.status(404).json({
                success: false,
                error: `Model ${model_id} not found or not active`,
                available_models: allAvailableModels
            });
        }

        console.log(`[DIRECT MODEL] 🤖 Direct interaction with ${model_id}`);
        console.log(`[DIRECT MODEL] 💬 Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);

        // Build enhanced prompt with context if provided
        let enhancedPrompt = prompt;
        if (context) {
            enhancedPrompt = `Contexto adicional: ${context}\n\nPrompt: ${prompt}`;
        }

        // Add model identity safeguard
        const safeguardedPrompt = await handleAutoModelSafeguard(model_id, enhancedPrompt);

        // Call the model
        const startTime = Date.now();
        const response = await callLLM(model_id, safeguardedPrompt);
        const duration = Date.now() - startTime;

        // Validate response
        const validationError = validateModelResponse(model_id, response);
        if (validationError) {
            console.log(`[DIRECT MODEL] ❌ ${model_id} failed validation: ${validationError}`);
            return res.status(422).json({
                success: false,
                error: `Response validation failed: ${validationError}`,
                model_id: model_id
            });
        }

        console.log(`[DIRECT MODEL] ✅ Response from ${model_id} (${duration}ms): ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`);

        res.json({
            success: true,
            model_id: model_id,
            prompt: prompt,
            response: response,
            metadata: {
                duration_ms: duration,
                response_length: response.length,
                context_provided: !!context,
                timestamp: new Date().toISOString(),
                model_type: shouldUseCursorAgent(model_id) ? 'cursor-agent' : 'aider'
            }
        });

    } catch (error) {
        console.error(`[DIRECT MODEL] Error during model interaction:`, error);
        res.status(500).json({
            success: false,
            error: error.message,
            model_id: req.body?.model_id || 'unknown'
        });
    }
});

// Global store for active opinion collection sessions
let activeOpinionSessions = new Map();

// Global store for active hello handshake sessions
let activeHelloSessions = new Map();

// API endpoint to collect opinions from all models
app.post('/api/models/opinions', async (req, res) => {
    const { topic, issueId = 1 } = req.body;

    if (!topic || topic.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Topic is required'
        });
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[OPINIONS] 🗳️  Starting opinion collection session: ${sessionId}`);
    console.log(`[OPINIONS] 📋 Topic: "${topic}"`);
    console.log(`[OPINIONS] 🎯 Target issue: ${issueId}`);

    // Get all available models
    const allModels = [
        ...MODEL_CATEGORIES.cursor_models,
        ...WORKING_APIS
    ];

    console.log(`[OPINIONS] 🤖 Total models to query: ${allModels.length}`);
    console.log(`[OPINIONS] 📊 Models: ${allModels.join(', ')}`);

    // Initialize session tracking
    const sessionData = {
        sessionId,
        topic,
        issueId,
        startTime: new Date().toISOString(),
        totalModels: allModels.length,
        pendingModels: [...allModels],
        completedModels: [],
        failedModels: [],
        responses: []
    };

    activeOpinionSessions.set(sessionId, sessionData);

    // Send initial response with session info
    res.json({
        success: true,
        sessionId,
        message: 'Opinion collection started',
        totalModels: allModels.length,
        models: allModels
    });

    // Start collecting opinions asynchronously
    collectModelOpinions(sessionId, topic, issueId, allModels);
});

// Function to collect opinions from all models
async function collectModelOpinions(sessionId, topic, issueId, models) {
    const session = activeOpinionSessions.get(sessionId);
    if (!session) {
        console.error(`[OPINIONS] ❌ Session ${sessionId} not found`);
        return;
    }

    console.log(`[OPINIONS] 🚀 Starting opinion collection for ${models.length} models`);

    // Broadcast initial status
    broadcastOpinionUpdate(sessionId, {
        type: 'session_started',
        totalModels: models.length,
        pendingModels: [...models],
        completedModels: [],
        failedModels: []
    });

    // Process models in parallel (but limit concurrency to avoid overwhelming)
    const concurrency = 3; // Process 3 models at once
    const chunks = [];

    for (let i = 0; i < models.length; i += concurrency) {
        chunks.push(models.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
        const promises = chunk.map(modelId => collectSingleModelOpinion(sessionId, modelId, topic, issueId));
        await Promise.allSettled(promises);
    }

    // Session complete
    const finalSession = activeOpinionSessions.get(sessionId);
    if (finalSession) {
        console.log(`[OPINIONS] ✅ Session ${sessionId} completed`);
        console.log(`[OPINIONS] 📊 Final stats: ${finalSession.completedModels.length} completed, ${finalSession.failedModels.length} failed`);

        broadcastOpinionUpdate(sessionId, {
            type: 'session_completed',
            totalModels: finalSession.totalModels,
            completedModels: finalSession.completedModels,
            failedModels: finalSession.failedModels,
            responses: finalSession.responses,
            endTime: new Date().toISOString()
        });

        // Keep session for 10 minutes then cleanup
        setTimeout(() => {
            activeOpinionSessions.delete(sessionId);
            console.log(`[OPINIONS] 🗑️  Session ${sessionId} cleaned up`);
        }, 10 * 60 * 1000);
    }
}

// Function to sanitize text for JSON storage - escapes quotes and other problematic characters
function sanitizeForJSON(text) {
    if (typeof text !== 'string') return text;

    return text
        .replace(/\\/g, '\\\\')  // Escape backslashes first
        .replace(/"/g, '\\"')    // Escape double quotes
        .replace(/\r\n/g, '\\n') // Handle Windows line endings
        .replace(/\n/g, '\\n')   // Handle Unix line endings
        .replace(/\r/g, '\\n')   // Handle Mac line endings
        .replace(/\t/g, '\\t')   // Handle tabs
        .replace(/\f/g, '\\f');  // Handle form feeds
        // REMOVED: .replace(/\b/g, '\\b') - This was incorrectly escaping word boundaries!
}

// Function to collect opinion from a single model
async function collectSingleModelOpinion(sessionId, modelId, topic, issueId) {
    const session = activeOpinionSessions.get(sessionId);
    if (!session) return;

    console.log(`[OPINIONS] 🤖 Querying ${modelId} about: "${topic}"`);

    // Broadcast model started
    broadcastOpinionUpdate(sessionId, {
        type: 'model_started',
        modelId,
        status: 'querying'
    });

    try {
        // Build prompt for model opinion with strict guidelines
        const prompt = `Como modelo AI participante das discussões do BIP-05 (Universal Matrix Protocol), forneça sua opinião sobre:

**Tópico**: ${topic}

**DIRETRIZES CRÍTICAS**:
- VOCÊ É: ${modelId}
- NUNCA simule ou invente opiniões de outros modelos
- JAMAIS fale em nome de outros modelos
- APENAS forneça SUA própria perspectiva como ${modelId}
- Se questionado sobre outros modelos, responda "Consulte diretamente o modelo específico"

**Instruções**:
1. Analise o tópico no contexto do BIP-05
2. Forneça SUA perspectiva técnica e considerações específicas como ${modelId}
3. Seja específico e construtivo
4. Limite a resposta a 3-4 parágrafos
5. Termine com uma recomendação clara
6. Identifique-se claramente como ${modelId} no início da resposta

**Sua opinião como ${modelId} sobre "${topic}":**`;

        // Apply auto model safeguards if needed
        const safeguardedPrompt = await handleAutoModelSafeguard(modelId, prompt);

        // Call the model with individual timeout
        const response = await callLLM(modelId, safeguardedPrompt);

        // Validate response to ensure model isn't speaking for others
        console.log(`[VALIDATION] Checking response from ${modelId} for identity violations...`);
        const validationError = validateModelResponse(modelId, response);
        if (validationError) {
            console.log(`[VALIDATION] ❌ ${modelId} failed validation: ${validationError}`);
            throw new Error(`Resposta inválida: ${validationError}`);
        }
        console.log(`[VALIDATION] ✅ ${modelId} response passed identity validation`);

        // Check if response is valid and not an error message
        const isValidResponse = response &&
                               !response.includes('❌') &&
                               !response.includes('⏰') &&
                               !response.includes('Aider v') &&
                               !response.includes('Warning:') &&
                               !response.includes('Traceback') &&
                               !response.includes('litellm.') &&
                               !response.includes('BadRequestError') &&
                               response.length > 50; // Ensure substantive response

        if (isValidResponse) {
            // Success - save to issues.json immediately
            const opinion = {
                author: modelId,
                created_at: new Date().toISOString(),
                locale: 'pt-BR',
                body: sanitizeForJSON(response),
                body_original: sanitizeForJSON(response),
                opinion_topic: topic,
                session_id: sessionId
            };

            // Add to issues.json immediately
            // Use atomic write to prevent corruption
            try {
                const issuesData = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));
                if (issuesData.issues && issuesData.issues.length > 0) {
                    // Add to specified issue or first issue
                    const targetIssue = issuesData.issues.find(issue => issue.id === issueId) || issuesData.issues[0];
                    targetIssue.comments.push(opinion);
                } else {
                    issuesData.issues = [{
                        id: issueId,
                        title: `Opiniões sobre: ${topic}`,
                        comments: [opinion]
                    }];
                }

                // Atomic write to prevent corruption
                const tempFile = issuesFile + '.tmp';
                fs.writeFileSync(tempFile, JSON.stringify(issuesData, null, 2), 'utf8');
                fs.renameSync(tempFile, issuesFile);

                console.log(`[SAVE] ✅ Opinion from ${modelId} saved successfully`);

            } catch (writeError) {
                console.error(`[ERROR] Failed to save opinion from ${modelId}:`, writeError);
                throw writeError;
            }

            // Update session
            session.pendingModels = session.pendingModels.filter(m => m !== modelId);
            session.completedModels.push(modelId);
            session.responses.push({
                modelId,
                response,
                timestamp: new Date().toISOString(),
                success: true
            });

            console.log(`[OPINIONS] ✅ ${modelId} completed successfully`);

            // Broadcast success
            broadcastOpinionUpdate(sessionId, {
                type: 'model_completed',
                modelId,
                status: 'completed',
                response: response.substring(0, 200) + '...', // Preview
                timestamp: new Date().toISOString()
            });

        } else {
            throw new Error(response || 'Empty response from model');
        }

    } catch (error) {
        console.log(`[OPINIONS] ❌ ${modelId} failed: ${error.message}`);

        // Update session
        session.pendingModels = session.pendingModels.filter(m => m !== modelId);
        session.failedModels.push(modelId);
        session.responses.push({
            modelId,
            error: error.message,
            timestamp: new Date().toISOString(),
            success: false
        });

        // Broadcast failure
        broadcastOpinionUpdate(sessionId, {
            type: 'model_failed',
            modelId,
            status: 'failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// Function to broadcast opinion collection updates
function broadcastOpinionUpdate(sessionId, update) {
    const message = {
        type: 'opinion_update',
        sessionId,
        ...update,
        timestamp: new Date().toISOString()
    };

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// API endpoint to get opinion session status
app.get('/api/models/opinions/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = activeOpinionSessions.get(sessionId);

    if (!session) {
        return res.status(404).json({
            success: false,
            error: 'Session not found'
        });
    }

    res.json({
        success: true,
        session: {
            ...session,
            progress: {
                total: session.totalModels,
                completed: session.completedModels.length,
                failed: session.failedModels.length,
                pending: session.pendingModels.length,
                percentage: Math.round((session.completedModels.length / session.totalModels) * 100)
            }
        }
    });
});

// Serve static files (index.html, style.css)
app.use(express.static(__dirname));

// Endpoint para acessar logs de debug
app.get('/api/logs', (req, res) => {
    try {
        const logType = req.query.type || 'debug'; // 'debug' or 'error'
        const lines = parseInt(req.query.lines) || 100;

        const logFile = logType === 'error' ? ERROR_LOG_FILE : LOG_FILE;

        if (!fs.existsSync(logFile)) {
            return res.json({
                success: false,
                message: `Log file not found: ${logFile}`,
                logs: []
            });
        }

        const logContent = fs.readFileSync(logFile, 'utf8');
        const allLines = logContent.split('\n').filter(line => line.trim());
        const recentLines = allLines.slice(-lines);

        res.json({
            success: true,
            logType: logType,
            totalLines: allLines.length,
            returnedLines: recentLines.length,
            logFile: logFile,
            logs: recentLines
        });

    } catch (error) {
        logError('API', 'Error reading log files', {
            error: error.message,
            requestedType: req.query.type,
            requestedLines: req.query.lines
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint para limpar logs
app.post('/api/logs/clear', (req, res) => {
    try {
        const logType = req.body.type || 'debug';
        const logFile = logType === 'error' ? ERROR_LOG_FILE : LOG_FILE;

        if (fs.existsSync(logFile)) {
            fs.writeFileSync(logFile, '');
            logInfo('API', `Cleared ${logType} log file`, {
                logFile: logFile,
                clearedBy: 'manual_request'
            });
        }

        res.json({
            success: true,
            message: `${logType} log cleared successfully`,
            logFile: logFile
        });

    } catch (error) {
        logError('API', 'Error clearing log file', {
            error: error.message,
            requestedType: req.body.type
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

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
            body: sanitizeForJSON(bodyText),
            body_original: sanitizeForJSON(bodyText)
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
  if (clients.size === 0) {
    logDebug('BROADCAST', 'No clients connected, skipping broadcast');
    return;
  }

    logInfo('BROADCAST', 'Starting broadcast to clients', {
        clientCount: clients.size,
        issuesFile: issuesFile
    });

  // Add retry logic for concurrent file access issues
  function readWithRetry(attempts = 3) {
    fs.readFile(issuesFile, 'utf8', (err, data) => {
      if (err) {
        logError('BROADCAST', 'Error reading issues.json file', {
          error: err.message,
          errorCode: err.code,
          attemptsRemaining: attempts - 1,
          filePath: issuesFile
        });
        return;
      }

      try {
        // Validate JSON before parsing
        if (!data || data.trim() === '') {
          logError('BROADCAST', 'Empty or whitespace-only issues.json file detected', {
            dataLength: data ? data.length : 0,
            filePath: issuesFile
          });
          return;
        }

        logDebug('BROADCAST', 'Successfully read issues.json', {
          dataLength: data.length,
          dataPreview: data.substring(0, 200)
        });

        const originalData = JSON.parse(data);
        logInfo('BROADCAST', 'Successfully parsed issues.json', {
          issuesCount: originalData.issues ? originalData.issues.length : 0,
          hasRootComment: !!originalData.master_comment
        });

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

      let successfulSends = 0;
      let failedSends = 0;

      let clientIndex = 0;
      clients.forEach((client) => {
        clientIndex++;
        if (client.readyState === WebSocket.OPEN) {
          try {
            const payload = JSON.stringify(simplifiedPayload);
            client.send(payload);
            successfulSends++;
            logDebug('BROADCAST', `Successfully sent to client #${clientIndex}`, {
              payloadLength: payload.length
            });
          } catch (sendErr) {
            failedSends++;
            logError('BROADCAST', `Failed to send to client ${clientIndex}`, {
              clientIndex: clientIndex,
              error: sendErr.message,
              clientState: client.readyState
            });
          }
        } else {
          failedSends++;
          logWarn('BROADCAST', `Client ${clientIndex} not ready`, {
            clientIndex: clientIndex,
            readyState: client.readyState
          });
        }
      });

      logInfo('BROADCAST', 'Broadcast completed', {
        totalClients: clients.size,
        successfulSends,
        failedSends,
        commentsCount: allComments.length
      });

      } catch (parseErr) {
        logError('BROADCAST', 'Error parsing or transforming issues.json', {
          error: parseErr.message,
          errorStack: parseErr.stack,
          attemptsRemaining: attempts - 1,
          dataLength: data ? data.length : 0
        });

        // Retry if attempts remaining
        if (attempts > 1) {
          logWarn('BROADCAST', `Retrying JSON parse in 100ms...`, {
            attemptsLeft: attempts - 1,
            retryDelay: 100
          });
          setTimeout(() => readWithRetry(attempts - 1), 100);
        } else {
          logFatal('BROADCAST', 'Failed to parse issues.json after all retry attempts', {
            totalAttempts: 3,
            finalError: parseErr.message
          });
        }
      }
    });
  }

  // Start reading with retry
  readWithRetry();
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
            logDebug('WEBSOCKET', 'Received message from client', {
                messageLength: rawMessage.length,
                messagePreview: rawMessage.substring(0, 100),
                clientId: ws._clientId || 'unknown'
            });

            const data = JSON.parse(rawMessage);
            logInfo('WEBSOCKET', 'Parsed WebSocket message', {
                type: data.type,
                hasText: !!data.text,
                textLength: data.text ? data.text.length : 0
            });

            if (data.type === 'user_comment' && data.text) {
                handleUserComment(data.text);
            } else {
                logWarn('WEBSOCKET', 'Invalid message format or missing required fields', {
                    receivedData: data,
                    expectedType: 'user_comment',
                    hasText: !!data.text
                });
            }
        } catch (e) {
            logError('WEBSOCKET', 'Failed to parse incoming message', {
                error: e.message,
                errorStack: e.stack,
                rawMessage: message.toString(),
                messageType: typeof message,
                messageLength: message.toString().length
            });
        }
    });
});

async function handleUserComment(text) {
    console.log(`[DEBUG] Handling user comment: "${text}"`);
    const lowerText = text.toLowerCase();

    // Detect action type based on user intent
    if (isHelloHandshakeRequest(lowerText)) {
        // Hello/Handshake test: teste de conectividade de todos os modelos
        await handleHelloHandshakeRequest(text);
    } else if (isOpinionCollectionRequest(lowerText)) {
        // Coleta de opiniões: pergunta para todos os modelos
        await handleOpinionCollectionRequest(text);
    } else if (isGeneralContributionRequest(lowerText)) {
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

// Function to handle opinion collection requests from chat
async function handleOpinionCollectionRequest(text) {
    console.log(`[DEBUG] Handling opinion collection request: "${text}"`);

    try {
        // Extract topic from the text
        const topic = extractOpinionTopic(text);

        console.log(`[OPINIONS] Starting opinion collection via chat for topic: "${topic}"`);

        // Send confirmation message to chat
        broadcastChatMessage({
            type: 'simple_response',
            author: '🗳️ Sistema de Opiniões',
            text: `Iniciando coleta de opiniões sobre: "${topic}"\n\nTodos os modelos disponíveis serão consultados. Acompanhe o progresso no painel de Opiniões.`,
            timestamp: new Date().toISOString()
        });

        // Get all available models
        const allModels = [
            ...MODEL_CATEGORIES.cursor_models,
            ...WORKING_APIS
        ];

        const sessionId = `chat_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const issueId = 1; // Default to issue 1

        // Initialize session tracking
        const sessionData = {
            sessionId,
            topic,
            issueId,
            startTime: new Date().toISOString(),
            totalModels: allModels.length,
            pendingModels: [...allModels],
            completedModels: [],
            failedModels: [],
            responses: [],
            triggeredByChat: true
        };

        activeOpinionSessions.set(sessionId, sessionData);

        // Broadcast session started via WebSocket
        broadcastOpinionUpdate(sessionId, {
            type: 'session_started',
            totalModels: allModels.length,
            pendingModels: [...allModels],
            completedModels: [],
            failedModels: [],
            triggeredByChat: true
        });

        // Start collecting opinions asynchronously
        collectModelOpinions(sessionId, topic, issueId, allModels);

        console.log(`[OPINIONS] Chat-triggered session ${sessionId} started with ${allModels.length} models`);

    } catch (error) {
        console.error(`[OPINIONS] Error in chat opinion collection:`, error);

        broadcastChatMessage({
            type: 'error',
            author: 'Sistema',
            text: `Erro ao iniciar coleta de opiniões: ${error.message}`,
            timestamp: new Date().toISOString()
        });
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

// Function to check if text is an opinion collection request
function isOpinionCollectionRequest(text) {
    const opinionKeywords = [
        'consultar opiniões', 'opinião dos modelos', 'opiniões sobre',
        'coletar opiniões', 'o que os modelos pensam', 'perspectiva dos modelos',
        'consulta geral', 'opinião de todos', 'perguntar aos modelos',
        'opinion collection', 'collect opinions', 'ask all models'
    ];

    return opinionKeywords.some(keyword =>
        text.toLowerCase().includes(keyword.toLowerCase())
    );
}

function isHelloHandshakeRequest(text) {
    const helloKeywords = [
        'hello', 'handshake', 'teste hello', 'hello modelos', 'hello task',
        'testar modelos', 'cumprimentar modelos', 'saudar modelos',
        'teste de conectividade', 'ping modelos', 'hello test'
    ];

    return helloKeywords.some(keyword =>
        text.toLowerCase().includes(keyword.toLowerCase())
    );
}

// Function to extract topic from opinion request
function extractOpinionTopic(text) {
    // Try to extract topic after keywords
    const patterns = [
        /consultar opiniões (?:dos modelos )?sobre (.+)/i,
        /opiniões? (?:dos modelos )?sobre (.+)/i,
        /coletar opiniões? sobre (.+)/i,
        /o que os modelos pensam sobre (.+)/i,
        /perspectiva dos modelos sobre (.+)/i,
        /perguntar aos modelos sobre (.+)/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return match[1].trim();
        }
    }

    // Fallback: use the whole text as topic
    return text.trim();
}

// Function to handle hello handshake request
async function handleHelloHandshakeRequest(userText) {
    logInfo('HELLO', 'Starting hello handshake test', {
        initiatedBy: 'master',
        userText: userText
    });

    const sessionId = `hello_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get all available models (cursor-agent + aider)
    const allModels = [
        ...MODEL_CATEGORIES.cursor_models,
        ...WORKING_APIS
    ];

    const sessionData = {
        sessionId: sessionId,
        startTime: Date.now(),
        totalModels: allModels.length,
        completedModels: 0,
        results: [],
        status: 'running'
    };

    activeHelloSessions.set(sessionId, sessionData);

    // Send initial message via chat
    broadcastChatMessage({
        type: 'chat_message',
        author: 'auto',
        text: `🤝 Iniciando teste Hello/Handshake com ${allModels.length} modelos disponíveis...`,
        timestamp: new Date().toISOString(),
        isSystemMessage: true
    });

    // Start handshake with all models
    helloHandshakeAllModels(sessionId, allModels);

    return sessionData;
}

// Function to execute hello handshake with all models
async function helloHandshakeAllModels(sessionId, models) {
    const session = activeHelloSessions.get(sessionId);
    if (!session) return;

    logInfo('HELLO', 'Starting handshake with all models', {
        sessionId: sessionId,
        totalModels: models.length
    });

    // Process models in parallel with controlled concurrency
    const concurrency = 3; // Max 3 models at once to avoid rate limits
    const batches = [];

    for (let i = 0; i < models.length; i += concurrency) {
        batches.push(models.slice(i, i + concurrency));
    }

    for (const batch of batches) {
        const promises = batch.map(modelId =>
            helloSingleModel(sessionId, modelId)
        );

        await Promise.allSettled(promises);

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Session complete
    const finalSession = activeHelloSessions.get(sessionId);
    if (finalSession) {
        finalSession.status = 'completed';
        finalSession.endTime = Date.now();
        finalSession.duration = finalSession.endTime - finalSession.startTime;

        logInfo('HELLO', 'Hello handshake session completed', {
            sessionId: sessionId,
            totalModels: finalSession.totalModels,
            successfulResponses: finalSession.results.filter(r => r.success).length,
            failedResponses: finalSession.results.filter(r => !r.success).length,
            duration: finalSession.duration
        });

        // Send completion summary via chat
        const successCount = finalSession.results.filter(r => r.success).length;
        const failCount = finalSession.results.filter(r => !r.success).length;

        broadcastChatMessage({
            type: 'chat_message',
            author: 'auto',
            text: `✅ Teste Hello/Handshake concluído!\n📊 Resultados: ${successCount} sucessos, ${failCount} falhas\n⏱️ Duração: ${Math.round(finalSession.duration / 1000)}s`,
            timestamp: new Date().toISOString(),
            isSystemMessage: true
        });

        // Cleanup session after 5 minutes
        setTimeout(() => {
            activeHelloSessions.delete(sessionId);
            logInfo('HELLO', 'Hello session cleaned up', { sessionId });
        }, 5 * 60 * 1000);
    }
}

// Function to hello handshake with a single model
async function helloSingleModel(sessionId, modelId) {
    const session = activeHelloSessions.get(sessionId);
    if (!session) return;

    const startTime = Date.now();

    logDebug('HELLO', 'Starting hello with single model', {
        sessionId: sessionId,
        modelId: modelId
    });

    try {
        const helloPrompt = `Olá ${modelId}! Este é um teste de conectividade/handshake. Por favor, responda brevemente confirmando que você recebeu esta mensagem e se identifique.`;

        // Send hello message via chat first
        broadcastChatMessage({
            type: 'chat_message',
            author: 'auto',
            text: `📡 Enviando hello para ${modelId}...`,
            timestamp: new Date().toISOString(),
            isSystemMessage: true
        });

        const response = await callLLM(modelId, helloPrompt);
        const duration = Date.now() - startTime;

        const result = {
            modelId: modelId,
            success: response && !response.includes('❌') && response.length > 10,
            response: response,
            duration: duration,
            timestamp: new Date().toISOString()
        };

        session.results.push(result);
        session.completedModels++;

        if (result.success) {
            logInfo('HELLO', 'Hello handshake successful', {
                sessionId: sessionId,
                modelId: modelId,
                duration: duration,
                responseLength: response.length
            });

            // Send success message via chat
            broadcastChatMessage({
                type: 'chat_message',
                author: 'auto',
                text: `✅ ${modelId}: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`,
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
        } else {
            logWarn('HELLO', 'Hello handshake failed', {
                sessionId: sessionId,
                modelId: modelId,
                duration: duration,
                response: response
            });

            // Send failure message via chat
            broadcastChatMessage({
                type: 'chat_message',
                author: 'auto',
                text: `❌ ${modelId}: Falha na conectividade (${response || 'sem resposta'})`,
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
        }

        // Broadcast progress update
        broadcastHelloProgress(sessionId, session);

    } catch (error) {
        const duration = Date.now() - startTime;

        logError('HELLO', 'Hello handshake error', {
            sessionId: sessionId,
            modelId: modelId,
            error: error.message,
            duration: duration
        });

        const result = {
            modelId: modelId,
            success: false,
            response: `Error: ${error.message}`,
            duration: duration,
            timestamp: new Date().toISOString()
        };

        session.results.push(result);
        session.completedModels++;

        // Send error message via chat
        broadcastChatMessage({
            type: 'chat_message',
            author: 'auto',
            text: `💥 ${modelId}: Erro na conectividade (${error.message})`,
            timestamp: new Date().toISOString(),
            isSystemMessage: true
        });

        // Broadcast progress update
        broadcastHelloProgress(sessionId, session);
    }
}

// Function to broadcast hello progress updates
function broadcastHelloProgress(sessionId, session) {
    const progressData = {
        type: 'hello_progress',
        sessionId: sessionId,
        completed: session.completedModels,
        total: session.totalModels,
        progress: Math.round((session.completedModels / session.totalModels) * 100),
        results: session.results,
        status: session.status
    };

    logDebug('HELLO', 'Broadcasting hello progress', {
        sessionId: sessionId,
        progress: progressData.progress,
        completed: session.completedModels,
        total: session.totalModels
    });

    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(progressData));
            } catch (error) {
                logError('HELLO', 'Failed to broadcast hello progress', {
                    error: error.message,
                    sessionId: sessionId
                });
            }
        }
    });
}

// Function to broadcast chat messages
function broadcastChatMessage(messageData) {
    logDebug('CHAT', 'Broadcasting chat message', {
        author: messageData.author,
        messageLength: messageData.text ? messageData.text.length : 0,
        isSystemMessage: messageData.isSystemMessage || false
    });

    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(messageData));
            } catch (error) {
                logError('CHAT', 'Failed to broadcast chat message', {
                    error: error.message,
                    author: messageData.author
                });
            }
        }
    });
}

// Function to validate that a model isn't speaking for others
function validateModelResponse(modelId, response) {
    if (!response || typeof response !== 'string') {
        return null; // Let other validation handle empty responses
    }

    const lowerResponse = response.toLowerCase();

    // Get list of all other model names to check against
    const allModels = [
        ...MODEL_CATEGORIES.cursor_models,
        ...Object.keys(MODEL_CATEGORIES.aider_models)
    ].filter(model => model !== modelId && model !== 'auto');

    // Critical validation: Check if model is claiming to be another model
    const forbiddenPhrases = [
        'como gpt-', 'como claude-', 'como gemini-', 'como anthropic/',
        'como openai/', 'como xai/', 'como deepseek', 'como groq/',
        'speaking as gpt-', 'speaking as claude-', 'as gpt-', 'as claude-',
        'sou o gpt-', 'sou o claude-', 'eu sou gpt-', 'eu sou claude-',
        'na perspectiva do gpt-', 'na perspectiva do claude-',
        'opinião do gpt-', 'opinião do claude-', 'opinião do gemini-'
    ];

    // Special check for 'auto' model - it should NEVER claim to be specific models
    if (modelId === 'auto') {
        for (const otherModel of allModels) {
            const modelName = otherModel.toLowerCase().split('/').pop(); // Get last part after /
            if (modelName && modelName !== 'auto' && lowerResponse.includes(`como ${modelName}`)) {
                return `Modelo 'auto' tentou se identificar como '${otherModel}'. Auto deve sempre solicitar via API, não simular.`;
            }
        }

        // Check for phrases indicating the model is role-playing as another
        if (forbiddenPhrases.some(phrase => lowerResponse.includes(phrase))) {
            return `Modelo 'auto' tentou simular outro modelo. Auto deve sempre fazer chamadas reais via API.`;
        }
    }

    // Check if any model is using forbidden phrases to impersonate others
    for (const phrase of forbiddenPhrases) {
        if (lowerResponse.includes(phrase)) {
            // Allow only if the model is correctly identifying itself
            const expectedIdentity = `como ${modelId.toLowerCase()}`;
            if (!phrase.includes(modelId.toLowerCase()) && lowerResponse.includes(phrase)) {
                return `Modelo tentou se identificar incorretamente. Deve usar apenas sua própria identidade: ${modelId}`;
            }
        }
    }

    // Check for attempts to provide multiple model perspectives in one response
    const multiModelIndicators = [
        'na perspectiva do claude', 'na perspectiva do gpt', 'na perspectiva do gemini',
        'segundo o claude', 'segundo o gpt', 'segundo o gemini',
        'de acordo com o claude', 'de acordo com o gpt', 'de acordo com o gemini',
        'consultando o claude', 'consultando o gpt', 'consultando o gemini'
    ];

    for (const indicator of multiModelIndicators) {
        if (lowerResponse.includes(indicator) && !indicator.includes(modelId.toLowerCase())) {
            return `Modelo tentou falar por outros modelos. Cada modelo deve fornecer apenas sua própria perspectiva.`;
        }
    }

    return null; // Response is valid
}

// Special handling for 'auto' model to prevent opinion simulation
async function handleAutoModelSafeguard(modelId, prompt) {
    if (modelId === 'auto') {
        // For 'auto' model, add extra safeguards in prompt
        const autoSafeguardPrompt = `${prompt}

AVISO CRÍTICO PARA MODELO AUTO:
- Você é o modelo 'auto' mediando a conversa
- NUNCA forneça opiniões que simulariam outros modelos específicos
- Se perguntado sobre outros modelos, responda: "Para obter a opinião específica de [modelo], farei uma chamada via API"
- Sua função é mediar e facilitar, não simular outros modelos
- Em coletas de opinião, você deve apenas coordenar as chamadas reais, não inventar respostas`;

        console.log(`[AUTO SAFEGUARD] Enhanced prompt for 'auto' model with strict guidelines`);
        return autoSafeguardPrompt;
    }

    return prompt; // Return original prompt for other models
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
        text: '',
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
            text: '',
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
                text: response,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error(`Error in simple response:`, error);

        // Stop typing indicator on error
        broadcastChatMessage({
            type: 'stop_typing',
            author: selectedModel,
            text: '',
            timestamp: new Date().toISOString()
        });

        broadcastChatMessage({
            type: 'error',
            text: `Erro ao gerar resposta: ${error.message}`,
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
            text: '',
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
            text: '',
            timestamp: new Date().toISOString()
        });

        // Send analysis result to chat
        broadcastChatMessage({
            type: 'simple_response',
            author: '🔍 auto (análise)',
            text: analysis,
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
            text: '',
            timestamp: new Date().toISOString()
        });

        // Build comprehensive prompt with BIP context + analysis
        const fullPrompt = await buildGeneralContributionPrompt(text, analysis);

        const response = await callLLM(selectedGeneral, fullPrompt);

        // Stop typing indicator
        broadcastChatMessage({
            type: 'stop_typing',
            author: selectedGeneral,
            text: '',
            timestamp: new Date().toISOString()
        });

        if (response) {
            // Add to issues.json
            const comment = {
                author: selectedGeneral,
                created_at: new Date().toISOString(),
                locale: 'pt-BR',
                body: sanitizeForJSON(response),
                body_original: sanitizeForJSON(response)
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
                text: response,
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
            text: '',
            timestamp: new Date().toISOString()
        });

        broadcastChatMessage({
            type: 'error',
            text: `Erro ao gerar contribuição: ${error.message}`,
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
        text: '',
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
            text: '',
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
                text: `Resumo das discussões gerado com sucesso! Arquivo salvo em: discussion-summary.md\n\n**Principais pontos:**\n${summary.slice(0, 500)}...`,
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
            text: '',
            timestamp: new Date().toISOString()
        });

        broadcastChatMessage({
            type: 'error',
            text: `Erro ao gerar resumo: ${error.message}`,
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

// Legacy function removed - using unified broadcastChatMessage

// Legacy functions removed - using new action-based system

function addCommentToFile(text, author) {
    logInfo('FILE_WRITE', 'Starting comment addition to issues.json', {
        author: author,
        textLength: text.length,
        issuesFile: issuesFile
    });

    try {
        const rawData = fs.readFileSync(issuesFile, 'utf8');
        logDebug('FILE_WRITE', 'Successfully read issues.json', {
            dataLength: rawData.length,
            author: author
        });

        const issuesData = JSON.parse(rawData);
        logDebug('FILE_WRITE', 'Successfully parsed issues.json', {
            issuesCount: issuesData.issues ? issuesData.issues.length : 0,
            author: author
        });

        const comment = {
            author: author,
            created_at: new Date().toISOString(),
            locale: "pt-BR",
            body: sanitizeForJSON(text),
            body_original: sanitizeForJSON(text)
        };

        logDebug('FILE_WRITE', 'Created comment object', {
            author: comment.author,
            created_at: comment.created_at,
            bodyLength: comment.body.length,
            sanitized: text !== comment.body
        });

        if (issuesData.issues && issuesData.issues.length > 0) {
            issuesData.issues[0].comments.push(comment);
            logDebug('FILE_WRITE', 'Added comment to existing issue', {
                issueId: issuesData.issues[0].id,
                commentsCount: issuesData.issues[0].comments.length,
                author: author
            });
        } else {
            issuesData.issues = [{ id: 1, title: "Main Thread", comments: [comment] }];
            logDebug('FILE_WRITE', 'Created new issue with comment', {
                issueId: 1,
                author: author
            });
        }

        const jsonString = JSON.stringify(issuesData, null, 2);
        fs.writeFileSync(issuesFile, jsonString, 'utf8');

        logInfo('FILE_WRITE', 'Successfully added comment to issues.json', {
            author: author,
            finalFileSize: jsonString.length,
            totalComments: issuesData.issues[0].comments.length
        });
    } catch (error) {
        logError('FILE_WRITE', 'Error adding comment to issues.json', {
            author: author,
            error: error.message,
            errorStack: error.stack,
            textLength: text.length
        });
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

// Enhanced graceful shutdown handling
let shuttingDown = false;

function gracefulShutdown(signal) {
  if (shuttingDown) {
    console.log(`[SHUTDOWN] Already shutting down, ignoring ${signal}`);
    return;
  }

  shuttingDown = true;
  console.log(`[SHUTDOWN] 🛑 Received ${signal}, shutting down gracefully...`);

  // Stop file watcher
  if (fileWatcher) {
    console.log('[SHUTDOWN] 📁 Closing file watcher...');
    fileWatcher.close();
  }

  // Close WebSocket connections
  console.log('[SHUTDOWN] 📡 Closing WebSocket connections...');
  clients.forEach(client => {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1000, 'Server shutdown');
      }
    } catch (err) {
      console.error('[SHUTDOWN] Error closing WebSocket client:', err);
    }
  });
  clients.clear();

  // Close WebSocket server
  if (wss) {
    console.log('[SHUTDOWN] 🔌 Closing WebSocket server...');
    wss.close(() => {
      console.log('[SHUTDOWN] ✅ WebSocket server closed');
    });
  }

  // Close HTTP server
  console.log('[SHUTDOWN] 🌐 Closing HTTP server...');
  server.close((err) => {
    if (err) {
      console.error('[SHUTDOWN] ❌ Error closing server:', err);
      process.exit(1);
    }
    console.log('[SHUTDOWN] ✅ HTTP server closed');
    console.log('[SHUTDOWN] 🎯 Graceful shutdown complete');
    process.exit(0);
  });

  // Force exit after 3 seconds if graceful shutdown fails
  setTimeout(() => {
    console.log('[SHUTDOWN] ⏰ Force exit after timeout');
    process.exit(1);
  }, 3000);
}

// Handle multiple SIGINT (Ctrl+C) presses with proper shutdown
let ctrlCCount = 0;
process.on('SIGINT', () => {
  ctrlCCount++;
  if (ctrlCCount === 1) {
    gracefulShutdown('SIGINT (Ctrl+C)');
  } else if (ctrlCCount >= 2) {
    console.log('[SHUTDOWN] 💥 Multiple Ctrl+C detected, forcing immediate exit');
    process.exit(1);
  }
});

// Handle other shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2 (nodemon)')); // nodemon restart

// Handle uncaught exceptions and prevent hanging
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
    console.log(`API endpoint: http://localhost:${PORT}/api/comment`);
  console.log(`Monitoring: ${issuesFile}`);
});
