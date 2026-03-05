# Session Report Feature

This feature generates comprehensive performance reports from live training session transcripts using the Gemini SDK.

## Architecture

### Components

1. **Session Store** (`proxima/session_store.py`)
    - In-memory storage for session transcripts
    - Thread-safe operations
    - Automatic session lifecycle tracking

2. **Report Generator** (`services/gemini/multimodal/session_report.py`)
    - Gemini-powered analysis of session transcripts
    - Structured metric extraction
    - Coaching recommendations

3. **Report API** (`proxima/api/report.py`)
    - RESTful endpoints for report generation
    - Session transcript retrieval
    - Session management

4. **Websocket Handler Integration** (`proxima/websocket/handler.py`)
    - Automatic transcript collection
    - Real-time message storage
    - Session ID tracking

## Usage

### 1. Start a Training Session

Connect to the websocket with an optional `session_id` parameter:

```javascript
const sessionId = "optional-session-id"; // Or let server generate one
const ws = new WebSocket(
    `ws://localhost:8000/ws/proxima-agent?mode=training&session_id=${sessionId}`
);

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "session_ready") {
        console.log("Session ID:", message.session_id);
        // Store this for later report generation
    }
};
```

### 2. Generate a Report

After the session ends, call the report generation endpoint:

```bash
curl -X POST http://localhost:8000/report/generate \
  -H "Content-Type: application/json" \
  -d '{"session_id": "your-session-id"}'
```

**Response:**

```json
{
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "session_total_time": "15m 30s",
    "rep_confidence_avg": 7.2,
    "rep_confidence_trend": "increasing",
    "on_rep_confidence_avg": 6.8,
    "on_rep_confidence_trend": "stable",
    "prospect_sentiment_avg": 7.5,
    "prospect_sentiment_trend": "improving",
    "key_moments": [
        "Strong value proposition at 3:45 - prospect showed clear interest",
        "Objection about pricing at 8:20 - rep handled well with ROI framing",
        "Closing attempt at 14:00 - could have been more confident"
    ],
    "recommendations": [
        "Excellent discovery questions in opening - maintain this approach",
        "Practice more assertive closing language to boost confidence",
        "Work on reducing filler words when discussing technical features",
        "Great handling of price objection - replicate this technique"
    ],
    "transcript_length": 42
}
```

### 3. Retrieve Session Transcript

Get the raw transcript for analysis or debugging:

```bash
curl http://localhost:8000/report/session/{session_id}/transcript
```

**Response:**

```json
{
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "mode": "training",
    "created_at": 1709395200.0,
    "started_at": 1709395205.0,
    "ended_at": 1709396135.0,
    "duration_seconds": 930.0,
    "message_count": 42,
    "transcript": [
        {
            "speaker": "rep",
            "text": "Hi, thanks for taking the time to meet with me today.",
            "timestamp": 1709395205.5
        },
        {
            "speaker": "prospect",
            "text": "Sure, what's this about?",
            "timestamp": 1709395208.2
        }
    ]
}
```

### 4. Delete Session Data

Clean up session data when no longer needed:

```bash
curl -X DELETE http://localhost:8000/report/session/{session_id}
```

## Metrics Explained

### Rep Confidence (Internal)

- **Scale:** 0-10 (0=very hesitant, 10=extremely confident)
- **Measures:** How confident the rep sounds in their delivery
- **Indicators:** Tonality, filler words, pauses, assertiveness

### On-Rep Confidence (External)

- **Scale:** 0-10 (0=prospect doubts rep, 10=prospect trusts rep)
- **Measures:** How confident the rep APPEARS to the prospect
- **Indicators:** Prospect's responsiveness, trust signals, follow-up questions

### Prospect Sentiment

- **Scale:** 0-10 (0=very negative, 10=very positive)
- **Measures:** Emotional state of the prospect
- **Indicators:** Language tone, objections, enthusiasm, engagement

### Key Moments

Critical turning points in the conversation:

- Strong objection handling
- Missed opportunities
- Breakthrough moments
- Relationship-building exchanges

### Recommendations

Specific, actionable coaching points:

- Strengths to leverage
- Areas for improvement
- Techniques to practice
- Behavioral adjustments

## API Reference

### POST `/report/generate`

Generate performance report from session transcript.

**Request:**

```json
{
    "session_id": "string"
}
```

**Response:** `GenerateReportResponse` (see schema above)

**Status Codes:**

- `200` - Success
- `404` - Session not found
- `422` - Empty transcript
- `500` - Analysis error

### GET `/report/session/{session_id}/transcript`

Retrieve raw session transcript.

**Response:** Session metadata + full transcript

**Status Codes:**

- `200` - Success
- `404` - Session not found

### DELETE `/report/session/{session_id}`

Delete session data.

**Response:**

```json
{
    "session_id": "string",
    "status": "deleted"
}
```

**Status Codes:**

- `200` - Success
- `404` - Session not found

## Implementation Notes

### Session Storage

- **Type:** In-memory (development)
- **Thread-safe:** Yes (using threading.Lock)
- **Persistence:** None (data lost on server restart)
- **Production:** Replace with PostgreSQL/Redis

### Transcript Collection

- **Automatic:** Captured during websocket session
- **Real-time:** Messages stored as they occur
- **Speakers:** "rep" (user) and "prospect" (AI)
- **Timestamps:** Unix timestamps (converted to relative for analysis)

### Report Generation

- **Model:** Uses `PROXIMA_GEMINI_DOC_MODEL` (configurable)
- **Temperature:** 0.3 (consistent analysis)
- **Format:** JSON response
- **Async:** Non-blocking API calls

## Future Enhancements

- [ ] Persistent storage (database integration)
- [ ] Historical trend analysis across sessions
- [ ] Comparative reports (against benchmarks)
- [ ] Real-time coaching hints during session
- [ ] Export to PDF/CSV
- [ ] Custom metric definitions
- [ ] Multi-session aggregation
