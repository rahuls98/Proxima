import type { SessionReport } from "@/lib/api";
import type { SavedPersona } from "@/lib/persona-storage";
import type { TrainingSession } from "@/lib/training-history";
import type {
    MetricsAggregate,
    TrainingMetricDataPoint,
} from "@/lib/training-metrics-storage";

export const DUMMY_PERSONA_IMAGES: Record<string, string> = {
    "Sarah Jenkins":
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCL2gOKBkc8wZkGWqEX1jSBWUWqk8QLafI2HZlsCkxgll8J1O7wMntTZG-np1BiH_0SxQ0EJdohNXBIjv7Gg50DMEBrkqEKn2_tItSWwc7snfefUWmjJgEaopF5N2NDZHviaFfB9ATwXSL0Y7rD3VWKmg5evaaQKN-_K043Hm4PjFFIZCYhIQ2sKuwt-WAK_FtmqRGemkwV6j5prFUbNPNslcLluJC4z6fPgYXw1FvB3B5EAlbPVB9Ou7KfQQCzirGqjK0RKrLOxwi_",
    "Marcus Chen":
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDeczkoA9EOvF8hXAwJHq-e404zK1rxKjitr8IV68DUXYrZyooysbN1JO8Cj3y8bG4S_u3Pwxwx9ieROhr8XXIrDfM9e1xS8Dq-qShEnsSW4BluQVmVRnAhGKpx3k0vR6fYxZWh7fAyhFLHhnifItF1jL-bh1F_s5DjQY6e8S6bWSPUSAJArQlIyiaIBwJ4iRIvSkMM470n8S5CO37eaRqgzseZWfIt78E2VzJOtJlVOaGVGBKNO9yapy1YKV1dPMuzxMmf-3EyoBj9",
    "Elena Rodriguez":
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDDu0qEAGzKXefiwHxeXLLQgAh5tQb11SNhV0mFBG2VCI8CLM5aF1yfoJmknNEi_CuynQLnysDCfPuasuwDeXjxs4PNh4kc_vdzd5DjQbf4kDNMdjcGuzHbdnSGqmozxR5xN-0Hz6kzW49aTF0qactLVhOYQewyf7C_6BeGMOSO0G2v7j44riIZqMmaKe2-HgHORFNXmkNnjcXCtIcYdFpLd7zh8K8sruRIjdTrsv2o2r1qGgUuQJhqM5NmtswbzkCxv1Yj2MoaU4Eg",
    "Priya Nair":
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBihDp1qCtaFovpEQFKxWznW1l6cDGHQ3d2nPAlmZFYSUwJI94OCLDzY9yKLVBpYa6jlvb_pdT2tgW82cZQaNtifB2PbbX-_NJnuNtot3JUueJSHyrH7zq8zDqdbzF-C6h_Qu9FBx3qD1Jq88TGyE9DyeuiWJUDBOQvCsIKGQHfNts5Ag-XvihRC7EydBe1VnufAGMinoZWWYI9UwO-t8G8EZeYZXHU6pQV4TSEMUbkQEjOjHccNfxNgGeJOB68JQoMBwUkgiHj4dJm",
};

export const DUMMY_METRICS_AGGREGATE: MetricsAggregate = {
    total_sessions: 24,
    avg_overall_score: 82,
    avg_discovery_score: 79,
    avg_objection_score: 76,
    avg_value_comm_score: 85,
    avg_conversation_control: 80,
    avg_emotional_intelligence: 83,
    avg_duration_seconds: 872,
    avg_questions_asked: 9,
    avg_talk_ratio_rep: 0.54,
    performance_distribution: {
        excellent: 11,
        good: 10,
        needs_improvement: 3,
    },
    most_common_strengths: [
        "Strong consultative discovery flow",
        "Clear ROI communication under pressure",
        "Calm recovery during objections",
    ],
    most_common_feedback: [
        "Ask deeper follow-up questions on timeline.",
        "Slow pacing before pricing transitions.",
        "Invite stakeholder impact earlier in the call.",
    ],
};

export const DUMMY_TRAINING_METRICS: TrainingMetricDataPoint[] = [
    {
        session_id: "demo_s_1",
        timestamp: "2026-03-10T10:20:00.000Z",
        scenario: "Enterprise Pitch Rehearsal",
        difficulty: "High",
        duration_seconds: 872,
        overall_score: 88,
        discovery_score: 84,
        objection_handling_score: 82,
        value_communication_score: 90,
        conversation_control_score: 86,
        emotional_intelligence_score: 89,
        talk_ratio_rep: 0.54,
        questions_asked: 11,
        open_questions: 8,
        interruptions: 1,
        discovery_completeness: 86,
        trust_change: 0.21,
        commitment_secured: true,
    },
    {
        session_id: "demo_s_2",
        timestamp: "2026-03-09T14:30:00.000Z",
        scenario: "Objection Handling Prep",
        difficulty: "Medium",
        duration_seconds: 495,
        overall_score: 72,
        discovery_score: 68,
        objection_handling_score: 76,
        value_communication_score: 71,
        conversation_control_score: 70,
        emotional_intelligence_score: 74,
        talk_ratio_rep: 0.61,
        questions_asked: 7,
        open_questions: 4,
        interruptions: 2,
        discovery_completeness: 69,
        trust_change: 0.08,
        commitment_secured: false,
    },
    {
        session_id: "demo_s_3",
        timestamp: "2026-03-08T09:45:00.000Z",
        scenario: "Negotiation Strategy",
        difficulty: "High",
        duration_seconds: 635,
        overall_score: 64,
        discovery_score: 62,
        objection_handling_score: 66,
        value_communication_score: 64,
        conversation_control_score: 61,
        emotional_intelligence_score: 67,
        talk_ratio_rep: 0.66,
        questions_asked: 5,
        open_questions: 3,
        interruptions: 3,
        discovery_completeness: 58,
        trust_change: -0.04,
        commitment_secured: false,
    },
];

export const DUMMY_PERSONAS: SavedPersona[] = [
    {
        id: "persona_demo_sarah",
        name: "Sarah Jenkins",
        createdAt: "2026-03-10T07:30:00.000Z",
        personaInstruction: "Demo persona instruction",
        jobTitle: "VP of Operations",
        department: "Finance",
        prospectName: "Sarah Jenkins",
        sessionContext: {
            prospect_name: "Sarah Jenkins",
            job_title: "VP of Operations",
            department: "Finance",
            personality: "The Skeptic",
        },
    },
    {
        id: "persona_demo_marcus",
        name: "Marcus Chen",
        createdAt: "2026-03-09T12:10:00.000Z",
        personaInstruction: "Demo persona instruction",
        jobTitle: "Director of Procurement",
        department: "Operations",
        prospectName: "Marcus Chen",
        sessionContext: {
            prospect_name: "Marcus Chen",
            job_title: "Director of Procurement",
            department: "Operations",
            personality: "The Negotiator",
        },
    },
    {
        id: "persona_demo_elena",
        name: "Elena Rodriguez",
        createdAt: "2026-03-08T18:55:00.000Z",
        personaInstruction: "Demo persona instruction",
        jobTitle: "Chief Technology Officer",
        department: "Technology",
        prospectName: "Elena Rodriguez",
        sessionContext: {
            prospect_name: "Elena Rodriguez",
            job_title: "Chief Technology Officer",
            department: "Technology",
            personality: "The Visionary",
        },
    },
    {
        id: "persona_demo_priya",
        name: "Priya Nair",
        createdAt: "2026-03-07T16:40:00.000Z",
        personaInstruction: "Demo persona instruction",
        jobTitle: "Head of Marketing",
        department: "Growth",
        prospectName: "Priya Nair",
        sessionContext: {
            prospect_name: "Priya Nair",
            job_title: "Head of Marketing",
            department: "Growth",
            personality: "The Pragmatist",
        },
    },
];

export const DUMMY_TRAINING_HISTORY: TrainingSession[] = [
    {
        id: "demo_s_1",
        timestamp: "2026-03-10T10:20:00.000Z",
        transcriptLength: 54,
        personaName: "Sarah Jenkins",
        jobTitle: "VP of Operations",
        duration: "14m 32s",
        scenario: "Enterprise Pitch Rehearsal",
    },
    {
        id: "demo_s_2",
        timestamp: "2026-03-09T14:30:00.000Z",
        transcriptLength: 37,
        personaName: "Marcus Chen",
        jobTitle: "Director of Procurement",
        duration: "8m 15s",
        scenario: "Objection Handling Prep",
    },
    {
        id: "demo_s_3",
        timestamp: "2026-03-08T09:45:00.000Z",
        transcriptLength: 29,
        personaName: "Elena Rodriguez",
        jobTitle: "Chief Technology Officer",
        duration: "10m 35s",
        scenario: "Negotiation Strategy",
    },
];

export const DUMMY_SESSION_REPORT: SessionReport = {
    session_overview: {
        session_id: "demo_s_1",
        scenario: "Enterprise Pitch Rehearsal",
        prospect_persona: "Sarah Jenkins",
        difficulty: "High",
        session_duration_seconds: 872,
        session_start_time: "2026-03-10T10:05:00.000Z",
    },
    overall_score: {
        score: 88,
        performance_level: "Strong Performer",
        breakdown: {
            discovery: 84,
            objection_handling: 82,
            value_communication: 90,
            conversation_control: 86,
            emotional_intelligence: 89,
        },
    },
    conversation_metrics: {
        talk_ratio_rep: 0.54,
        talk_ratio_prospect: 0.46,
        questions_asked: 11,
        open_questions: 8,
        interruptions: 1,
        avg_response_latency_seconds: 1.4,
    },
    discovery_signals: {
        pain_identified: true,
        current_tools_identified: true,
        budget_discussed: true,
        decision_process_identified: true,
        timeline_discussed: "clear",
    },
    objection_handling: {
        objections_detected: 4,
        acknowledgment_quality: "Strong",
        evidence_used: "Specific and relevant",
        follow_up_questions: "Consistent",
    },
    value_communication: {
        value_clarity: "Excellent",
        feature_vs_benefit_balance: "Benefit-led",
        roi_quantified: true,
        personalization: "High",
    },
    emotional_intelligence: {
        empathy: "High",
        listening_signals: "Strong",
        rapport_building: "Excellent",
        tone_adaptation: "Adaptive",
    },
    prospect_engagement: {
        trust_change: 0.21,
        engagement_level: "High",
        objection_frequency: 0.32,
        conversation_momentum: "Positive",
    },
    deal_progression: {
        buying_interest: "Improving",
        next_step_clarity: "Clear",
        commitment_secured: true,
    },
    top_feedback: [
        "Open each objection response with explicit acknowledgment.",
        "Use one concrete KPI before moving to implementation.",
        "Pause after pricing anchors to invite stakeholder questions.",
    ],
    strengths: [
        "Confident pacing with executive tone.",
        "Strong alignment between pain and value.",
        "Good control of next-step framing.",
    ],
    practice_recommendations: {
        focus_area: "Budget risk framing",
        recommended_exercise:
            "Run two 8-minute rounds focused on budget pushback with constrained discounting.",
    },
};
