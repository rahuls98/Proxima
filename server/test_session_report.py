#!/usr/bin/env python3
"""
Test script for session report generation.

This script demonstrates how to:
1. Create a mock session with transcript
2. Generate a performance report
3. Retrieve and display the results

Usage:
    python test_session_report.py
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

from services.gemini.multimodal import SessionReportGenerator, TranscriptEntry
from proxima.session_store import get_session_store


# Sample training session transcript
SAMPLE_TRANSCRIPT: list[TranscriptEntry] = [
    {"speaker": "rep", "text": "Hi Sarah, thanks for taking the time to meet with me today. I understand you're looking to improve your sales team's performance?", "timestamp": 0.0},
    {"speaker": "prospect", "text": "Yes, but I'm not sure how another tool is going to help. We've tried several platforms already.", "timestamp": 5.2},
    {"speaker": "rep", "text": "I completely understand your concern. Can you tell me what challenges you faced with those previous tools?", "timestamp": 8.5},
    {"speaker": "prospect", "text": "They were too complex. My team spent more time learning the software than actually selling.", "timestamp": 13.1},
    {"speaker": "rep", "text": "That's a common issue. Our platform is designed specifically to reduce that learning curve. In fact, most teams are productive within 48 hours.", "timestamp": 18.0},
    {"speaker": "prospect", "text": "Really? That sounds too good to be true.", "timestamp": 24.3},
    {"speaker": "rep", "text": "I get that skepticism. Let me show you how. We use AI to automate the tedious parts while keeping the process intuitive. Would you like to see a quick demo?", "timestamp": 27.8},
    {"speaker": "prospect", "text": "Sure, show me what you've got.", "timestamp": 35.2},
    {"speaker": "rep", "text": "Great! So here's how it works... [demonstrates features]", "timestamp": 38.0},
    {"speaker": "prospect", "text": "Okay, this is actually pretty straightforward. What about pricing?", "timestamp": 125.5},
    {"speaker": "rep", "text": "Our pricing is based on team size. For a team of your size, we're looking at around $2,500 per month.", "timestamp": 130.2},
    {"speaker": "prospect", "text": "That's more than I expected. Our budget is tight right now.", "timestamp": 136.8},
    {"speaker": "rep", "text": "I understand budget constraints. Let me ask - what's the cost of your team missing quota? If we can increase close rates by just 10%, would that cover the investment?", "timestamp": 141.0},
    {"speaker": "prospect", "text": "That's a good point. Yeah, 10% would definitely make this worthwhile.", "timestamp": 148.5},
    {"speaker": "rep", "text": "Excellent. Based on our customer data, teams typically see a 15-20% improvement in their first quarter. Would you like to start with a pilot program?", "timestamp": 153.0},
    {"speaker": "prospect", "text": "A pilot could work. What does that look like?", "timestamp": 161.8},
    {"speaker": "rep", "text": "We can do a 30-day trial with a small subset of your team. If you see results, we scale. If not, no commitment. Sound fair?", "timestamp": 165.5},
    {"speaker": "prospect", "text": "Yes, that sounds very reasonable. Let's do it.", "timestamp": 173.0},
    {"speaker": "rep", "text": "Perfect! I'll get the paperwork started. When would you like to begin?", "timestamp": 176.2},
    {"speaker": "prospect", "text": "Let's aim for next Monday.", "timestamp": 180.5},
]


async def test_session_report():
    """Test the session report generation feature."""
    print("=" * 70)
    print("SESSION REPORT GENERATOR TEST")
    print("=" * 70)
    print()
    
    # 1. Create a session and populate it
    print("📝 Creating test session...")
    session_store = get_session_store()
    session_id = session_store.create_session(mode="training")
    session_store.start_session(session_id)
    
    print(f"   Session ID: {session_id}")
    
    # Add transcript messages
    for entry in SAMPLE_TRANSCRIPT:
        session_store.add_message(
            session_id=session_id,
            speaker=entry["speaker"],
            text=entry["text"],
            timestamp=session_store.get_session(session_id).started_at + entry["timestamp"],
        )
    
    session_store.end_session(session_id)
    session = session_store.get_session(session_id)
    
    print(f"   Messages: {len(session.transcript)}")
    print(f"   Duration: {session.get_duration():.1f}s")
    print()
    
    # 2. Display transcript preview
    print("📋 Transcript Preview:")
    print("-" * 70)
    for i, msg in enumerate(session.transcript[:3]):
        speaker = msg["speaker"].upper().ljust(8)
        text = msg["text"][:60] + ("..." if len(msg["text"]) > 60 else "")
        print(f"   {speaker}: {text}")
    print(f"   ... ({len(session.transcript) - 3} more messages)")
    print()
    
    # 3. Generate report
    print("🤖 Generating performance report with Gemini...")
    print("   (This may take 10-20 seconds)")
    print()
    
    try:
        generator = SessionReportGenerator()
        relative_transcript = session.get_relative_transcript()
        
        # Convert to TranscriptEntry format
        transcript_entries: list[TranscriptEntry] = []
        for msg in relative_transcript:
            transcript_entries.append({
                "speaker": msg["speaker"],
                "text": msg["text"],
                "timestamp": msg["timestamp"],
            })
        
        metrics = await generator.generate_report(transcript_entries)
        
        # 4. Display results
        print("=" * 70)
        print("📊 SESSION PERFORMANCE REPORT")
        print("=" * 70)
        print()
        
        print(f"Session Duration: {metrics['session_total_time']}")
        print()
        
        print("CONFIDENCE METRICS")
        print("-" * 70)
        print(f"Rep Confidence (Internal):      {metrics['rep_confidence_avg']:.1f}/10  ({metrics['rep_confidence_trend']})")
        print(f"On-Rep Confidence (External):   {metrics['on_rep_confidence_avg']:.1f}/10  ({metrics['on_rep_confidence_trend']})")
        print()
        
        print("SENTIMENT ANALYSIS")
        print("-" * 70)
        print(f"Prospect Sentiment:             {metrics['prospect_sentiment_avg']:.1f}/10  ({metrics['prospect_sentiment_trend']})")
        print()
        
        print("KEY MOMENTS")
        print("-" * 70)
        for i, moment in enumerate(metrics['key_moments'], 1):
            print(f"{i}. {moment}")
        print()
        
        print("COACHING RECOMMENDATIONS")
        print("-" * 70)
        for i, rec in enumerate(metrics['recommendations'], 1):
            print(f"{i}. {rec}")
        print()
        
        print("=" * 70)
        print("✅ Report generation successful!")
        print("=" * 70)
        
        # Save to file
        output_file = Path(__file__).parent / "test_report_output.json"
        with open(output_file, 'w') as f:
            json.dump(metrics, f, indent=2)
        print(f"\nFull report saved to: {output_file}")
        
    except Exception as e:
        print(f"❌ Error generating report: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    finally:
        # Cleanup
        print("\n🧹 Cleaning up test session...")
        session_store.delete_session(session_id)
    
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(test_session_report())
    sys.exit(exit_code)
