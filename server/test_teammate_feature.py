#!/usr/bin/env python3
"""
Test script for teammate persona feature.

This script demonstrates how to:
1. Generate a teammate configuration
2. Create a multi-participant session
3. Generate a performance report with team collaboration metrics

Usage:
    python test_teammate_feature.py
"""

import asyncio
import json
import sys
from pathlib import Path

# Add server directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env", override=False)

from proxima.config import (
    generate_teammate_config,
    TeammateArchetype,
    get_archetype_description,
)
from services.gemini.multimodal import SessionReportGenerator, TranscriptEntry
from proxima.session_store import get_session_store


# Sample multi-participant training session transcript
MULTI_PARTICIPANT_TRANSCRIPT: list[TranscriptEntry] = [
    {"speaker": "rep", "text": "Hi Sarah, thanks for joining us. I have my colleague Jordan with me today, our AE. We're excited to learn about your sales challenges.", "timestamp": 0.0},
    {"speaker": "prospect", "text": "Great to meet you both. Yes, we're looking to improve our outbound sales process.", "timestamp": 5.5},
    {"speaker": "teammate", "text": "I can jump in here. We've helped dozens of companies with that exact problem. Our platform is really the best in the market.", "timestamp": 10.2},
    {"speaker": "rep", "text": "Thanks Jordan. Sarah, before we dive into solutions, can you tell us what specific challenges you're facing?", "timestamp": 16.0},
    {"speaker": "prospect", "text": "Well, our team struggles with follow-up consistency and tracking engagement.", "timestamp": 22.3},
    {"speaker": "teammate", "text": "Oh absolutely! Our automated follow-up system will solve that instantly. It's incredible.", "timestamp": 27.5},
    {"speaker": "rep", "text": "Jordan, that's a great feature to mention. Sarah, let me understand more about your current process. How are you tracking engagement now?", "timestamp": 33.8},
    {"speaker": "prospect", "text": "Mostly spreadsheets and manual CRM entries. It's not ideal.", "timestamp": 40.1},
    {"speaker": "rep", "text": "I see. And how much time does that take per rep per day?", "timestamp": 44.5},
    {"speaker": "prospect", "text": "Probably 1-2 hours of administrative work daily.", "timestamp": 49.2},
    {"speaker": "teammate", "text": "That's terrible! With our solution, that drops to zero. Well, maybe 5 minutes.", "timestamp": 53.8},
    {"speaker": "rep", "text": "Jordan brings up a good point, though let me clarify - you'd see significant time savings, realistically reducing that to 15-20 minutes. The system automates most tasks but still needs some oversight.", "timestamp": 58.5},
    {"speaker": "prospect", "text": "Okay, that sounds more realistic. I appreciate the honest assessment.", "timestamp": 67.0},
    {"speaker": "rep", "text": "Absolutely. Transparency is important. Sarah, what would you do with those extra 90 minutes per rep per day?", "timestamp": 71.5},
    {"speaker": "prospect", "text": "More selling time. That would be huge for us.", "timestamp": 77.8},
    {"speaker": "teammate", "text": "Exactly! And selling time means more revenue. This is a no-brainer investment.", "timestamp": 81.2},
    {"speaker": "rep", "text": "It can definitely drive revenue growth. Jordan, can you share some data on the ROI metrics we've seen?", "timestamp": 86.0},
    {"speaker": "teammate", "text": "Sure! Customers typically see 40-50% increase in close rates in the first month.", "timestamp": 91.5},
    {"speaker": "rep", "text": "Let me clarify that - our average customer sees 15-20% improvement in close rates over the first quarter. Some exceed that, but we want to set realistic expectations.", "timestamp": 96.8},
    {"speaker": "prospect", "text": "I appreciate you keeping it real. That kind of honesty makes me trust you more.", "timestamp": 105.2},
    {"speaker": "rep", "text": "Thank you Sarah. Jordan, do you want to walk through the pricing options?", "timestamp": 110.5},
    {"speaker": "teammate", "text": "Happy to! For your team size, we're looking at around $3,000 per month, which is incredibly competitive.", "timestamp": 115.3},
    {"speaker": "rep", "text": "Actually, for Sarah's team of 10 reps, we'd be at $2,500 per month on our standard plan. Sarah, does that fit within your budget considerations?", "timestamp": 121.0},
    {"speaker": "prospect", "text": "It's within range. Given the realistic expectations you've set, I'm interested in learning more.", "timestamp": 128.5},
    {"speaker": "rep", "text": "Excellent. Let's schedule a follow-up where we can do a deeper dive into implementation. Jordan, can you send Sarah our case studies?", "timestamp": 133.2},
    {"speaker": "teammate", "text": "Absolutely, I'll get those over to you today.", "timestamp": 140.0},
    {"speaker": "prospect", "text": "Sounds good. Thanks for your time, both of you.", "timestamp": 143.5},
]


def print_section(title: str):
    """Print a formatted section header."""
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")


def test_generate_teammate_config():
    """Test generating a teammate configuration."""
    print_section("1. Generating Teammate Configuration")
    
    # Generate a dominant teammate
    config = generate_teammate_config(
        archetype=TeammateArchetype.OVERLY_EXCITED,
        role="AE",
    )
    
    print(f"✓ Generated Teammate Configuration:")
    print(f"  Name: {config['teammate_name']}")
    print(f"  Role: {config['teammate_role']}")
    print(f"  Archetype: {config['behavior_archetype']}")
    print(f"  Interruption Frequency: {config['interruption_frequency']}")
    print(f"  Confidence Level: {config['confidence_level']}")
    print(f"  Helpfulness Level: {config['helpfulness_level']}")
    
    # Get archetype description
    archetype_desc = get_archetype_description(TeammateArchetype.OVERLY_EXCITED)
    print(f"\n  Archetype Description:")
    print(f"  Name: {archetype_desc['name']}")
    print(f"  Description: {archetype_desc['description']}")
    print(f"  Training Goals: {', '.join(archetype_desc['training_goals'])}")
    
    return config


def test_create_session_with_teammate(config: dict):
    """Test creating a session with teammate configuration."""
    print_section("2. Creating Multi-Participant Session")
    
    session_store = get_session_store()
    
    # Create session with teammate config
    session_id = session_store.create_session(
        mode="training",
        teammate_config=config
    )
    
    print(f"✓ Created session: {session_id}")
    print(f"  Teammate enabled: {config['teammate_enabled']}")
    print(f"  Teammate: {config['teammate_name']} ({config['teammate_role']})")
    
    # Add transcript to session
    session_store.start_session(session_id)
    for entry in MULTI_PARTICIPANT_TRANSCRIPT:
        session_store.add_message(
            session_id,
            entry["speaker"],
            entry["text"],
            entry["timestamp"]
        )
    session_store.end_session(session_id)
    
    session = session_store.get_session(session_id)
    print(f"\n✓ Session populated:")
    print(f"  Duration: {session.get_duration():.1f}s")
    print(f"  Messages: {len(session.transcript)}")
    print(f"  Speakers: {set(m['speaker'] for m in session.transcript)}")
    
    return session_id


async def test_generate_report(session_id: str, teammate_archetype: str):
    """Test generating a report for multi-participant session."""
    print_section("3. Generating Performance Report (Multi-Participant)")
    
    session_store = get_session_store()
    session = session_store.get_session(session_id)
    
    # Convert to transcript entries
    transcript_entries = [
        {
            "speaker": msg["speaker"],
            "text": msg["text"],
            "timestamp": msg["timestamp"],
        }
        for msg in session.get_relative_transcript()
    ]
    
    print("✓ Analyzing session with Gemini (this may take 10-20 seconds)...")
    
    generator = SessionReportGenerator()
    try:
        metrics = await generator.generate_report(
            transcript_entries,
            teammate_archetype=teammate_archetype
        )
        
        print("\n✓ Report Generated Successfully!\n")
        
        # Standard metrics
        print("STANDARD METRICS:")
        print(f"  Session Duration: {metrics['session_total_time']}")
        print(f"  Rep Confidence: {metrics['rep_confidence_avg']:.1f}/10 ({metrics['rep_confidence_trend']})")
        print(f"  On-Rep Confidence: {metrics['on_rep_confidence_avg']:.1f}/10 ({metrics['on_rep_confidence_trend']})")
        print(f"  Prospect Sentiment: {metrics['prospect_sentiment_avg']:.1f}/10 ({metrics['prospect_sentiment_trend']})")
        
        # Team collaboration metrics
        print("\nTEAM COLLABORATION METRICS:")
        print(f"  Call Leadership Score: {metrics['call_leadership_score']:.0f}%")
        print(f"  Delegation Skill: {metrics['delegation_skill']:.1f}/10")
        print(f"  Interruption Handling: {metrics['interruption_handling']:.1f}/10")
        print(f"  Collaboration Score: {metrics['collaboration_score']:.1f}/10")
        print(f"  Peer Leadership: {metrics['peer_leadership']:.1f}/10")
        
        print("\nKEY MOMENTS:")
        for i, moment in enumerate(metrics['key_moments'], 1):
            print(f"  {i}. {moment}")
        
        print("\nCOACHING RECOMMENDATIONS:")
        for i, rec in enumerate(metrics['recommendations'], 1):
            print(f"  {i}. {rec}")
            
        return metrics
        
    except Exception as e:
        print(f"\n✗ Error generating report: {e}")
        raise


async def main():
    """Run all tests."""
    print_section("TEAMMATE PERSONA FEATURE TEST")
    
    try:
        # Test 1: Generate config
        config = test_generate_teammate_config()
        
        # Test 2: Create session
        session_id = test_create_session_with_teammate(config)
        
        # Test 3: Generate report
        await test_generate_report(session_id, config['behavior_archetype'])
        
        print_section("ALL TESTS COMPLETED SUCCESSFULLY!")
        
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
