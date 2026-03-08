# Client Library

This directory contains core business logic and utilities for the Proxima training platform.

## Training System

The training system consists of two main components:

### 1. Training Reports

Comprehensive performance reports generated after each AI sales training session.

**Files:**

- `training-report-storage.ts` - Abstracted storage layer for reports
- `training-history.ts` - Session metadata management
- `mock-report-generator.ts` - Mock data generators for development
- `api.ts` - SessionReport type definition

**Key Features:**

- ✅ Comprehensive 12-section report schema
- ✅ Abstracted storage (localStorage → API migration ready)
- ✅ Performance scoring across 5 categories
- ✅ Conversation metrics and discovery signals
- ✅ Actionable coaching feedback

**Usage:**

```typescript
import {
    saveTrainingReport,
    getTrainingReport,
} from "@/lib/training-report-storage";
import { generateMockReport } from "@/lib/mock-report-generator";

// Save a report (automatically saves metrics too)
await saveTrainingReport(sessionId, report);

// Retrieve a report
const report = await getTrainingReport(sessionId);

// Generate mock data for testing
const mockReport = generateMockReport("test_session");
```

**Report Structure:**

```typescript
SessionReport {
  session_overview: {
    session_id, scenario, persona, difficulty, duration, start_time
  },
  overall_score: {
    score: 0-100,
    performance_level: "Excellent" | "Good" | "Needs Improvement",
    breakdown: { discovery, objection_handling, value_communication,
                 conversation_control, emotional_intelligence }
  },
  conversation_metrics: {
    talk_ratio_rep, talk_ratio_prospect, questions_asked,
    open_questions, interruptions, avg_response_latency_seconds
  },
  discovery_signals: {
    pain_identified, current_tools_identified, budget_discussed,
    decision_process_identified, timeline_discussed
  },
  objection_handling: {
    objections_detected, acknowledgment_quality,
    evidence_used, follow_up_questions
  },
  value_communication: {
    value_clarity, feature_vs_benefit_balance,
    roi_quantified, personalization
  },
  emotional_intelligence: {
    empathy, listening_signals, rapport_building, tone_adaptation
  },
  prospect_engagement: {
    trust_change, engagement_level, objection_frequency,
    conversation_momentum
  },
  deal_progression: {
    buying_interest, next_step_clarity, commitment_secured
  },
  top_feedback: string[],      // Top 3 coaching improvements
  strengths: string[],          // What they did well
  practice_recommendations: {
    focus_area, recommended_exercise
  }
}
```

**Migration to API:**

```typescript
// In training-report-storage.ts:
const USE_API_STORAGE = true;  // Switch from localStorage to API

// Implement these endpoints:
PUT    /api/reports/:sessionId  - Save/update report
GET    /api/reports/:sessionId  - Get report
DELETE /api/reports/:sessionId  - Delete report
GET    /api/reports             - Get all report IDs
DELETE /api/reports             - Clear all reports
```

### 2. Training Metrics

Automatically extracted analytics from training sessions for dashboard visualizations.

**Files:**

- `training-metrics-storage.ts` - Metrics extraction, storage, and aggregation

**Key Features:**

- ✅ Automatic extraction from reports
- ✅ Time-series data storage
- ✅ Aggregated statistics
- ✅ Performance trend analysis
- ✅ Pattern recognition (common strengths/feedback)

**Usage:**

```typescript
import {
    getTrainingMetricsAggregate,
    getPerformanceTrend,
    getAllTrainingMetrics,
    getRecentTrainingMetrics,
} from "@/lib/training-metrics-storage";

// Get aggregated statistics
const stats = await getTrainingMetricsAggregate();
// Returns: total_sessions, avg_overall_score, avg_discovery_score,
//          performance_distribution, most_common_strengths, etc.

// Get performance trend
const trend = await getPerformanceTrend(7, 30);
// Compares recent 7 days vs previous 30 days
// Returns: recent_avg, comparison_avg, trend, change_percent

// Get all metrics
const allMetrics = await getAllTrainingMetrics();

// Get recent metrics
const recentMetrics = await getRecentTrainingMetrics(30); // Last 30 days
```

**Metric Data Point:**

```typescript
TrainingMetricDataPoint {
  session_id: string,
  timestamp: string,
  scenario: string,
  difficulty: string,
  duration_seconds: number,

  // Performance scores (0-100)
  overall_score: number,
  discovery_score: number,
  objection_handling_score: number,
  value_communication_score: number,
  conversation_control_score: number,
  emotional_intelligence_score: number,

  // Conversation metrics
  talk_ratio_rep: number,
  questions_asked: number,
  open_questions: number,
  interruptions: number,
  discovery_completeness: number,

  // Engagement
  trust_change: number,
  commitment_secured: boolean
}
```

**Automatic Integration:**

Metrics are automatically saved when reports are saved:

```typescript
// Saves BOTH report and metrics
await saveTrainingReport(sessionId, report);

// Deletes BOTH report and metrics
await deleteTrainingReport(sessionId);
```

**Migration to API:**

```typescript
// In training-metrics-storage.ts:
const USE_API_STORAGE = true;

// Implement these endpoints:
POST   /api/metrics              - Save metric
GET    /api/metrics/:sessionId   - Get metric
GET    /api/metrics              - Get all metrics (with date range filter)
DELETE /api/metrics/:sessionId   - Delete metric
DELETE /api/metrics              - Clear all metrics
GET    /api/metrics/aggregate    - Get aggregated statistics
```

## Development Utilities

**File:** `dev-utils.ts`

Utilities for testing and development of training features.

**Usage:**

```typescript
import {
    seedMockReports,
    seedHistoricalData,
    viewMetricsAggregate,
    clearMockData,
} from "@/lib/dev-utils";

// Seed 3 sample sessions
await seedMockReports();

// Seed 30 days of historical data for charts
await seedHistoricalData(30);

// View metrics in console
await viewMetricsAggregate();

// Clear all test data
await clearMockData();
```

**Browser Console:**

```javascript
// Available in browser console:
await trainingDevUtils.seedMockReports();
await trainingDevUtils.seedHistoricalData(30);
await trainingDevUtils.viewMetricsAggregate();
await trainingDevUtils.clearMockData();
trainingDevUtils.logDevHelp();
```

## Persona Storage

**File:** `persona-storage.ts`

Manages saved training personas in localStorage.

**Usage:**

```typescript
import {
    savePersona,
    getSavedPersonas,
    getPersonaById,
    deletePersona,
} from "@/lib/persona-storage";

// Save a persona
const persona = savePersona(sessionContext, personaInstruction);

// Get all personas
const personas = getSavedPersonas();

// Get specific persona
const persona = getPersonaById(personaId);

// Delete persona
deletePersona(personaId);
```

## API Utilities

**File:** `api.ts`

Core API functions for backend communication.

**Functions:**

```typescript
// Generate persona instruction from context
const result = await generatePersonaInstruction(sessionContext);

// Generate session performance report
const report = await generateSessionReport(sessionId);
```

## LocalStorage Keys

The training system uses these localStorage keys:

- `proxima_training_reports` - Training report data
- `proxima_training_metrics` - Metric data points (max 100 sessions)
- `proxima_training_strengths` - All strengths for frequency analysis
- `proxima_training_feedback` - All feedback for frequency analysis
- `proxima_training_history` - Session metadata (max 50 sessions)
- `proxima_saved_personas` - Saved persona configurations

## Architecture Patterns

### Storage Abstraction

All storage implementations follow the Strategy Pattern:

```
Application Layer
       ↓
Storage Interface (Abstract)
       ↓
   ┌───┴───┐
   ↓       ↓
Local   API
Storage Impl
```

**Benefits:**

- Easy migration from localStorage to API
- Consistent interface across components
- Single flag to switch implementations
- No code changes needed in application layer

### Automatic Data Flow

```
Training Session Completes
         ↓
Report Generated (API)
         ↓
Save Report (training-report-storage)
         ↓
Auto-extract & Save Metrics (training-metrics-storage)
         ↓
Dashboard Reads Metrics
```

## Performance Considerations

### LocalStorage Limits

- Reports: Unlimited (keyed by session ID)
- Metrics: Max 100 sessions (~20-30KB)
- Session history: Max 50 sessions
- Total usage: ~50-100KB
- Browser limit: 5-10MB (safe margin)

### Optimization

- Metrics cached in memory during aggregation
- No re-parsing on repeated reads
- Efficient aggregation with single pass
- Consider API migration for 1000+ sessions

## Testing

### Quick Test

```typescript
import { seedMockReports } from "@/lib/dev-utils";

// Generate test data
await seedMockReports();

// Navigate to:
// - /training/session-report?session_id=sess_avg_001
// - /training/session-report?session_id=sess_high_002
// - /training/session-report?session_id=sess_low_003
// - /dashboard
```

### Historical Data

```typescript
import { seedHistoricalData } from "@/lib/dev-utils";

// Seed 30 days of varied performance data
await seedHistoricalData(30);

// View dashboard to see trends and charts
// Navigate to: /dashboard
```

## API Migration Checklist

When migrating from localStorage to API:

- [ ] Implement backend endpoints (see migration sections above)
- [ ] Set `USE_API_STORAGE = true` in storage files
- [ ] Test CRUD operations work correctly
- [ ] Verify dashboard loads data from API
- [ ] Update environment variables if needed
- [ ] Test error handling for failed API calls
- [ ] Implement retry logic for network failures
- [ ] Add loading states in UI components
- [ ] Consider pagination for large datasets
- [ ] Add caching strategy for frequently accessed data

## Troubleshooting

### Reports not persisting

```javascript
// Check browser localStorage:
localStorage.getItem("proxima_training_reports");
localStorage.getItem("proxima_training_metrics");
```

### Metrics not appearing on dashboard

1. Confirm reports were saved with metrics enabled
2. Check console for errors
3. Try seeding test data: `await trainingDevUtils.seedMockReports()`

### Performance issues

- Check localStorage size: `JSON.stringify(localStorage).length`
- Clear old data if needed: `await clearMockData()`
- Consider migrating to API storage for large datasets

## Future Enhancements

- [ ] Time-series charts with historical trends
- [ ] Skill radar charts for multi-dimensional visualization
- [ ] Comparative analytics across scenarios/personas
- [ ] Goal tracking and progress monitoring
- [ ] Export reports as PDF
- [ ] Shareable report links
- [ ] Sales methodology compliance scoring (MEDDICC, BANT)
- [ ] AI-powered next-step recommendations
- [ ] Multi-session progression tracking
- [ ] Percentile rankings (requires backend)
