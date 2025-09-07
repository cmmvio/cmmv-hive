#!/usr/bin/env python3
"""
MCP Cursor Voting Orchestrator
Automates voting collection from multiple models via Cursor integration

Usage:
    python cursor_voting_orchestrator.py --proposal <file> --models <group>

Author: Claude Code Assistant
Date: 2024-12-21
"""

import argparse
import asyncio
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any
import yaml

class CursorVotingOrchestrator:
    """Main orchestrator for automated voting via Cursor MCP"""

    def __init__(self, config_path: str = ".cursor/mcp_config.json"):
        self.config = self.load_config(config_path)
        self.models = self.load_model_inventory()
        self.results = []

    def load_config(self, config_path: str) -> Dict[str, Any]:
        """Load MCP configuration"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return self.create_default_config(config_path)

    def create_default_config(self, config_path: str) -> Dict[str, Any]:
        """Create default MCP configuration"""
        default_config = {
            "mcp_server": {
                "name": "cursor-voting-orchestrator",
                "version": "1.0.0",
                "commands": {
                    "vote": "cursor-vote",
                    "analyze": "cursor-analyze",
                    "models": "cursor-models"
                }
            },
            "models": {
                "timeout": 300,  # 5 minutes
                "max_concurrent": 5,
                "retry_attempts": 3
            },
            "output": {
                "format": "markdown",
                "directory": "voting_results"
            }
        }

        # Ensure directory exists
        Path(config_path).parent.mkdir(parents=True, exist_ok=True)

        with open(config_path, 'w') as f:
            json.dump(default_config, f, indent=2)

        return default_config

    def load_model_inventory(self) -> Dict[str, Any]:
        """Load model inventory from YAML"""
        inventory_path = "scripts/mcp/cursor_model_inventory.yml"

        if not os.path.exists(inventory_path):
            self.create_default_inventory(inventory_path)

        try:
            with open(inventory_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f"Error loading model inventory: {e}")
            return {}

    def create_default_inventory(self, inventory_path: str) -> None:
        """Create default model inventory"""
        default_inventory = {
            "models": {
                "cursor_available": {
                    "claude-3-5-sonnet": {
                        "name": "Claude 3.5 Sonnet",
                        "provider": "Anthropic",
                        "type": "general",
                        "capabilities": ["voting", "analysis", "code_review"]
                    },
                    "claude-3-5-haiku": {
                        "name": "Claude 3.5 Haiku",
                        "provider": "Anthropic",
                        "type": "collaborator",
                        "capabilities": ["voting", "quick_analysis"]
                    },
                    "gpt-4o": {
                        "name": "GPT-4o",
                        "provider": "OpenAI",
                        "type": "general",
                        "capabilities": ["voting", "analysis", "consensus"]
                    },
                    "gpt-4o-mini": {
                        "name": "GPT-4o-mini",
                        "provider": "OpenAI",
                        "type": "collaborator",
                        "capabilities": ["voting", "rationale"]
                    }
                },
                "manual_required": {
                    "grok-3": {
                        "name": "Grok-3",
                        "provider": "xAI",
                        "type": "general",
                        "capabilities": ["voting", "adaptive_learning"],
                        "notes": "Requires manual execution"
                    },
                    "deepseek-v3": {
                        "name": "DeepSeek-V3",
                        "provider": "DeepSeek",
                        "type": "general",
                        "capabilities": ["voting", "reasoning"],
                        "notes": "Requires manual execution"
                    }
                }
            },
            "groups": {
                "all": ["cursor_available", "manual_required"],
                "generals": ["claude-3-5-sonnet", "gpt-4o", "grok-3", "deepseek-v3"],
                "collaborators": ["claude-3-5-haiku", "gpt-4o-mini"],
                "cursor_only": ["cursor_available"]
            }
        }

        # Ensure directory exists
        Path(inventory_path).parent.mkdir(parents=True, exist_ok=True)

        with open(inventory_path, 'w') as f:
            yaml.dump(default_inventory, f, default_flow_style=False, indent=2)

    async def orchestrate_vote(self, proposal_file: str, model_group: str) -> Dict[str, Any]:
        """Main voting orchestration method"""
        print(f"🚀 Starting automated voting for: {proposal_file}")
        print(f"🎯 Target models: {model_group}")

        # Load proposal content
        proposal_content = self.load_proposal(proposal_file)
        if not proposal_content:
            return {"error": f"Could not load proposal: {proposal_file}"}

        # Get target models
        target_models = self.get_target_models(model_group)
        if not target_models:
            return {"error": f"No models found for group: {model_group}"}

        print(f"📋 Found {len(target_models)} target models")

        # Execute voting in parallel
        results = await self.execute_parallel_voting(proposal_content, target_models)

        # Generate report
        report = self.generate_voting_report(proposal_file, results)

        return {
            "proposal": proposal_file,
            "model_group": model_group,
            "total_models": len(target_models),
            "completed_votes": len([r for r in results if r.get("status") == "completed"]),
            "results": results,
            "report": report,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    def load_proposal(self, proposal_file: str) -> Optional[str]:
        """Load proposal content"""
        try:
            with open(proposal_file, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"Error loading proposal: {e}")
            return None

    def get_target_models(self, model_group: str) -> List[str]:
        """Get list of target models for voting"""
        if model_group == "all":
            cursor_models = list(self.models.get("models", {}).get("cursor_available", {}).keys())
            manual_models = list(self.models.get("models", {}).get("manual_required", {}).keys())
            return cursor_models + manual_models

        groups = self.models.get("groups", {})
        if model_group in groups:
            return groups[model_group]

        # Check if it's a specific model
        all_models = []
        for category in ["cursor_available", "manual_required"]:
            all_models.extend(list(self.models.get("models", {}).get(category, {}).keys()))

        if model_group in all_models:
            return [model_group]

        return []

    async def execute_parallel_voting(self, proposal_content: str, target_models: List[str]) -> List[Dict[str, Any]]:
        """Execute voting in parallel across models"""
        semaphore = asyncio.Semaphore(self.config.get("models", {}).get("max_concurrent", 5))
        timeout = self.config.get("models", {}).get("timeout", 300)

        async def vote_with_model(model_id: str) -> Dict[str, Any]:
            async with semaphore:
                return await self.collect_model_vote(model_id, proposal_content, timeout)

        tasks = [vote_with_model(model) for model in target_models]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Process results
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    "model": target_models[i],
                    "status": "error",
                    "error": str(result),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
            else:
                processed_results.append(result)

        return processed_results

    async def collect_model_vote(self, model_id: str, proposal_content: str, timeout: int) -> Dict[str, Any]:
        """Collect vote from a specific model"""
        start_time = time.time()

        try:
            # Check if model is available in Cursor
            model_info = self.get_model_info(model_id)
            if not model_info:
                return {
                    "model": model_id,
                    "status": "error",
                    "error": "Model not found in inventory",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }

            # Determine if manual or automated
            if model_info.get("notes") == "Requires manual execution":
                return {
                    "model": model_id,
                    "status": "manual_required",
                    "message": f"Manual voting required for {model_id}",
                    "instructions": self.generate_manual_instructions(model_id, proposal_content),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }

            # Automated voting via Cursor
            vote_result = await self.execute_cursor_vote(model_id, proposal_content, timeout)

            return {
                "model": model_id,
                "status": "completed",
                "vote": vote_result.get("vote"),
                "rationale": vote_result.get("rationale"),
                "confidence": vote_result.get("confidence", 0.0),
                "processing_time": time.time() - start_time,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        except Exception as e:
            return {
                "model": model_id,
                "status": "error",
                "error": str(e),
                "processing_time": time.time() - start_time,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

    def get_model_info(self, model_id: str) -> Optional[Dict[str, Any]]:
        """Get model information from inventory"""
        for category in ["cursor_available", "manual_required"]:
            models = self.models.get("models", {}).get(category, {})
            if model_id in models:
                return models[model_id]
        return None

    async def execute_cursor_vote(self, model_id: str, proposal_content: str, timeout: int) -> Dict[str, Any]:
        """Execute automated vote via Cursor"""
        # This would integrate with Cursor's MCP to switch models and collect responses
        # For now, return a mock response structure

        # In real implementation, this would:
        # 1. Switch to the target model in Cursor
        # 2. Send the voting prompt
        # 3. Collect the response
        # 4. Parse the vote and rationale

        return {
            "vote": "YES",  # Would be parsed from model response
            "rationale": f"Analysis completed by {model_id}",
            "confidence": 0.85,
            "raw_response": "Mock response - would contain actual model output"
        }

    def generate_manual_instructions(self, model_id: str, proposal_content: str) -> str:
        """Generate instructions for manual voting"""
        return f"""
Manual Voting Required for {model_id}:

1. Copy the proposal content below
2. Switch to {model_id} in your chat interface
3. Send the following prompt:

---
VOTING REQUEST:

Please analyze this proposal and provide your vote (YES/NO) with rationale:

{proposal_content[:500]}...

[Full proposal content truncated for brevity]

Please respond in this format:
## 🤖 Vote: [YES/NO]

**Model**: {model_id}
**Rationale**: [Your detailed reasoning]
**Confidence**: [0.0-1.0]
---

4. Copy the model's response back to the orchestrator
        """

    def generate_voting_report(self, proposal_file: str, results: List[Dict[str, Any]]) -> str:
        """Generate comprehensive voting report"""
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        report = f"""# 🗳️ Automated Voting Report
**Proposal**: {proposal_file}
**Generated**: {timestamp}

## 📊 Summary
- **Total Models**: {len(results)}
- **Completed Votes**: {len([r for r in results if r.get('status') == 'completed'])}
- **Manual Required**: {len([r for r in results if r.get('status') == 'manual_required'])}
- **Errors**: {len([r for r in results if r.get('status') == 'error'])}

## 📋 Detailed Results

"""

        for result in results:
            report += f"### 🤖 {result['model']}\n"
            report += f"**Status**: {result['status']}\n"

            if result['status'] == 'completed':
                report += f"**Vote**: {result.get('vote', 'N/A')}\n"
                report += f"**Confidence**: {result.get('confidence', 0.0)}\n"
                report += f"**Processing Time**: {result.get('processing_time', 0):.2f}s\n"
                if result.get('rationale'):
                    report += f"**Rationale**: {result['rationale'][:200]}...\n"

            elif result['status'] == 'manual_required':
                report += "**Instructions**: Manual execution required\n"

            elif result['status'] == 'error':
                report += f"**Error**: {result.get('error', 'Unknown error')}\n"

            report += "\n---\n\n"

        return report

    def save_report(self, report: str, proposal_file: str) -> str:
        """Save voting report to file"""
        output_dir = self.config.get("output", {}).get("directory", "voting_results")
        Path(output_dir).mkdir(exist_ok=True)

        proposal_name = Path(proposal_file).stem
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        report_file = f"{output_dir}/{proposal_name}_voting_report_{timestamp}.md"

        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)

        return report_file


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="MCP Cursor Voting Orchestrator")
    parser.add_argument("--proposal", "-p", required=True, help="Proposal file path")
    parser.add_argument("--models", "-m", default="all", help="Model group (all, generals, collaborators, cursor_only)")
    parser.add_argument("--output", "-o", help="Output report file path")

    args = parser.parse_args()

    # Initialize orchestrator
    orchestrator = CursorVotingOrchestrator()

    # Execute voting
    result = await orchestrator.orchestrate_vote(args.proposal, args.models)

    if "error" in result:
        print(f"❌ Error: {result['error']}")
        sys.exit(1)

    # Generate and save report
    report = result["report"]
    report_file = orchestrator.save_report(report, args.proposal)

    print(f"✅ Voting completed successfully!")
    print(f"📄 Report saved: {report_file}")
    print(f"📊 Summary: {result['completed_votes']}/{result['total_models']} votes collected")


if __name__ == "__main__":
    asyncio.run(main())
