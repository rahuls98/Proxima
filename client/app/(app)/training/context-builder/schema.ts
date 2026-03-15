import { VOICE_TONES } from "./voices";

export type FieldType =
    | "text"
    | "dropdown"
    | "multi-select"
    | "slider_0_1"
    | "slider_1_5"
    | "slider_low_high"
    | "boolean"
    | "file";

export interface Field {
    key: string;
    label: string;
    type: FieldType;
    required: boolean;
    dummy_value?: string | number | boolean | string[];
    notes?: string;
    options?: string[];
}

export interface Section {
    section_name: string;
    fields: Field[];
}

export interface ContextBuilderSchema {
    version: string;
    sections: Section[];
}

export const SESSION_CONTEXT_BUILDER_SCHEMA: ContextBuilderSchema = {
    version: "1.0",
    sections: [
        {
            section_name: "Prospect Identity",
            fields: [
                {
                    key: "prospect_name",
                    label: "Prospect Name (Optional)",
                    type: "text",
                    required: false,
                    dummy_value: "Sarah Mitchell",
                    notes: "Used for realism in conversation.",
                },
                {
                    key: "job_title",
                    label: "Job Title (Required)",
                    type: "text",
                    required: true,
                    dummy_value: "VP of Marketing",
                    notes: "Primary behavioral anchor.",
                },
                {
                    key: "department",
                    label: "Department (Optional)",
                    type: "dropdown",
                    required: false,
                    dummy_value: "Marketing",
                    options: [
                        "Marketing",
                        "Sales",
                        "Engineering",
                        "Operations",
                        "Finance",
                        "HR",
                        "Other",
                    ],
                },
                {
                    key: "location",
                    label: "Location",
                    type: "text",
                    required: true,
                    dummy_value: "San Francisco, CA",
                },
                {
                    key: "company_name",
                    label: "Company Name (Optional)",
                    type: "text",
                    required: false,
                    dummy_value: "GrowthStack",
                },
                {
                    key: "company_size",
                    label: "Company Size (Required)",
                    type: "dropdown",
                    required: true,
                    dummy_value: "500–1000 employees",
                    options: [
                        "1–10 employees",
                        "11–50 employees",
                        "51–200 employees",
                        "201–500 employees",
                        "500–1000 employees",
                        "1000+ employees",
                    ],
                },
                {
                    key: "revenue_range",
                    label: "Revenue Range (Optional)",
                    type: "dropdown",
                    required: false,
                    dummy_value: "$50M–$100M",
                    options: [
                        "<$1M",
                        "$1M–$10M",
                        "$10M–$50M",
                        "$50M–$100M",
                        "$100M–$500M",
                        "$500M+",
                    ],
                },
                {
                    key: "industry",
                    label: "Industry (Required)",
                    type: "text",
                    required: true,
                    dummy_value: "B2B SaaS",
                },
                {
                    key: "geography",
                    label: "Geography (Optional)",
                    type: "dropdown",
                    required: false,
                    dummy_value: "North America",
                    options: [
                        "North America",
                        "Europe",
                        "Asia Pacific",
                        "Latin America",
                        "Middle East & Africa",
                        "Global",
                    ],
                },
                {
                    key: "reports_to",
                    label: "Reports To (Optional)",
                    type: "text",
                    required: false,
                    dummy_value: "CMO",
                },
                {
                    key: "budget_authority_level",
                    label: "Budget Authority Level (Required)",
                    type: "dropdown",
                    required: true,
                    dummy_value: "Influencer (Not Final Signer)",
                    options: [
                        "Final Decision Maker",
                        "Influencer (High Impact)",
                        "Influencer (Not Final Signer)",
                        "End User / No Budget Authority",
                    ],
                },
            ],
        },
        {
            section_name: "Business Context",
            fields: [
                {
                    key: "buying_stage",
                    label: "Buying Stage (Required)",
                    type: "dropdown",
                    required: true,
                    dummy_value: "Early Evaluation",
                    options: [
                        "Problem Awareness",
                        "Early Evaluation",
                        "Advanced Evaluation",
                        "Negotiation",
                        "Decision Made",
                    ],
                },
                {
                    key: "current_initiative",
                    label: "Current Initiative (Optional)",
                    type: "text",
                    required: false,
                    dummy_value: "Marketing automation overhaul",
                },
                {
                    key: "current_tools",
                    label: "Current Tools",
                    type: "multi-select",
                    required: false,
                    dummy_value: ["HubSpot", "Salesforce"],
                    options: [
                        "HubSpot",
                        "Salesforce",
                        "Marketo",
                        "Pardot",
                        "Other",
                    ],
                },
                {
                    key: "competitors_considered",
                    label: "Competitors Being Considered",
                    type: "multi-select",
                    required: false,
                    dummy_value: ["Marketo", "Pardot"],
                    options: [
                        "Marketo",
                        "Pardot",
                        "HubSpot",
                        "Salesforce",
                        "Other",
                    ],
                },
                {
                    key: "internal_pressure_source",
                    label: "Internal Pressure Source",
                    type: "multi-select",
                    required: false,
                    dummy_value: ["Board", "CFO"],
                    options: [
                        "Board",
                        "CFO",
                        "CEO",
                        "Sales",
                        "Marketing",
                        "Other",
                    ],
                },
                {
                    key: "urgency_level",
                    label: "Urgency Level",
                    type: "slider_1_5",
                    required: false,
                    dummy_value: 3,
                },
                {
                    key: "budget_status",
                    label: "Budget Status",
                    type: "dropdown",
                    required: false,
                    dummy_value: "Not Approved Yet",
                    options: [
                        "Approved & Allocated",
                        "Pending Approval",
                        "Not Approved Yet",
                        "Budget Exists but Unallocated",
                    ],
                },
                {
                    key: "decision_timeline",
                    label: "Decision Timeline",
                    type: "dropdown",
                    required: false,
                    dummy_value: "3–6 Months",
                    options: [
                        "Urgent (< 1 Month)",
                        "1–3 Months",
                        "3–6 Months",
                        "6–12 Months",
                        "12+ Months",
                    ],
                },
            ],
        },
        {
            section_name: "KPIs & Success Metrics",
            fields: [
                {
                    key: "primary_kpis",
                    label: "Primary KPIs",
                    type: "multi-select",
                    required: true,
                    dummy_value: ["Pipeline Velocity"],
                    options: [
                        "Pipeline Velocity",
                        "Win Rate",
                        "Sales Cycle Length",
                        "CAC",
                        "LTV",
                        "Revenue Growth",
                        "Other",
                    ],
                },
                {
                    key: "secondary_kpis",
                    label: "Secondary KPIs",
                    type: "multi-select",
                    required: false,
                    dummy_value: ["CAC Reduction", "MQL Growth"],
                    options: [
                        "CAC Reduction",
                        "MQL Growth",
                        "SQL Conversion",
                        "Customer Retention",
                        "Other",
                    ],
                },
                {
                    key: "roi_expectation",
                    label: "ROI Expectation",
                    type: "dropdown",
                    required: false,
                    dummy_value: "Minimum 20% improvement",
                    options: [
                        "Minimum 10% improvement",
                        "Minimum 20% improvement",
                        "Minimum 50% improvement",
                        "Break-even in Year 1",
                        "Other",
                    ],
                },
                {
                    key: "risk_tolerance",
                    label: "Risk Tolerance",
                    type: "dropdown",
                    required: true,
                    dummy_value: "Low",
                    options: ["Very Low", "Low", "Medium", "High", "Very High"],
                },
                {
                    key: "measurement_preference",
                    label: "Measurement Preference",
                    type: "dropdown",
                    required: false,
                    dummy_value: "Data-driven",
                    options: [
                        "Data-driven",
                        "Qualitative",
                        "Mixed",
                        "Experience-based",
                    ],
                },
            ],
        },
        {
            section_name: "Objection Profile",
            fields: [
                {
                    key: "primary_objections",
                    label: "Primary Objections",
                    type: "multi-select",
                    required: true,
                    dummy_value: ["Budget", "Integration Complexity"],
                    options: [
                        "Budget",
                        "Integration Complexity",
                        "Unclear ROI",
                        "Competitor Loyalty",
                        "Internal Change Resistance",
                        "Other",
                    ],
                },
                {
                    key: "skepticism_level",
                    label: "Skepticism Level",
                    type: "slider_0_1",
                    required: true,
                    dummy_value: 0.7,
                },
                {
                    key: "negotiation_toughness",
                    label: "Negotiation Toughness",
                    type: "dropdown",
                    required: false,
                    dummy_value: "Tough",
                    options: [
                        "Very Tough",
                        "Tough",
                        "Balanced",
                        "Flexible",
                        "Very Flexible",
                    ],
                },
                {
                    key: "decision_style",
                    label: "Decision Style",
                    type: "dropdown",
                    required: false,
                    dummy_value: "Slow & Analytical",
                    options: [
                        "Quick & Intuitive",
                        "Balanced & Deliberate",
                        "Slow & Analytical",
                        "Consensus-Driven",
                    ],
                },
                {
                    key: "trust_level_at_start",
                    label: "Initial Trust Level",
                    type: "slider_0_1",
                    required: false,
                    dummy_value: 0.4,
                },
            ],
        },
        {
            section_name: "Personality & Communication",
            fields: [
                {
                    key: "personality_archetype",
                    label: "Personality Archetype",
                    type: "dropdown",
                    required: true,
                    dummy_value: "Analytical",
                    options: ["Analytical", "Driver", "Expressive", "Amiable"],
                },
                {
                    key: "communication_style",
                    label: "Communication Style",
                    type: "dropdown",
                    required: true,
                    dummy_value: "Concise & Direct",
                    options: [
                        "Concise & Direct",
                        "Detailed & Thorough",
                        "Casual & Friendly",
                        "Formal & Professional",
                    ],
                },
                {
                    key: "emotional_baseline",
                    label: "Emotional Baseline",
                    type: "dropdown",
                    required: false,
                    dummy_value: "Calm but Skeptical",
                    options: [
                        "Enthusiastic",
                        "Calm but Engaged",
                        "Calm but Skeptical",
                        "Stressed",
                        "Neutral",
                    ],
                },
                {
                    key: "dominance_level",
                    label: "Dominance Level",
                    type: "dropdown",
                    required: false,
                    dummy_value: "Medium",
                    options: ["Low", "Medium", "High", "Very High"],
                },
                {
                    key: "interrupt_frequency",
                    label: "Interrupt Frequency",
                    type: "dropdown",
                    required: false,
                    dummy_value: "Medium",
                    options: ["Low", "Medium", "High"],
                },
                {
                    key: "formality_level",
                    label: "Formality Level",
                    type: "dropdown",
                    required: false,
                    dummy_value: "Professional Formal",
                    options: [
                        "Very Casual",
                        "Casual",
                        "Professional",
                        "Professional Formal",
                    ],
                },
            ],
        },
        {
            section_name: "Voice Configuration",
            fields: [
                {
                    key: "voice_tone",
                    label: "Voice Tone (Required)",
                    type: "dropdown",
                    required: true,
                    dummy_value: "Even",
                    options: Object.keys(VOICE_TONES),
                    notes: "Select a voice tone category. Available voices will be shown in the Voice Name field.",
                },
                {
                    key: "voice_name",
                    label: "Voice Name (Required)",
                    type: "dropdown",
                    required: true,
                    dummy_value: "Schedar",
                    options: Object.values(VOICE_TONES).flat(),
                    notes: "Select a specific voice. The available voices depend on the selected tone.",
                },
                {
                    key: "speaking_pace",
                    label: "Speaking Pace (Optional)",
                    type: "dropdown",
                    required: false,
                    dummy_value: "Moderate",
                    options: ["Slow", "Moderate", "Fast", "Varied"],
                },
                {
                    key: "energy_level",
                    label: "Energy Level (Optional)",
                    type: "slider_1_5",
                    required: false,
                    dummy_value: 2,
                },
                {
                    key: "emotional_variability",
                    label: "Emotional Variability (Optional)",
                    type: "slider_1_5",
                    required: false,
                    dummy_value: 3,
                },
                {
                    key: "accent_preference",
                    label: "Accent Preference (Optional)",
                    type: "dropdown",
                    required: false,
                    dummy_value: "American Neutral",
                    options: [
                        "American Neutral",
                        "British",
                        "Australian",
                        "Other",
                    ],
                },
            ],
        },
        {
            section_name: "Training Script Integration",
            fields: [
                {
                    key: "script_mode_enabled",
                    label: "Script Mode Enabled",
                    type: "boolean",
                    required: false,
                    dummy_value: true,
                },
                {
                    key: "script_type",
                    label: "Script Type",
                    type: "dropdown",
                    required: false,
                    dummy_value: "Discovery Call",
                    options: [
                        "Discovery Call",
                        "Demo Call",
                        "Negotiation Call",
                        "Closing Call",
                        "Custom",
                    ],
                },
                {
                    key: "script_upload",
                    label: "Upload Script",
                    type: "file",
                    required: false,
                    dummy_value: "discovery_call_script.pdf",
                },
                {
                    key: "script_adherence_strictness",
                    label: "Script Adherence Strictness",
                    type: "slider_1_5",
                    required: false,
                    dummy_value: 3,
                },
            ],
        },
    ],
};
