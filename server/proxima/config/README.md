# Configuration Module: Session Setup & System Prompts

Manages Gemini Live session configuration, mode resolution, system prompts, and audio settings.

## Overview

Provides a centralized configuration system for training sessions:

- **Mode Resolution**: Validates and normalizes query parameters to valid agent modes
- **Live Config Assembly**: Builds complete Gemini Live configuration from mode, voice, and tools
- **System Prompts**: Centralized storage of agent personality instructions per mode
- **Voice Configuration**: Maps voice names to Gemini Live API parameters
- **Audio Settings**: PCM encoding parameters (16 kHz, mono, 16-bit)

## Components

### config.py: Session Configuration

**Type Aliases**:

```python
ProximaAgentMode = Literal["training"]  # Valid agent modes (extensible)
```

**Constants**:

```python
DEFAULT_MODE = "training"                           # Default if ?mode not specified
DEFAULT_VOICE_NAME = "Schedar"                      # Agent voice from Gemini Live
```

**Functions**:

#### resolve_mode(raw_mode: str | None) → ProximaAgentMode

Validates and normalizes mode from query parameters, falling back to DEFAULT_MODE.

```python
resolve_mode("training")       → "training"
resolve_mode("invalid")        → "training"  # Fallback
resolve_mode(None)             → "training"  # Fallback
```

#### build_live_config(system_instruction: str, mode: ProximaAgentMode, tools=None) → LiveConnectConfig

Assembles Gemini Live configuration with system instruction, model, voice, and audio settings.

```python
config = build_live_config(
    system_instruction="Custom system prompt...",
    mode="training",
    tools=None  # Optional tool declarations
)
```

### prompts.py: System Prompts

Natural-language system instructions per agent mode.

```python
TRAINING_PROMPT = """You are a conversational training AI assistant...
Your goals are to help users practice and improve their skills...
"""
```

## Extending the System

### Adding a New Mode

1. **Define prompt** in `prompts.py`:

```python
SALES_PROMPT = """You are an AI sales training assistant..."""
```

2. **Add to type** in `config.py`:

```python
ProximaAgentMode = Literal["training", "sales"]
```

3. **Map in SYSTEM_PROMPTS**:

```python
SYSTEM_PROMPTS: dict[ProximaAgentMode, str] = {
    "training": TRAINING_PROMPT,
    "sales": SALES_PROMPT,
}
```

4. **Use in WebSocket**:

```
?mode=sales → resolve_mode("sales") → build_live_config(...) → Agent trained for sales
```

## Dynamic Instructions

Update agent persona mid-session via WebSocket message:

```json
{ "type": "set_system_instruction", "instruction": "new system prompt..." }
```

This triggers reconnection with the new instruction without losing conversation context.

## Integration with API

The `/context/persona-instruction` endpoint generates tailored instructions:

```
Session Context Form → Gemini API → Generated Instruction
                                          ↓
                                 WebSocket Message
                                          ↓
                          build_live_config(generated_instruction)
                                          ↓
                               Live Session with AI Persona
```

## Testing

```python
from proxima.config import resolve_mode, build_live_config

def test_resolve_mode():
    assert resolve_mode("training") == "training"
    assert resolve_mode("invalid") == "training"
    assert resolve_mode(None) == "training"

def test_build_config():
    config = build_live_config("Custom", "training")
    assert config["model"] == "gemini-2.0-flash"
    assert config["audio_input_format"]["sample_rate_hertz"] == 16000
```

## Performance

| Operation       | Latency |
| --------------- | ------- |
| Mode resolution | < 1 ms  |
| Config building | < 1 ms  |
| Voice lookup    | < 1 ms  |

## Usage

```python
from proxima.config import build_live_config, resolve_mode, SYSTEM_PROMPTS

# Initial WebSocket setup
mode = resolve_mode(query_params.get("mode"))
config = build_live_config(SYSTEM_PROMPTS[mode], mode, tools=None)

# Dynamic update
config = build_live_config(new_instruction, mode, tools=live_tools)
```

## Troubleshooting

### Mode Not Recognized

- Check spelling in `SYSTEM_PROMPTS`
- Verify in `ProximaAgentMode` type
- Use lowercase mode names

### System Instructions Ignored

- Keep instructions < 5000 chars
- Verify via server logs
- Reconnect after instruction change
