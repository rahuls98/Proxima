# Gemini Multimodal

Location: `server/services/gemini/multimodal/`

Used for:

- Persona instruction generation from context fields
- Session report analysis from transcripts

Report generation:

- LLM produces key moments (timestamp, speaker, utterance)
- LLM produces strengths, improvements, recommendations
- Deterministic metrics are merged for consistency
