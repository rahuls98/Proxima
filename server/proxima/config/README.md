# Configuration Module

Manages Gemini Live session configuration and system prompts for different agent modes.

## What It Does

Provides:

- Mode resolution (validates `?mode=training` query parameter)
- System prompt lookup per mode
- Gemini Live config assembly (voice, audio format, model, tools)

## Key Functions

**`resolve_mode(raw_mode)`** - Returns validated mode string, falls back to "training" if invalid

**`build_live_config(system_instruction, mode, tools=None)`** - Builds complete Gemini Live config

**`SYSTEM_PROMPTS`** - Dict mapping mode → system instruction string

## How to Use

```python
from proxima.config import resolve_mode, build_live_config, SYSTEM_PROMPTS

# During WebSocket handshake
mode = resolve_mode(websocket.query_params.get("mode"))
system_instruction = SYSTEM_PROMPTS[mode]

# Or with custom instruction (e.g., generated persona)
custom_instruction = "You are a sales trainer..."
config = build_live_config(custom_instruction, mode, tools=my_tools)
```

## Adding a New Mode

1. Add prompt to `prompts.py`
2. Add mode to `ProximaAgentMode` type in `config.py`
3. Add to `SYSTEM_PROMPTS` dict
4. Use `?mode=newmode` in WebSocket URL

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
```
