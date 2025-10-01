"""
AWS service integration tools for the LogicCart Bedrock Agent (MVP)

Responsibilities:
- Fetch ticket records from DynamoDB
- Fetch policy text from S3
- Persist AI decisions back to DynamoDB
- Send SNS email notifications for ALL decision statuses (APPROVE, REJECT, NEEDS_INFO)
- Generate short-lived, presigned S3 URLs for image assets

Notes:
- No hardcoded AWS account IDs, regions, or resource names.
- All configuration is driven by environment variables.
- Frontend-validated checks are NOT repeated here; mechanical validator is
  provided only as a utility if needed elsewhere.
"""

from __future__ import annotations

import json
import logging
import os
from decimal import Decimal
from typing import Any, Dict, Optional, List

import boto3
from botocore.exceptions import ClientError

# ------------------------------------------------------------------------------
# Logging
# ------------------------------------------------------------------------------
logger = logging.getLogger(__name__)
logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

# ------------------------------------------------------------------------------
# Environment configuration (no hardcoded values)
# ------------------------------------------------------------------------------
AWS_REGION = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION")
# If not set, boto3 will fall back to the execution environment’s region.

TICKETS_TABLE = os.getenv("TICKETS_TABLE", "tickets")  # Safe default; override in Lambda
POLICY_BUCKET = os.getenv("POLICY_BUCKET", "")
UPLOADS_BUCKET = os.getenv("UPLOADS_BUCKET", "")
SNS_TOPIC_ARN = os.getenv("SNS_TOPIC_ARN", "")

POLICY_DEFAULT_KEY = os.getenv("POLICY_FILE_KEY", "policy.md")
PRESIGNED_URL_TTL = int(os.getenv("PRESIGNED_URL_TTL", "300"))  # seconds

BEDROCK_MODEL = os.getenv("BEDROCK_MODEL", "amazon.nova-lite-v1:0")

# ------------------------------------------------------------------------------
# AWS clients (created once)
# ------------------------------------------------------------------------------
_dynamo_resource = boto3.resource("dynamodb", region_name=AWS_REGION) if AWS_REGION else boto3.resource("dynamodb")
_s3_client = boto3.client("s3", region_name=AWS_REGION) if AWS_REGION else boto3.client("s3")
_sns_client = boto3.client("sns", region_name=AWS_REGION) if AWS_REGION else boto3.client("sns")


# ------------------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------------------
def _decimalize(value: Any) -> Any:
    """Convert floats to Decimal for DynamoDB; pass through others."""
    if isinstance(value, float):
        return Decimal(str(value))
    return value


def _safe_json(obj: Any) -> str:
    """JSON dumps with Decimal handling."""
    def _default(o):
        if isinstance(o, Decimal):
            return float(o)
        return str(o)
    return json.dumps(obj, default=_default)


def _parse_assets(assets_data: Any) -> List[Dict[str, Any]]:
    """Parse assets from DynamoDB - could be JSON string or already parsed list."""
    if not assets_data:
        return []
    
    # If it's already a list, return it
    if isinstance(assets_data, list):
        return assets_data
    
    # If it's a string (JSON), parse it
    if isinstance(assets_data, str):
        try:
            parsed = json.loads(assets_data)
            return parsed if isinstance(parsed, list) else []
        except (json.JSONDecodeError, TypeError):
            logger.warning(f"Failed to parse assets JSON: {assets_data}")
            return []
    
    # Fallback for unexpected types
    return []


# ------------------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------------------
def get_ticket(ticket_id: str) -> Dict[str, Any]:
    """
    Retrieve ticket data from DynamoDB and normalize field names for the agent.

    Expected DynamoDB item (example fields):
      - ticketId (PK)
      - title, description, changeType, pageUrls, targetLaunchDate, urgency,
        requesterEmail, requesterName, department, language, copyEn, copyZh,
        notes, status, createdAt, assets (list of { s3Key, width, height, ... })

    Returns a dict with normalized keys used by the agent.
    """
    try:
        if not ticket_id:
            raise ValueError("ticket_id is required")

        logger.info(f"[tools] Fetch ticket: {ticket_id}")
        table = _dynamo_resource.Table(TICKETS_TABLE)
        resp = table.get_item(Key={"ticketId": ticket_id})

        if "Item" not in resp:
            raise ValueError(f"Ticket not found: {ticket_id}")

        item = resp["Item"]

        # Handle DynamoDB Sets and Lists for pageUrls
        page_urls_raw = item.get("pageUrls", [])
        if isinstance(page_urls_raw, set):
            page_urls = list(page_urls_raw)
        elif isinstance(page_urls_raw, list):
            page_urls = page_urls_raw
        else:
            page_urls = []

        ticket: Dict[str, Any] = {
            "id": item.get("ticketId"),
            "title": item.get("title", ""),
            "description": item.get("description", ""),
            "request_type": (item.get("changeType") or "").upper().replace(" ", "_"),
            "page_area": item.get("pageArea", ""),
            "page_urls": page_urls,
            "target_url": page_urls[0] if page_urls else "",
            "launch_date": item.get("targetLaunchDate", ""),
            "urgency": item.get("urgency", "medium"),
            "requester_email": item.get("requesterEmail", ""),
            "requester_name": item.get("requesterName", ""),
            "department": item.get("department", ""),
            "language": item.get("language", "English"),
            "copy_en": item.get("copyEn", ""),
            "copy_zh": item.get("copyZh", ""),
            "notes": item.get("notes", ""),
            "status": item.get("status", "pending"),
            "created_at": item.get("createdAt", ""),
            "assets": _parse_assets(item.get("assets", [])),
        }

        logger.info(f"[tools] Ticket {ticket_id} loaded (type={ticket['request_type']})")
        return ticket

    except ClientError as e:
        msg = f"DynamoDB error retrieving ticket {ticket_id}: {e}"
        logger.error(msg)
        raise Exception(msg)
    except Exception as e:
        msg = f"Error retrieving ticket {ticket_id}: {e}"
        logger.error(msg)
        raise Exception(msg)


def get_policy(policy_key: str = None) -> str:
    """
    Retrieve policy text from S3. Key defaults to POLICY_FILE_KEY/policy.md.
    """
    key = policy_key or POLICY_DEFAULT_KEY
    if not POLICY_BUCKET:
        raise Exception("POLICY_BUCKET is not configured")

    try:
        logger.info(f"[tools] Fetch policy from s3://{POLICY_BUCKET}/{key}")
        resp = _s3_client.get_object(Bucket=POLICY_BUCKET, Key=key)
        text = resp["Body"].read().decode("utf-8")
        logger.info(f"[tools] Policy loaded ({len(text)} chars)")
        return text

    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "Unknown")
        if code == "NoSuchKey":
            msg = f"Policy file not found: {key}"
        else:
            msg = f"S3 error retrieving policy {key}: {e}"
        logger.error(msg)
        raise Exception(msg)
    except Exception as e:
        msg = f"Error retrieving policy {key}: {e}"
        logger.error(msg)
        raise Exception(msg)


def write_result(ticket_id: str, result: Dict[str, Any]) -> bool:
    """
    Persist the AI decision to DynamoDB and (optionally) notify via SNS.

    Expected `result` schema:
      {
        "decision": "APPROVE|REJECT|NEEDS_INFO",
        "reasons": [.. up to 5 ..],
        "confidence": float,
        "processed_at": ISO8601Z,
        "analysis_method": "...",
        "email": { "subject": "...", "body": "..." }   # for NEEDS_INFO/REJECT
        "requester_email": "..."                       # optional for email meta
      }
    """
    try:
        logger.info(f"[tools] Persist decision for ticket {ticket_id}: {result.get('decision')}")

        table = _dynamo_resource.Table(TICKETS_TABLE)

        # Build update expression
        expr_vals: Dict[str, Any] = {
            ":decision": {
                "decision": result.get("decision"),
                "reasons": result.get("reasons", []),
                "confidence": _decimalize(result.get("confidence", 0.0)),
                "processedAt": result.get("processed_at", ""),
                "modelUsed": BEDROCK_MODEL,
                "analysisMethod": result.get("analysis_method", "policy"),
            },
            ":updated_at": result.get("processed_at", ""),
        }

        update_expr_parts = ["agentDecision = :decision", "updatedAt = :updated_at"]
        expr_names: Dict[str, str] = {}

        # Reflect core status transitions
        decision = result.get("decision")
        if decision in ("APPROVE", "REJECT", "NEEDS_INFO"):
            status_value = (
                "approved" if decision == "APPROVE"
                else "rejected" if decision == "REJECT"
                else "needs_info"
            )
            expr_vals[":status"] = status_value
            expr_names["#status"] = "status"
            update_expr_parts.append("#status = :status")

        update_expr = "SET " + ", ".join(update_expr_parts)

        # Build params without passing None for ExpressionAttributeNames
        params = {
            "Key": {"ticketId": ticket_id},
            "UpdateExpression": update_expr,
            "ExpressionAttributeValues": expr_vals,
        }
        if expr_names:
            params["ExpressionAttributeNames"] = expr_names

        table.update_item(**params)
        logger.info(f"[tools] DynamoDB updated for {ticket_id}")

        # Send SNS notification for ALL decision statuses
        if decision in ("APPROVE", "REJECT", "NEEDS_INFO"):
            notified = _send_notification(ticket_id, result)
            if notified:
                # save emailSent metadata (non-critical)
                email_subject = ""
                if result.get("email"):
                    email_subject = result["email"].get("subject", "")
                else:
                    # Generate default subject for APPROVE status
                    email_subject = f"LogicCart Request Update: {ticket_id}"
                
                table.update_item(
                    Key={"ticketId": ticket_id},
                    UpdateExpression="SET emailSent = :email_sent",
                    ExpressionAttributeValues={
                        ":email_sent": {
                            "sentAt": result.get("processed_at", ""),
                            "subject": email_subject,
                            "recipient": result.get("requester_email", ""),
                            "status": decision,
                        }
                    },
                )
                logger.info(f"[tools] Notification sent and recorded for {ticket_id} (status: {decision})")

        return True

    except ClientError as e:
        logger.error(f"DynamoDB error updating ticket {ticket_id}: {e}")
        return False
    except Exception as e:
        logger.error(f"Error updating ticket {ticket_id}: {e}")
        return False


def get_banner_image_url(s3_key: str) -> Optional[str]:
    """
    Generate a presigned URL for a banner asset in UPLOADS_BUCKET.

    Returns:
        URL string or None on error.
    """
    if not UPLOADS_BUCKET:
        logger.warning("UPLOADS_BUCKET not configured; cannot create presigned URL")
        return None

    try:
        logger.info(f"[tools] Presign s3://{UPLOADS_BUCKET}/{s3_key}")
        url = _s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": UPLOADS_BUCKET, "Key": s3_key},
            ExpiresIn=PRESIGNED_URL_TTL,
        )
        return url
    except ClientError as e:
        logger.error(f"Error generating presigned URL for {s3_key}: {e}")
        return None
    except Exception as e:
        logger.error(f"Error generating presigned URL for {s3_key}: {e}")
        return None


# ------------------------------------------------------------------------------
# Optional utilities (not used by policy-aligned path; kept for reuse/testing)
# ------------------------------------------------------------------------------
def validate_file_metadata(asset: Dict[str, Any]) -> Dict[str, bool]:
    """
    Basic mechanical checks for a single asset.
    NOTE: Per policy, the agent SHOULD NOT rely on these (frontend already validates).
    This remains available for tools/tests if needed.

    Returns:
        {
          "file_size_valid": bool,
          "mime_type_valid": bool,
          "dimensions_valid": bool,
          "alt_text_valid": bool
        }
    """
    results = {
        "file_size_valid": False,
        "mime_type_valid": False,
        "dimensions_valid": False,
        "alt_text_valid": False,
    }

    try:
        # Size (≤ 5 MB as a generic ceiling; frontend enforces 500KB/image)
        size_kb = asset.get("sizeKb") or asset.get("size_kb") or 0
        size_bytes = int(size_kb) * 1024 if isinstance(size_kb, (int, float)) else 0
        results["file_size_valid"] = size_bytes > 0 and size_bytes <= 5_242_880

        # MIME type
        content_type = (asset.get("contentType") or asset.get("mimeType") or "").lower()
        valid_types = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
        results["mime_type_valid"] = content_type in valid_types

        # Dimensions: policy says frontend already validates — keep this neutral
        width = int(asset.get("width") or 0)
        height = int(asset.get("height") or 0)
        results["dimensions_valid"] = (width > 0 and height > 0)

        # Alt text presence
        alt_text = (asset.get("altText") or asset.get("alt_text") or "").strip()
        results["alt_text_valid"] = len(alt_text) > 0

        logger.debug(f"[tools] Mechanical validation (neutral): {results}")
        return results

    except Exception as e:
        logger.error(f"Error validating file metadata: {e}")
        return results


# ------------------------------------------------------------------------------
# Internal
# ------------------------------------------------------------------------------
def _send_notification(ticket_id: str, result: Dict[str, Any]) -> bool:
    """
    Publish an email notification via SNS for all decision statuses.
    """
    if not SNS_TOPIC_ARN:
        logger.warning("SNS_TOPIC_ARN not configured; skipping notification")
        return False

    try:
        decision = result.get("decision", "UNKNOWN")
        email = result.get("email") or {}
        
        # Use custom email content if provided, otherwise generate default
        if email.get("subject") and email.get("body"):
            subject = email["subject"]
            body = email["body"]
        else:
            # Generate default notification content based on decision
            subject = _generate_default_subject(ticket_id, decision)
            body = _generate_default_body(ticket_id, decision, result)

        # Using message structure for email protocol is safe and flexible
        message = {
            "default": body,
            "email": body,
        }

        # Add message attributes for SNS filtering
        message_attributes = {
            'decision': {
                'DataType': 'String',
                'StringValue': decision
            },
            'ticketId': {
                'DataType': 'String',
                'StringValue': ticket_id
            }
        }
        
        if result.get("requester_email"):
            message_attributes['requesterEmail'] = {
                'DataType': 'String',
                'StringValue': result["requester_email"]
            }

        resp = _sns_client.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=subject[:100],  # SNS Subject limit
            Message=json.dumps(message),
            MessageStructure="json",
            MessageAttributes=message_attributes
        )
        logger.info(f"[tools] SNS published for {ticket_id} (decision: {decision}, MessageId={resp.get('MessageId')})")
        return True

    except ClientError as e:
        logger.error(f"SNS error for {ticket_id}: {e}")
        return False
    except Exception as e:
        logger.error(f"SNS publish error for {ticket_id}: {e}")
        return False


def _generate_default_subject(ticket_id: str, decision: str) -> str:
    """Generate default email subject based on decision status."""
    subject_map = {
        'APPROVE': f'LogicCart Request - Approved: {ticket_id}',
        'REJECT': f'LogicCart Request - Rejected: {ticket_id}',
        'NEEDS_INFO': f'LogicCart Request - Additional Information Required: {ticket_id}'
    }
    return subject_map.get(decision, f'LogicCart Request Update: {ticket_id}')


def _generate_default_body(ticket_id: str, decision: str, result: Dict[str, Any]) -> str:
    """Generate default email body based on decision status."""
    reasons = result.get("reasons", [])
    confidence = result.get("confidence", 0.0)
    processed_at = result.get("processed_at", "")
    
    reasons_text = ""
    if reasons:
        reasons_text = "\n\nReasons:\n" + "\n".join(f"• {reason}" for reason in reasons[:5])
    
    body_map = {
        'APPROVE': f"""Your LogicCart website change request has been approved.

Request ID: {ticket_id}
Status: APPROVED
Processed: {processed_at}
Confidence: {confidence:.1%}
{reasons_text}

Next Steps:
- Development team will begin implementation
- You will receive updates on progress

Best regards,
LogicCart Website Change Request System""",

        'REJECT': f"""Your LogicCart website change request has been rejected.

Request ID: {ticket_id}
Status: REJECTED
Processed: {processed_at}
Confidence: {confidence:.1%}
{reasons_text}

Next Steps:
- Review the feedback above
- Make necessary adjustments to your request
- Resubmit with required changes

Best regards,
LogicCart Website Change Request System""",

        'NEEDS_INFO': f"""Your LogicCart website change request requires additional information.

Request ID: {ticket_id}
Status: NEEDS ADDITIONAL INFORMATION
Processed: {processed_at}
Confidence: {confidence:.1%}
{reasons_text}

Next Steps:
- Please provide the requested information
- Reply to this email or resubmit your request

Best regards,
LogicCart Website Change Request System"""
    }
    
    return body_map.get(decision, f"""Your LogicCart website change request has been updated.

Request ID: {ticket_id}
Status: {decision}
Processed: {processed_at}

Best regards,
LogicCart Website Change Request System""")
