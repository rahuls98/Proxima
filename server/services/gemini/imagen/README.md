# Gemini Imagen Service

This module provides persona image generation using Google's Imagen API.

## Overview

The Imagen service generates professional portrait images for AI personas based on their session context. These images are displayed on the participant tiles in the meeting room to provide a more immersive training experience.

## Features

- **Context-Aware Generation**: Creates portraits based on job title, industry, and demographic information
- **Professional Quality**: Generates high-quality business headshots in LinkedIn profile style
- **Fast Generation**: Uses `imagen-4.0-fast-generate-001` model for quick results
- **Square Format**: Outputs 1:1 aspect ratio images optimized for participant tiles

## Usage

### Basic Usage

```python
from services.gemini.imagen import GeminiImagenClient, ImagenError

client = GeminiImagenClient()

session_context = {
    "job_title": "VP of Marketing",
    "industry": "B2B SaaS",
    "department": "Marketing",
    "company_name": "GrowthStack",
}

try:
    image_bytes = await client.generate_persona_image(session_context)
    # image_bytes is PNG format
except ImagenError as e:
    print(f"Failed to generate image: {e}")
```

## API Endpoint

The service is exposed via the `/context/persona-image` endpoint:

```bash
POST /context/persona-image
Content-Type: application/json

{
  "session_context": {
    "job_title": "VP of Marketing",
    "industry": "B2B SaaS",
    "department": "Marketing"
  }
}
```

Response: PNG image (binary)

## Image Generation Prompt

The prompt is automatically constructed from session context fields:

- **job_title**: Main role identifier
- **industry**: Business context
- **department**: Organizational context
- **company_size**: Company scale context
- **prospect_name**: Optional name field

The generated prompt follows this pattern:

```
A professional headshot portrait of a [job_title] in [department/industry],
business professional, confident and approachable, professional office background,
soft natural lighting, modern corporate photography style, high quality,
professional headshot, LinkedIn profile style
```

## Configuration

The service uses:

- Model: `imagen-4.0-fast-generate-001`
- Aspect Ratio: `1:1` (square)
- Number of Images: `1`
- Person Generation: `allow_adult`

## Error Handling

The service raises `ImagenError` for:

- Empty or missing session context
- Imagen API failures
- Network errors
- Invalid responses

## Integration

### Server-Side

The service integrates with FastAPI via the context router:

- Lazy initialization on first request
- Returns PNG images directly as Response objects
- Includes proper error handling and logging

### Client-Side

The client calls the API endpoint and displays the generated image:

1. Session context is stored in localStorage after persona generation
2. MeetingRoom component fetches the persona image on mount
3. Image is displayed as background on the Agent ParticipantTile
4. Blob URLs are properly cleaned up on unmount

## Logging

The service logs:

- Image generation requests with prompts
- Successful generation confirmations
- Detailed error messages for failures

Logger name: `gemini_imagen`
