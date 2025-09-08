#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MINUTES_DIR = path.join(__dirname, '../../gov/minutes/0004');
const VOTES_DIR = path.join(MINUTES_DIR, 'votes');

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bright: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(message, 'cyan');
    log(`${'='.repeat(60)}\n`, 'cyan');
}

function readVoteFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        log(`Erro ao ler arquivo ${filePath}: ${error.message}`, 'red');
        return null;
    }
}

function getAllVoteFiles() {
    const files = fs.readdirSync(VOTES_DIR);
    return files
        .filter(file => file.endsWith('.json') && file !== 'TEMPLATE.json')
        .map(file => path.join(VOTES_DIR, file));
}

function processVotes() {
    const voteFiles = getAllVoteFiles();
    const votes = [];
    const proposals = new Map();

    logHeader('PROCESSANDO VOTOS DA REUNIÃO 0004');
    log(`Encontrados ${voteFiles.length} arquivos de votos\n`);

    // Process each vote file
    for (const filePath of voteFiles) {
        const voteData = readVoteFile(filePath);
        if (!voteData) continue;

        const modelName = voteData.model;
        votes.push(voteData);

        log(`📊 Processando voto de: ${modelName}`, 'yellow');

        // Process each proposal weight
        for (const weight of voteData.weights) {
            const proposalId = weight.proposal_id;

            if (!proposals.has(proposalId)) {
                proposals.set(proposalId, {
                    id: proposalId,
                    votes: [],
                    totalWeight: 0,
                    averageWeight: 0,
                    voteCount: 0,
                    comments: []
                });
            }

            const proposal = proposals.get(proposalId);
            proposal.votes.push({
                model: modelName,
                weight: weight.weight,
                comment: weight.comment
            });
            proposal.totalWeight += weight.weight;
            proposal.voteCount += 1;
            proposal.comments.push(`${modelName}: ${weight.comment}`);
        }
    }

    // Calculate averages
    for (const proposal of proposals.values()) {
        proposal.averageWeight = proposal.totalWeight / proposal.voteCount;
    }

    return { votes, proposals };
}

function generateReport(votes, proposals) {
    logHeader('RELATÓRIO FINAL DA VOTAÇÃO');

    log(`📈 Total de votos processados: ${votes.length}`, 'green');
    log(`📋 Total de propostas votadas: ${proposals.size}\n`, 'green');

    // Sort proposals by average weight descending
    const sortedProposals = Array.from(proposals.values())
        .sort((a, b) => b.averageWeight - a.averageWeight);

    log('🏆 RANKING DAS PROPOSTAS POR PESO MÉDIO:\n', 'bright');

    sortedProposals.forEach((proposal, index) => {
        const rank = index + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ` ${rank}.`;
        const avgWeight = proposal.averageWeight.toFixed(2);

        log(`${medal} Proposta ${proposal.id}`, 'bright');
        log(`   📊 Peso médio: ${avgWeight}/10`, 'cyan');
        log(`   👥 Total de votos: ${proposal.voteCount}`, 'yellow');
        log(`   📈 Peso total: ${proposal.totalWeight}`, 'magenta');

        // Show top 3 comments
        if (proposal.comments.length > 0) {
            log('   💬 Principais comentários:', 'blue');
            proposal.comments.slice(0, 3).forEach(comment => {
                log(`      • ${comment}`, 'reset');
            });
        }
        log('');
    });

    // Detailed breakdown for each proposal
    logHeader('DETALHES POR PROPOSTA');

    for (const proposal of sortedProposals) {
        log(`📋 Proposta ${proposal.id}:`, 'bright');
        log(`   📊 Estatísticas: Média ${proposal.averageWeight.toFixed(2)}, Total ${proposal.totalWeight}, Votos ${proposal.voteCount}`, 'cyan');

        // Show all votes for this proposal
        proposal.votes.forEach(vote => {
            log(`   🤖 ${vote.model}: ${vote.weight}/10 - "${vote.comment}"`, 'yellow');
        });
        log('');
    }

    return sortedProposals;
}

function saveReportToFile(sortedProposals, votes) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(MINUTES_DIR, `voting_results_${timestamp}.json`);

    const report = {
        minute_id: "0004",
        timestamp: new Date().toISOString(),
        total_votes: votes.length,
        total_proposals: sortedProposals.length,
        results: sortedProposals.map(proposal => ({
            proposal_id: proposal.id,
            average_weight: proposal.averageWeight,
            total_weight: proposal.totalWeight,
            vote_count: proposal.voteCount,
            votes: proposal.votes
        }))
    };

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    log(`💾 Relatório salvo em: ${reportFile}`, 'green');
}

function main() {
    try {
        const { votes, proposals } = processVotes();
        const sortedProposals = generateReport(votes, proposals);
        saveReportToFile(sortedProposals, votes);

        logHeader('CONTAGEM CONCLUÍDA COM SUCESSO');
        log('✅ Todos os votos foram processados e o relatório foi gerado!', 'green');

    } catch (error) {
        log(`❌ Erro durante a contagem: ${error.message}`, 'red');
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
