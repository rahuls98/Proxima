/**
 * Mock Training Report Generator
 *
 * This utility provides sample training report data for testing and development.
 * Can be used to populate the UI before the backend API is fully implemented.
 */

import type { SessionReport } from "./api";

/**
 * Generate a sample training report with realistic data
 * @param sessionId - Optional custom session ID
 * @returns Complete SessionReport object
 */
export function generateMockReport(sessionId?: string): SessionReport {
    return {
        session_overview: {
            session_id: sessionId || `sess_${Date.now()}`,
            scenario: "Discovery Call – Marketing Automation",
            prospect_persona: "VP Marketing - B2B SaaS",
            difficulty: "Medium",
            session_duration_seconds: 1122,
            session_start_time: new Date().toISOString(),
        },
        overall_score: {
            score: 74,
            performance_level: "Good",
            breakdown: {
                discovery: 68,
                objection_handling: 72,
                value_communication: 70,
                conversation_control: 82,
                emotional_intelligence: 78,
            },
        },
        conversation_metrics: {
            talk_ratio_rep: 0.63,
            talk_ratio_prospect: 0.37,
            questions_asked: 11,
            open_questions: 6,
            interruptions: 1,
            avg_response_latency_seconds: 2.8,
        },
        discovery_signals: {
            pain_identified: true,
            current_tools_identified: true,
            budget_discussed: false,
            decision_process_identified: false,
            timeline_discussed: "partial",
        },
        objection_handling: {
            objections_detected: 3,
            acknowledgment_quality: "strong",
            evidence_used: "limited",
            follow_up_questions: "moderate",
        },
        value_communication: {
            value_clarity: "moderate",
            feature_vs_benefit_balance: "feature_heavy",
            roi_quantified: false,
            personalization: "good",
        },
        emotional_intelligence: {
            empathy: "strong",
            listening_signals: "good",
            rapport_building: "moderate",
            tone_adaptation: "good",
        },
        prospect_engagement: {
            trust_change: 0.18,
            engagement_level: "moderate",
            objection_frequency: 3,
            conversation_momentum: "stable",
        },
        deal_progression: {
            buying_interest: "moderate",
            next_step_clarity: "weak",
            commitment_secured: false,
        },
        top_feedback: [
            "Ask budget and decision-process questions earlier",
            "Quantify ROI when presenting value",
            "End the conversation with a clear next step",
        ],
        strengths: [
            "Strong empathy and listening",
            "Good use of open-ended discovery questions",
            "Maintained calm conversational pacing",
        ],
        practice_recommendations: {
            focus_area: "ROI storytelling",
            recommended_exercise: "Budget objection scenario",
        },
    };
}

/**
 * Generate a high-performing mock report
 */
export function generateHighScoreMockReport(sessionId?: string): SessionReport {
    return {
        session_overview: {
            session_id: sessionId || `sess_${Date.now()}`,
            scenario: "Enterprise Demo – Sales CRM",
            prospect_persona: "Chief Revenue Officer - Enterprise",
            difficulty: "Hard",
            session_duration_seconds: 1845,
            session_start_time: new Date().toISOString(),
        },
        overall_score: {
            score: 89,
            performance_level: "Excellent",
            breakdown: {
                discovery: 92,
                objection_handling: 88,
                value_communication: 90,
                conversation_control: 85,
                emotional_intelligence: 91,
            },
        },
        conversation_metrics: {
            talk_ratio_rep: 0.45,
            talk_ratio_prospect: 0.55,
            questions_asked: 18,
            open_questions: 14,
            interruptions: 0,
            avg_response_latency_seconds: 1.9,
        },
        discovery_signals: {
            pain_identified: true,
            current_tools_identified: true,
            budget_discussed: true,
            decision_process_identified: true,
            timeline_discussed: "comprehensive",
        },
        objection_handling: {
            objections_detected: 5,
            acknowledgment_quality: "excellent",
            evidence_used: "strong",
            follow_up_questions: "excellent",
        },
        value_communication: {
            value_clarity: "excellent",
            feature_vs_benefit_balance: "balanced",
            roi_quantified: true,
            personalization: "excellent",
        },
        emotional_intelligence: {
            empathy: "excellent",
            listening_signals: "excellent",
            rapport_building: "strong",
            tone_adaptation: "excellent",
        },
        prospect_engagement: {
            trust_change: 0.42,
            engagement_level: "high",
            objection_frequency: 5,
            conversation_momentum: "accelerating",
        },
        deal_progression: {
            buying_interest: "high",
            next_step_clarity: "strong",
            commitment_secured: true,
        },
        top_feedback: [
            "Excellent discovery technique - maintain this approach",
            "Strong ROI quantification and business case building",
            "Great job securing a clear commitment and next steps",
        ],
        strengths: [
            "Outstanding discovery questioning and active listening",
            "Excellent objection handling with strong evidence",
            "Effective value communication with ROI focus",
            "Strong emotional intelligence and rapport building",
        ],
        practice_recommendations: {
            focus_area: "Advanced negotiation tactics",
            recommended_exercise: "C-level strategic discussion scenario",
        },
    };
}

/**
 * Generate a low-performing mock report
 */
export function generateLowScoreMockReport(sessionId?: string): SessionReport {
    return {
        session_overview: {
            session_id: sessionId || `sess_${Date.now()}`,
            scenario: "Cold Call – Small Business",
            prospect_persona: "Small Business Owner - Retail",
            difficulty: "Easy",
            session_duration_seconds: 420,
            session_start_time: new Date().toISOString(),
        },
        overall_score: {
            score: 45,
            performance_level: "Needs Improvement",
            breakdown: {
                discovery: 38,
                objection_handling: 42,
                value_communication: 40,
                conversation_control: 55,
                emotional_intelligence: 52,
            },
        },
        conversation_metrics: {
            talk_ratio_rep: 0.82,
            talk_ratio_prospect: 0.18,
            questions_asked: 4,
            open_questions: 1,
            interruptions: 5,
            avg_response_latency_seconds: 0.8,
        },
        discovery_signals: {
            pain_identified: false,
            current_tools_identified: false,
            budget_discussed: false,
            decision_process_identified: false,
            timeline_discussed: "none",
        },
        objection_handling: {
            objections_detected: 6,
            acknowledgment_quality: "weak",
            evidence_used: "none",
            follow_up_questions: "weak",
        },
        value_communication: {
            value_clarity: "weak",
            feature_vs_benefit_balance: "feature_heavy",
            roi_quantified: false,
            personalization: "weak",
        },
        emotional_intelligence: {
            empathy: "weak",
            listening_signals: "weak",
            rapport_building: "weak",
            tone_adaptation: "moderate",
        },
        prospect_engagement: {
            trust_change: -0.22,
            engagement_level: "low",
            objection_frequency: 6,
            conversation_momentum: "declining",
        },
        deal_progression: {
            buying_interest: "low",
            next_step_clarity: "none",
            commitment_secured: false,
        },
        top_feedback: [
            "Talk less, listen more - aim for 50/50 talk ratio",
            "Ask open-ended discovery questions to uncover pain points",
            "Stop interrupting the prospect - let them finish speaking",
        ],
        strengths: [
            "Quick response time shows engagement",
            "Completed the call within reasonable time",
        ],
        practice_recommendations: {
            focus_area: "Discovery questioning fundamentals",
            recommended_exercise: "Basic discovery call scenario",
        },
    };
}
