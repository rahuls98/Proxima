# server/services/gemini/live/manager.py

import logging
from collections.abc import AsyncIterator

from google import genai
from google.genai import types  # type: ignore

from services.gemini.config import get_live_model_name
from services.gemini.tools import UploadedFileTools

from .dispatcher import ToolDispatcher


logger = logging.getLogger("gemini_live")


class GeminiLiveManager:
    """
    Facade for the Gemini Multimodal Live API.
    Handles persistent connections and dispatches incoming events.
    """
    def __init__(self, model: str | None = None):
        self.client = genai.Client()
        self.model = model or get_live_model_name()
        self.session = None
        self._connection_cm = None
        self.dispatcher = ToolDispatcher()
        self.uploaded_file_tools = UploadedFileTools()
        self.uploaded_file_tools.register(self.dispatcher)

    def live_tool_declarations(self) -> list[types.Tool]:
        return self.uploaded_file_tools.declarations()

    def store_uploaded_file(self, *, file_name: str, mime_type: str, data: bytes) -> str:
        record = self.uploaded_file_tools.add_uploaded_file(
            file_name=file_name,
            mime_type=mime_type,
            data=data,
        )
        return record.file_id

    async def send_text_message(self, text: str, turn_complete: bool = True):
        if not self.session:
            return

        normalized = text.strip()
        if not normalized:
            return

        await self.session.send_client_content(
            turns=[
                types.Content(
                    role="user",
                    parts=[types.Part(text=normalized)],
                )
            ],
            turn_complete=turn_complete,
        )

    async def request_uploaded_file_summary(
        self,
        *,
        file_id: str,
        file_name: str,
        mime_type: str,
    ):
        await self.send_text_message(
            (
                "A user uploaded a file in the chat. "
                f"file_id={file_id}, file_name={file_name}, mime_type={mime_type}. "
                "Call summarize_uploaded_file with this file_id and then explain the "
                "file's purpose and key points in a short response."
            )
        )

    async def connect(self, config: types.LiveConnectConfig):
        """Initializes the bidirectional WebSocket session."""
        self._connection_cm = self.client.aio.live.connect(
            model=self.model, config=config
        )
        self.session = await self._connection_cm.__aenter__()
        return self

    async def close(self):
        """Closes the live connection cleanly."""
        if self._connection_cm is not None:
            try:
                await self._connection_cm.__aexit__(None, None, None)
            except Exception:
                # Connection may already be closed/timed out; swallow during cleanup.
                logger.exception("Error while closing Gemini live connection")
            self._connection_cm = None
        self.session = None

    async def stream_input(self, pcm_data: bytes, sample_rate: int = 16000):
        """Streams audio/video chunks to the model."""
        if self.session:
            await self.session.send_realtime_input(
                audio=types.Blob(data=pcm_data, mime_type=f"audio/pcm;rate={sample_rate}")
            )

    async def stream_video_input(
        self, frame_data: bytes, mime_type: str = "image/jpeg"
    ):
        """Streams visual frames (screen-share snapshots) to the model."""
        if self.session:
            await self.session.send_realtime_input(
                video=types.Blob(data=frame_data, mime_type=mime_type)
            )

    async def begin_activity(self):
        """Signals start of user activity for manual turn control."""
        if self.session:
            await self.session.send_realtime_input(activity_start=types.ActivityStart())

    async def end_activity(self):
        """Signals end of user activity for manual turn control."""
        if self.session:
            await self.session.send_realtime_input(activity_end=types.ActivityEnd())

    async def iter_events(self) -> AsyncIterator[dict]:
        """
        Yields normalized event dictionaries from a live Gemini turn stream.
        This keeps Gemini-specific response object parsing out of higher layers.
        """
        if not self.session:
            return

        turn = self.session.receive()
        async for response in turn:
            if response.server_content and response.server_content.interrupted:
                yield {"type": "interruption"}

            if (
                response.server_content
                and response.server_content.input_transcription
                and response.server_content.input_transcription.text
            ):
                yield {
                    "type": "user_text",
                    "text": response.server_content.input_transcription.text,
                }

            if (
                response.server_content
                and response.server_content.output_transcription
                and response.server_content.output_transcription.text
            ):
                yield {
                    "type": "text",
                    "text": response.server_content.output_transcription.text,
                }

            if response.tool_call and response.tool_call.function_calls:
                function_responses = []
                for function_call in response.tool_call.function_calls:
                    result = await self.dispatcher.execute(function_call)
                    function_responses.append(
                        types.FunctionResponse(
                            id=function_call.id,
                            name=function_call.name,
                            response=result,
                        )
                    )
                await self.session.send_tool_response(function_responses=function_responses)

            if response.server_content and response.server_content.model_turn:
                for part in response.server_content.model_turn.parts:
                    if part.inline_data and part.inline_data.data:
                        yield {
                            "type": "audio",
                            "data": part.inline_data.data,
                            "mime_type": part.inline_data.mime_type or "audio/pcm;rate=24000",
                        }

            if response.server_content and response.server_content.turn_complete:
                yield {"type": "turn_complete"}
            if response.server_content and response.server_content.waiting_for_input:
                yield {"type": "waiting_for_input"}
