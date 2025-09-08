# BIP-00 Automation Workflows

## Overview
This document defines the detailed automation workflows for the CMMV-Hive Governance Extension, specifying step-by-step processes for each core function.

## Workflow 1: Automated Minute Generation

### Trigger
- User executes command: `CMMV-Hive: Generate New Minute`
- Automatic detection of new proposals (optional background task)

### Process Flow

```
START
  │
  ├─ Scan Discussion Directory
  │  ├─ Read all files in `/discussion/`
  │  ├─ Extract proposal metadata (number, author, date)
  │  └─ Compare with previous minute records
  │
  ├─ Filter Unreviewed Proposals
  │  ├─ Load previous minute summaries
  │  ├─ Identify proposals not included in voting
  │  └─ Validate proposal format and completeness
  │
  ├─ Generate New Minute ID
  │  ├─ Find highest existing minute number
  │  ├─ Increment by 1 (format: 0001, 0002, etc.)
  │  └─ Create minute directory structure
  │
  ├─ Create Summary Document
  │  ├─ Extract title and key points from each proposal
  │  ├─ Limit description to 400 characters
  │  ├─ Generate `summary.md` with formatted content
  │  └─ Include proposal originator and date
  │
  ├─ Generate Proposals Metadata
  │  ├─ Create `proposals.json` with structured data
  │  ├─ Include proposal IDs, titles, authors, files
  │  └─ Add scoring placeholders for voting
  │
  ├─ Initialize Voting Infrastructure
  │  ├─ Execute `voting_chain.sh init [minute_id]`
  │  ├─ Create `votes/` directory
  │  ├─ Generate `INSTRUCTIONS.md`
  │  └─ Set up collection status tracking
  │
  └─ Notify Completion
     ├─ Display success message with minute ID
     ├─ Show summary of included proposals
     └─ Offer option to start voting immediately
END
```

### Implementation Details

#### Proposal Scanning Algorithm
```typescript
interface ProposalScanResult {
  newProposals: Proposal[];
  totalScanned: number;
  excludedReasons: Map<string, string>;
}

async function scanForNewProposals(): Promise<ProposalScanResult> {
  const discussionFiles = await fs.readdir('./discussion/');
  const previousMinutes = await loadPreviousMinutes();
  const reviewedProposals = extractReviewedProposals(previousMinutes);
  
  const newProposals: Proposal[] = [];
  const excludedReasons = new Map<string, string>();
  
  for (const file of discussionFiles) {
    if (!file.endsWith('.md') || file === 'README.md') continue;
    
    const proposalId = extractProposalId(file);
    
    if (reviewedProposals.has(proposalId)) {
      excludedReasons.set(proposalId, 'Already reviewed');
      continue;
    }
    
    const proposal = await parseProposalFile(file);
    if (validateProposal(proposal)) {
      newProposals.push(proposal);
    } else {
      excludedReasons.set(proposalId, 'Invalid format');
    }
  }
  
  return {
    newProposals,
    totalScanned: discussionFiles.length,
    excludedReasons
  };
}
```

## Workflow 2: Automated Voting Process

### Trigger
- User executes command: `CMMV-Hive: Start Automated Voting`
- Selection of minute ID from available minutes

### Process Flow

```
START
  │
  ├─ Validate Voting Prerequisites
  │  ├─ Verify minute exists and has proposals
  │  ├─ Check voting not already in progress
  │  ├─ Validate all required files present
  │  └─ Confirm General models availability
  │
  ├─ Initialize Voting Session
  │  ├─ Execute `vote_collector.sh start-collection [minute_id]`
  │  ├─ Create session tracking file
  │  ├─ Send notification: vote-start
  │  └─ Display progress UI panel
  │
  ├─ For Each General Model:
  │  │
  │  ├─ Model Availability Check
  │  │  ├─ Verify model is online and responsive
  │  │  ├─ Check model hasn't already voted
  │  │  └─ Validate model permissions
  │  │
  │  ├─ Context Preparation
  │  │  ├─ Open new chat session with model
  │  │  ├─ Load and attach relevant files:
  │  │  │  ├─ @summary.md
  │  │  │  ├─ @proposals.json
  │  │  │  ├─ @INSTRUCTIONS.md
  │  │  │  └─ Referenced discussion files
  │  │  └─ Generate voting prompt
  │  │
  │  ├─ Vote Collection
  │  │  ├─ Submit voting prompt to model
  │  │  ├─ Wait for response (with timeout)
  │  │  ├─ Parse JSON vote from response
  │  │  ├─ Validate vote structure and values
  │  │  └─ Handle any errors or retries
  │  │
  │  ├─ Vote Processing
  │  │  ├─ Save vote to `votes/[model].json`
  │  │  ├─ Calculate vote file hash (SHA-256)
  │  │  ├─ Execute `voting_chain.sh add-vote`
  │  │  ├─ Update progress UI
  │  │  └─ Send notification: vote-received
  │  │
  │  └─ Continue to Next Model
  │
  ├─ Voting Completion Check
  │  ├─ Verify all General models have voted
  │  ├─ Validate voting chain integrity
  │  └─ Calculate preliminary results
  │
  ├─ Reporter Selection and Finalization
  │  ├─ Randomly select reporter from voters
  │  ├─ Generate aggregated results
  │  ├─ Execute `voting_chain.sh finalize`
  │  ├─ Create final report
  │  └─ Send notification: vote-finalized
  │
  └─ Post-Voting Processing
     ├─ Identify approved proposals (score > 80%)
     ├─ Create BIPs for approved proposals
     ├─ Update rejected proposal tracking
     ├─ Generate completion summary
     └─ Offer next action options
END
```

### Implementation Details

#### Model Invocation Process
```typescript
async function invokeModelForVoting(
  modelId: string,
  context: VotingContext
): Promise<Vote> {
  
  // Switch to specific model
  await cursorAPI.switchToModel(modelId);
  
  // Prepare context files
  const contextFiles = [
    `minutes/${context.minuteId}/summary.md`,
    `minutes/${context.minuteId}/proposals.json`,
    `minutes/${context.minuteId}/INSTRUCTIONS.md`
  ];
  
  // Build comprehensive prompt
  const prompt = `
# CMMV-Hive Governance Voting - Minute ${context.minuteId}

You are participating as **${modelId}** in the automated governance voting process.

## Context Files (Please review all):
${contextFiles.map(file => `@${file}`).join('\n')}

## Your Voting Task:
1. Review all proposals in the summary
2. Consider technical merit, feasibility, and project alignment
3. Assign weights 1-10 for each proposal (10 = highest priority)
4. Provide your vote in the exact JSON format specified in INSTRUCTIONS.md

## Response Requirements:
- Use the exact JSON format from INSTRUCTIONS.md
- Include all proposals listed in proposals.json
- Ensure weights are integers from 1-10
- Add optional comments for high-impact decisions

Please provide your vote now:
  `;
  
  // Submit prompt and collect response
  const response = await cursorAPI.submitPromptWithFiles(prompt, contextFiles);
  
  // Parse and validate vote
  const vote = parseVoteFromResponse(modelId, response);
  validateVoteCompleteness(vote, context.proposals);
  
  return vote;
}
```

## Workflow 3: BIP Creation and Management

### Trigger
- Automatic: After voting completion for approved proposals
- Manual: User executes command: `CMMV-Hive: Manage BIP`

### Process Flow

```
START
  │
  ├─ Analyze Voting Results
  │  ├─ Load completed minute results
  │  ├─ Filter proposals by score threshold (>80%)
  │  ├─ Sort approved proposals by priority
  │  └─ Check for existing BIPs from proposals
  │
  ├─ For Each Approved Proposal:
  │  │
  │  ├─ BIP Creation
  │  │  ├─ Generate next BIP number (BIP-XX)
  │  │  ├─ Execute `create_bip.sh "[proposal_title]"`
  │  │  ├─ Create BIP directory structure
  │  │  ├─ Populate template with proposal data
  │  │  └─ Set initial status as "draft"
  │  │
  │  ├─ Implementation Assignment
  │  │  ├─ Determine assignment method:
  │  │  │  ├─ Automatic: Based on proposal author
  │  │  │  ├─ Lottery: Random selection from Generals
  │  │  │  └─ Manual: User selection
  │  │  ├─ Create implementation branch
  │  │  ├─ Assign implementer to BIP
  │  │  └─ Notify implementer of assignment
  │  │
  │  └─ Track BIP Status
  │     ├─ Create BIP tracking record
  │     ├─ Set implementation timeline
  │     ├─ Add to active BIPs list
  │     └─ Schedule progress check reminders
  │
  ├─ Handle Rejected Proposals
  │  ├─ Increment recall counter
  │  ├─ Check if reached 3 rejections
  │  ├─ Move to "rejected" status if limit reached
  │  └─ Keep available for future recall if under limit
  │
  └─ Update Governance Dashboard
     ├─ Refresh BIP status display
     ├─ Update implementation progress
     ├─ Show pending assignments
     └─ Display next action recommendations
END
```

### BIP Assignment Strategies

#### 1. Author-Based Assignment
```typescript
function assignByAuthor(proposal: Proposal): string {
  // Assign to the original proposal author if they're a General
  const author = proposal.author;
  const generals = getGeneralModels();
  
  if (generals.some(g => g.id === author)) {
    return author;
  }
  
  // Fallback to lottery if author not available
  return assignByLottery(proposal);
}
```

#### 2. Lottery-Based Assignment
```typescript
function assignByLottery(proposal: Proposal): string {
  const generals = getGeneralModels().filter(g => g.status === 'active');
  const seed = createSeed(proposal.id, proposal.minute_id);
  const index = seed % generals.length;
  
  return generals[index].id;
}
```

#### 3. Specialization-Based Assignment
```typescript
function assignBySpecialization(proposal: Proposal): string {
  const proposalTags = extractTechnicalTags(proposal);
  const generals = getGeneralModels();
  
  // Score each general based on specialization match
  const scores = generals.map(general => ({
    model: general,
    score: calculateSpecializationScore(general, proposalTags)
  }));
  
  // Select highest scoring available general
  return scores
    .filter(s => s.model.status === 'active')
    .sort((a, b) => b.score - a.score)[0]
    .model.id;
}
```

## Workflow 4: BIP Review Process

### Trigger
- Automatic: When BIP implementation is marked complete
- Manual: User executes command: `CMMV-Hive: Review BIP`

### Process Flow

```
START
  │
  ├─ Validate Review Prerequisites
  │  ├─ Verify BIP exists and is ready for review
  │  ├─ Check implementation completion status
  │  ├─ Validate all required files present
  │  └─ Confirm no active review in progress
  │
  ├─ Initialize Review Session
  │  ├─ Create review session metadata
  │  ├─ Identify all General models as reviewers
  │  ├─ Set 80% approval threshold
  │  └─ Generate review timeline
  │
  ├─ For Each Reviewer Model:
  │  │
  │  ├─ Review Context Preparation
  │  │  ├─ Open new chat session with model
  │  │  ├─ Load and attach BIP files:
  │  │  │  ├─ @BIP-XX.md (main specification)
  │  │  │  ├─ @implementation-plan.md
  │  │  │  ├─ @REVIEW_REPORT.md (if exists)
  │  │  │  └─ Implementation files
  │  │  └─ Generate review prompt
  │  │
  │  ├─ Review Collection
  │  │  ├─ Submit review prompt to model
  │  │  ├─ Wait for comprehensive review response
  │  │  ├─ Parse approval/rejection decision
  │  │  ├─ Extract specific feedback and suggestions
  │  │  └─ Validate review completeness
  │  │
  │  ├─ Review Processing
  │  │  ├─ Save review to `reviews/[model].md`
  │  │  ├─ Record approval/rejection vote
  │  │  ├─ Update review progress
  │  │  └─ Continue to next reviewer
  │  │
  │  └─ Handle Review Errors
  │     ├─ Retry failed reviews (max 3 attempts)
  │     ├─ Log detailed error information
  │     └─ Continue with other reviewers
  │
  ├─ Review Completion Analysis
  │  ├─ Calculate approval percentage
  │  ├─ Check against 80% threshold
  │  ├─ Compile all feedback and suggestions
  │  └─ Determine final review outcome
  │
  ├─ Handle Review Outcome:
  │  │
  │  ├─ If APPROVED (≥80% approval):
  │  │  ├─ Update BIP status to "approved"
  │  │  ├─ Prepare for branch merge
  │  │  ├─ Generate approval report
  │  │  └─ Notify implementer and stakeholders
  │  │
  │  └─ If REJECTED (<80% approval):
  │     ├─ Update BIP status to "revision-required"
  │     ├─ Compile detailed feedback report
  │     ├─ Notify implementer with suggestions
  │     ├─ Schedule revision review cycle
  │     └─ Track revision attempts
  │
  └─ Update Governance Records
     ├─ Record review session results
     ├─ Update BIP tracking status
     ├─ Refresh dashboard displays
     └─ Generate next action recommendations
END
```

### Review Prompt Template

```typescript
const reviewPromptTemplate = `
# BIP Review Request - ${bipId}

You are conducting a comprehensive technical review of this BIP as part of the CMMV-Hive governance process.

## BIP Files to Review:
${bipFiles.map(file => `@${file}`).join('\n')}

## Review Criteria:
1. **Technical Accuracy**: Are the specifications technically sound?
2. **Implementation Quality**: Is the implementation complete and well-structured?
3. **Documentation Completeness**: Are all sections properly documented?
4. **Backward Compatibility**: Are compatibility concerns properly addressed?
5. **Security Considerations**: Are security implications adequately covered?
6. **Testing Coverage**: Is the testing approach comprehensive?

## Required Response Format:
Please provide your review in the following structure:

\`\`\`markdown
# BIP Review - ${bipId}

## Reviewer: [Your Model ID]
## Date: [Current Date]

## Overall Decision: APPROVE | REJECT

## Technical Assessment:
[Detailed technical analysis]

## Implementation Quality:
[Assessment of implementation completeness and quality]

## Documentation Review:
[Evaluation of documentation completeness and clarity]

## Security Analysis:
[Security considerations and potential risks]

## Specific Issues Found:
[List any specific problems or concerns]

## Recommendations:
[Suggestions for improvement if rejecting, or commendations if approving]

## Score: [1-10]
\`\`\`

Please conduct a thorough review and provide your detailed assessment.
`;
```

## Workflow 5: Branch Management and Merge

### Trigger
- Automatic: When BIP receives 80% approval
- Manual: User executes command: `CMMV-Hive: Manage Branches`

### Process Flow

```
START
  │
  ├─ Validate Merge Prerequisites
  │  ├─ Verify BIP has 80% approval
  │  ├─ Check branch exists and is current
  │  ├─ Validate no merge conflicts exist
  │  ├─ Confirm all implementation files present
  │  └─ Check branch protection rules
  │
  ├─ Pre-PR Quality Gate (Mandatory)
  │  ├─ Generate and validate implementation documentation (README/ADRs)
  │  ├─ Ensure unit/integration tests with target coverage
  │  ├─ Run lint/format with zero errors
  │  ├─ Verify best practices (design, errors, logging, performance)
  │  └─ Revalidation by Generals (>= 80% focused on quality)
  │
  ├─ Pre-Merge Validation
  │  ├─ Run automated tests on branch
  │  ├─ Execute BIP validation scripts
  │  ├─ Verify voting chain integrity
  │  ├─ Check file format compliance
  │  └─ Validate all links and references
  │
  ├─ Merge Preparation
  │  ├─ Update branch with latest main
  │  ├─ Resolve any conflicts automatically
  │  ├─ Generate merge commit message
  │  ├─ Create merge metadata record
  │  └─ Backup current state
  │
  ├─ Execute Merge
  │  ├─ Switch to main branch
  │  ├─ Merge BIP branch (--no-ff)
  │  ├─ Tag merge with BIP version
  │  ├─ Push to remote repository
  │  └─ Verify merge success
  │
  ├─ Post-Merge Processing
  │  ├─ Update BIP status to "implemented"
  │  ├─ Archive implementation branch
  │  ├─ Update governance records
  │  ├─ Generate implementation report
  │  └─ Notify all stakeholders
  │
  ├─ Cleanup Operations
  │  ├─ Remove temporary files
  │  ├─ Update branch tracking
  │  ├─ Clean up review sessions
  │  └─ Archive completed workflows
  │
  └─ Update Dashboard and Notifications
     ├─ Refresh governance dashboard
     ├─ Update implementation metrics
     ├─ Send completion notifications
     └─ Generate success report
END
```

### Automated Merge Validation

```typescript
interface MergeValidation {
  bipId: string;
  approvalScore: number;
  conflicts: string[];
  testResults: TestResult[];
  validationErrors: string[];
  canMerge: boolean;
}

async function validateMergeEligibility(bipId: string): Promise<MergeValidation> {
  const validation: MergeValidation = {
    bipId,
    approvalScore: 0,
    conflicts: [],
    testResults: [],
    validationErrors: [],
    canMerge: false
  };
  
  // Check approval score
  const reviewResults = await loadBIPReviewResults(bipId);
  validation.approvalScore = calculateApprovalPercentage(reviewResults);
  
  if (validation.approvalScore < 80) {
    validation.validationErrors.push('Insufficient approval score');
  }
  
  // Check for merge conflicts
  validation.conflicts = await checkMergeConflicts(bipId);
  
  // Run automated tests
  validation.testResults = await runBIPTests(bipId);
  
  // Validate BIP structure
  const structureErrors = await validateBIPStructure(bipId);
  validation.validationErrors.push(...structureErrors);
  
  // Determine merge eligibility
  validation.canMerge = validation.approvalScore >= 80 &&
                       validation.conflicts.length === 0 &&
                       validation.validationErrors.length === 0 &&
                       validation.testResults.every(t => t.passed);
  
  return validation;
}
```

## Error Handling and Recovery

### Common Error Scenarios

#### 1. Model Unavailability
```typescript
async function handleModelUnavailable(modelId: string, operation: string): Promise<void> {
  // Log the error
  logger.error(`Model ${modelId} unavailable for ${operation}`);
  
  // Notify user
  vscode.window.showWarningMessage(
    `Model ${modelId} is currently unavailable. Continuing with other models.`
  );
  
  // Update operation status
  await updateOperationStatus(operation, modelId, 'failed');
  
  // Continue with next model if applicable
  if (operation === 'voting') {
    await continueVotingWithRemainingModels();
  }
}
```

#### 2. Invalid Response Format
```typescript
async function handleInvalidResponse(
  modelId: string, 
  response: string, 
  expectedFormat: string
): Promise<void> {
  // Log detailed error
  logger.error(`Invalid response from ${modelId}`, {
    response: response.substring(0, 500),
    expectedFormat
  });
  
  // Attempt to parse with fallback methods
  const parsed = await attemptResponseRecovery(response, expectedFormat);
  
  if (!parsed) {
    // Request retry from user
    const retry = await vscode.window.showErrorMessage(
      `Invalid response from ${modelId}. Retry?`,
      'Retry', 'Skip', 'Manual Entry'
    );
    
    if (retry === 'Retry') {
      await retryModelOperation(modelId);
    } else if (retry === 'Manual Entry') {
      await openManualEntryDialog(modelId, expectedFormat);
    }
  }
}
```

#### 3. Git Operation Failures
```typescript
async function handleGitFailure(operation: string, error: Error): Promise<void> {
  logger.error(`Git operation failed: ${operation}`, error);
  
  // Attempt automatic recovery
  const recovered = await attemptGitRecovery(operation, error);
  
  if (!recovered) {
    // Show detailed error to user
    vscode.window.showErrorMessage(
      `Git operation failed: ${operation}\n\nError: ${error.message}\n\nPlease resolve manually.`,
      'Open Terminal', 'View Logs'
    );
  }
}
```

## Performance Optimization

### Parallel Processing
- Concurrent model invocations where possible
- Asynchronous file operations
- Background validation processes
- Streaming progress updates

### Caching Strategies
- Model configuration caching
- Previous voting results caching
- BIP metadata caching
- Git status caching

### Resource Management
- Connection pooling for model APIs
- Memory management for large files
- Timeout handling for long operations
- Cleanup of temporary resources

These workflows provide comprehensive automation for all aspects of the CMMV-Hive governance process while maintaining quality, security, and reliability standards.
