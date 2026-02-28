import logging
from collections.abc import AsyncIterator, Callable

from google import genai
from google.genai import types

from .tool_dispatcher import ToolDispatcher


logger = logging.getLogger("gemini_live_manager")


class GeminiLiveManager:
    """
    Facade for the Gemini Multimodal Live API.
    Handles persistent connections and dispatches incoming events.
    """
    def __init__(self, model: str = "gemini-live-2.5-flash-native-audio"):
        self.client = genai.Client()
        self.model = model
        self.session = None
        self._connection_cm = None
        self.dispatcher = ToolDispatcher()

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

    async def listen(self, event_callback: Callable):
        """
        Asynchronous listener loop.
        
        :param event_callback: Function handling (event_type, payload).
        """
        if not self.session:
            return

        async for response in self.session.receive():
            # Handle Interruptions
            if response.server_content and response.server_content.interrupted:
                await event_callback("interruption", True)

            if response.server_content and response.server_content.waiting_for_input:
                await event_callback("waiting_for_input", True)

            if response.server_content and response.server_content.turn_complete:
                await event_callback("turn_complete", True)

            if (
                response.server_content
                and response.server_content.input_transcription
                and response.server_content.input_transcription.text
            ):
                await event_callback(
                    "user_text", response.server_content.input_transcription.text
                )

            # Handle output transcription when using audio responses.
            if (
                response.server_content
                and response.server_content.output_transcription
                and response.server_content.output_transcription.text
            ):
                await event_callback(
                    "text", response.server_content.output_transcription.text
                )

            # Handle Tool Calls
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
            
            # Route content
            if response.server_content and response.server_content.model_turn:
                for part in response.server_content.model_turn.parts:
                    if part.text:
                        await event_callback("text", part.text)
                    if part.inline_data and part.inline_data.data:
                        await event_callback(
                            "audio",
                            {
                                "data": part.inline_data.data,
                                "mime_type": part.inline_data.mime_type,
                            },
                        )

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
