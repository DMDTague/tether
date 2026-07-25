"""Versioned governance and matching semantics for customer profile fields."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from numbers import Real
from typing import Any


@dataclass(frozen=True)
class FieldDefinition:
    key: str
    data_type: str
    sensitivity: str
    default_visibility: str
    filter_permitted: bool
    ranking_permitted: bool
    telemetry_prohibited: bool
    retention: str
    allowed_values: tuple[str, ...] = ()
    minimum: float | None = None
    maximum: float | None = None


FIELD_REGISTRY_VERSION = "2026-07-25"
FIELD_REGISTRY = {
    item.key: item
    for item in (
        FieldDefinition("height_cm", "number", "personal", "filter_only", True, False, True, "until_deleted", minimum=120, maximum=230),
        FieldDefinition("weight_kg", "number", "sensitive", "filter_only", True, False, True, "until_deleted", minimum=35, maximum=300),
        FieldDefinition("body_type", "enum", "personal", "filter_only", True, False, True, "until_deleted", ("slim", "average", "athletic", "muscular", "stocky", "large")),
        FieldDefinition("position", "enum", "sensitive", "filter_only", True, False, True, "until_deleted", ("top", "vers_top", "vers", "vers_bottom", "bottom", "side", "not_applicable")),
        FieldDefinition("relationship_status", "enum", "personal", "filter_only", True, True, True, "until_deleted", ("single", "dating", "partnered", "married", "open", "separated")),
        FieldDefinition("smoking", "enum", "personal", "filter_only", True, True, True, "until_deleted", ("never", "sometimes", "often", "quitting")),
        FieldDefinition("drinking", "enum", "personal", "filter_only", True, True, True, "until_deleted", ("never", "socially", "often", "sober")),
        FieldDefinition("family_plans", "enum", "personal", "after_match", True, True, True, "until_deleted", ("want", "do_not_want", "have_and_want_more", "have_and_done", "unsure")),
        FieldDefinition("music_genres", "string_list", "public", "public", True, True, False, "until_deleted"),
        FieldDefinition("lifestyle", "string_list", "personal", "filter_only", True, True, True, "until_deleted"),
        FieldDefinition("health_practices", "string_list", "highly_sensitive", "filter_only", True, False, True, "until_deleted"),
    )
}
VISIBILITIES = {"public", "after_match", "filter_only", "do_not_use"}


def public_registry() -> dict:
    return {
        "version": FIELD_REGISTRY_VERSION,
        "fields": [
            {
                **asdict(definition),
                "allowed_values": list(definition.allowed_values),
            }
            for definition in FIELD_REGISTRY.values()
        ],
    }


def validate_field_value(key: str, value: Any, visibility: str) -> Any:
    definition = FIELD_REGISTRY.get(key)
    if not definition:
        raise ValueError(f"Unknown profile field: {key}")
    if visibility not in VISIBILITIES:
        raise ValueError(f"Unsupported visibility for {key}")
    if visibility == "filter_only" and not definition.filter_permitted:
        raise ValueError(f"{key} cannot be used for filtering")
    if value is None:
        return None

    if definition.data_type == "number":
        if isinstance(value, bool) or not isinstance(value, Real):
            raise ValueError(f"{key} must be numeric")
        numeric = float(value)
        if definition.minimum is not None and numeric < definition.minimum:
            raise ValueError(f"{key} is below the supported range")
        if definition.maximum is not None and numeric > definition.maximum:
            raise ValueError(f"{key} is above the supported range")
        return numeric
    if definition.data_type == "enum":
        normalized = str(value).strip().casefold()
        if normalized not in definition.allowed_values:
            raise ValueError(f"{key} has an unsupported value")
        return normalized
    if definition.data_type == "string_list":
        if not isinstance(value, list) or len(value) > 30:
            raise ValueError(f"{key} must be a list with at most 30 values")
        normalized = [str(item).strip().casefold() for item in value if str(item).strip()]
        if len(normalized) != len(set(normalized)):
            raise ValueError(f"{key} contains duplicate values")
        return normalized
    raise ValueError(f"{key} has no validator")


def validate_filter_map(filters: dict[str, Any], *, exclusions: bool = False) -> dict[str, Any]:
    if len(filters) > 20:
        raise ValueError("Too many profile filters")
    validated: dict[str, Any] = {}
    for key, criterion in filters.items():
        definition = FIELD_REGISTRY.get(key)
        if not definition or not definition.filter_permitted:
            raise ValueError(f"{key} is not a supported profile filter")
        if definition.data_type == "number":
            if not isinstance(criterion, dict) or not set(criterion).issubset({"min", "max"}):
                raise ValueError(f"{key} requires min/max bounds")
            bounds = {}
            for bound, value in criterion.items():
                bounds[bound] = validate_field_value(key, value, "filter_only")
            if bounds.get("min", float("-inf")) > bounds.get("max", float("inf")):
                raise ValueError(f"{key} minimum exceeds maximum")
            validated[key] = bounds
        else:
            values = criterion if isinstance(criterion, list) else [criterion]
            validated[key] = [
                validate_field_value(
                    key,
                    [value] if definition.data_type == "string_list" else value,
                    "filter_only",
                )[0] if definition.data_type == "string_list" else validate_field_value(key, value, "filter_only")
                for value in values
            ]
        if exclusions and not validated[key]:
            raise ValueError(f"{key} dealbreaker cannot be empty")
    return validated


def fields_match(
    required: dict[str, Any],
    excluded: dict[str, Any],
    candidate_values: dict[str, Any],
) -> bool:
    for key, criterion in required.items():
        definition = FIELD_REGISTRY.get(key)
        if not definition:
            return False
        candidate = candidate_values.get(key)
        if candidate is None:
            return False
        if definition.data_type == "number":
            try:
                numeric = float(candidate)
            except (TypeError, ValueError):
                return False
            if "min" in criterion and numeric < criterion["min"]:
                return False
            if "max" in criterion and numeric > criterion["max"]:
                return False
        else:
            candidate_set = set(candidate if isinstance(candidate, list) else [candidate])
            if not candidate_set.intersection(criterion):
                return False

    for key, criterion in excluded.items():
        definition = FIELD_REGISTRY.get(key)
        if not definition:
            return False
        candidate = candidate_values.get(key)
        if candidate is None:
            continue
        if definition.data_type == "number":
            try:
                numeric = float(candidate)
            except (TypeError, ValueError):
                return False
            if criterion.get("min", float("-inf")) <= numeric <= criterion.get("max", float("inf")):
                return False
        else:
            candidate_set = set(candidate if isinstance(candidate, list) else [candidate])
            if candidate_set.intersection(criterion):
                return False
    return True
