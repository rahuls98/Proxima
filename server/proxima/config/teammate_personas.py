# server/proxima/config/teammate_personas.py

"""
Teammate persona configurations for multi-participant training sessions.

This module defines AI teammate archetypes that simulate realistic team dynamics
during sales calls (e.g., BDR + AE discovery calls, junior rep shadowing).
"""

from enum import Enum
from typing import TypedDict, Literal
import random


# Type definitions
TeammateRole = Literal["BDR", "AE", "Junior_Rep", "Senior_Rep"]
BehaviorArchetype = Literal[
    "dominator",
    "supportive",
    "passive",
    "nervous_junior",
    "overly_excited",
    "strategic_ae"
]
InterruptionFrequency = Literal["low", "medium", "high"]
ConfidenceLevel = Literal["low", "medium", "high"]
HelpfulnessLevel = Literal["low", "medium", "high"]


class TeammateConfig(TypedDict):
    """Configuration for an AI teammate in a training session."""
    teammate_enabled: bool
    teammate_name: str
    teammate_role: TeammateRole
    behavior_archetype: BehaviorArchetype
    interruption_frequency: InterruptionFrequency
    confidence_level: ConfidenceLevel
    helpfulness_level: HelpfulnessLevel


class TeammateArchetype(str, Enum):
    """Enum of teammate behavior archetypes."""
    
    DOMINATOR = "dominator"
    SUPPORTIVE = "supportive"
    PASSIVE = "passive"
    NERVOUS_JUNIOR = "nervous_junior"
    OVERLY_EXCITED = "overly_excited"
    STRATEGIC_AE = "strategic_ae"


# Archetype definitions with detailed behavior patterns
ARCHETYPE_DEFINITIONS = {
    TeammateArchetype.DOMINATOR: {
        "name": "Dominant Teammate",
        "description": "Tries to take control of the call",
        "behaviors": [
            "Interrupts trainee occasionally",
            "Answers prospect questions first",
            "Jumps into product explanations",
            "Eager to demonstrate expertise"
        ],
        "training_goals": [
            "Assertiveness",
            "Regaining control of the call",
            "Call leadership"
        ],
        "default_config": {
            "interruption_frequency": "high",
            "confidence_level": "high",
            "helpfulness_level": "low"
        }
    },
    TeammateArchetype.SUPPORTIVE: {
        "name": "Supportive Partner",
        "description": "Helps reinforce the trainee's points",
        "behaviors": [
            "Prompts trainee",
            "Adds supporting examples",
            "Reinforces statements",
            "Collaborative approach"
        ],
        "training_goals": [
            "Collaborative selling",
            "Team coordination",
            "Leveraging team strengths"
        ],
        "default_config": {
            "interruption_frequency": "low",
            "confidence_level": "high",
            "helpfulness_level": "high"
        }
    },
    TeammateArchetype.PASSIVE: {
        "name": "Passive Shadow",
        "description": "Rarely speaks unless invited",
        "behaviors": [
            "Waits quietly",
            "Answers when called on",
            "Minimal voluntary participation",
            "Observes mostly"
        ],
        "training_goals": [
            "Delegation",
            "Leading a call with observers",
            "Including quiet participants"
        ],
        "default_config": {
            "interruption_frequency": "low",
            "confidence_level": "medium",
            "helpfulness_level": "medium"
        }
    },
    TeammateArchetype.NERVOUS_JUNIOR: {
        "name": "Nervous Junior Rep",
        "description": "Acts like a new BDR",
        "behaviors": [
            "Slightly uncertain",
            "May say incorrect or vague things",
            "Asks trainee for help",
            "Defers to trainee"
        ],
        "training_goals": [
            "Mentoring",
            "Correcting mistakes tactfully",
            "Supporting junior teammates"
        ],
        "default_config": {
            "interruption_frequency": "low",
            "confidence_level": "low",
            "helpfulness_level": "medium"
        }
    },
    TeammateArchetype.OVERLY_EXCITED: {
        "name": "Over-Excited Seller",
        "description": "Too enthusiastic about the product",
        "behaviors": [
            "Oversells features",
            "Exaggerates product claims",
            "Talks quickly",
            "Overly optimistic"
        ],
        "training_goals": [
            "Maintaining credibility",
            "Reining in overpromising",
            "Balanced messaging"
        ],
        "default_config": {
            "interruption_frequency": "medium",
            "confidence_level": "high",
            "helpfulness_level": "low"
        }
    },
    TeammateArchetype.STRATEGIC_AE: {
        "name": "Strategic AE",
        "description": "Acts like a senior teammate observing the call",
        "behaviors": [
            "Asks strategic questions",
            "Pushes trainee toward better discovery",
            "Provides perspective",
            "Guides conversation strategically"
        ],
        "training_goals": [
            "Structured selling discipline",
            "Strategic thinking",
            "Advanced discovery"
        ],
        "default_config": {
            "interruption_frequency": "medium",
            "confidence_level": "high",
            "helpfulness_level": "high"
        }
    }
}


# Default teammate names by role
DEFAULT_NAMES_BY_ROLE = {
    "BDR": ["Jordan", "Alex", "Taylor", "Sam"],
    "AE": ["Morgan", "Casey", "Jamie", "Riley"],
    "Junior_Rep": ["Chris", "Pat", "Drew", "Avery"],
    "Senior_Rep": ["Cameron", "Quinn", "Blake", "Reese"]
}


def generate_teammate_config(
    archetype: TeammateArchetype | None = None,
    role: TeammateRole | None = None,
    name: str | None = None
) -> TeammateConfig:
    """
    Generate a randomized teammate configuration.
    
    Args:
        archetype: Specific archetype to use (randomized if None)
        role: Specific role to use (randomized if None)
        name: Specific name to use (randomized if None)
    
    Returns:
        Complete TeammateConfig dictionary
    """
    # Randomize archetype if not provided
    if archetype is None:
        archetype = random.choice(list(TeammateArchetype))
    
    # Randomize role if not provided
    if role is None:
        role = random.choice(["BDR", "AE", "Junior_Rep", "Senior_Rep"])
    
    # Randomize name if not provided
    if name is None:
        name = random.choice(DEFAULT_NAMES_BY_ROLE[role])
    
    # Get default config for archetype
    default_config = ARCHETYPE_DEFINITIONS[archetype]["default_config"]
    
    return TeammateConfig(
        teammate_enabled=True,
        teammate_name=name,
        teammate_role=role,
        behavior_archetype=archetype.value,
        interruption_frequency=default_config["interruption_frequency"],
        confidence_level=default_config["confidence_level"],
        helpfulness_level=default_config["helpfulness_level"]
    )


def get_archetype_description(archetype: TeammateArchetype) -> dict:
    """Get detailed description of a teammate archetype."""
    return ARCHETYPE_DEFINITIONS[archetype]
