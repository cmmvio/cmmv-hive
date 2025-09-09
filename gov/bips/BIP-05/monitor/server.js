const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Model categorization based on user specifications
const MODEL_CATEGORIES = {
    // Small models for initial analysis
    small: ['gpt-5-mini', 'grok-code-fast-1'],

    // General models for complex tasks
    generals: [
        'gpt-5', 'gpt-4o', 'claude-4-sonnet', 'claude-3.7-sonnet',
        'deepseek-v3.1', 'deepseek-r1-0528', 'grok-3', 'grok-code-fast-1',
        'gemini-2.5-pro', 'gemini-2.5-flash'
    ],

    // BIP-specific models for discussions
    bip_specific: ['gpt-5-mini', 'gpt-oss-20b', 'qwen3']
};

// LLM call helper using cursor-agent
async function callLLM(modelId, prompt) {
    const { spawn } = require('child_process');

    const systemPrompt = 'Você é um modelo auxiliando na discussão do BIP-05 (UMICP). Responda em PT-BR, de forma objetiva e útil, mantendo o contexto do tópico.';
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    try {
        console.error(`[CURSOR-AGENT] Start model intract`);

        return new Promise((resolve, reject) => {
            const cursorAgent = spawn('cursor-agent', [
                '--print',
                '--output-format', 'json',
                '--model', modelId,
                '-p', fullPrompt
            ]);

            let stdout = '';
            let stderr = '';

            cursorAgent.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            cursorAgent.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            cursorAgent.on('close', (code) => {
                if (code !== 0) {
                    console.error(`[CURSOR-AGENT ERROR] Code ${code}:`, stderr);
                    return resolve(null);
                }

                try {
                    const response = JSON.parse(stdout);
                    if (response.type === 'result' && response.subtype === 'success' && !response.is_error) {
                        resolve(response.result);
                    } else {
                        console.error('[CURSOR-AGENT ERROR] Response:', response);
                        resolve(null);
                    }
                } catch (parseErr) {
                    console.error('[CURSOR-AGENT PARSE ERROR]:', parseErr);
                    console.error('Raw output:', stdout);
                    resolve(null);
                }
            });

            cursorAgent.on('error', (error) => {
                console.error('[CURSOR-AGENT SPAWN ERROR]:', error);
                resolve(null);
            });
        });
    } catch (err) {
        console.error('[LLM ERROR]', err?.message || err);
        return null;
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
const inventoryFile = path.join(__dirname, '..', '..', '..', '..', 'scripts', 'mcp', 'cursor_model_inventory.yml');

// Middleware to parse JSON request bodies
app.use(express.json());

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

    // Pattern to detect a command like "ask gpt-4o to..."
    const commandRegex = /^(ask|get|request|chame|peça|solicite)\s+([\w.-]+)/;
    const match = lowerText.match(commandRegex);

    if (match) {
        // It's a command to trigger a specific model
        const modelToTrigger = match[2];
        console.log(`[DEBUG] Interpreted as a command to trigger model: ${modelToTrigger}`);
        // Always log the user's message in the thread first
        addCommentAsProxy(text);
        await generateAndAddComment(modelToTrigger, text);

    } else if (lowerText.endsWith('?')) {
        // It's a question, use intelligent selection (may pick a general model for complex questions)
        console.log(`[DEBUG] Interpreted as a question. Using intelligent model selection.`);
        addCommentAsProxy(text);
        const selectedModel = selectAppropriateModel(text, 'bip');
        console.log(`[DEBUG] Selected model for question: ${selectedModel}`);
        await generateAndAddComment(selectedModel, text);

    } else {
        // General comment: use small model for simple interactions
        console.log(`[DEBUG] Interpreted as a general comment.`);
        addCommentAsProxy(text);
        const selectedModel = selectAppropriateModel(text, 'general');
        console.log(`[DEBUG] Selected model for comment: ${selectedModel}`);
        await generateAndAddComment(selectedModel, text);
    }
}

async function generateAndAddComment(model, text) {
    try {
        const issuesData = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));
        const prompt = buildPromptFromContext(text || 'Sem texto do usuário', issuesData);
        const llmText = await callLLM(model, prompt);
        const bodyText = llmText || (text ? `Recebido: "${text}"` : `Participação registrada por ${model}.`);
        console.log(`[CURSOR-AGENT] Comment generated: ${bodyText}`);

        //addCommentToFile(bodyText, model);
    } catch (error) {
        console.error(`Error generating comment for model ${model}:`, error);
        //addCommentToFile(`Erro ao gerar comentário: ${error.message}`, model);
    }
}

function addCommentAsProxy(text) {
    addCommentToFile(text, 'User');
}

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
