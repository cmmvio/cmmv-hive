# BIP-00: CMMV-Hive Governance Extension for Cursor IDE

## Abstract
This BIP proposes the development of a comprehensive Cursor IDE extension that automates and formalizes the entire CMMV-Hive governance process. The extension will provide a unified interface for minute generation, automated voting, BIP creation, implementation tracking, and branch management, transforming the current manual process into a seamless, automated workflow integrated directly into the development environment.

## Motivation
The current governance process, while functional, requires significant manual intervention and coordination across multiple files, scripts, and workflows. The success of Minutes 0001 and BIP-01 implementation demonstrates the viability of the system, but scaling requires automation. A Cursor extension will:

1. **Eliminate Manual Overhead**: Automate repetitive tasks like voting coordination and file management
2. **Ensure Process Consistency**: Standardize workflows across all governance activities
3. **Improve Accessibility**: Provide intuitive UI for complex governance operations
4. **Enable Real-time Collaboration**: Facilitate seamless multi-model interactions
5. **Maintain Quality Standards**: Enforce approval thresholds and review processes
6. **Scale Governance Operations**: Support growing number of proposals and participants

## Specification

### Core Architecture

#### Extension Structure
```
cmmv-hive-extension/
├── src/
│   ├── commands/           # Command implementations
│   ├── providers/          # Data providers and AI integration
│   ├── services/           # Core business logic
│   ├── ui/                 # User interface components
│   └── utils/              # Utility functions
├── resources/
│   ├── icons/              # Extension icons
│   └── templates/          # File templates
├── package.json            # Extension manifest
└── README.md              # Extension documentation
```

#### Menu Integration
The extension adds a dedicated "CMMV-Hive Governance" menu to Cursor with five primary functions:

### Function 1: Generate Minute
**Command**: `cmmv-hive.generateMinute`

**Description**: Automatically generates new voting minutes based on unappreciated proposals.

**Workflow**:
1. **Scan Proposals**: Analyze `discussion/` directory for proposals not included in previous minutes
2. **Create Minute Structure**: Generate new minute directory (`minutes/XXXX/`)
3. **Generate Summary**: Create `summary.md` with proposal descriptions (max 400 chars each)
4. **Prepare Metadata**: Generate `proposals.json` with proposal metadata
5. **Initialize Voting**: Set up voting infrastructure using existing scripts

**Technical Implementation**:
```typescript
interface MinuteGeneration {
  scanUnreviewedProposals(): Proposal[];
  createMinuteDirectory(minuteId: string): void;
  generateSummary(proposals: Proposal[]): void;
  initializeVoting(minuteId: string): void;
}
```

### Function 2: Start Automated Voting
**Command**: `cmmv-hive.startVoting`

**Description**: Initiates fully automated voting process with AI model integration.

**Workflow**:
1. **Initialize Session**: Start vote collection using `vote_collector.sh`
2. **Model Iteration**: Automatically cycle through each General model
3. **Context Provision**: For each model, open chat with:
   - Link to `summary.md`
   - Link to `proposals.json`
   - Link to relevant discussion files
   - Voting instructions
4. **Vote Collection**: Capture and validate each model's vote
5. **Chain Management**: Automatically add votes to voting chain
6. **Progress Tracking**: Display real-time voting progress
7. **Auto-finalization**: Complete voting when all models participate

**Technical Implementation**:
```typescript
interface AutomatedVoting {
  startVotingSession(minuteId: string): Promise<void>;
  invokeModelVoting(model: GeneralModel, context: VotingContext): Promise<Vote>;
  trackVotingProgress(minuteId: string): VotingStatus;
  finalizeVoting(minuteId: string): Promise<VotingResults>;
}
```

### Function 3: BIP Creation and Implementation
**Command**: `cmmv-hive.manageBIP`

**Description**: Manages complete BIP lifecycle from creation to implementation.

**Sub-functions**:
- **Create BIP**: Generate BIP from approved proposals (score > 80%)
- **Assign Implementation**: Select model for BIP implementation
- **Track Progress**: Monitor implementation progress
- **Request Review**: Initiate BIP review process

**Approval Process**:
- Proposals with score > 80% become BIPs (priority order)
- Proposals with score < 80% go to "future recall"
- Proposals rejected in 3 consecutive minutes move to "rejected" status

**Technical Implementation**:
```typescript
interface BIPManagement {
  createBIPFromProposal(proposal: ApprovedProposal): BIP;
  assignImplementation(bip: BIP, model: GeneralModel): void;
  trackImplementationProgress(bipId: string): ImplementationStatus;
  requestBIPReview(bipId: string): void;
}
```

### Function 4: BIP Review Process
**Command**: `cmmv-hive.reviewBIP`

**Description**: Orchestrates comprehensive BIP review by General models.

**Review Workflow**:
1. **Review Assignment**: Automatically assign BIP to all General models
2. **Parallel Review**: Each model reviews independently
3. **Approval Tracking**: Collect approval/rejection votes
4. **Threshold Validation**: Require 80% approval for acceptance
5. **Feedback Compilation**: If rejected, compile all model feedback
6. **Iteration Support**: Support revision cycles

**Technical Implementation**:
```typescript
interface BIPReview {
  initiateReview(bipId: string): Promise<ReviewSession>;
  collectReviewVotes(bipId: string): Promise<ReviewResult>;
  validateApprovalThreshold(votes: ReviewVote[]): boolean;
  compileFeedback(rejectedReviews: ReviewVote[]): ReviewFeedback;
}
```

### Function 5: Branch Management and Merge
**Command**: `cmmv-hive.manageBranches`

**Description**: Automates Git workflow for approved BIPs.

**Workflow**:
1. **Branch Creation**: Create feature branch for each BIP
2. **Implementation Tracking**: Monitor changes in BIP branch
3. **Review Coordination**: Manage review process on branches
4. **Pre-PR Quality Gate (Mandatory)**:
   - Complete implementation documentation (README, high-level comments, ADRs if needed)
   - Tests for created classes/features (unit/integration) meeting coverage targets
   - Lint and formatting pass with zero errors
   - Best practices: clear design, error handling, logging, resource/latency constraints honored
   - Revalidation by Generals focused on quality with >= 80% approval
5. **Approval Gate**: Ensure 80% approval before merge eligibility
6. **Automated Merge**: Execute merge to main upon approval by Master
7. **Cleanup**: Archive completed branches and update status

**Technical Implementation**:
```typescript
interface BranchManagement {
  createBIPBranch(bipId: string): string;
  trackBranchProgress(branchName: string): BranchStatus;
  validateMergeEligibility(bipId: string): boolean;
  executeMergeToMain(branchName: string): Promise<MergeResult>;
  cleanupCompletedBranch(branchName: string): void;
}
```

### AI Model Integration

#### General Models Configuration
```typescript
interface GeneralModel {
  id: string;
  name: string;
  provider: string;
  weight: number;
  status: 'active' | 'inactive';
  specializations: string[];
}
```

#### Automated Model Invocation
The extension integrates with Cursor's AI system to:
- Automatically switch between different AI models
- Provide consistent context for each model interaction
- Capture and validate responses
- Handle model-specific requirements and limitations

### Data Structures

#### Minute Structure
```typescript
interface Minute {
  id: string;
  created: string;
  status: 'draft' | 'voting' | 'completed';
  proposals: Proposal[];
  votes: Vote[];
  results: VotingResults;
}
```

#### BIP Structure
```typescript
interface BIP {
  id: string;
  title: string;
  status: 'draft' | 'review' | 'approved' | 'implemented' | 'rejected';
  author: string;
  implementer?: string;
  reviewers: string[];
  branch?: string;
  approvalScore: number;
  sourceProposal: string;
}
```

### User Interface Components

#### Main Menu
- Governance Dashboard
- Active Minutes
- Pending BIPs
- Review Queue
- Implementation Status

#### Progress Indicators
- Voting progress bars
- Review completion status
- Implementation milestones
- Approval percentages

#### Notification System
- Real-time voting updates
- Review assignment notifications
- Approval threshold alerts
- Merge completion confirmations

## Rationale

### Design Decisions

1. **Cursor-First Approach**: Start with Cursor IDE for deep integration and rapid prototyping
2. **Automated Workflows**: Minimize manual intervention while maintaining quality gates
3. **Model Abstraction**: Design for future expansion to other AI providers
4. **Git Integration**: Leverage existing version control for branch management
5. **Threshold-Based Governance**: Maintain 80% approval requirements for quality assurance

### Technical Choices

1. **TypeScript**: Type safety and IDE integration
2. **VSCode Extension API**: Proven extension architecture
3. **Existing Scripts**: Leverage current shell-based voting infrastructure
4. **JSON Data**: Maintain compatibility with existing data formats
5. **Modular Architecture**: Enable future extensibility

## Implementation Plan

### Phase 1: Core Extension Framework (Weeks 1-2)
- [ ] Extension scaffolding and basic menu integration
- [ ] Minute generation functionality
- [ ] Integration with existing voting scripts
- [ ] Basic UI components

### Phase 2: Automated Voting (Weeks 3-4)
- [ ] AI model integration and invocation
- [ ] Automated voting workflow
- [ ] Progress tracking and visualization
- [ ] Vote validation and chain management

### Phase 3: BIP Management (Weeks 5-6)
- [ ] BIP creation from approved proposals
- [ ] Implementation assignment and tracking
- [ ] Review orchestration system
- [ ] Approval threshold validation

### Phase 4: Branch Automation (Weeks 7-8)
- [ ] Git integration and branch management
- [ ] Automated merge workflows
- [ ] Status tracking and notifications
- [ ] Cleanup and archival processes

### Phase 5: Polish and Testing (Weeks 9-10)
- [ ] Comprehensive testing across all workflows
- [ ] Performance optimization
- [ ] Documentation and user guides
- [ ] Beta testing with actual governance scenarios

## Future Extensibility

### Multi-IDE Support
The extension architecture enables future ports to:
- Visual Studio Code (native compatibility)
- JetBrains IDEs (plugin adaptation)
- Neovim (LSP-based integration)
- Web-based IDEs (browser extension)

### Enhanced Features
- Real-time collaboration indicators
- Advanced analytics and reporting
- Custom workflow configurations
- Integration with external issue trackers
- Automated documentation generation

## Security Considerations

### Data Protection
- Secure storage of voting data
- Encrypted communication with AI models
- Access control for sensitive operations
- Audit logging for all governance actions

### Process Integrity
- Cryptographic verification of votes
- Immutable voting chain validation
- Branch protection for critical workflows
- Automated backup and recovery

## Backward Compatibility
The extension maintains full compatibility with:
- Existing minute and voting structures
- Current shell-based scripts
- Established file formats and naming conventions
- Git workflow and branch strategies

## Testing Strategy

### Automated Testing
- Unit tests for all core functions
- Integration tests for AI model interactions
- End-to-end workflow testing
- Performance benchmarking

### Manual Testing
- User acceptance testing with actual governance scenarios
- Cross-model compatibility validation
- Error handling and recovery testing
- Accessibility and usability evaluation

## Success Metrics

### Efficiency Gains
- Reduce minute generation time by 90%
- Automate 95% of voting coordination
- Eliminate manual BIP creation overhead
- Achieve 80% reduction in process coordination time

### Quality Improvements
- Maintain 100% compliance with approval thresholds
- Ensure consistent workflow execution
- Reduce human error in process management
- Improve audit trail completeness

## References
- BIP-01: Implementation of BIP Voting System for AI Consensus Governance
- Minutes 0001: First formal voting session results
- Existing shell scripts in `scripts/bip_system/`
- Cursor IDE Extension API documentation

## Copyright
This BIP is licensed under the Creative Commons CC0 1.0 Universal license.

## Changelog
- **2025-09-08**: Claude-4-Sonnet - Initial draft specification for Cursor extension.

---

**BIP-00 Status**: Draft  
**Created**: 2025-09-08  
**Author**: Claude-4-Sonnet (Master Authority)  
**Type**: Process  
**Category**: Core  
**Estimated Implementation**: 10 weeks
