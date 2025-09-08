# BIP-00 Technical Architecture

## Extension Overview
The CMMV-Hive Governance Extension transforms the Cursor IDE into a comprehensive governance platform for AI-driven consensus decision making.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Cursor IDE Extension                      │
├─────────────────────────────────────────────────────────────┤
│  UI Layer                                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Governance│ │   Voting    │ │     BIP     │           │
│  │   Dashboard │ │   Progress  │ │  Management │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────┤
│  Command Layer                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Minute    │ │   Voting    │ │   Branch    │           │
│  │  Generator  │ │  Orchestrator│ │  Manager    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────┤
│  Service Layer                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  AI Model   │ │   Data      │ │    Git      │           │
│  │  Integration│ │  Management │ │ Integration │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Voting    │ │     BIP     │ │   Config    │           │
│  │   Chain     │ │   Storage   │ │   Management│           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────┤
│  External Integrations                                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Shell     │ │  Cursor AI  │ │     Git     │           │
│  │   Scripts   │ │   Models    │ │  Repository │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Component Specifications

### 1. Extension Manifest (package.json)

```json
{
  "name": "cmmv-hive-governance",
  "displayName": "CMMV-Hive Governance",
  "description": "AI Consensus Governance System for Cursor IDE",
  "version": "1.0.0",
  "engines": {
    "vscode": "^1.70.0"
  },
  "categories": ["Other"],
  "activationEvents": [
    "onCommand:cmmv-hive.generateMinute",
    "onCommand:cmmv-hive.startVoting",
    "onCommand:cmmv-hive.manageBIP",
    "onCommand:cmmv-hive.reviewBIP",
    "onCommand:cmmv-hive.manageBranches"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "cmmv-hive.generateMinute",
        "title": "Generate New Minute",
        "category": "CMMV-Hive"
      },
      {
        "command": "cmmv-hive.startVoting",
        "title": "Start Automated Voting",
        "category": "CMMV-Hive"
      },
      {
        "command": "cmmv-hive.manageBIP",
        "title": "Manage BIP",
        "category": "CMMV-Hive"
      },
      {
        "command": "cmmv-hive.reviewBIP",
        "title": "Review BIP",
        "category": "CMMV-Hive"
      },
      {
        "command": "cmmv-hive.manageBranches",
        "title": "Manage Branches",
        "category": "CMMV-Hive"
      }
    ],
    "menus": {
      "commandPalette": [
        {
          "command": "cmmv-hive.generateMinute",
          "when": "workspaceContains:**/discussion"
        }
      ]
    },
    "views": {
      "explorer": [
        {
          "id": "cmmv-hive-governance",
          "name": "CMMV-Hive Governance",
          "when": "workspaceContains:**/discussion"
        }
      ]
    }
  }
}
```

### 2. Core Services

#### AI Model Integration Service

```typescript
// src/services/AIModelService.ts
export interface AIModel {
  id: string;
  name: string;
  provider: 'cursor' | 'openai' | 'anthropic' | 'google';
  type: 'general' | 'collaborator';
  weight: number;
  status: 'active' | 'inactive' | 'maintenance';
  capabilities: ModelCapability[];
}

export interface ModelCapability {
  name: string;
  description: string;
  enabled: boolean;
}

export interface VotingContext {
  minuteId: string;
  proposals: Proposal[];
  summaryPath: string;
  instructionsPath: string;
  previousVotes?: Vote[];
}

export interface Vote {
  model: string;
  timestamp: string;
  proposals: ProposalVote[];
  signature?: string;
}

export interface ProposalVote {
  proposalId: string;
  weight: number; // 1-10
  comment?: string;
}

export class AIModelService {
  private models: Map<string, AIModel> = new Map();
  private cursorAPI: CursorAPIWrapper;

  constructor() {
    this.loadModelConfiguration();
    this.cursorAPI = new CursorAPIWrapper();
  }

  async invokeModelForVoting(
    modelId: string, 
    context: VotingContext
  ): Promise<Vote> {
    const model = this.models.get(modelId);
    if (!model || model.status !== 'active') {
      throw new Error(`Model ${modelId} not available for voting`);
    }

    // Switch to specific model in Cursor
    await this.cursorAPI.switchToModel(modelId);
    
    // Prepare context and voting prompt
    const prompt = this.buildVotingPrompt(context);
    
    // Submit to Cursor and wait for response
    const response = await this.cursorAPI.submitPrompt(prompt);
    
    // Parse and validate vote
    return this.parseVoteResponse(modelId, response);
  }

  private buildVotingPrompt(context: VotingContext): string {
    return `
# Voting Instructions for Minute ${context.minuteId}

You are participating in the CMMV-Hive governance voting process.

## Context Files:
- Summary: @${context.summaryPath}
- Proposals: @${context.minuteId}/proposals.json
- Instructions: @${context.minuteId}/INSTRUCTIONS.md

## Your Task:
Review all proposals and assign a weight from 1-10 for each proposal based on:
- Technical merit and feasibility
- Alignment with project goals
- Implementation complexity
- Community impact

## Response Format:
Provide your vote in JSON format:
\`\`\`json
{
  "model": "your-model-id",
  "timestamp": "${new Date().toISOString()}",
  "proposals": [
    {"proposal_id": "001", "weight": 8, "comment": "Optional comment"},
    {"proposal_id": "002", "weight": 6}
  ]
}
\`\`\`

Please review carefully and provide your weighted votes.
    `;
  }

  private async parseVoteResponse(modelId: string, response: string): Promise<Vote> {
    // Extract JSON from response
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch) {
      throw new Error(`Invalid vote response format from ${modelId}`);
    }

    try {
      const vote = JSON.parse(jsonMatch[1]) as Vote;
      
      // Validate vote structure
      this.validateVote(vote);
      
      return vote;
    } catch (error) {
      throw new Error(`Failed to parse vote from ${modelId}: ${error}`);
    }
  }

  private validateVote(vote: Vote): void {
    if (!vote.model || !vote.timestamp || !vote.proposals) {
      throw new Error('Invalid vote structure');
    }

    for (const proposal of vote.proposals) {
      if (!proposal.proposal_id || 
          typeof proposal.weight !== 'number' || 
          proposal.weight < 1 || 
          proposal.weight > 10) {
        throw new Error(`Invalid proposal vote: ${JSON.stringify(proposal)}`);
      }
    }
  }
}
```

#### Voting Orchestration Service

```typescript
// src/services/VotingOrchestratorService.ts
export interface VotingSession {
  minuteId: string;
  status: 'initializing' | 'active' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  expectedVoters: string[];
  receivedVotes: string[];
  progress: number;
}

export class VotingOrchestratorService {
  private aiModelService: AIModelService;
  private dataService: DataManagementService;
  private shellExecutor: ShellExecutorService;

  constructor() {
    this.aiModelService = new AIModelService();
    this.dataService = new DataManagementService();
    this.shellExecutor = new ShellExecutorService();
  }

  async startVotingSession(minuteId: string): Promise<VotingSession> {
    // Initialize voting session
    const session: VotingSession = {
      minuteId,
      status: 'initializing',
      startTime: new Date().toISOString(),
      expectedVoters: await this.getGeneralModels(),
      receivedVotes: [],
      progress: 0
    };

    try {
      // Initialize voting infrastructure
      await this.shellExecutor.execute(`./scripts/bip_system/vote_collector.sh start-collection ${minuteId}`);
      
      session.status = 'active';
      
      // Start automated voting process
      this.orchestrateVoting(session);
      
      return session;
    } catch (error) {
      session.status = 'failed';
      throw error;
    }
  }

  private async orchestrateVoting(session: VotingSession): Promise<void> {
    const context = await this.buildVotingContext(session.minuteId);
    
    for (const modelId of session.expectedVoters) {
      try {
        // Invoke model for voting
        const vote = await this.aiModelService.invokeModelForVoting(modelId, context);
        
        // Save vote file
        await this.dataService.saveVoteFile(session.minuteId, vote);
        
        // Add to voting chain
        await this.shellExecutor.execute(
          `./scripts/bip_system/voting_chain.sh add-vote ${session.minuteId} ${modelId} votes/${modelId}.json`
        );
        
        // Update session progress
        session.receivedVotes.push(modelId);
        session.progress = (session.receivedVotes.length / session.expectedVoters.length) * 100;
        
        // Notify progress
        this.notifyVotingProgress(session);
        
      } catch (error) {
        console.error(`Failed to collect vote from ${modelId}:`, error);
        // Continue with other models
      }
    }
    
    // Finalize voting if all votes received
    if (session.receivedVotes.length === session.expectedVoters.length) {
      await this.finalizeVoting(session);
    }
  }

  private async finalizeVoting(session: VotingSession): Promise<void> {
    try {
      // Auto-finalize voting
      await this.shellExecutor.execute(
        `./scripts/bip_system/vote_collector.sh auto-finalize ${session.minuteId}`
      );
      
      session.status = 'completed';
      session.endTime = new Date().toISOString();
      
      // Generate results and BIPs for approved proposals
      await this.processVotingResults(session.minuteId);
      
    } catch (error) {
      session.status = 'failed';
      throw error;
    }
  }

  private async processVotingResults(minuteId: string): Promise<void> {
    const results = await this.dataService.loadVotingResults(minuteId);
    
    // Create BIPs for proposals with score > 80%
    const approvedProposals = results.results.filter(r => r.score > 80);
    
    for (const proposal of approvedProposals) {
      await this.createBIPFromProposal(proposal);
    }
    
    // Handle rejected proposals (track recall count)
    const rejectedProposals = results.results.filter(r => r.score <= 80);
    await this.handleRejectedProposals(rejectedProposals);
  }
}
```

#### BIP Management Service

```typescript
// src/services/BIPManagementService.ts
export interface BIP {
  id: string;
  number: string; // BIP-XX format
  title: string;
  status: 'draft' | 'review' | 'approved' | 'implemented' | 'rejected';
  author: string;
  implementer?: string;
  reviewers: string[];
  branch?: string;
  approvalScore: number;
  sourceProposal: string;
  sourceMinute: string;
  created: string;
  updated: string;
  files: BIPFile[];
}

export interface BIPFile {
  path: string;
  type: 'specification' | 'implementation' | 'test' | 'documentation';
  status: 'draft' | 'complete' | 'reviewed';
}

export class BIPManagementService {
  private shellExecutor: ShellExecutorService;
  private branchManager: BranchManagementService;
  private aiModelService: AIModelService;

  async createBIPFromProposal(proposal: ApprovedProposal): Promise<BIP> {
    const bipNumber = await this.getNextBIPNumber();
    const bipId = `BIP-${bipNumber}`;
    
    // Create BIP directory structure
    await this.shellExecutor.execute(
      `./scripts/bip_system/create_bip.sh "${proposal.title}"`
    );
    
    // Create BIP object
    const bip: BIP = {
      id: bipId,
      number: bipNumber,
      title: proposal.title,
      status: 'draft',
      author: 'System-Generated',
      reviewers: [],
      approvalScore: proposal.score,
      sourceProposal: proposal.proposal_id,
      sourceMinute: proposal.minute_id,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      files: []
    };
    
    // Save BIP metadata
    await this.saveBIPMetadata(bip);
    
    return bip;
  }

  async assignImplementation(bipId: string, modelId: string): Promise<void> {
    const bip = await this.loadBIP(bipId);
    
    if (!bip) {
      throw new Error(`BIP ${bipId} not found`);
    }
    
    // Create implementation branch
    const branchName = await this.branchManager.createBIPBranch(bipId);
    
    // Update BIP with implementer and branch
    bip.implementer = modelId;
    bip.branch = branchName;
    bip.updated = new Date().toISOString();
    
    await this.saveBIPMetadata(bip);
    
    // Notify implementer
    await this.notifyBIPAssignment(bipId, modelId);
  }

  async initiateBIPReview(bipId: string): Promise<ReviewSession> {
    const bip = await this.loadBIP(bipId);
    const generalModels = await this.aiModelService.getGeneralModels();
    
    const reviewSession: ReviewSession = {
      bipId,
      status: 'active',
      startTime: new Date().toISOString(),
      reviewers: generalModels.map(m => m.id),
      reviews: [],
      approvalThreshold: 0.8
    };
    
    // Initiate review with each model
    for (const modelId of reviewSession.reviewers) {
      await this.requestBIPReview(bipId, modelId);
    }
    
    return reviewSession;
  }

  private async requestBIPReview(bipId: string, modelId: string): Promise<void> {
    const bip = await this.loadBIP(bipId);
    const reviewContext = await this.buildReviewContext(bip);
    
    // Switch to model and request review
    await this.aiModelService.invokeModelForReview(modelId, reviewContext);
  }
}
```

### 3. User Interface Components

#### Governance Dashboard

```typescript
// src/ui/GovernanceDashboardProvider.ts
export class GovernanceDashboardProvider implements vscode.TreeDataProvider<GovernanceItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<GovernanceItem | undefined | null | void> = new vscode.EventEmitter<GovernanceItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<GovernanceItem | undefined | null | void> = this._onDidChangeTreeData.event;

  getTreeItem(element: GovernanceItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: GovernanceItem): Thenable<GovernanceItem[]> {
    if (!element) {
      return Promise.resolve(this.getRootItems());
    }
    return Promise.resolve(this.getChildItems(element));
  }

  private getRootItems(): GovernanceItem[] {
    return [
      new GovernanceItem('Active Minutes', 'minutes', vscode.TreeItemCollapsibleState.Expanded),
      new GovernanceItem('Pending BIPs', 'bips', vscode.TreeItemCollapsibleState.Expanded),
      new GovernanceItem('Review Queue', 'reviews', vscode.TreeItemCollapsibleState.Expanded),
      new GovernanceItem('Implementation Status', 'implementations', vscode.TreeItemCollapsibleState.Expanded)
    ];
  }
}

export class GovernanceItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly type: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}`;
    this.contextValue = type;
  }
}
```

### 4. Integration Layer

#### Shell Executor Service

```typescript
// src/services/ShellExecutorService.ts
export class ShellExecutorService {
  async execute(command: string, cwd?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const options = cwd ? { cwd } : {};
      
      exec(command, options, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${error.message}\nStderr: ${stderr}`));
          return;
        }
        resolve(stdout);
      });
    });
  }

  async executeWithProgress(
    command: string, 
    progressCallback: (output: string) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('bash', ['-c', command], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';

      process.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        progressCallback(chunk);
      });

      process.stderr.on('data', (data) => {
        progressCallback(`ERROR: ${data.toString()}`);
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
    });
  }
}
```

## Data Flow Diagrams

### Voting Process Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Generate  │───▶│   Start     │───▶│  AI Model   │
│   Minute    │    │   Voting    │    │  Iteration  │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Results   │◀───│   Voting    │◀───│   Vote      │
│ Processing  │    │   Chain     │    │ Collection  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### BIP Lifecycle Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Approved   │───▶│   Create    │───▶│   Assign    │
│  Proposal   │    │    BIP      │    │Implementer  │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Merge to  │◀───│   Review    │◀───│Implementa-  │
│    Main     │    │ Approval    │    │    tion     │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Security Architecture

### Access Control
- Command-level permissions
- Model authentication
- Branch protection rules
- Audit logging

### Data Integrity
- Cryptographic vote signing
- Chain validation
- File integrity checks
- Backup and recovery

## Performance Considerations

### Optimization Strategies
- Asynchronous operations for AI model calls
- Caching of model configurations
- Batch processing of votes
- Progressive loading of historical data

### Scalability Factors
- Configurable timeout values
- Rate limiting for AI model calls
- Efficient data structures
- Memory management for large datasets

## Error Handling

### Recovery Mechanisms
- Automatic retry for failed operations
- Graceful degradation for model unavailability
- Transaction rollback for critical failures
- Comprehensive error logging

### User Notifications
- Real-time status updates
- Error reporting with context
- Recovery suggestions
- Progress indicators

This technical architecture provides a robust foundation for implementing the CMMV-Hive Governance Extension with all required functionality while maintaining extensibility and reliability.
