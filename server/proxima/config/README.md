# Proxima Config Module

Configuration and system prompts for Proxima agent modes.

## Overview

Manages Gemini Live session configuration, including mode resolution, system prompts, voice settings, and audio transcription parameters.

## Files

- **config.py**: Core configuration builder and mode resolver
    - `ProximaAgentMode`: Type alias for valid agent modes (currently `"training"`)
    - `DEFAULT_MODE`, `DEFAULT_VOICE_NAME`: Session defaults
    - `SYSTEM_PROMPTS`: Dict mapping modes to their system instructions
    - `resolve_mode(raw_mode)`: Normalizes query param to valid mode (falls back to training)
    - `build_live_config(mode, voice_name, tools)`: Assembles `types.LiveConnectConfig` for Gemini Live session

- **prompts.py**: System instructions per mode
    - `ProximaAgentPrompt`: `str` Enum for system prompts
        - `TRAINING`: "You are a conversational training assistant..."

## Adding a New Agent Mode

1. Add a member to `ProximaAgentPrompt` enum in `prompts.py`:

    ```python
    MY_MODE = ("Your system instruction text here...")
    ```

2. Map it in `SYSTEM_PROMPTS` dict in `config.py`:

    ```python
    SYSTEM_PROMPTS: dict[ProximaAgentMode, ProximaAgentPrompt] = {
        "training": ProximaAgentPrompt.TRAINING,
        "my_mode": ProximaAgentPrompt.MY_MODE,
    }
    ```

3. Extend `ProximaAgentMode` type in `config.py`:
    ```python
    ProximaAgentMode = Literal["training", "my_mode"]
    ```

## Usage

```python
from proxima.config import build_live_config, resolve_mode

mode = resolve_mode(query_params.get("mode"))
config = build_live_config(mode, voice_name="Schedar", tools=None)
```
