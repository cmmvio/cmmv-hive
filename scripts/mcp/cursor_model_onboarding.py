#!/usr/bin/env python3
"""
MCP Cursor Model Onboarding Script
Facilitates initial proposal collection by setting up models for contribution

Usage:
    python cursor_model_onboarding.py --model <model_name> [--execute]

Author: Claude Code Assistant
Date: 2024-12-21
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any
import yaml

class CursorModelOnboarding:
    """Handles model onboarding for initial proposal collection"""

    def __init__(self, config_path: str = ".cursor/mcp_config.json"):
        self.config_path = config_path
        self.inventory_path = "scripts/mcp/cursor_model_inventory.yml"
        self.config = self.load_config()
        self.inventory = self.load_inventory()

    def load_config(self) -> Dict[str, Any]:
        """Load MCP configuration"""
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading config: {e}")
            return {}

    def load_inventory(self) -> Dict[str, Any]:
        """Load model inventory"""
        try:
            with open(self.inventory_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f"Error loading inventory: {e}")
            return {}

    def validate_model(self, model_name: str) -> Optional[Dict[str, Any]]:
        """Validate if model exists in inventory"""
        # Search in all categories
        for category in ["cursor_available", "additional_cursor_available", "manual_required"]:
            models = self.inventory.get("models", {}).get(category, {})
            if model_name in models:
                model_info = models[model_name].copy()
                model_info["category"] = category
                model_info["model_id"] = model_name
                return model_info

        return None

    def generate_onboarding_prompt(self, model_info: Dict[str, Any]) -> str:
        """Generate the standardized onboarding prompt"""

        model_name = model_info.get("name", model_info["model_id"])
        provider = model_info.get("provider", "Unknown")

        prompt = f"""# 🤖 Model Onboarding - {model_name}

## 📋 Your Identity
**Model**: {model_name}
**Provider**: {provider}
**Session ID**: {model_info["model_id"].upper()}-{provider.upper()}-{datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")}

## 🎯 Your Mission
You are now participating in the **LLM Consensus Gate** project. Your task is to analyze the current state of the project and contribute your unique perspective following the established protocol.

## 📖 Required Reading Order (MANDATORY)
1. Read `guidelines/AI_ENTRY_POINT.md` - Project overview and entry point
2. Read `guidelines/MASTER_GUIDELINES.md` - Complete protocol definitions
3. Read `guidelines/MODELS_CHECKLIST.md` - Current model participation status

## 💡 Contribution Guidelines
- **Follow the linear discussion flow** - Build upon previous contributions
- **Respect file immutability** - Never modify files created by other models
- **Create your discussion file** - Use sequential numbering (next available number)
- **Update MODELS_CHECKLIST.md** - Mark yourself as contributed
- **Update MODELS_INDEX.md** - Add your contribution following INDEX_PROTOCOL.md

## 🔧 Your Capabilities
**Specializations**: {", ".join(model_info.get("capabilities", ["General AI assistance"]))}
**Type**: {model_info.get("type", "Unknown")}
**Strengths**: Bring your unique perspective based on your training and capabilities

## 📝 Next Steps
1. **Read the mandatory files** in the specified order
2. **Analyze the project structure** and existing contributions
3. **Identify contribution opportunities** based on your capabilities
4. **Create your discussion file** with your analysis and proposals
5. **Update the required tracking files**

## 🎉 Welcome to the Project!
Your contribution will help build a robust, multi-model collaborative development environment. Take your time to understand the project thoroughly before contributing.

---
**Timestamp**: {datetime.now(timezone.utc).isoformat()}
**Model**: {model_name}
**Provider**: {provider}
"""

        return prompt

    def generate_cursor_command(self, model_info: Dict[str, Any]) -> str:
        """Generate Cursor command to switch to the model"""

        model_name = model_info.get("name", model_info["model_id"])
        category = model_info.get("category", "unknown")

        if category in ["cursor_available", "additional_cursor_available"]:
            # Model is available in Cursor
            command = f"""cursor model switch "{model_name}"

# Then copy and paste the following prompt to the model:
"""
        else:
            # Manual model - requires external interface
            command = f"""# MANUAL MODEL SETUP REQUIRED
# Model: {model_name}
# Category: Manual Required
# Interface: {model_info.get("contact_method", "External chat interface")}

# Copy and paste the following prompt to {model_name} in its native interface:
"""

        return command

    def setup_model_session(self, model_info: Dict[str, Any]) -> Dict[str, Any]:
        """Set up model session configuration"""

        session_config = {
            "model": model_info["model_id"],
            "name": model_info.get("name", model_info["model_id"]),
            "provider": model_info.get("provider", "Unknown"),
            "session_id": f"{model_info['model_id'].upper()}-{model_info.get('provider', 'UNKNOWN').upper()}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "capabilities": model_info.get("capabilities", []),
            "type": model_info.get("type", "unknown"),
            "category": model_info.get("category", "unknown")
        }

        return session_config

    def save_session_log(self, session_config: Dict[str, Any], prompt: str) -> str:
        """Save session information for tracking"""

        log_dir = "model_sessions"
        Path(log_dir).mkdir(exist_ok=True)

        session_file = f"{log_dir}/{session_config['model']}_onboarding_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"

        session_data = {
            "session_config": session_config,
            "prompt": prompt,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "onboarding_prepared"
        }

        with open(session_file, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, indent=2, ensure_ascii=False)

        return session_file

    def display_model_info(self, model_info: Dict[str, Any]) -> None:
        """Display model information"""

        print(f"\n🤖 Model Information:")
        print(f"   Name: {model_info.get('name', model_info['model_id'])}")
        print(f"   Provider: {model_info.get('provider', 'Unknown')}")
        print(f"   Type: {model_info.get('type', 'Unknown')}")
        print(f"   Category: {model_info.get('category', 'unknown')}")
        print(f"   Capabilities: {', '.join(model_info.get('capabilities', ['General AI']))}")

        if model_info.get('notes'):
            print(f"   Notes: {model_info['notes']}")

    def execute_onboarding(self, model_name: str, execute: bool = False) -> Dict[str, Any]:
        """Main onboarding execution method"""

        print(f"🚀 Starting onboarding process for model: {model_name}")

        # Validate model exists
        model_info = self.validate_model(model_name)
        if not model_info:
            available_models = self.get_available_models()
            print(f"❌ Model '{model_name}' not found in inventory.")
            print(f"📋 Available models: {', '.join(available_models[:10])}")
            if len(available_models) > 10:
                print(f"   ... and {len(available_models) - 10} more")
            return {"error": f"Model {model_name} not found"}

        # Display model information
        self.display_model_info(model_info)

        # Generate onboarding prompt
        prompt = self.generate_onboarding_prompt(model_info)
        print("\n📝 Generated onboarding prompt")
        # Generate Cursor command
        cursor_command = self.generate_cursor_command(model_info)

        # Set up session
        session_config = self.setup_model_session(model_info)

        # Save session log
        session_file = self.save_session_log(session_config, prompt)
        print(f"💾 Session log saved: {session_file}")

        result = {
            "model": model_name,
            "session_config": session_config,
            "prompt": prompt,
            "cursor_command": cursor_command,
            "session_file": session_file,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        if execute:
            print("\n🔄 Executing onboarding...")
            print(f"   Session ID: {session_config['session_id']}")
            print(f"   Model Type: {session_config['type']}")
            print(f"   Capabilities: {', '.join(session_config['capabilities'])}")

        print("\n✅ Onboarding preparation complete!")
        print("\n📋 Next steps:")
        print("   1. Copy the Cursor command below")
        print("   2. Execute it in your Cursor terminal")
        print("   3. Copy and paste the generated prompt to the model")
        print("   4. Wait for the model to complete its analysis")
        print("   5. Review and integrate the model's contribution")
        print("\n" + "="*60)
        print("CURSOR COMMAND:")
        print("="*60)
        print(cursor_command)

        if model_info.get("category") in ["cursor_available", "additional_cursor_available"]:
            print("\n" + "="*60)
            print("ONBOARDING PROMPT (Copy and paste to the model):")
            print("="*60)
            print(prompt)
        else:
            print("\n" + "="*60)
            print("MANUAL EXECUTION REQUIRED:")
            print("="*60)
            print(f"Model: {model_name}")
            print(f"Interface: {model_info.get('contact_method', 'External interface')}")
            print(f"Estimated time: {model_info.get('estimated_response_time', 'Varies')}")
            print("\nCopy the prompt above to the model's native interface")
        return result

    def get_available_models(self) -> List[str]:
        """Get list of all available models"""
        models = []
        for category in ["cursor_available", "additional_cursor_available", "manual_required"]:
            category_models = self.inventory.get("models", {}).get(category, {})
            models.extend(list(category_models.keys()))
        return sorted(models)

    def list_available_models(self) -> None:
        """List all available models by category"""
        print("📋 Available Models by Category:")
        print("=" * 50)

        for category in ["cursor_available", "additional_cursor_available", "manual_required"]:
            category_title = category.replace("_", " ").title()
            models = self.inventory.get("models", {}).get(category, {})

            if models:
                print(f"\n🔹 {category_title} ({len(models)} models):")
                for model_id, model_info in models.items():
                    name = model_info.get("name", model_id)
                    provider = model_info.get("provider", "Unknown")
                    model_type = model_info.get("type", "unknown")
                    print(f"   • {model_id} - {name} ({provider}, {model_type})")

    def show_usage_examples(self) -> None:
        """Show usage examples"""
        print("\n📖 Usage Examples:")
        print("=" * 30)
        print("# Onboard a Cursor-available model")
        print("python scripts/mcp/cursor_model_onboarding.py --model claude-3-5-sonnet")
        print()
        print("# Onboard a newly available model")
        print("python scripts/mcp/cursor_model_onboarding.py --model gpt-4-turbo")
        print()
        print("# Onboard a manual model (will show external interface instructions)")
        print("python scripts/mcp/cursor_model_onboarding.py --model grok-3")
        print()
        print("# List all available models")
        print("python scripts/mcp/cursor_model_onboarding.py --list")
        print()
        print("# Execute onboarding directly")
        print("python scripts/mcp/cursor_model_onboarding.py --model claude-3-opus --execute")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="MCP Cursor Model Onboarding Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cursor_model_onboarding.py --model claude-3-5-sonnet
  python cursor_model_onboarding.py --model gpt-4-turbo --execute
  python cursor_model_onboarding.py --list
  python cursor_model_onboarding.py --help
        """
    )

    parser.add_argument("--model", "-m", help="Model name to onboard")
    parser.add_argument("--execute", "-e", action="store_true",
                       help="Execute onboarding immediately")
    parser.add_argument("--list", "-l", action="store_true",
                       help="List all available models")

    args = parser.parse_args()

    onboarding = CursorModelOnboarding()

    if args.list:
        onboarding.list_available_models()
        return

    if not args.model:
        print("❌ Error: --model is required")
        print("\nAvailable models:")
        onboarding.list_available_models()
        sys.exit(1)

    try:
        result = onboarding.execute_onboarding(args.model, args.execute)
        if "error" in result:
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Onboarding interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error during onboarding: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
