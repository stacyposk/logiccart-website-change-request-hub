"""
System Prompts and Model Configuration for LogicCart Decision Agent
- Aligns with policy.md (visual-only checks for banners; features always NEEDS_INFO)
- Enforces strict JSON output schema
- Uses environment-driven model/region, with safe defaults
"""

from __future__ import annotations

import json
import os
from enum import Enum
from typing import Any, Dict, List, Optional


class PromptType(Enum):
    MAIN_SYSTEM = "main_system"
    BANNER_ANALYSIS = "banner_analysis"
    FEATURE_GUIDANCE = "feature_guidance"
    JSON_ENFORCEMENT = "json_enforcement"
    POLICY_COMPLIANCE = "policy_compliance"


class ModelConfiguration:
    """Nova Lite model configuration for optimal cost and consistency."""

    # Environment overrides are allowed; defaults are safe.
    _DEFAULT_MODEL_ID = "amazon.nova-lite-v1:0"
    _DEFAULT_REGION = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION")

    NOVA_LITE_CONFIG: Dict[str, Any] = {
        "model_id": os.getenv("BEDROCK_MODEL", _DEFAULT_MODEL_ID),
        "region": _DEFAULT_REGION,
        "inference_config": {
            # Conservative settings for consistent JSON; also cost-aware
            "maxTokens": int(os.getenv("MAX_OUTPUT_TOKENS", "2048")),
            "temperature": float(os.getenv("MODEL_TEMPERATURE", "0.1")),
            "topP": float(os.getenv("MODEL_TOP_P", "0.9")),
            "stopSequences": [
                "```",
                "END",
                "</json>",
                "---END---",
            ],
        },
        "cost_optimization": {
            # Informational; not used in computation
            "input_token_cost": 0.00006,   # per 1K input tokens (subject to change)
            "output_token_cost": 0.00024,  # per 1K output tokens (subject to change)
        },
    }

    @classmethod
    def get_inference_config(cls) -> Dict[str, Any]:
        return dict(cls.NOVA_LITE_CONFIG["inference_config"])

    @classmethod
    def get_cost_info(cls) -> Dict[str, Any]:
        return dict(cls.NOVA_LITE_CONFIG["cost_optimization"])


class SystemPrompts:
    """Prompt builders aligned to LogicCart policy.md"""

    @staticmethod
    def get_main_system_prompt() -> str:
        """
        High-level instruction set for the agent (used primarily for tool-using flows).
        Kept concise to minimize token use and avoid redundancy.
        """
        return (
            "You are the LogicCart Decision Agent. Follow these principles:\n"
            "1) For NEW_BANNER: perform visual checks ONLY (quality, appropriateness, brand alignment). "
            "Do NOT check file size, format, dimensions, alt text, or required fields—they are already validated.\n"
            "2) For NEW_FEATURE: always return NEEDS_INFO with structured guidance.\n"
            "3) Return ONLY valid JSON in the required schema. Be concise and cite specific policy concerns where relevant."
        )

    @staticmethod
    def get_banner_analysis_prompt(policy_text: str) -> str:
        """
        Banner prompt strictly scoped to visual checks per policy.md.
        """
        return f"""You are analyzing a NEW_BANNER request for LogicCart.

SCOPE (VISUAL ONLY) — DO NOT evaluate: file size, image format, dimensions, alt text, required fields.

POLICY VISUAL CHECKS:
{policy_text}

Perform ONLY these checks:
- Visual quality: professional appearance; no blur/pixelation/compression artifacts.
- Appropriateness: no adult/offensive content; no competitor branding; no misleading claims; no obvious watermarks/copyright issues.
- Brand alignment: colors complement LogicCart purple (#5754FF); logo presence if visually applicable; overall look suitable for e-commerce.

OUTPUT — Return ONLY valid JSON:
{{
  "decision": "APPROVE|REJECT|NEEDS_INFO",
  "reasons": ["up to 5 brief, policy-based reasons (visual domain only)"],
  "confidence": 0.0-1.0,
  "email": {{
    "subject": "string (required for REJECT/NEEDS_INFO)",
    "body": "string (required for REJECT/NEEDS_INFO)"
  }}
}}"""

    @staticmethod
    def get_feature_guidance_prompt() -> str:
        """
        Feature prompt: always NEEDS_INFO with structured guidance (per policy.md).
        """
        return (
            "For NEW_FEATURE requests, ALWAYS return NEEDS_INFO with an email asking for:\n"
            "1) User Stories: \"As a [role], I want [feature], so that [benefit]\".\n"
            "2) Visual Mockups: reference images, wireframes, Figma links, or design specs.\n"
            "3) Technical Specs: API requirements, DB changes, integrations, constraints.\n"
            "4) Success Metrics: KPIs, engagement targets, business impact.\n\n"
            "Output JSON must include decision=NEEDS_INFO, reasons (single item is OK), confidence=1.0, and a helpful email."
        )

    @staticmethod
    def get_json_enforcement_prompt() -> str:
        """
        Strict JSON-only output enforcement.
        """
        return """CRITICAL: Return ONLY valid JSON. No prose, no code fences, no comments.

REQUIRED SCHEMA:
{
  "decision": "APPROVE|REJECT|NEEDS_INFO",
  "reasons": ["1-5 brief strings"],
  "confidence": number (0.0-1.0),
  "email": {
    "subject": "string (required for REJECT/NEEDS_INFO)",
    "body": "string (required for REJECT/NEEDS_INFO)"
  }
}"""

    @staticmethod
    def get_policy_compliance_prompt(policy_text: str) -> str:
        """
        A reinforcement block to avoid hallucinations and keep checks within policy scope.
        """
        return f"""Policy Compliance Guardrails:
- Do NOT invent policies not present in the policy text below.
- Reasons must reference visual issues only (quality/appropriateness/brand alignment).
- Non-visual items (file size, format, dimensions, alt text, required fields) are OFF-SCOPE.

POLICY (visual scope reference):
{policy_text}"""

    @staticmethod
    def get_combined_prompt(request_type: str, policy_text: str) -> str:
        """
        Combined prompt used when a single consolidated instruction block is helpful.
        """
        main = SystemPrompts.get_main_system_prompt()
        json_only = SystemPrompts.get_json_enforcement_prompt()
        policy_guard = SystemPrompts.get_policy_compliance_prompt(policy_text)

        if request_type == "NEW_BANNER":
            specific = SystemPrompts.get_banner_analysis_prompt(policy_text)
        elif request_type == "NEW_FEATURE":
            specific = SystemPrompts.get_feature_guidance_prompt()
        else:
            specific = "Unknown request type; return NEEDS_INFO with manual review note."

        return f"{main}\n\n{specific}\n\n{policy_guard}\n\n{json_only}"

    @staticmethod
    def get_cost_optimized_prompt(request_type: str) -> str:
        """
        Ultra-concise hints to reduce token usage (for small in-context calls).
        """
        if request_type == "NEW_BANNER":
            return (
                'Visual-only checks per policy. JSON ONLY: '
                '{"decision":"APPROVE|REJECT|NEEDS_INFO","reasons":["≤5 visual reasons"],'
                '"confidence":0.0-1.0,"email":{"subject":"str","body":"str"}}'
            )
        if request_type == "NEW_FEATURE":
            return (
                'Always NEEDS_INFO. JSON ONLY: '
                '{"decision":"NEEDS_INFO","reasons":["Requires user stories, mockups, API specs, metrics"],'
                '"confidence":1.0,"email":{"subject":"Additional Information Required","body":"Please provide: user stories, mockups/Figma, API/DB/integrations, success metrics."}}'
            )
        return 'JSON ONLY: {"decision":"NEEDS_INFO","reasons":["Manual review required"],"confidence":0.0}'


class PromptTemplates:
    """Minimal email templates used by tools/handlers."""

    @staticmethod
    def get_email_templates() -> Dict[str, Dict[str, str]]:
        return {
            "banner_reject": {
                "subject": "Banner Request Rejected - {title}",
                "body_template": (
                    "Dear {requester_name},\n\n"
                    "Your banner request '{title}' (ID: {ticket_id}) has been rejected for visual policy reasons:\n\n"
                    "{reasons_list}\n\n"
                    "Please correct the issues and resubmit.\n\n"
                    "Best regards,\nLogicCart Review Team"
                ),
            },
            "banner_needs_info": {
                "subject": "Banner Request - Additional Information Required",
                "body_template": (
                    "Dear {requester_name},\n\n"
                    "Your banner request '{title}' (ID: {ticket_id}) requires clarification:\n\n"
                    "{reasons_list}\n\n"
                    "Please provide the requested info or updated assets.\n\n"
                    "Best regards,\nLogicCart Review Team"
                ),
            },
            "feature_needs_info": {
                "subject": "Feature Request - Specification Required",
                "body_template": (
                    "Dear {requester_name},\n\n"
                    "Thank you for your feature request '{title}' (ID: {ticket_id}). To proceed, please provide:\n\n"
                    "• User stories (As a [role], I want [feature], so that [benefit])\n"
                    "• Visual mockups or Figma links\n"
                    "• Technical/API specifications (including data and integrations)\n"
                    "• Success metrics/KPIs\n\n"
                    "Reply with these details to continue processing.\n\n"
                    "Best regards,\nLogicCart Development Team"
                ),
            },
        }

    @staticmethod
    def format_email_template(template_key: str, **kwargs) -> Dict[str, str]:
        templates = PromptTemplates.get_email_templates()
        if template_key not in templates:
            return {"subject": "LogicCart Request Update", "body": "Your request requires attention."}

        template = templates[template_key]

        # Format reasons list (bullets) if provided
        if "reasons" in kwargs and isinstance(kwargs["reasons"], list):
            kwargs["reasons_list"] = "\n".join(f"• {r}" for r in kwargs["reasons"])

        # Derive requester_name from email when missing
        if "requester_name" not in kwargs and kwargs.get("requester_email"):
            name_part = kwargs["requester_email"].split("@")[0]
            if "." in name_part:
                kwargs["requester_name"] = " ".join(p.title() for p in name_part.split("."))
            elif "_" in name_part:
                kwargs["requester_name"] = " ".join(p.title() for p in name_part.split("_"))
            else:
                kwargs["requester_name"] = name_part.title()

        try:
            return {
                "subject": template["subject"].format(**kwargs),
                "body": template["body_template"].format(**kwargs),
            }
        except KeyError as e:
            return {
                "subject": f"LogicCart Request Update - {kwargs.get('title', 'Request')}",
                "body": f"Your request needs attention. Missing template variable: {e}",
            }


class PromptValidator:
    """Utilities for validating/inspecting model output JSON."""

    @staticmethod
    def validate_json_output(output_text: str) -> Dict[str, Any]:
        """
        Validate that output_text contains a single valid JSON object adhering to the schema.
        """
        result: Dict[str, Any] = {
            "is_valid": False,
            "parsed_json": None,
            "errors": [],
            "warnings": [],
        }

        try:
            json_str = PromptValidator._extract_json(output_text)
            if not json_str:
                result["errors"].append("No JSON found in output")
                return result

            parsed = json.loads(json_str)
            result["parsed_json"] = parsed

            # Required fields
            for field in ["decision", "reasons", "confidence"]:
                if field not in parsed:
                    result["errors"].append(f"Missing required field: {field}")

            # decision
            if parsed.get("decision") not in ["APPROVE", "REJECT", "NEEDS_INFO"]:
                result["errors"].append(f"Invalid decision: {parsed.get('decision')}")

            # confidence
            conf = parsed.get("confidence")
            if not isinstance(conf, (int, float)) or not (0.0 <= float(conf) <= 1.0):
                result["errors"].append(f"Invalid confidence: {conf}")

            # reasons
            reasons = parsed.get("reasons", [])
            if not isinstance(reasons, list) or not reasons:
                result["errors"].append("Reasons must be a non-empty array")
            elif len(reasons) > 5:
                result["warnings"].append(f"Too many reasons ({len(reasons)}); limit is 5")

            # email required for REJECT / NEEDS_INFO
            if parsed.get("decision") in ["REJECT", "NEEDS_INFO"]:
                email = parsed.get("email")
                if not isinstance(email, dict):
                    result["errors"].append("Email object required for REJECT/NEEDS_INFO")
                else:
                    if not email.get("subject"):
                        result["errors"].append("Email subject required")
                    if not email.get("body"):
                        result["errors"].append("Email body required")

            result["is_valid"] = len(result["errors"]) == 0
            return result

        except json.JSONDecodeError as e:
            result["errors"].append(f"Invalid JSON: {e}")
            return result
        except Exception as e:
            result["errors"].append(f"Validation error: {e}")
            return result

    @staticmethod
    def _extract_json(text: str) -> Optional[str]:
        """
        Extract a single JSON object from arbitrary text (handles ```json fences).
        """
        if not text:
            return None
        t = text.replace("```json", "").replace("```", "")
        start = t.find("{")
        if start == -1:
            return None
        brace = 0
        end = None
        for i, ch in enumerate(t[start:], start):
            if ch == "{":
                brace += 1
            elif ch == "}":
                brace -= 1
                if brace == 0:
                    end = i + 1
                    break
        if end is None:
            return None
        return t[start:end]

    @staticmethod
    def test_prompt_effectiveness(prompt: str, expected_format: str) -> Dict[str, Any]:
        """
        Lightweight scoring for clarity/specificity/JSON enforcement and cost hints.
        """
        analysis = {
            "prompt_length": len(prompt),
            "token_estimate": int(len(prompt.split()) * 1.2),
            "clarity_score": 0,
            "specificity_score": 0,
            "json_enforcement_score": 0,
            "cost_efficiency_score": 0,
            "recommendations": [],
        }

        pl = prompt.lower()

        clarity_words = ["must", "required", "only", "strict", "exact"]
        spec_words = ["format", "schema", "structure", "fields", "example"]
        json_words = ["json", "valid", "parse", "object", "schema"]

        analysis["clarity_score"] = sum(w in pl for w in clarity_words)
        analysis["specificity_score"] = sum(w in pl for w in spec_words)
        analysis["json_enforcement_score"] = sum(w in pl for w in json_words)

        # Cost heuristic
        if analysis["token_estimate"] < 400:
            analysis["cost_efficiency_score"] = 10
        elif analysis["token_estimate"] < 800:
            analysis["cost_efficiency_score"] = 8
        elif analysis["token_estimate"] < 1600:
            analysis["cost_efficiency_score"] = 6
        else:
            analysis["cost_efficiency_score"] = 3
            analysis["recommendations"].append("Consider shortening the prompt for cost efficiency.")

        if analysis["clarity_score"] < 3:
            analysis["recommendations"].append("Increase clarity language (must/only/required).")
        if analysis["json_enforcement_score"] < 3:
            analysis["recommendations"].append("Reinforce JSON-only output constraints.")
        if "example" not in pl:
            analysis["recommendations"].append("Consider adding a compact example JSON output.")

        return analysis


# Convenience exports used elsewhere in the codebase
def get_system_prompt(request_type: str, policy_text: str = "", cost_optimized: bool = True) -> str:
    """
    Choose a compact or combined prompt depending on cost_optimized flag.
    """
    if cost_optimized:
        return SystemPrompts.get_cost_optimized_prompt(request_type)
    return SystemPrompts.get_combined_prompt(request_type, policy_text)


def get_model_config() -> Dict[str, Any]:
    """
    Return model configuration (includes model_id, region, inference settings).
    """
    return dict(ModelConfiguration.NOVA_LITE_CONFIG)


def validate_output(output_text: str) -> Dict[str, Any]:
    """
    Validate model output string conforms to required JSON schema.
    """
    return PromptValidator.validate_json_output(output_text)
