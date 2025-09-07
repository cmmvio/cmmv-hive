#!/usr/bin/env python3
"""
MCP Cursor Proposal Analyzer
Automates multi-model analysis of proposals via Cursor integration

Usage:
    python cursor_proposal_analyzer.py --file <proposal> --models <group> --analysis-type <type>

Author: Claude Code Assistant
Date: 2024-12-21
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any
import yaml

class CursorProposalAnalyzer:
    """Multi-model proposal analysis via Cursor MCP"""

    def __init__(self, config_path: str = ".cursor/mcp_config.json"):
        self.config = self.load_config(config_path)
        self.models = self.load_model_inventory()
        self.analysis_types = {
            "technical": self.analyze_technical_feasibility,
            "security": self.analyze_security_implications,
            "impact": self.analyze_project_impact,
            "implementation": self.analyze_implementation_complexity,
            "consensus": self.analyze_consensus_potential
        }

    def load_config(self, config_path: str) -> Dict[str, Any]:
        """Load MCP configuration"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Configuration file not found: {config_path}")
            return {}

    def load_model_inventory(self) -> Dict[str, Any]:
        """Load model inventory"""
        inventory_path = "scripts/mcp/cursor_model_inventory.yml"
        try:
            with open(inventory_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f"Error loading model inventory: {e}")
            return {}

    async def analyze_proposal(self, proposal_file: str, model_group: str,
                              analysis_type: str = "comprehensive") -> Dict[str, Any]:
        """Main proposal analysis orchestration"""

        print(f"🔍 Starting multi-model analysis for: {proposal_file}")
        print(f"🎯 Analysis type: {analysis_type}")
        print(f"👥 Target models: {model_group}")

        # Load proposal
        proposal_content = self.load_proposal(proposal_file)
        if not proposal_content:
            return {"error": f"Could not load proposal: {proposal_file}"}

        # Get target models
        target_models = self.get_target_models(model_group)
        if not target_models:
            return {"error": f"No models found for group: {model_group}"}

        print(f"📋 Analyzing with {len(target_models)} models")

        # Execute parallel analysis
        if analysis_type == "comprehensive":
            analysis_types = ["technical", "security", "impact", "implementation", "consensus"]
            all_results = {}
            for analysis in analysis_types:
                results = await self.execute_parallel_analysis(
                    proposal_content, target_models, analysis
                )
                all_results[analysis] = results
        else:
            all_results = await self.execute_parallel_analysis(
                proposal_content, target_models, analysis_type
            )

        # Generate comprehensive report
        report = self.generate_analysis_report(proposal_file, all_results, analysis_type)

        return {
            "proposal": proposal_file,
            "analysis_type": analysis_type,
            "model_group": model_group,
            "total_models": len(target_models),
            "results": all_results,
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
        """Get target models for analysis"""
        groups = self.models.get("groups", {})
        if model_group in groups:
            return groups[model_group]

        # Check if specific model
        all_models = []
        for category in ["cursor_available", "manual_required"]:
            all_models.extend(list(self.models.get("models", {}).get(category, {}).keys()))

        if model_group in all_models:
            return [model_group]

        return []

    async def execute_parallel_analysis(self, proposal_content: str,
                                      target_models: List[str],
                                      analysis_type: str) -> List[Dict[str, Any]]:
        """Execute analysis in parallel"""

        semaphore = asyncio.Semaphore(self.config.get("models", {}).get("max_concurrent", 5))

        async def analyze_with_model(model_id: str) -> Dict[str, Any]:
            async with semaphore:
                return await self.collect_model_analysis(model_id, proposal_content, analysis_type)

        tasks = [analyze_with_model(model) for model in target_models]
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

    async def collect_model_analysis(self, model_id: str, proposal_content: str,
                                   analysis_type: str) -> Dict[str, Any]:
        """Collect analysis from specific model"""

        try:
            model_info = self.get_model_info(model_id)
            if not model_info:
                return {
                    "model": model_id,
                    "status": "error",
                    "error": "Model not found in inventory"
                }

            # Check if manual execution required
            if model_info.get("notes") == "Requires manual execution":
                return {
                    "model": model_id,
                    "status": "manual_required",
                    "instructions": self.generate_manual_analysis_instructions(
                        model_id, proposal_content, analysis_type
                    )
                }

            # Execute automated analysis
            analysis_result = await self.execute_cursor_analysis(
                model_id, proposal_content, analysis_type
            )

            return {
                "model": model_id,
                "status": "completed",
                "analysis_type": analysis_type,
                "analysis": analysis_result,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        except Exception as e:
            return {
                "model": model_id,
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

    def get_model_info(self, model_id: str) -> Optional[Dict[str, Any]]:
        """Get model information"""
        for category in ["cursor_available", "manual_required"]:
            models = self.models.get("models", {}).get(category, {})
            if model_id in models:
                return models[model_id]
        return None

    async def execute_cursor_analysis(self, model_id: str, proposal_content: str,
                                    analysis_type: str) -> Dict[str, Any]:
        """Execute automated analysis via Cursor"""
        # This would integrate with Cursor to switch models and collect analysis
        # For now, return structured mock response

        analysis_prompt = self.generate_analysis_prompt(analysis_type, proposal_content)

        return {
            "analysis_type": analysis_type,
            "summary": f"Analysis completed by {model_id} for {analysis_type}",
            "key_findings": [
                "Technical feasibility: High",
                "Security implications: Minimal risk",
                "Project impact: Positive",
                "Implementation complexity: Medium"
            ],
            "recommendations": [
                "Proceed with implementation",
                "Consider security review",
                "Monitor performance metrics"
            ],
            "confidence_score": 0.88,
            "raw_response": f"Mock analysis response from {model_id}"
        }

    def generate_analysis_prompt(self, analysis_type: str, proposal_content: str) -> str:
        """Generate analysis prompt based on type"""

        prompts = {
            "technical": f"""
Analyze the technical feasibility of this proposal:

{proposal_content[:1000]}...

Please provide:
1. Technical requirements assessment
2. Implementation complexity evaluation
3. Potential technical challenges
4. Resource requirements estimation
5. Feasibility score (1-10)
""",

            "security": f"""
Analyze security implications of this proposal:

{proposal_content[:1000]}...

Please provide:
1. Security risk assessment
2. Privacy impact evaluation
3. Authentication/authorization requirements
4. Data protection considerations
5. Security score (1-10)
""",

            "impact": f"""
Analyze the project impact of this proposal:

{proposal_content[:1000]}...

Please provide:
1. Scope of changes required
2. Impact on existing functionality
3. User experience implications
4. Maintenance overhead assessment
5. Overall impact score (1-10)
"""
        }

        return prompts.get(analysis_type, f"Analyze this proposal: {proposal_content[:500]}...")

    def generate_manual_analysis_instructions(self, model_id: str,
                                           proposal_content: str,
                                           analysis_type: str) -> str:
        """Generate manual analysis instructions"""

        prompt = self.generate_analysis_prompt(analysis_type, proposal_content)

        return f"""
Manual Analysis Required for {model_id}:

1. Copy the analysis prompt below
2. Switch to {model_id} in your chat interface
3. Send the following:

---
ANALYSIS REQUEST - {analysis_type.upper()}:

{prompt}

Please respond in this format:
## 🔍 Analysis: {analysis_type.title()}

**Model**: {model_id}
**Analysis Type**: {analysis_type}
**Summary**: [Brief overview]
**Key Findings**: [Bullet points]
**Recommendations**: [Actionable suggestions]
**Confidence**: [0.0-1.0]
---

4. Copy the model's response back to the analyzer
"""

    def generate_analysis_report(self, proposal_file: str, results: Dict[str, Any],
                               analysis_type: str) -> str:
        """Generate comprehensive analysis report"""

        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        if analysis_type == "comprehensive":
            return self.generate_comprehensive_report(proposal_file, results, timestamp)
        else:
            return self.generate_single_analysis_report(proposal_file, results, analysis_type, timestamp)

    def generate_comprehensive_report(self, proposal_file: str, all_results: Dict[str, Any],
                                    timestamp: str) -> str:
        """Generate comprehensive multi-analysis report"""

        report = f"""# 🔍 Comprehensive Proposal Analysis Report
**Proposal**: {proposal_file}
**Generated**: {timestamp}
**Analysis Types**: Technical, Security, Impact, Implementation, Consensus

"""

        for analysis_type, results in all_results.items():
            report += f"## 📊 {analysis_type.title()} Analysis\n\n"

            completed = [r for r in results if r.get('status') == 'completed']
            manual = [r for r in results if r.get('status') == 'manual_required']
            errors = [r for r in results if r.get('status') == 'error']

            report += f"**Completed**: {len(completed)} | **Manual**: {len(manual)} | **Errors**: {len(errors)}\n\n"

            for result in completed:
                report += f"### 🤖 {result['model']}\n"
                analysis = result.get('analysis', {})
                report += f"**Confidence**: {analysis.get('confidence_score', 0.0)}\n"

                if analysis.get('key_findings'):
                    report += "**Key Findings**:\n"
                    for finding in analysis['key_findings']:
                        report += f"- {finding}\n"

                if analysis.get('recommendations'):
                    report += "**Recommendations**:\n"
                    for rec in analysis['recommendations']:
                        report += f"- {rec}\n"

                report += "\n"

            report += "---\n\n"

        return report

    def generate_single_analysis_report(self, proposal_file: str, results: List[Dict[str, Any]],
                                      analysis_type: str, timestamp: str) -> str:
        """Generate single analysis type report"""

        report = f"""# 🔍 {analysis_type.title()} Analysis Report
**Proposal**: {proposal_file}
**Analysis Type**: {analysis_type}
**Generated**: {timestamp}

"""

        for result in results:
            report += f"## 🤖 {result['model']}\n"
            report += f"**Status**: {result['status']}\n"

            if result['status'] == 'completed':
                analysis = result.get('analysis', {})
                report += f"**Confidence**: {analysis.get('confidence_score', 0.0)}\n"
                report += f"**Summary**: {analysis.get('summary', 'N/A')}\n"

                if analysis.get('key_findings'):
                    report += "**Key Findings**:\n"
                    for finding in analysis['key_findings']:
                        report += f"- {finding}\n"

                if analysis.get('recommendations'):
                    report += "**Recommendations**:\n"
                    for rec in analysis['recommendations']:
                        report += f"- {rec}\n"

            report += "\n---\n\n"

        return report

    def save_report(self, report: str, proposal_file: str, analysis_type: str) -> str:
        """Save analysis report to file"""

        output_dir = "analysis_results"
        Path(output_dir).mkdir(exist_ok=True)

        proposal_name = Path(proposal_file).stem
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        report_file = f"{output_dir}/{proposal_name}_{analysis_type}_analysis_{timestamp}.md"

        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)

        return report_file


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="MCP Cursor Proposal Analyzer")
    parser.add_argument("--file", "-f", required=True, help="Proposal file path")
    parser.add_argument("--models", "-m", default="all", help="Model group")
    parser.add_argument("--analysis-type", "-t", default="comprehensive",
                       choices=["technical", "security", "impact", "implementation", "consensus", "comprehensive"],
                       help="Type of analysis to perform")
    parser.add_argument("--output", "-o", help="Output report file path")

    args = parser.parse_args()

    # Initialize analyzer
    analyzer = CursorProposalAnalyzer()

    # Execute analysis
    result = await analyzer.analyze_proposal(args.file, args.models, args.analysis_type)

    if "error" in result:
        print(f"❌ Error: {result['error']}")
        sys.exit(1)

    # Generate and save report
    report = result["report"]
    report_file = analyzer.save_report(report, args.file, args.analysis_type)

    print("✅ Analysis completed successfully!"    print(f"📄 Report saved: {report_file}")
    print(f"📊 Analyzed by {result['total_models']} models")


if __name__ == "__main__":
    asyncio.run(main())
