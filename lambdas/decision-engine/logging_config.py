"""
Comprehensive logging configuration for LogicCart Decision Agent
- Structured JSON logs for CloudWatch
- Performance & cost tracking helpers
- Safe decorator for function-call logging
"""

from __future__ import annotations

import json
import logging
import os
import sys
import traceback
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional


# ---------- Enums ---------- #

class LogLevel(Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class LogCategory(Enum):
    AGENT_PROCESSING = "agent_processing"
    MODEL_OUTPUT = "model_output"
    TOOL_ERROR = "tool_error"
    DECISION_REASONING = "decision_reasoning"
    FALLBACK_ANALYSIS = "fallback_analysis"
    ERROR_HANDLING = "error_handling"
    PERFORMANCE = "performance"
    SECURITY = "security"
    COST_TRACKING = "cost_tracking"


# ---------- JSON Formatter ---------- #

class CloudWatchJSONFormatter(logging.Formatter):
    """
    JSON formatter for CloudWatch logs.
    Keeps entries concise & query-friendly.
    """

    def format(self, record: logging.LogRecord) -> str:
        entry: Dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, timezone.utc)
            .isoformat()
            .replace("+00:00", "Z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Common extras
        for key in (
            "category",
            "ticket_id",
            "request_type",
            "model",
            "decision",
            "confidence",
            "processing_time_ms",
            "error_type",
            "fallback_reason",
        ):
            if hasattr(record, key):
                entry[key] = getattr(record, key)

        # Include any additional extras that were passed via 'extra'
        for k, v in record.__dict__.items():
            if k in entry:
                continue
            if k.startswith(("_", "args")):
                continue
            if k in {
                "name",
                "msg",
                "levelname",
                "levelno",
                "pathname",
                "filename",
                "module",
                "lineno",
                "funcName",
                "created",
                "msecs",
                "relativeCreated",
                "thread",
                "threadName",
                "processName",
                "process",
                "exc_info",
                "exc_text",
                "stack_info",
            }:
                continue
            entry.setdefault(k, v)

        # Attach formatted exception if present
        if record.exc_info:
            entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(entry, ensure_ascii=False, default=str)


# ---------- Structured Logger ---------- #

class StructuredLogger:
    """
    Singleton-style structured logger for the agent.
    Emits JSON entries suitable for CloudWatch Logs insights queries.
    """

    def __init__(self, name: str = "LogicCartDecisionAgent") -> None:
        self.logger = logging.getLogger(name)

        # Avoid duplicate handlers in Lambda warm starts
        if not self.logger.handlers:
            self.logger.setLevel(logging.INFO)
            handler = logging.StreamHandler(sys.stdout)
            handler.setFormatter(CloudWatchJSONFormatter())
            self.logger.addHandler(handler)

        # Honor env LOG_LEVEL, default INFO
        level_name = os.getenv("LOG_LEVEL", "INFO").upper()
        level = getattr(logging, level_name, logging.INFO)
        self.logger.setLevel(level)

        self.logger.info(
            "StructuredLogger initialized",
            extra={"category": LogCategory.AGENT_PROCESSING.value, "log_level": level_name},
        )

    # --- Convenience emitters ---

    def log_agent_start(self, ticket_id: str, request_type: str, model: str) -> None:
        self.logger.info(
            "Agent processing started",
            extra={
                "category": LogCategory.AGENT_PROCESSING.value,
                "ticket_id": ticket_id,
                "request_type": request_type,
                "model": model,
                "timestamp": _iso_now(),
            },
        )

    def log_agent_completion(
        self, ticket_id: str, decision: str, confidence: float, processing_time_ms: float
    ) -> None:
        self.logger.info(
            "Agent processing completed",
            extra={
                "category": LogCategory.AGENT_PROCESSING.value,
                "ticket_id": ticket_id,
                "decision": decision,
                "confidence": confidence,
                "processing_time_ms": processing_time_ms,
                "timestamp": _iso_now(),
            },
        )

    def log_model_output(
        self,
        ticket_id: str,
        model: str,
        input_tokens: Optional[int],
        output_tokens: Optional[int],
        raw_output: str,
        parsed_successfully: bool,
    ) -> None:
        self.logger.info(
            "Model output received",
            extra={
                "category": LogCategory.MODEL_OUTPUT.value,
                "ticket_id": ticket_id,
                "model": model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "output_length": len(raw_output),
                "parsed_successfully": parsed_successfully,
                "raw_output_preview": (raw_output[:500] + "...") if len(raw_output) > 500 else raw_output,
                "timestamp": _iso_now(),
            },
        )

    def log_decision_reasoning(
        self,
        ticket_id: str,
        decision: str,
        reasons: List[str],
        confidence: float,
        analysis_details: Dict[str, Any],
    ) -> None:
        self.logger.info(
            "Decision reasoning",
            extra={
                "category": LogCategory.DECISION_REASONING.value,
                "ticket_id": ticket_id,
                "decision": decision,
                "reasons": reasons,
                "confidence": confidence,
                "analysis_method": analysis_details.get("analysis_method", "standard"),
                "mechanical_score": analysis_details.get("mechanical_score"),
                "visual_score": analysis_details.get("visual_score"),
                "content_score": analysis_details.get("content_score"),
                "timestamp": _iso_now(),
            },
        )

    def log_fallback_analysis(self, ticket_id: str, reason: str, fallback_method: str, confidence: float) -> None:
        self.logger.warning(
            "Fallback analysis activated",
            extra={
                "category": LogCategory.FALLBACK_ANALYSIS.value,
                "ticket_id": ticket_id,
                "fallback_reason": reason,
                "fallback_method": fallback_method,
                "confidence": confidence,
                "timestamp": _iso_now(),
            },
        )

    def log_tool_error(
        self, ticket_id: str, tool_name: str, error_message: str, error_type: str, retry_count: int = 0
    ) -> None:
        self.logger.error(
            "Tool execution error",
            extra={
                "category": LogCategory.TOOL_ERROR.value,
                "ticket_id": ticket_id,
                "tool_name": tool_name,
                "error_message": error_message,
                "error_type": error_type,
                "retry_count": retry_count,
                "timestamp": _iso_now(),
            },
        )

    def log_error_handling(
        self,
        ticket_id: str,
        original_error: str,
        error_type: str,
        handling_strategy: str,
        result: Dict[str, Any],
    ) -> None:
        self.logger.warning(
            "Error handling activated",
            extra={
                "category": LogCategory.ERROR_HANDLING.value,
                "ticket_id": ticket_id,
                "original_error": original_error,
                "error_type": error_type,
                "handling_strategy": handling_strategy,
                "result_decision": result.get("decision"),
                "manual_review_required": result.get("manual_review_required", False),
                "timestamp": _iso_now(),
            },
        )

    def log_performance_metrics(self, ticket_id: str, metrics: Dict[str, Any]) -> None:
        self.logger.info(
            "Performance metrics",
            extra={
                "category": LogCategory.PERFORMANCE.value,
                "ticket_id": ticket_id,
                "metrics": metrics,
                "timestamp": _iso_now(),
            },
        )

    def log_cost_tracking(
        self, ticket_id: str, model: str, input_tokens: int, output_tokens: int, estimated_cost_usd: float
    ) -> None:
        self.logger.info(
            "Cost tracking",
            extra={
                "category": LogCategory.COST_TRACKING.value,
                "ticket_id": ticket_id,
                "model": model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "estimated_cost_usd": estimated_cost_usd,
                "timestamp": _iso_now(),
            },
        )

    def log_security_event(self, ticket_id: str, event_type: str, details: Dict[str, Any]) -> None:
        self.logger.warning(
            "Security event",
            extra={
                "category": LogCategory.SECURITY.value,
                "ticket_id": ticket_id,
                "event_type": event_type,
                "details": details,
                "timestamp": _iso_now(),
            },
        )

    def log_exception(self, ticket_id: str, exception: Exception, context: str = "") -> None:
        self.logger.error(
            "Exception occurred",
            extra={
                "category": LogCategory.ERROR_HANDLING.value,
                "ticket_id": ticket_id,
                "exception_type": type(exception).__name__,
                "exception_message": str(exception),
                "context": context,
                "stack_trace": traceback.format_exc(),
                "timestamp": _iso_now(),
            },
        )


# ---------- Performance & Cost Tracking ---------- #

class PerformanceTracker:
    """
    Lightweight performance tracker.
    Collects coarse metrics per ticket; logs on finish.
    """

    def __init__(self, logger: StructuredLogger) -> None:
        self.logger = logger
        self._start: Optional[datetime] = None
        self.ticket_id: str = "unknown"
        self.metrics: Dict[str, Any] = {}

    def start_tracking(self, ticket_id: str) -> None:
        self.ticket_id = ticket_id or "unknown"
        self._start = datetime.now(timezone.utc)
        self.metrics = {
            "start_time": _iso_now(),
            "model_calls": 0,
            "tool_calls": 0,
            "errors": 0,
        }

    def record_model_call(self, model: str, duration_ms: float, input_tokens: int, output_tokens: int) -> None:
        self.metrics["model_calls"] += 1
        self.metrics[f"model_{model}_duration_ms"] = duration_ms
        self.metrics[f"model_{model}_input_tokens"] = input_tokens
        self.metrics[f"model_{model}_output_tokens"] = output_tokens

    def record_tool_call(self, tool_name: str, duration_ms: float, success: bool) -> None:
        self.metrics["tool_calls"] += 1
        self.metrics[f"tool_{tool_name}_duration_ms"] = duration_ms
        self.metrics[f"tool_{tool_name}_success"] = success
        if not success:
            self.metrics["errors"] += 1

    def finish_tracking(self) -> Dict[str, Any]:
        if not self._start:
            return {}
        end = datetime.now(timezone.utc)
        total_ms = (end - self._start).total_seconds() * 1000.0
        self.metrics["end_time"] = end.isoformat().replace("+00:00", "Z")
        self.metrics["total_time_ms"] = total_ms
        self.logger.log_performance_metrics(self.ticket_id, self.metrics)
        return self.metrics


class CostTracker:
    """
    Simple cost tracker for Nova Lite usage estimation (env/price-agnostic).
    """

    NOVA_LITE_PRICING = {
        "input_per_1k": 0.00006,   # USD per 1K input tokens
        "output_per_1k": 0.00024,  # USD per 1K output tokens
    }

    def __init__(self, logger: StructuredLogger) -> None:
        self.logger = logger
        self._entries: List[Dict[str, Any]] = []

    def calculate_model_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        if "nova-lite" in model.lower():
            return (input_tokens / 1000.0) * self.NOVA_LITE_PRICING["input_per_1k"] + (
                output_tokens / 1000.0
            ) * self.NOVA_LITE_PRICING["output_per_1k"]
        # default nominal
        return 0.001

    def track_model_usage(self, ticket_id: str, model: str, input_tokens: int, output_tokens: int) -> float:
        cost = self.calculate_model_cost(model, input_tokens, output_tokens)
        self._entries.append(
            {
                "ticket_id": ticket_id,
                "model": model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost_usd": cost,
                "timestamp": _iso_now(),
            }
        )
        self.logger.log_cost_tracking(ticket_id, model, input_tokens, output_tokens, cost)
        return cost

    def get_session_total_cost(self) -> float:
        return sum(e["cost_usd"] for e in self._entries)

    def get_daily_cost_estimate(self, requests_per_day: int = 100) -> float:
        if not self._entries:
            return 0.0
        avg = self.get_session_total_cost() / max(len(self._entries), 1)
        return avg * requests_per_day


# ---------- Global accessors ---------- #

_global_logger: Optional[StructuredLogger] = None


def get_logger() -> StructuredLogger:
    global _global_logger
    if _global_logger is None:
        _global_logger = StructuredLogger()
    return _global_logger


def create_performance_tracker() -> PerformanceTracker:
    return PerformanceTracker(get_logger())


def create_cost_tracker() -> CostTracker:
    return CostTracker(get_logger())


# ---------- Context manager ---------- #

class PerformanceContext:
    """Context manager for automatic performance tracking."""

    def __init__(self, ticket_id: str) -> None:
        self.ticket_id = ticket_id
        self.tracker = create_performance_tracker()

    def __enter__(self) -> PerformanceTracker:
        self.tracker.start_tracking(self.ticket_id)
        return self.tracker

    def __exit__(self, exc_type, exc, tb) -> None:
        self.tracker.finish_tracking()
        if exc:
            get_logger().log_exception(self.ticket_id, exc, "PerformanceContext")


# ---------- Decorator ---------- #

def log_function_call(category: LogCategory = LogCategory.AGENT_PROCESSING):
    """
    Decorator to add DEBUG-level logs before/after function calls.
    Avoids leaking args; logs counts/keys only.
    Tries to infer ticket_id from kwargs['ticket_id'] or from an object
    on args[0] that has 'ticket_id' attribute.
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            logger = get_logger()
            ticket_id = _extract_ticket_id(args, kwargs)

            logger.logger.debug(
                f"Function {func.__name__} called",
                extra={
                    "category": category.value,
                    "ticket_id": ticket_id,
                    "function": func.__name__,
                    "args_count": len(args),
                    "kwargs_keys": list(kwargs.keys()),
                },
            )
            try:
                result = func(*args, **kwargs)
                logger.logger.debug(
                    f"Function {func.__name__} completed",
                    extra={
                        "category": category.value,
                        "ticket_id": ticket_id,
                        "function": func.__name__,
                        "success": True,
                    },
                )
                return result
            except Exception as e:
                logger.log_exception(ticket_id, e, f"Function {func.__name__}")
                raise
        return wrapper
    return decorator


# ---------- Helpers ---------- #

def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _extract_ticket_id(args: tuple, kwargs: dict) -> str:
    if "ticket_id" in kwargs and isinstance(kwargs["ticket_id"], str):
        return kwargs["ticket_id"]
    if args:
        # If bound method, args[0] is usually 'self'; try attribute
        first = args[0]
        if hasattr(first, "ticket_id") and isinstance(getattr(first, "ticket_id"), str):
            return getattr(first, "ticket_id")
        # Sometimes the first arg itself is the ticket_id
        if isinstance(first, str):
            return first
    return "unknown"
