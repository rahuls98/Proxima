# proxima/api/teammate.py

"""
API endpoints for managing AI teammate configurations in training sessions.
"""

import logging
from typing import List

from fastapi import APIRouter  # type: ignore
from pydantic import BaseModel  # type: ignore

from proxima.config import (
    TeammateArchetype,
    generate_teammate_config,
    get_archetype_description,
    ARCHETYPE_DEFINITIONS,
)


logger = logging.getLogger("teammate_api")
router = APIRouter(prefix="/teammate", tags=["teammate"])


class TeammateConfigRequest(BaseModel):
    """Request body for generating a teammate configuration."""
    archetype: str | None = None
    role: str | None = None  # "BDR", "AE", "Junior_Rep", "Senior_Rep"
    name: str | None = None


class TeammateConfigResponse(BaseModel):
    """Response body for teammate configuration."""
    teammate_enabled: bool
    teammate_name: str
    teammate_role: str
    behavior_archetype: str
    interruption_frequency: str
    confidence_level: str
    helpfulness_level: str
    archetype_description: dict


class ArchetypeInfo(BaseModel):
    """Information about a teammate archetype."""
    archetype: str
    name: str
    description: str
    behaviors: List[str]
    training_goals: List[str]


@router.post(
    "/generate-config",
    response_model=TeammateConfigResponse,
    summary="Generate a teammate configuration",
)
async def generate_teammate_configuration(request: TeammateConfigRequest):
    """
    Generate a randomized or specific teammate configuration for multi-participant training.
    
    This endpoint creates a complete teammate configuration that can be used to
    initialize a multi-participant training session with an AI teammate.
    
    Args:
        request: Optional constraints for archetype, role, and name.
    
    Returns:
        Complete teammate configuration with behavioral parameters.
    """
    # Convert archetype string to enum if provided
    archetype_enum = None
    if request.archetype:
        try:
            archetype_enum = TeammateArchetype(request.archetype)
        except ValueError:
            # Fall back to random if invalid archetype
            pass
    
    # Generate configuration
    config = generate_teammate_config(
        archetype=archetype_enum,
        role=request.role,  # type: ignore
        name=request.name,
    )
    
    # Get archetype description
    archetype_desc = get_archetype_description(TeammateArchetype(config["behavior_archetype"]))
    
    return TeammateConfigResponse(
        teammate_enabled=config["teammate_enabled"],
        teammate_name=config["teammate_name"],
        teammate_role=config["teammate_role"],
        behavior_archetype=config["behavior_archetype"],
        interruption_frequency=config["interruption_frequency"],
        confidence_level=config["confidence_level"],
        helpfulness_level=config["helpfulness_level"],
        archetype_description=archetype_desc,
    )


@router.get(
    "/archetypes",
    response_model=List[ArchetypeInfo],
    summary="Get all available teammate archetypes",
)
async def get_teammate_archetypes():
    """
    Retrieve a list of all available teammate behavior archetypes.
    
    Returns:
        List of archetype definitions with behaviors and training goals.
    """
    archetypes = []
    
    for archetype_enum, definition in ARCHETYPE_DEFINITIONS.items():
        archetypes.append(
            ArchetypeInfo(
                archetype=archetype_enum.value,
                name=definition["name"],
                description=definition["description"],
                behaviors=definition["behaviors"],
                training_goals=definition["training_goals"],
            )
        )
    
    return archetypes


@router.get(
    "/archetypes/{archetype}",
    response_model=ArchetypeInfo,
    summary="Get details about a specific archetype",
)
async def get_archetype_details(archetype: str):
    """
    Get detailed information about a specific teammate archetype.
    
    Args:
        archetype: Archetype identifier (e.g., "dominator", "supportive").
    
    Returns:
        Detailed archetype information.
    """
    try:
        archetype_enum = TeammateArchetype(archetype)
    except ValueError:
        return {"error": f"Unknown archetype: {archetype}"}
    
    definition = get_archetype_description(archetype_enum)
    
    return ArchetypeInfo(
        archetype=archetype_enum.value,
        name=definition["name"],
        description=definition["description"],
        behaviors=definition["behaviors"],
        training_goals=definition["training_goals"],
    )
