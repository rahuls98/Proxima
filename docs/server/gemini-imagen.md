# Gemini Imagen

Location: `server/services/gemini/imagen/`

The Imagen service generates professional portrait images for AI personas based on their session context. These images are displayed on participant tiles in the meeting room.

## Features

- Context-aware generation (job title, industry, department)
- Gender alignment via `prospect_gender` / `voice_gender`
- Professional LinkedIn-style headshots
- Square 1:1 output optimized for tiles

## Endpoint

`POST /context/persona-image`

Request body:

```json
{
  "session_context": {
    "job_title": "VP of Marketing",
    "industry": "B2B SaaS",
    "department": "Marketing"
  }
}
```

Response: PNG image (binary)

## Prompt Pattern

The client builds a prompt from session context fields:

- `job_title`, `industry`, `department`, `company_size`
- `prospect_gender` / `voice_gender` (optional)

Example:

```
A professional headshot portrait of a female vp of marketing in b2b saas,
business professional, confident and approachable, professional office background,
soft natural lighting, modern corporate photography style, high quality,
professional headshot, LinkedIn profile style
```

## Configuration

- Model: `imagen-4.0-fast-generate-001`
- Aspect Ratio: `1:1`
- Number of Images: `1`
- Person Generation: `allow_adult`

## Integration Notes

- Persona image is generated after the session context is loaded.
- The meeting room uses `generatePersonaImage()` and applies the image as
  `avatarUrl` on the agent ParticipantTile.
- Blob URLs are revoked on cleanup.
