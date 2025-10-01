"""
Error handling and fallback mechanisms for LogicCart Decision Agent
- Graceful degradation when Bedrock/Nova Lite is unavailable
- Policy-aligned: visual-only banner checks; skip frontend-validated items
- Conservative fallback: REJECT only on clear policy violations (e.g., non-approved domain),
  otherwise NEEDS_INFO with manual review messaging
"""

from __future__ import annotations

import logging
import os
from enum import Enum
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from urllib.parse import urlparse

# Optional light import: only used for email templates when available
try:
    from system_prompts import PromptTemplates
except Exception:  # pragma: no cover - templates are optional
    PromptTemplates = None  # type: ignore

logger = logging.getLogger(__name__)
logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

# Approved domains per policy; can be overridden via env APPROVED_DOMAINS (comma-separated)
_DEFAULT_APPROVED_DOMAINS = [
    "logicart.com",
    "shop.logicart.com",
    "blog.logicart.com",
    "support.logicart.com",
]
APPROVED_DOMAINS: List[str] = [
    d.strip().lower()
    for d in os.getenv("APPROVED_DOMAINS", ",".join(_DEFAULT_APPROVED_DOMAINS)).split(",")
    if d.strip()
]


class ErrorType(Enum):
    """Types of errors that can occur during processing"""
    BEDROCK_UNAVAILABLE = "bedrock_unavailable"
    BEDROCK_TIMEOUT = "bedrock_timeout"
    BEDROCK_QUOTA_EXCEEDED = "bedrock_quota_exceeded"
    S3_ACCESS_ERROR = "s3_access_error"
    DYNAMODB_ERROR = "dynamodb_error"
    SNS_ERROR = "sns_error"
    NETWORK_ERROR = "network_error"
    VALIDATION_ERROR = "validation_error"
    UNKNOWN_ERROR = "unknown_error"


class FallbackDecisionEngine:
    """
    Rule-based fallback analysis when Nova Lite is unavailable.
    IMPORTANT: Follows policy.md — only perform checks that do NOT duplicate frontend validation.
       Visual quality/brand/appropriateness cannot be confirmed without vision => be conservative.
       Clear, objective violations (like non-approved domain) can lead to REJECT.
       Otherwise prefer NEEDS_INFO with 'visual analysis unavailable' guidance.
    """

    def __init__(self) -> None:
        self.analysis_timestamp = lambda: datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        logger.info("FallbackDecisionEngine initialized")

    # --------- Public API --------- #

    def analyze_banner_fallback(self, ticket_data: Dict[str, Any], policy_text: str) -> Dict[str, Any]:
        """
        Perform policy-aligned, conservative fallback for NEW_BANNER without vision.
        Checks performed:
          - URL whitelist (approved LogicCart domains only)
          - obvious text-based red flags (best-effort): misleading claims in description/copies
        We do NOT check: file size/format/dimensions/alt-text/required fields (frontend already validates).
        We do NOT try to guess visual quality or brand alignment without the model.
        """
        ticket_id = ticket_data.get("id", "unknown")
        title = ticket_data.get("title") or ticket_data.get("description") or "Banner Request"
        requester_email = ticket_data.get("requester_email", "")
        requester_name = ticket_data.get("requester_name") or self._name_from_email(requester_email)

        reasons: List[str] = []
        decision = "NEEDS_INFO"
        confidence = 0.55  # modest confidence; we lack vision
        summary = "Visual analysis unavailable — fallback checks executed."

        # 1) Approved domain checks (policy: LogicCart properties only)
        url_issues = self._check_urls(ticket_data)
        if url_issues:
            reasons.extend(url_issues)

        # 2) Best-effort text heuristics for misleading claims (conservative: flags lead to NEEDS_INFO)
        claim_flags = self._check_misleading_claims(ticket_data)
        if claim_flags:
            reasons.extend(claim_flags)

        # Decision rules (conservative):
        # - If any non-approved domain issue is present => REJECT (clear violation)
        # - Else NEEDS_INFO (we cannot verify visual quality/brand/appropriateness without the model)
        if any("non-approved domain" in r.lower() for r in reasons):
            decision = "REJECT"
            confidence = 0.9  # clear, objective violation
        else:
            # Ensure we provide at least one actionable reason for NEEDS_INFO
            if not reasons:
                reasons = ["Visual analysis unavailable — requires manual review"]
            decision = "NEEDS_INFO"
            confidence = max(confidence, 0.6)

        # Build email
        email = self._build_banner_email(
            decision=decision,
            title=title,
            ticket_id=ticket_id,
            requester_name=requester_name,
            requester_email=requester_email,
            reasons=reasons,
        )

        result: Dict[str, Any] = {
            "decision": decision,
            "reasons": reasons[:5],
            "confidence": confidence,
            "summary": summary,
            "email": email,
            "fallback_analysis": True,
            "visual_analysis_unavailable": True,
            "analysis_method": "rule_based_fallback",
            "analysis_timestamp": self.analysis_timestamp(),
        }
        return result

    def generate_feature_needs_info(self, ticket_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Feature requests ALWAYS return NEEDS_INFO per policy, with guidance email.
        """
        ticket_id = ticket_data.get("id", "unknown")
        title = ticket_data.get("title") or ticket_data.get("description") or "Request"
        requester_email = ticket_data.get("requester_email", "")
        requester_name = ticket_data.get("requester_name") or self._name_from_email(requester_email)

        reasons = ["Requires user stories, visual mockups (Figma), technical specs, and success metrics"]
        subject = f"Feature Request - Specification Required"
        body = (
            f"Dear {requester_name},\n\n"
            f"Thank you for your feature request '{title}' (ID: {ticket_id}). To proceed, please provide:\n\n"
            "1) User stories: \"As a [role], I want [feature], so that [benefit]\"\n"
            "2) Visual mockups: reference images, wireframes, or Figma links\n"
            "3) Technical specs: APIs, data model/DB changes, integrations, constraints\n"
            "4) Success metrics: KPIs, engagement targets, business impact\n\n"
            "Reply with these details to continue processing.\n\n"
            "Best regards,\nLogicCart Development Team"
        )

        if PromptTemplates:
            tpl = PromptTemplates.format_email_template(
                "feature_needs_info",
                requester_name=requester_name,
                title=title,
                ticket_id=ticket_id,
            )
            subject = tpl.get("subject", subject)
            body = tpl.get("body", body)

        return {
            "decision": "NEEDS_INFO",
            "reasons": reasons,
            "confidence": 1.0,
            "email": {"subject": subject, "body": body},
            "fallback_analysis": False,  # This is standard behavior, not a fallback
            "analysis_method": "policy_feature_guidance",
            "analysis_timestamp": self.analysis_timestamp(),
        }

    # --------- Internals --------- #

    def _check_urls(self, ticket_data: Dict[str, Any]) -> List[str]:
        """
        Validate URLs against approved domains.
        If any URL is outside APPROVED_DOMAINS => REJECT-able violation per policy.
        """
        issues: List[str] = []
        urls: List[str] = []

        target_url = ticket_data.get("target_url")
        if isinstance(target_url, str) and target_url.strip():
            urls.append(target_url.strip())

        page_urls = ticket_data.get("page_urls") or []
        if isinstance(page_urls, list):
            urls.extend([u for u in page_urls if isinstance(u, str) and u.strip()])

        for u in urls:
            try:
                netloc = urlparse(u).netloc.lower()
                # Allow exact matches; also allow any subdomain under logicart.com as approved,
                # but policy lists explicit approved subdomains — we'll enforce exact matches conservatively.
                if netloc not in APPROVED_DOMAINS:
                    issues.append(f"Target URL '{u}' uses non-approved domain (policy: approved LogicCart properties only)")
            except Exception:
                issues.append(f"Target URL '{u}' is invalid or cannot be parsed")

        return issues

    def _check_misleading_claims(self, ticket_data: Dict[str, Any]) -> List[str]:
        """
        Conservative text-based heuristics for misleading claims.
        We do not attempt to overreach; these flags lead to NEEDS_INFO, not automatic reject.
        """
        flags: List[str] = []
        text_blobs: List[str] = []

        for key in ("title", "description", "copy_en", "copy_zh", "notes"):
            v = ticket_data.get(key)
            if isinstance(v, str) and v.strip():
                text_blobs.append(v.strip().lower())

        if not text_blobs:
            return flags

        text = " ".join(text_blobs)

        suspicious = [
            "100% off",
            "free for life",
            "guaranteed lowest price",
            "unlimited for free",
            "no terms apply",
        ]
        if any(s in text for s in suspicious):
            flags.append("Possible misleading claim detected in description/copy (requires manual verification)")

        # Watermark hints
        if "watermark" in text or "stock photo" in text:
            flags.append("Possible watermark/stock photo concern (requires manual verification)")

        # Competitor brand hints (textual only; visual cannot be verified)
        competitors = ["shopify", "woocommerce", "magento", "bigcommerce"]
        if any(c in text for c in competitors):
            flags.append("Possible competitor branding mentioned in description (visual verification required)")

        return flags

    def _name_from_email(self, email: str) -> str:
        if not email or "@" not in email:
            return "User"
        local = email.split("@")[0]
        if "." in local:
            return " ".join(p.title() for p in local.split("."))
        if "_" in local:
            return " ".join(p.title() for p in local.split("_"))
        return local.title()

    def _build_banner_email(
        self,
        *,
        decision: str,
        title: str,
        ticket_id: str,
        requester_name: str,
        requester_email: str,
        reasons: List[str],
    ) -> Dict[str, str]:
        # Try to use PromptTemplates when available for consistency
        if PromptTemplates:
            key = "banner_needs_info" if decision == "NEEDS_INFO" else "banner_reject"
            tpl = PromptTemplates.format_email_template(
                key,
                requester_name=requester_name,
                requester_email=requester_email,
                title=title,
                ticket_id=ticket_id,
                reasons=reasons,
            )
            return {"subject": tpl.get("subject", ""), "body": tpl.get("body", "")}

        # Minimal inline templates if PromptTemplates is not available
        reasons_list = "\n".join(f"• {r}" for r in reasons) if reasons else "• Details pending"
        if decision == "REJECT":
            subject = f"Banner Request Rejected - {title}"
            body = (
                f"Dear {requester_name},\n\n"
                f"Your banner request '{title}' (ID: {ticket_id}) has been rejected:\n\n"
                f"{reasons_list}\n\n"
                "Please correct the issues and resubmit.\n\n"
                "Best regards,\nLogicCart Review Team"
            )
        else:
            subject = "Banner Request - Additional Information Required"
            body = (
                f"Dear {requester_name},\n\n"
                f"Your banner request '{title}' (ID: {ticket_id}) requires clarification:\n\n"
                f"{reasons_list}\n\n"
                "Visual analysis is currently unavailable, so we cannot verify visual quality/brand alignment automatically.\n"
                "Please provide clarifications or updated assets for manual review.\n\n"
                "Best regards,\nLogicCart Review Team"
            )
        return {"subject": subject, "body": body}


class ErrorHandler:
    """
    Centralized error handling that selects appropriate fallback paths.
    """

    def __init__(self) -> None:
        self.fallback_engine = FallbackDecisionEngine()
        logger.info("ErrorHandler initialized")

        # Simple pattern hints for classification
        self._patterns = {
            ErrorType.BEDROCK_UNAVAILABLE: ["bedrock", "unavailable", "endpoint", "connection"],
            ErrorType.BEDROCK_TIMEOUT: ["timeout", "timed out", "request timeout", "read timeout"],
            ErrorType.BEDROCK_QUOTA_EXCEEDED: ["quota", "limit", "throttl", "rate limit", "exceeded"],
            ErrorType.S3_ACCESS_ERROR: ["s3", "bucket", "access denied", "no such key", "forbidden"],
            ErrorType.DYNAMODB_ERROR: ["dynamodb", "provisioned throughput", "conditional check failed"],
            ErrorType.SNS_ERROR: ["sns", "topic", "publish", "notification"],
            ErrorType.NETWORK_ERROR: ["network", "dns", "connection refused", "unreachable"],
            ErrorType.VALIDATION_ERROR: ["validation", "invalid", "schema", "format"],
        }

    # --------- Public API --------- #

    def classify_error(self, error_message: str, exception: Optional[Exception] = None) -> ErrorType:
        em = (error_message or "").lower()

        # Exception-aware hints
        if exception:
            name = type(exception).__name__.lower()
            if "throttl" in em or "quota" in em:
                return ErrorType.BEDROCK_QUOTA_EXCEEDED
            if "timeout" in em:
                return ErrorType.BEDROCK_TIMEOUT
            if "bedrock" in name or "bedrock" in em:
                return ErrorType.BEDROCK_UNAVAILABLE

        # Pattern search
        for etype, pats in self._patterns.items():
            if any(p in em for p in pats):
                return etype

        return ErrorType.UNKNOWN_ERROR

    def handle_error(
        self,
        error_type: ErrorType,
        error_message: str,
        ticket_data: Dict[str, Any],
        policy_text: str = "",
    ) -> Dict[str, Any]:
        logger.warning(f"Handling error type: {error_type.value} ({error_message})")

        request_type = (ticket_data.get("request_type") or "").upper()

        if error_type in (
            ErrorType.BEDROCK_UNAVAILABLE,
            ErrorType.BEDROCK_TIMEOUT,
            ErrorType.BEDROCK_QUOTA_EXCEEDED,
        ):
            if request_type == "NEW_BANNER":
                result = self.fallback_engine.analyze_banner_fallback(ticket_data, policy_text)
                result["fallback_reason"] = f"Vision temporarily unavailable: {error_message}"
                return result
            if request_type == "NEW_FEATURE":
                result = self.fallback_engine.generate_feature_needs_info(ticket_data)
                result["fallback_reason"] = f"Vision not required for features; guidance generated. ({error_message})"
                return result
            return self._manual_review(ticket_data, f"Unknown request type during Bedrock issue: {request_type}")

        if error_type == ErrorType.S3_ACCESS_ERROR:
            return self._manual_review(ticket_data, f"Unable to access required policy/resources: {error_message}")

        if error_type == ErrorType.DYNAMODB_ERROR:
            return self._manual_review(ticket_data, f"Database access error: {error_message}")

        if error_type == ErrorType.SNS_ERROR:
            # Decision may still be valid; notify manual follow-up for email.
            return {
                "decision": "NEEDS_INFO",
                "reasons": ["Decision completed but notification failed"],
                "confidence": 0.5,
                "summary": f"SNS publish error: {error_message}",
                "email": None,
                "sns_error": True,
                "manual_notification_required": True,
                "analysis_timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            }

        # Network/validation/unknown — conservative manual review
        return self._manual_review(ticket_data, error_message or error_type.value)

    # --------- Internals --------- #

    def _manual_review(self, ticket_data: Dict[str, Any], err: str) -> Dict[str, Any]:
        ticket_id = ticket_data.get("id", "unknown")
        requester_email = ticket_data.get("requester_email", "")
        requester_name = ticket_data.get("requester_name") or self.fallback_engine._name_from_email(requester_email)
        title = ticket_data.get("title") or ticket_data.get("description") or "Request"

        subject = "Request Requires Manual Review - LogicCart"
        body = (
            f"Dear {requester_name},\n\n"
            "We encountered a technical issue while processing your request. "
            "Your ticket has been forwarded for manual review.\n\n"
            f"Ticket: {ticket_id}\n"
            f"Details: {err}\n\n"
            "We’ll follow up once the review is complete.\n\n"
            "Best regards,\nLogicCart Team"
        )

        return {
            "decision": "NEEDS_INFO",
            "reasons": ["System error: manual review required"],
            "confidence": 0.0,
            "summary": f"Manual review due to error: {err}",
            "email": {"subject": subject, "body": body},
            "error": True,
            "manual_review_required": True,
            "analysis_timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }


# Factory helpers
def create_fallback_engine() -> FallbackDecisionEngine:
    return FallbackDecisionEngine()


def create_error_handler() -> ErrorHandler:
    return ErrorHandler()


# Convenience wrapper used by callers
def handle_processing_error(
    error: Exception, ticket_data: Dict[str, Any], policy_text: str = ""
) -> Dict[str, Any]:
    handler = create_error_handler()
    etype = handler.classify_error(str(error), error)
    return handler.handle_error(etype, str(error), ticket_data, policy_text)
