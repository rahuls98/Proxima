# Gemini Services

Service layer for Gemini API integration: live streaming, multimodal context generation, image generation, and tool orchestration.

## Modules

**live/** - Real-time bidirectional streaming with Gemini Live API

- `GeminiLiveManager` - Session lifecycle, audio/video/text streaming, event normalization
- `ToolDispatcher` - Tool registry and execution (for file summarization, etc.)

**multimodal/** - Non-live Gemini calls for content generation

- `GeminiMultimodalClient` - Request/response generation (persona instructions, summaries)
- Content validation and response parsing

**imagen/** - Persona image generation with Imagen API

- `GeminiImagenClient` - Professional portrait generation for AI personas
- Context-aware prompt building from session data
- LinkedIn-style business headshots for participant tiles

**tools/file/** - Uploaded file handling

- `FileContextStore` - In-memory file storage
- `GeminiDocumentProcessor` - Document summarization via Gemini
- `UploadedFileTools` - Tool function for Gemini Live integration

## Usage

Use `GeminiLiveManager` for live sessions, `GeminiMultimodalClient` for pre/post-session content generation, and `GeminiImagenClient` for persona avatar generation.

## Imagen Persona Image Generation

The Imagen service automatically generates professional portrait images for AI personas based on session context.

### Features

- **Context-Aware**: Generates portraits based on job title, industry, and demographic data
- **Professional Quality**: Creates LinkedIn-style business headshots
- **Fast Generation**: Uses `imagen-4.0-fast-generate-001` for quick results
- **Square Format**: Outputs 1:1 aspect ratio optimized for participant tiles

### API Endpoint

```
POST /context/persona-image
Content-Type: application/json

{
  "session_context": {
    "job_title": "VP of Marketing",
    "industry": "B2B SaaS",
    "department": "Marketing",
    ...
  }
}
```

Response: PNG image (binary)

### Integration Flow

1. **Context Builder** → User fills training context form with persona details
2. **Submit** → System stores session context in localStorage
3. **Navigate to Meeting Room** → Loading screen appears
4. **Image Generation** → Component calls `/context/persona-image` during loading phase
5. **Server** → Generates portrait using Imagen API with intelligent prompt
6. **Meeting Room Ready** → Loading screen transitions to meeting room with persona image displayed on Agent ParticipantTile

The persona image is generated during the meeting room initialization, ensuring the avatar is ready before the user can join the session. A loading screen displays progress messages while the image is being generated.

### Prompt Generation

The service builds intelligent prompts from session context fields:

```python
# Example: VP of Marketing in B2B SaaS
"A professional headshot portrait of a vp of marketing in b2b saas,
business professional, confident and approachable, professional office background,
soft natural lighting, modern corporate photography style, high quality,
professional headshot, LinkedIn profile style"
```

### Configuration

- **Model**: `imagen-4.0-fast-generate-001`
- **Aspect Ratio**: `1:1` (square)
- **Number of Images**: `1`
- **Person Generation**: `allow_adult`

### Error Handling

- Empty context → 400 Bad Request
- Imagen API failure → 422 Unprocessable Entity
- Graceful client-side degradation (continues without image)
- Detailed logging via `gemini_imagen` logger

### Client Integration

**API Function** (`/client/lib/api.ts`):

```typescript
generatePersonaImage(sessionContext) -> Promise<string>
```

**ParticipantTile Component**:

- Added optional `avatarUrl` prop
- Displays persona image as background when provided
- Maintains gradient overlay for text readability

**MeetingRoom Component**:

- Shows loading screen on mount with progress messages
- Generates persona image during initialization phase
- Displays "Generating persona avatar..." then "Initializing training session..."
- Transitions to meeting room once image generation completes
- Passes image URL to Agent ParticipantTile
- Proper Blob URL cleanup on unmount
- Graceful degradation if image generation fails

### Testing

```bash
# Start the server
cd server
python main.py

# Test the endpoint
curl -X POST http://localhost:8000/context/persona-image \
  -H "Content-Type: application/json" \
  -d '{
    "session_context": {
      "job_title": "VP of Marketing",
      "industry": "B2B SaaS",
      "department": "Marketing"
    }
  }' \
  --output persona.png
```

### Files

**Server:**

- `services/gemini/imagen/__init__.py` - Module exports
- `services/gemini/imagen/client.py` - Imagen client implementation
- `services/gemini/imagen/README.md` - Detailed service documentation
- `proxima/api/context.py` - `/context/persona-image` endpoint

**Client:**

- `lib/api.ts` - `generatePersonaImage()` function
- `components/molecules/ParticipantTile.tsx` - Avatar display support
- `components/organisms/MeetingRoom.tsx` - Image fetching and state management
