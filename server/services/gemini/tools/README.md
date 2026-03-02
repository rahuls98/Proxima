# Tools Service

Gemini Live tool implementations for session features like file summarization.

## What It Does

Provides callable "tools" that Gemini can invoke during conversations:

- File upload and summarization
- Future: More tool-based features

## Files Module (file/)

**Purpose:** Handle uploaded files in training sessions

**Key Components:**

- `FileContextStore` - In-memory file storage
- `GeminiDocumentProcessor` - Summarizes documents via Gemini
- `UploadedFileTools` - Tool function for Gemini Live

## How It Works

1. Client uploads file via WebSocket
2. Backend stores in FileContextStore
3. Backend requests Gemini to summarize
4. Gemini calls tool: summarize_uploaded_file(file_id)
5. Tool processor summarizes using Gemini API
6. Result returned to Gemini, embedded in conversation

## Usage

Tools are automatically registered with GeminiLiveManager at construction. No manual setup needed.
