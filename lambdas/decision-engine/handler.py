"""
AWS Lambda handler for LogicCart Bedrock Agent (MVP)
Policy-aligned:
- Do NOT re-check frontend-validated items (file size/format/alt-text/dimensions/required fields)
- Focus on visual quality, content appropriateness, brand alignment, and URL whitelist/redirects
"""

import json
import os
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse

from tools import get_ticket, get_policy, write_result, get_banner_image_url
from nova_lite_analyzer import create_nova_lite_analyzer

# Logging
logger = logging.getLogger()
logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

# Env (no hardcoded details)
POLICY_FILE_KEY = os.getenv("POLICY_FILE_KEY", "policy.md")
APPROVED_DOMAINS = [
    d.strip().lower()
    for d in os.getenv(
        "APPROVED_DOMAINS",
        # Defaults exactly to policy.md
        "logicart.com,shop.logicart.com,blog.logicart.com,support.logicart.com",
    ).split(",")
]
# Domains/hosts commonly used for external redirects (flag for Needs Info)
REDIRECT_HOST_HINTS = [
    d.strip().lower()
    for d in os.getenv(
        "REDIRECT_HOST_HINTS",
        "bit.ly,t.co,lnkd.in,goo.gl,is.gd,tinyurl.com,redirect,tracker"
    ).split(",")
]


def _resp(status: int, body: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
        "body": json.dumps(body, default=str),
    }


def extract_user_context(event):
    """Extract user context from JWT claims in the event"""
    try:
        claims = event.get('requestContext', {}).get('authorizer', {}).get('jwt', {}).get('claims', {})
        if not claims:
            logger.warning('No JWT claims found in event requestContext')
            return None

        email = claims.get('email')
        user_id = claims.get('sub')
        username = claims.get('cognito:username') or claims.get('username')

        if not email or not user_id:
            logger.warning(f'Missing required JWT claims: email={bool(email)}, userId={bool(user_id)}')
            return None

        return {
            'email': email,
            'userId': user_id,
            'username': username or email.split('@')[0]  # fallback to email prefix if no username
        }
    except Exception as err:
        logger.error(f'Error extracting user context from JWT: {err}')
        return None

def lambda_handler(event, _context):
    """
    Expected route: POST /tickets/{id}/approve
    """
    ticket_id = None
    try:
        # Extract user context for audit trails
        user_context = extract_user_context(event)
        if user_context:
            logger.info(f"[AI] Bedrock Agent processing request from user: {user_context['email']} (ID: {user_context['userId']})")
        else:
            logger.warning("[AI] No user context found in request - processing without user audit trail")

        ticket_id = (event.get("pathParameters") or {}).get("id")
        if not ticket_id:
            return _resp(400, {"error": "Missing ticket ID"})

        logger.info(f"[AI] Begin decision for ticket {ticket_id} (user: {user_context['email'] if user_context else 'unknown'})")
        agent = LogicCartAIAgent()
        result = agent.process_request(ticket_id, user_context)
        return _resp(200, result)

    except Exception as e:
        user_email = event.get('requestContext', {}).get('authorizer', {}).get('jwt', {}).get('claims', {}).get('email', 'unknown')
        logger.exception(f"[AI] Handler error for {ticket_id or 'unknown'} (user: {user_email}): {e}")
        return _resp(500, {
            "error": "Internal server error",
            "message": str(e),
            "fallback_decision": "NEEDS_INFO",
            "manual_review_required": True,
        })


class LogicCartAIAgent:
    """
    Orchestrates:
      1) Ticket + policy load
      2) NEW_BANNER: URL whitelist/redirect hints + Nova Lite visual analysis
      3) NEW_FEATURE: Always NEEDS_INFO with policy template email
      4) Persist result (DynamoDB + optional SNS)
    """

    def __init__(self):
        self.nova_analyzer = create_nova_lite_analyzer()

    def process_request(self, ticket_id: str, user_context: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        try:
            ticket = get_ticket(ticket_id)
            request_type = ticket.get("request_type", "UNKNOWN")
            policy_text = get_policy(POLICY_FILE_KEY)

            # Log user context for audit trails
            if user_context:
                logger.info(f"[AI] Processing {request_type} request {ticket_id} for user {user_context['email']} (ID: {user_context['userId']})")
            else:
                logger.info(f"[AI] Processing {request_type} request {ticket_id} (no user context available)")

            if request_type == "NEW_BANNER":
                result = self._process_banner(ticket, policy_text)
            elif request_type == "NEW_FEATURE":
                result = self._process_feature(ticket, policy_text)
            else:
                result = self._needs_info([f"Unknown request type: {request_type}", "Manual review required"], 0.0)

            # Attach metadata and persist
            result["processed_at"] = datetime.utcnow().isoformat() + "Z"
            result["ticket_id"] = ticket_id
            result["request_type"] = request_type
            result["ai_analysis"] = True
            result["requester_email"] = ticket.get("requester_email", "")
            
            # Add user context to result for audit trails
            if user_context:
                result["user_context"] = {
                    "email": user_context["email"],
                    "userId": user_context["userId"],
                    "username": user_context.get("username", "")
                }

            write_result(ticket_id, result)
            logger.info(f"[AI] Decision for {ticket_id}: {result.get('decision')} ({result.get('confidence')}) - User: {user_context['email'] if user_context else 'unknown'}")
            return result

        except Exception as e:
            user_email = user_context['email'] if user_context else 'unknown'
            logger.exception(f"[AI] process_request failed for user {user_email}: {e}")
            return self._needs_info([f"System error: {str(e)}", "Manual review required"], 0.0)

    # ---------------------------
    # NEW_BANNER (policy-aligned)
    # ---------------------------
    def _process_banner(self, ticket: Dict[str, Any], policy_text: str) -> Dict[str, Any]:
        """
        Policy focus ONLY (skip frontend-validated checks):
          - Visual Content Quality (professional look, no blur/compression, etc.)
          - Content Appropriateness (no adult/offensive, no competitor branding, no misleading claims, copyright ok)
          - Brand Alignment (colors complementary to #5754FF; logo helpful but not strictly required)
          - URL Validation (approved domains only; flag external redirects)
        """
        reasons: List[str] = []

        # 1) URL Validation (whitelist + redirect hints)
        url_status = self._validate_urls(ticket.get("page_urls") or [])
        if url_status["reject_reasons"]:
            # Immediate reject on non-approved domain (per policy)
            return self._reject(url_status["reject_reasons"], confidence=0.9, analysis_method="policy_url_check")
        reasons.extend(url_status["needs_info_reasons"])  # e.g., possible redirect shorteners

        # 2) Visual Analysis via Nova Lite
        visual = self._run_visual_analysis(ticket, policy_text)

        # If no assets accessible -> Needs Info (visual focus cannot be applied)
        if visual is None:
            return self._needs_info(
                reasons + ["No accessible banner image to analyze"], confidence=0.6, analysis_method="policy_visual_focus"
            )

        # Interpret visual analysis per policy
        decision = self._visual_policy_decision(ticket, visual, prior_reasons=reasons)
        return decision

    def _validate_urls(self, urls: List[str]) -> Dict[str, List[str]]:
        """
        Returns:
            {
              "reject_reasons": [...],        # Non-approved domain
              "needs_info_reasons": [...]     # Potential external redirect that needs verification
            }
        """
        reject_reasons: List[str] = []
        needs_info_reasons: List[str] = []

        for url in urls:
            if not url:
                continue
            try:
                parsed = urlparse(url)
                host = (parsed.netloc or "").lower()

                # Approved domain check (exact host or subdomain)
                approved = host in APPROVED_DOMAINS or any(
                    host == d or host.endswith(f".{d}") for d in APPROVED_DOMAINS
                )
                if not approved:
                    reject_reasons.append(f"Non-approved URL domain: {url}")
                    continue

                # Redirect hints (cannot fully resolve in Lambda cheaply—flag for verification)
                # Only flag if the host contains redirect hints AND it's not our approved domain
                if any(hint in host for hint in REDIRECT_HOST_HINTS) and host not in APPROVED_DOMAINS:
                    needs_info_reasons.append(f"URL might be an external redirect: {url}")

            except Exception:
                # Malformed URL → ask for clarification
                needs_info_reasons.append(f"URL needs verification: {url}")

        return {"reject_reasons": reject_reasons, "needs_info_reasons": needs_info_reasons}

    def _run_visual_analysis(self, ticket: Dict[str, Any], policy_text: str) -> Optional[Dict[str, Any]]:
        assets = ticket.get("assets") or []
        image_urls: List[str] = []
        for a in assets:
            key = a.get("s3Key")
            if key:
                url = get_banner_image_url(key)
                if url:
                    image_urls.append(url)

        if not image_urls:
            return None

        try:
            if len(image_urls) == 1:
                return self.nova_analyzer.analyze_image_from_url(
                    image_urls[0], policy_text, ticket.get("id", "unknown")
                )
            return self.nova_analyzer.analyze_multiple_images(
                image_urls, policy_text, ticket.get("id", "unknown")
            )
        except Exception as e:
            logger.warning(f"[AI] Visual analysis failed; reason: {e}")
            return None

    def _visual_policy_decision(self, ticket: Dict[str, Any], visual: Dict[str, Any], prior_reasons: List[str]) -> Dict[str, Any]:
        """
        Map Nova Lite output to policy decisions.
        """
        reasons: List[str] = list(prior_reasons)
        content = (visual.get("content_appropriateness") or {})
        quality = (visual.get("visual_quality") or {})
        overall = (visual.get("overall_compliance") or {})

        appropriate = bool(content.get("appropriate", True))
        quality_score = float(quality.get("score", 0.0))
        issues = (quality.get("issues") or []) + (content.get("concerns") or [])
        confidence_ai = float(overall.get("confidence", 0.6))
        compliant_flag = bool(overall.get("compliant", False))

        # Policy hard REJECT conditions
        if not appropriate:
            # Try to surface specific concerns if present
            bad = content.get("concerns") or []
            if bad:
                reasons.extend(bad[:5 - len(reasons)])
            else:
                reasons.append("Inappropriate or unprofessional content detected")
            return self._reject(reasons[:5], confidence=max(0.7, confidence_ai), analysis_method="policy_visual", ticket=ticket)

        # Poor visual quality → REJECT (only for very poor quality)
        if quality_score <= 0.3 or any(k for k in issues if _looks_like_quality_blocker(k)):
            reasons.extend(_trim_to_fit(issues, max_items=5 - len(reasons)))
            return self._reject(reasons[:5], confidence=max(0.7, confidence_ai), analysis_method="policy_visual", ticket=ticket)

        # Brand alignment - more flexible color detection
        colors = [c.upper() for c in (visual.get("colors_detected") or [])]
        # Check for LogicCart purple or complementary colors (blues, purples, similar hues)
        brand_colors = ["#5754FF", "#5E60F1", "#6366F1", "#8B5CF6", "#A855F7", "#C084FC"]
        has_brand_color = any(c in colors for c in brand_colors) or any(
            any(brand in c for brand in ["5754", "5E60", "6366", "8B5C", "A855", "C084"]) for c in colors
        )
        is_festival = "festival" in (ticket.get("title", "") + " " + ticket.get("description", "")).lower()

        # More lenient AUTO-APPROVE criteria (policy-aligned)
        # Professional quality (lowered threshold), appropriate content, reasonable brand alignment
        if appropriate and quality_score >= 0.5 and (has_brand_color or is_festival or compliant_flag):
            return self._approve(
                ["Professional image quality", "Appropriate content", "Brand alignment acceptable"],
                confidence=min(1.0, max(0.8, confidence_ai)),
                analysis_method="policy_visual",
                ticket=ticket
            )

        # Conservative approval for borderline cases with no major issues
        if appropriate and quality_score >= 0.4 and compliant_flag and not issues:
            return self._approve(
                ["Meets policy standards", "No significant issues detected"],
                confidence=min(0.9, max(0.7, confidence_ai)),
                analysis_method="policy_visual",
                ticket=ticket
            )

        # NEEDS_INFO only for specific issues
        needs_info_reasons = list(prior_reasons)  # carry URL verification hints if any
        if quality_score < 0.4:
            needs_info_reasons.append("Image quality may need improvement")
        if not has_brand_color and not is_festival and not compliant_flag:
            needs_info_reasons.append("Brand alignment could be enhanced")

        # If no specific issues but model is uncertain, approve with lower confidence
        if not needs_info_reasons and appropriate:
            return self._approve(
                ["Acceptable quality", "No policy violations detected"],
                confidence=max(0.6, confidence_ai),
                analysis_method="policy_visual",
                ticket=ticket
            )

        # Only send NEEDS_INFO if there are actual specific issues to address
        if needs_info_reasons:
            email = self._banner_needs_info_email(ticket, needs_info_reasons)
            return self._needs_info(_trim_to_fit(needs_info_reasons), confidence=max(0.6, confidence_ai), email=email,
                                    analysis_method="policy_visual")

        # Final fallback - approve if content is appropriate
        return self._approve(
            ["Content appropriate", "No major policy violations"],
            confidence=max(0.6, confidence_ai),
            analysis_method="policy_visual",
            tet=tic
        )

    # ---------------------------
    # NEW_FEATURE (always Needs Info)
    # ---------------------------
    def _process_feature(self, ticket: Dict[str, Any], policy_text: str) -> Dict[str, Any]:
        """Always return NEEDS_INFO with the policy’s guidance email template."""
        email = self._feature_email_from_policy(ticket)
        return {
            "decision": "NEEDS_INFO",
            "reasons": ["New Feature requests require additional specification"],
            "confidence": 1.0,
            "email": email,
            "analysis_method": "policy_template",
        }

    # ---------------------------
    # Email builders (policy-consistent)
    # ---------------------------
    def _get_image_urls_section(self, ticket: Dict[str, Any]) -> str:
        """Helper method to get formatted image URLs section for emails"""
        image_urls = []
        assets = ticket.get("assets") or []
        for asset in assets:
            s3_key = asset.get("s3Key")
            if s3_key:
                image_url = get_banner_image_url(s3_key)
                if image_url:
                    image_urls.append(f"• {asset.get('filename', 'Image')}: {image_url}")
        
        return "\n".join(image_urls) if image_urls else "• No images attached"
    def _banner_approve_email(self, ticket: Dict[str, Any], reasons: List[str]) -> Dict[str, str]:
        subject = f"New Request {ticket.get('id','')} - Approved"
        bullet = "\n".join(f"• {r}" for r in _trim_to_fit(reasons))
        
        # Get S3 image URLs
        image_urls = []
        assets = ticket.get("assets") or []
        for asset in assets:
            s3_key = asset.get("s3Key")
            if s3_key:
                image_url = get_banner_image_url(s3_key)
                if image_url:
                    image_urls.append(f"• {asset.get('filename', 'Image')}: {image_url}")
        
        images_section = "\n".join(image_urls) if image_urls else "• No images attached"
        
        # Format page URLs
        page_urls = ticket.get("page_urls", [])
        if isinstance(page_urls, list) and page_urls:
            urls_text = ", ".join(page_urls)
        elif isinstance(page_urls, str):
            urls_text = page_urls
        else:
            urls_text = "(from form)"

        body = f"""Hello {ticket.get('requester_name','there')},

Great news! Your new banner request has been approved and is ready for implementation.

Approval Summary:
{bullet}

Next Steps:
• Your banner will be implemented by your target go-live date.
• You'll receive a confirmation email once it's live on the website
• No further action is required from you at this time

Implementation Details:
• Impacted Page Area: {ticket.get('page_area', '')}
• Impacted Page URL(s): {urls_text}
• Target Go-live Date: {ticket.get('launch_date', '')}
• Description: {ticket.get('description', '')}
• English Content: {ticket.get('copy_en')}
• Chinese Content: {ticket.get('copy_zh')}

Approved Images:
{images_section}

Questions?
Contact us at dev@logiccart.com

Best regards,
LogicCart Web Development Team

---
Request ID: {ticket.get('id','')}
Approved: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC
"""
        return {"subject": subject, "body": body}

    def _banner_needs_info_email(self, ticket: Dict[str, Any], reasons: List[str]) -> Dict[str, str]:
        subject = f"New Request {ticket.get('id','')} - Additional Information Required"
        bullet = "\n".join(f"• {r}" for r in _trim_to_fit(reasons))
        body = f"""Hello {ticket.get('requester_name','there')},

Thank you for submitting your new banner request. To finalize approval, please review:

{bullet}

Implementation Details:
• Impacted Page Area: {ticket.get('page_area', '(from form)')}
• Impacted Page URL(s): {', '.join(ticket.get('page_urls', [])) if ticket.get('page_urls') else '(from form)'}
• Target Go-live Date: {ticket.get('launch_date', '(from form)')}
• Description: {ticket.get('description', '')}
• English Content: {ticket.get('copy_en')}
• Chinese Content: {ticket.get('copy_zh')}

Submitted Images:
{self._get_image_urls_section(ticket)}

Once updated or clarified, please resubmit and we’ll complete the review.

Questions?
Contact us at dev@logiccart.com

Best regards,
LogicCart Web Development Team

---
Request ID: {ticket.get('id','')}
Submitted: {ticket.get('created_at','')}
"""
        return {"subject": subject, "body": body}

    def _banner_reject_email(self, ticket: Dict[str, Any], reasons: List[str]) -> Dict[str, str]:
        subject = f"New Request {ticket.get('id','')} - Not Approved"
        bullet = "\n".join(f"• {r}" for r in _trim_to_fit(reasons))
        body = f"""Hello {ticket.get('requester_name','there')},

Thank you for submitting your new banner request. Unfortunately, we cannot approve it in its current form due to the following policy violations:

Issues Found:
{bullet}

Recommendations:
• Review our brand guidelines at https://logiccart.com/brand-guidelines
• Ensure images meet professional quality standards (high resolution, no blur/pixelation)
• Use colors that complement LogicCart's purple theme (#5754FF)
• Verify content is appropriate for our e-commerce platform
• Check that URLs point to approved LogicCart domains only

Implementation Details:
• Impacted Page Area: {ticket.get('page_area', '(from form)')}
• Impacted Page URL(s): {', '.join(ticket.get('page_urls', [])) if ticket.get('page_urls') else '(from form)'}
• Target Go-live Date: {ticket.get('launch_date', '(from form)')}
• Description: {ticket.get('description', '')}
• English Content: {ticket.get('copy_en')}
• Chinese Content: {ticket.get('copy_zh')}

Submitted Images:
{self._get_image_urls_section(ticket)}

Next Steps:
• Address the issues listed above
• Resubmit your request with updated materials

Questions?
Contact us at dev@logiccart.com


Best regards,
LogicCart Web Development Team

---
Request ID: {ticket.get('id','')}
Reviewed: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC
"""
        return {"subject": subject, "body": body}

    def _feature_email_from_policy(self, ticket: Dict[str, Any]) -> Dict[str, str]:
        subject = f"New Request {ticket.get('id','')} - Additional Information Required"
        
        # Format page URLs properly
        page_urls = ticket.get("page_urls", [])
        if isinstance(page_urls, list) and page_urls:
            urls_text = ", ".join(page_urls)
        elif isinstance(page_urls, str):
            urls_text = page_urls
        else:
            urls_text = "(from form)"

        body = f"""Hello {ticket.get('requester_name', 'there')},

Thank you for submitting your new feature request. To ensure we build exactly what you need, please provide the following information:

Request Summary:
• Request Type: New Feature
• Department: {ticket.get('department')}
• Impacted Page Area: {ticket.get('page_area')}
• Impacted Page URLs: {urls_text}
• Target Go-live Date: {ticket.get('launch_date')}
• Description: {ticket.get('description', '')}
• English Content: {ticket.get('copy_en')}
• Chinese Content: {ticket.get('copy_zh')}

Additional Information Required:

1. Visual Design
• Reference images, wireframes or mockups showing the ideal user interface
• Figma links or design specifications if applicable
• Mobile and desktop layouts if applicable

2. Technical Specifications
• What data needs to be stored or retrieved?
• Any integrations with existing systems?
• Performance or scalability requirements?

3. Success Metrics
• How will we measure if this feature is successful?
• Expected user engagement or business impact?
• Any specific KPIs or targets?

Next Steps:
Please reply to this email with the above information. Once received, our development team will review and provide a timeline estimate.

Questions?
Contact us at dev@logiccart.com

Best regards,
LogicCart Web Development Team

---
Request ID: {ticket.get('id', '')}
Submitted: {ticket.get('created_at', '')}
"""
        return {"subject": subject, "body": body}

    # ---------------------------
    # Response helpers
    # ---------------------------
    def _approve(self, reasons: List[str], confidence: float, analysis_method: str, ticket: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        result = {
            "decision": "APPROVE",
            "reasons": _trim_to_fit(reasons),
            "confidence": min(1.0, max(0.0, confidence)),
            "analysis_method": analysis_method,
        }
        if ticket:
            result["email"] = self._banner_approve_email(ticket, reasons)
        return result

    def _reject(self, reasons: List[str], confidence: float, analysis_method: str, ticket: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        result = {
            "decision": "REJECT",
            "reasons": _trim_to_fit(reasons),
            "confidence": min(1.0, max(0.0, confidence)),
            "analysis_method": analysis_method,
        }
        if ticket:
            result["email"] = self._banner_reject_email(ticket, reasons)
        return result

    def _needs_info(
        self,
        reasons: List[str],
        confidence: float,
        email: Optional[Dict[str, str]] = None,
        analysis_method: str = "policy"
    ) -> Dict[str, Any]:
        out: Dict[str, Any] = {
            "decision": "NEEDS_INFO",
            "reasons": _trim_to_fit(reasons),
            "confidence": min(1.0, max(0.0, confidence)),
            "analysis_method": analysis_method,
        }
        if email:
            out["email"] = email
        return out


# ---------------------------
# Small utilities (pure)
# ---------------------------
def _trim_to_fit(items: List[str], max_items: int = 5) -> List[str]:
    return [s for s in items if s][:max_items]


def _looks_like_quality_blocker(text: str) -> bool:
    """
    Heuristic to map model issues to policy 'poor image quality' bucket.
    """
    t = (text or "").lower()
    keywords = [
        "blurry", "blur", "pixelation", "pixelated", "compression", "artifact",
        "low resolution", "poor resolution", "noisy", "distortion"
    ]
    return any(k in t for k in keywords)
