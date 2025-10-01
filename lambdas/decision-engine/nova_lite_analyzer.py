"""
Amazon Nova Lite integration for banner image visual analysis
- Focuses ONLY on visual checks per policy (quality, appropriateness, brand alignment)
- Skips frontend-validated items (dimensions, file size, alt text, required fields)
- Uses environment-driven configuration (no hardcoded account/region/resources)

Outputs a normalized analysis dict consumed by the handler.
"""

from __future__ import annotations

import base64
import json
import logging
import os
from typing import Any, Dict, List, Optional, Tuple

import boto3
from urllib.request import urlopen
from urllib.error import URLError
from botocore.exceptions import ClientError

from system_prompts import ModelConfiguration
from logging_config import get_logger, log_function_call, LogCategory

logger = get_logger()

# Environment / Config
AWS_REGION = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION")
BEDROCK_MODEL = os.getenv("BEDROCK_MODEL", ModelConfiguration.NOVA_LITE_CONFIG["model_id"])
HTTP_TIMEOUT_SEC = int(os.getenv("HTTP_TIMEOUT_SEC", "30"))  # image download timeout


class NovaLiteAnalyzer:
    """Handles vision analysis using Amazon Nova Lite (Bedrock)"""

    def __init__(self):
        cfg = ModelConfiguration.NOVA_LITE_CONFIG
        # Region and model may be overridden by env
        self.region = AWS_REGION or cfg.get("region")
        self.model_id = BEDROCK_MODEL
        self.inference_config = ModelConfiguration.get_inference_config()

        # Initialize Bedrock client
        self.bedrock = (
            boto3.client("bedrock-runtime", region_name=self.region)
            if self.region
            else boto3.client("bedrock-runtime")
        )

        logger.log_agent_start("nova_lite_init", "MODEL_INIT", self.model_id)

    # ------------------------- Prompt construction ------------------------- #
    def create_banner_analysis_prompt(self, policy_text: str) -> str:
        """
        Create system prompt for **visual** banner compliance analysis per policy.
        We intentionally DO NOT ask the model to re-check frontend-validated items.
        """
        return f"""
You are a visual compliance analyzer for LogicCart. Focus ONLY on the visual checks below.
Do NOT evaluate file size, image format, dimensions, alt text, or required fields
(these are already validated in frontend and must be ignored here).

POLICY (visual scope):
{policy_text}

Return a compact JSON object with:
{{
  "colors_detected": ["hex colors, prominent only"],
  "logo_present": boolean,
  "brand_elements": ["detected brand elements"],
  "text_content": ["major readable text"],
  "visual_quality": {{"score": 0.0-1.0, "issues": ["quality issues only (e.g., blur, pixelation, artifacts)"]}},
  "accessibility": {{"contrast_adequate": boolean, "text_readable": boolean}},
  "content_appropriateness": {{"appropriate": boolean, "concerns": ["policy concerns only (e.g., offensive content, competitor logos, misleading claims, watermarks)"]}},
  "overall_compliance": {{"compliant": boolean, "confidence": 0.0-1.0, "summary": "one-line justification"}}
}}

Key checks:
- Visual quality: no blur, pixelation, artifacts; professional look
- Appropriateness: no adult/offensive content; no competitor branding; no misleading claims; no obvious watermarks
- Brand alignment: LogicCart purple (#5754FF) generally present or complementary palette
- URL/domain evaluation is OUT OF SCOPE for vision; do not perform non-visual checks
"""

    # ------------------------- Public API ------------------------- #
    @log_function_call(LogCategory.MODEL_OUTPUT)
    def analyze_image_from_url(self, image_url: str, policy_text: str, ticket_id: str = "nova_viz") -> Dict[str, Any]:
        """
        Analyze a single banner image (bytes from presigned S3 URL) with Nova Lite.

        Returns a normalized analysis dict. If an error occurs, returns an error-shaped dict.
        """
        try:
            logger.logger.info(f"[nova] Downloading image for analysis: {image_url[:80]}...")
            image_bytes, content_type = self._download_image(image_url)
            if not image_bytes:
                return self._create_error_analysis("Image download failed: empty payload")

            img_format = self._detect_image_format(image_bytes, content_type)

            system_prompt = self.create_banner_analysis_prompt(policy_text)

            request_body = {
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"text": "Analyze this banner image per the visual policy scope and return JSON."},
                            {
                                "image": {
                                    "format": img_format,
                                    "source": {"bytes": base64.b64encode(image_bytes).decode("utf-8")},
                                }
                            },
                        ],
                    }
                ],
                "system": [{"text": system_prompt}],
                "inferenceConfig": self.inference_config,
            }

            # Rough token estimates for cost tracking
            est_in_tokens = len(system_prompt) // 4 + len(image_bytes) // 1000

            try:
                response = self.bedrock.invoke_model(
                    modelId=self.model_id,
                    body=json.dumps(request_body),
                    contentType="application/json",
                    accept="application/json",
                )

                body = response.get("body")
                if hasattr(body, "read"):
                    body = body.read()

                resp_json = json.loads(body)
                # Nova schema: output.message.content[0].text
                analysis_text = (
                    resp_json.get("output", {})
                    .get("message", {})
                    .get("content", [{}])[0]
                    .get("text", "")
                )

                est_out_tokens = len(analysis_text) // 4
                logger.log_model_output(ticket_id, self.model_id, est_in_tokens, est_out_tokens, analysis_text, True)

                return self._parse_analysis_response(analysis_text)

            except ClientError as e:
                code = e.response.get("Error", {}).get("Code", "Unknown")
                logger.log_tool_error(ticket_id, "bedrock_invoke", str(e), code)
                return self._create_error_analysis(f"Bedrock error ({code})")

            except Exception as e:
                logger.log_tool_error(ticket_id, "bedrock_invoke", str(e), "invoke_exception")
                return self._create_error_analysis(f"Bedrock invoke exception: {e}")

        except Exception as e:
            logger.log_exception(ticket_id, e, "Nova Lite single-image analysis")
            return self._create_error_analysis(f"Unhandled analyzer error: {e}")

    def analyze_multiple_images(self, image_urls: List[str], policy_text: str, ticket_id: str = "nova_multi") -> Dict[str, Any]:
        """
        Analyze multiple banner images (e.g., desktop + mobile variants) and combine results.
        """
        try:
            if not image_urls:
                return self._create_error_analysis("No image URLs provided")

            logger.logger.info(f"[nova] Multi-image analysis: {len(image_urls)} image(s)")
            analyses: List[Dict[str, Any]] = []
            for idx, url in enumerate(image_urls):
                single = self.analyze_image_from_url(url, policy_text, ticket_id=ticket_id)
                single["image_index"] = idx
                analyses.append(single)

            return self._combine_analyses(analyses)

        except Exception as e:
            logger.log_exception(ticket_id, e, "Nova Lite multi-image analysis")
            return self._create_error_analysis(f"Multi-image analysis error: {e}")

    # ------------------------- Internals ------------------------- #
    def _download_image(self, image_url: str) -> Tuple[Optional[bytes], Optional[str]]:
        """Download image from a presigned S3 URL (or any HTTPS) and return bytes + content-type."""
        try:
            with urlopen(image_url, timeout=HTTP_TIMEOUT_SEC) as resp:
                content = resp.read()
                content_type = resp.headers.get("Content-Type", "").lower()
                return content, content_type
        except (URLError, Exception) as e:
            logger.logger.error(f"[nova] HTTP error downloading image: {e}")
            return None, None
        except Exception as e:
            logger.logger.error(f"[nova] Unexpected error downloading image: {e}")
            return None, None

    def _detect_image_format(self, image_bytes: bytes, content_type: Optional[str]) -> str:
        """
        Very lightweight image format sniffing to choose one of: png | jpeg | webp.
        Defaults to 'png' if unknown (Bedrock accepts the label; bytes are authoritative).
        """
        if content_type:
            if "png" in content_type:
                return "png"
            if "jpeg" in content_type or "jpg" in content_type:
                return "jpeg"
            if "webp" in content_type:
                return "webp"

        # Magic number sniffing
        header = image_bytes[:12]
        if header.startswith(b"\x89PNG\r\n\x1a\n"):
            return "png"
        if header.startswith(b"\xFF\xD8\xFF"):
            return "jpeg"
        if header[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP":
            return "webp"

        return "png"

    def _parse_analysis_response(self, analysis_text: str) -> Dict[str, Any]:
        """
        Extract JSON from model output text (handles plain JSON or fenced blocks).
        Returns normalized analysis dict; falls back when parsing fails.
        """
        try:
            json_str = self._extract_json(analysis_text)
            if not json_str:
                return self._create_fallback_analysis(analysis_text)

            parsed = json.loads(json_str)
            return self._validate_analysis_structure(parsed)

        except json.JSONDecodeError:
            return self._create_fallback_analysis(analysis_text)
        except Exception as e:
            logger.logger.error(f"[nova] Parse error: {e}")
            return self._create_fallback_analysis(analysis_text)

    @staticmethod
    def _extract_json(text: str) -> Optional[str]:
        """Grab the first JSON object from text (removes ```json fences if present)."""
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

    def _validate_analysis_structure(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize fields; ensure required keys exist with safe defaults.
        """
        out = {
            "colors_detected": analysis.get("colors_detected", []) or [],
            "logo_present": bool(analysis.get("logo_present", False)),
            "brand_elements": analysis.get("brand_elements", []) or [],
            "text_content": analysis.get("text_content", []) or [],
            "visual_quality": analysis.get("visual_quality", {}) or {},
            "accessibility": analysis.get("accessibility", {}) or {},
            "content_appropriateness": analysis.get("content_appropriateness", {}) or {},
            "overall_compliance": analysis.get("overall_compliance", {}) or {},
        }

        # visual_quality
        vq = out["visual_quality"]
        if "score" not in vq or not isinstance(vq.get("score"), (int, float)):
            vq["score"] = 0.5
        if "issues" not in vq or not isinstance(vq.get("issues"), list):
            vq["issues"] = []

        # accessibility
        acc = out["accessibility"]
        acc["contrast_adequate"] = bool(acc.get("contrast_adequate", False))
        acc["text_readable"] = bool(acc.get("text_readable", False))

        # content_appropriateness
        ca = out["content_appropriateness"]
        ca["appropriate"] = bool(ca.get("appropriate", True))
        if not isinstance(ca.get("concerns"), list):
            ca["concerns"] = []

        # overall_compliance
        oc = out["overall_compliance"]
        oc["compliant"] = bool(oc.get("compliant", False))
        if not isinstance(oc.get("confidence"), (int, float)):
            oc["confidence"] = 0.5
        if not isinstance(oc.get("summary", ""), str):
            oc["summary"] = "Analysis completed"

        return out

    def _create_fallback_analysis(self, analysis_text: str) -> Dict[str, Any]:
        """
        When the model returns non-JSON or ambiguous output, salvage basic hints
        without inventing non-visual/unsupported checks.
        """
        text_lower = (analysis_text or "").lower()
        colors: List[str] = []
        if "#5754ff" in text_lower or "purple" in text_lower:
            colors.append("#5754FF")

        logo_flag = any(k in text_lower for k in ["logo", "logicart", "branding"])

        return {
            "colors_detected": list(set(colors)),
            "logo_present": logo_flag,
            "brand_elements": ["LogicCart branding"] if logo_flag else [],
            "text_content": [],
            "visual_quality": {"score": 0.4, "issues": ["Unable to parse model JSON"]},
            "accessibility": {"contrast_adequate": False, "text_readable": False},
            "content_appropriateness": {"appropriate": True, "concerns": []},
            "overall_compliance": {
                "compliant": False,
                "confidence": 0.3,
                "summary": "Fallback generated due to parsing issues",
            },
            "raw_analysis": analysis_text,
            "parsing_error": True,
        }

    def _create_error_analysis(self, error_message: str) -> Dict[str, Any]:
        """Return an error-shaped analysis result."""
        return {
            "colors_detected": [],
            "logo_present": False,
            "brand_elements": [],
            "text_content": [],
            "visual_quality": {"score": 0.0, "issues": [f"Analysis failed: {error_message}"]},
            "accessibility": {"contrast_adequate": False, "text_readable": False},
            "content_appropriateness": {
                "appropriate": False,
                "concerns": ["Visual analysis unavailable"],
            },
            "overall_compliance": {
                "compliant": False,
                "confidence": 0.0,
                "summary": f"Analysis failed: {error_message}",
            },
            "error": True,
            "error_message": error_message,
        }

    def _combine_analyses(self, analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Combine multiple analysis dicts into one (union signals and averaged scores).
        """
        if not analyses:
            return self._create_error_analysis("No analyses to combine")
        if len(analyses) == 1:
            combined = analyses[0]
            combined["combined_analysis"] = False
            return combined

        colors: List[str] = []
        brands: List[str] = []
        texts: List[str] = []
        logo_present = False
        vq_scores: List[float] = []
        oc_scores: List[float] = []
        appropriate_all = True
        concerns: List[str] = []

        for a in analyses:
            if a.get("error"):
                continue
            colors.extend(a.get("colors_detected", []))
            brands.extend(a.get("brand_elements", []))
            texts.extend(a.get("text_content", []))
            logo_present = logo_present or a.get("logo_present", False)
            vq_scores.append(a.get("visual_quality", {}).get("score", 0.0))
            oc_scores.append(a.get("overall_compliance", {}).get("confidence", 0.0))
            ca = a.get("content_appropriateness", {})
            appropriate_all = appropriate_all and ca.get("appropriate", True)
            concerns.extend(ca.get("concerns", []))

        avg_vq = (sum(vq_scores) / len(vq_scores)) if vq_scores else 0.0
        avg_conf = (sum(oc_scores) / len(oc_scores)) if oc_scores else 0.0

        return {
            "colors_detected": sorted(set(colors)),
            "logo_present": logo_present,
            "brand_elements": sorted(set(brands)),
            "text_content": sorted(set(texts)),
            "visual_quality": {"score": avg_vq, "issues": []},
            "accessibility": {
                # Heuristic: if average visual quality is high, readability likely OK
                "contrast_adequate": avg_vq >= 0.6,
                "text_readable": avg_vq >= 0.5,
            },
            "content_appropriateness": {"appropriate": appropriate_all, "concerns": sorted(set(concerns))},
            "overall_compliance": {
                "compliant": (avg_conf >= 0.7) and appropriate_all,
                "confidence": avg_conf,
                "summary": f"Combined analysis of {len(analyses)} images",
            },
            "individual_analyses": analyses,
            "combined_analysis": True,
        }


# Factory
def create_nova_lite_analyzer() -> NovaLiteAnalyzer:
    return NovaLiteAnalyzer()
