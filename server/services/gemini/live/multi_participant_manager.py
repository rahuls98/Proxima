# server/services/gemini/live/multi_participant_manager.py

"""
Multi-participant session manager for training sessions with AI teammate.

Architecture
------------
Two independent Gemini Live sessions run concurrently:

1. **Prospect AI** - receives the trainee's real-time audio/video.
2. **Teammate AI** - prompted via text at turn boundaries.

A background task continuously reads from the prospect session and pushes
events (or errors) into an ``asyncio.Queue``.  The public ``iter_events()``
drains that queue and yields events to the handler.  Because the prospect
reader never pauses, there is **no gap** during which prospect events could
be lost or the session could time-out.

When the teammate should speak, ``iter_events()`` yields teammate events
inline (the prospect queue keeps filling in the background and is drained
immediately afterward).

Error propagation: prospect errors are placed in the queue as sentinel
objects and **re-raised** inside ``iter_events()`` so the handler's
``receive_from_gemini`` reconnection logic fires normally.
"""

import asyncio
import logging
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

from google.genai import types  # type: ignore

from proxima.config import build_teammate_system_prompt, TeammateConfig
from services.gemini.config import get_live_model_name

from .manager import GeminiLiveManager


logger = logging.getLogger("multi_participant")


# ---- internal queue sentinels ------------------------------------------------

@dataclass
class _Event:
    """Wraps a normal event dict pushed by the prospect reader task."""
    data: dict

@dataclass
class _TurnBoundary:
    """Signals that one prospect turn finished (iter_events returned)."""
    pass

@dataclass
class _Error:
    """Wraps an exception from the prospect reader so it can be re-raised."""
    exc: BaseException


_QueueItem = _Event | _TurnBoundary | _Error


# ---- manager -----------------------------------------------------------------

class MultiParticipantManager:
    """
    Manages a multi-participant training session with Prospect + Teammate AIs.

    The prospect session behaves identically to a single-participant session.
    The teammate session sits idle until explicitly prompted, then its audio/text
    response is yielded to the caller before returning control to the prospect
    queue.
    """

    def __init__(
        self,
        teammate_config: TeammateConfig,
        prospect_config: types.LiveConnectConfig,
        model: str | None = None,
    ):
        self.teammate_config = teammate_config
        self.model = model or get_live_model_name()

        # Two independent Gemini Live sessions
        self.prospect_manager = GeminiLiveManager(model=self.model)
        self.teammate_manager = GeminiLiveManager(model=self.model)

        # Configs
        self.prospect_config = prospect_config
        self.teammate_config_live = self._build_teammate_live_config()

        # Turn-taking state
        self.last_speaker: str = "rep"
        self.conversation_turns: int = 0
        self.teammate_last_spoke_turn: int = -10
        self._teammate_speaking: bool = False  # guard against re-entry

    # ------------------------------------------------------------------
    # Handler compatibility - the WebSocket handler checks manager.session
    # ------------------------------------------------------------------

    @property
    def session(self):
        """Return the prospect session so the handler's ``session is None`` guard works."""
        return self.prospect_manager.session

    # ------------------------------------------------------------------
    # Config helpers
    # ------------------------------------------------------------------

    def _build_teammate_live_config(self) -> types.LiveConnectConfig:
        """Build Gemini Live config for the teammate AI with a distinct voice."""
        from proxima.config import build_live_config, DEFAULT_VOICE_NAME

        teammate_prompt = build_teammate_system_prompt(self.teammate_config)
        teammate_voice = "Kore" if DEFAULT_VOICE_NAME == "Schedar" else "Schedar"

        return build_live_config(
            system_instruction=teammate_prompt,
            mode="training",
            voice_name=teammate_voice,
            tools=None,
        )

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def connect(self):
        """Connect both prospect and teammate AI sessions."""
        await self.prospect_manager.connect(self.prospect_config)
        await self.teammate_manager.connect(self.teammate_config_live)
        return self

    async def close(self):
        """Close both AI sessions."""
        await asyncio.gather(
            self.prospect_manager.close(),
            self.teammate_manager.close(),
        )
        logger.info("Multi-participant session closed")

    # ------------------------------------------------------------------
    # Input streaming - audio/video goes ONLY to prospect
    # ------------------------------------------------------------------

    async def stream_input(self, pcm_data: bytes, sample_rate: int = 16000):
        """Stream audio to the prospect only (teammate is text-prompted)."""
        await self.prospect_manager.stream_input(pcm_data, sample_rate)

    async def stream_video_input(self, frame_data: bytes, mime_type: str = "image/jpeg"):
        """Stream video to the prospect only."""
        await self.prospect_manager.stream_video_input(frame_data, mime_type)

    # ------------------------------------------------------------------
    # Text message pass-through (handler calls this for user_message)
    # ------------------------------------------------------------------

    async def send_text_message(self, text: str, turn_complete: bool = True):
        """Forward text messages to the prospect AI."""
        await self.prospect_manager.send_text_message(text, turn_complete)

    # ------------------------------------------------------------------
    # Turn-taking logic
    # ------------------------------------------------------------------

    def _should_teammate_speak(self) -> bool:
        """Decide whether the teammate should chime in after the current prospect turn."""
        if self._teammate_speaking:
            return False

        if self.conversation_turns < 2:
            result = False
        else:
            turns_since = self.conversation_turns - self.teammate_last_spoke_turn
            archetype = self.teammate_config.get("behavior_archetype", "supportive")

            thresholds = {
                "dominator": 2,
                "overly_excited": 2,
                "supportive": 3,
                "strategic_ae": 3,
                "nervous_junior": 5,
                "passive": 7,
            }
            result = turns_since >= thresholds.get(archetype, 3)

        logger.info(
            "_should_teammate_speak: turn=%d, last_spoke=%d -> %s",
            self.conversation_turns,
            self.teammate_last_spoke_turn,
            result,
        )
        return result

    # ------------------------------------------------------------------
    # Background prospect reader
    # ------------------------------------------------------------------

    async def _prospect_reader(self, queue: asyncio.Queue[_QueueItem]) -> None:
        """
        Continuously read prospect events and push them into *queue*.

        Runs as a background ``asyncio.Task``.  Reads directly from the prospect
        session's ``receive()`` stream (which spans the entire session lifetime)
        and pushes normalized events.  A ``_TurnBoundary`` is pushed whenever
        the model signals ``turn_complete`` or ``waiting_for_input``.

        Errors are wrapped in ``_Error`` and pushed so the main loop can re-raise.
        """
        try:
            while True:
                session = self.prospect_manager.session
                if not session:
                    await asyncio.sleep(0.1)
                    continue

                try:
                    turn = session.receive()
                    async for response in turn:
                        # --- interrupted ---
                        if response.server_content and response.server_content.interrupted:
                            await queue.put(_Event({"type": "interruption", "speaker": "prospect"}))

                        # --- input transcription (user speech) ---
                        if (
                            response.server_content
                            and response.server_content.input_transcription
                            and response.server_content.input_transcription.text
                        ):
                            await queue.put(_Event({
                                "type": "user_text",
                                "text": response.server_content.input_transcription.text,
                                "speaker": "prospect",
                            }))

                        # --- output transcription (model speech text) ---
                        if (
                            response.server_content
                            and response.server_content.output_transcription
                            and response.server_content.output_transcription.text
                        ):
                            await queue.put(_Event({
                                "type": "text",
                                "text": response.server_content.output_transcription.text,
                                "speaker": "prospect",
                            }))

                        # --- model turn (audio data) ---
                        if response.server_content and response.server_content.model_turn:
                            for part in response.server_content.model_turn.parts:
                                if part.inline_data and part.inline_data.data:
                                    await queue.put(_Event({
                                        "type": "audio",
                                        "data": part.inline_data.data,
                                        "mime_type": part.inline_data.mime_type or "audio/pcm;rate=24000",
                                        "speaker": "prospect",
                                    }))

                        # --- tool calls (pass through to prospect's dispatcher) ---
                        if response.tool_call and response.tool_call.function_calls:
                            dispatcher = self.prospect_manager.dispatcher
                            function_responses = []
                            for function_call in response.tool_call.function_calls:
                                if function_call.name == "trigger_ui_coaching_hint":
                                    import json as _json
                                    args = _json.loads(function_call.args) if isinstance(function_call.args, str) else function_call.args
                                    await queue.put(_Event({
                                        "type": "ui_event",
                                        "sub_type": "coaching",
                                        "data": args,
                                        "speaker": "prospect",
                                    }))
                                result = await dispatcher.execute(function_call)
                                function_responses.append(
                                    types.FunctionResponse(
                                        id=function_call.id,
                                        name=function_call.name,
                                        response=result,
                                    )
                                )
                            await session.send_tool_response(function_responses=function_responses)

                        # --- turn_complete -> push event + boundary ---
                        if response.server_content and response.server_content.turn_complete:
                            await queue.put(_Event({"type": "turn_complete", "speaker": "prospect"}))
                            await queue.put(_TurnBoundary())

                        # --- waiting_for_input -> push event + boundary ---
                        if response.server_content and response.server_content.waiting_for_input:
                            await queue.put(_Event({"type": "waiting_for_input", "speaker": "prospect"}))
                            await queue.put(_TurnBoundary())

                    # session.receive() stream ended (session closed gracefully).
                    # Treat as a close: push an error so the handler reconnects.
                    logger.info("Prospect receive stream ended (normal close)")
                    await queue.put(
                        _Error(ConnectionError("Prospect session stream ended"))
                    )
                    return

                except asyncio.CancelledError:
                    raise  # let cancellation propagate
                except Exception as exc:
                    # Push the error so iter_events() can re-raise it, then
                    # stop.  The handler will reconnect and call iter_events()
                    # again, which creates a fresh reader task — so we must
                    # NOT loop back and try to re-read from a stale session.
                    logger.warning("Prospect reader caught error: %s", exc)
                    await queue.put(_Error(exc))
                    return

        except asyncio.CancelledError:
            logger.info("Prospect reader task cancelled")

    # ------------------------------------------------------------------
    # Event iteration - the core merge loop
    # ------------------------------------------------------------------

    async def iter_events(self) -> AsyncIterator[dict]:
        """
        Yield events from both AIs with coordinated turn-taking.

        A background task feeds prospect events into a queue (never pausing).
        This method drains the queue, yielding events to the handler.  When a
        turn boundary is detected, it optionally lets the teammate speak --
        during which time prospect events continue to accumulate in the queue
        and are drained immediately afterward.

        Prospect errors are re-raised here so the handler can reconnect.
        """
        teammate_name = self.teammate_config.get("teammate_name", "Teammate")
        current_prospect_text: list[str] = []

        queue: asyncio.Queue[_QueueItem] = asyncio.Queue()
        reader_task = asyncio.create_task(self._prospect_reader(queue))

        try:
            while True:
                item = await queue.get()

                # --- error from prospect reader -> re-raise ---
                if isinstance(item, _Error):
                    raise item.exc

                # --- turn boundary -> teammate logic ---
                if isinstance(item, _TurnBoundary):
                    self.conversation_turns += 1
                    self.last_speaker = "prospect"

                    if self._should_teammate_speak():
                        context = " ".join(current_prospect_text) if current_prospect_text else ""
                        if context:
                            prompt = (
                                'The prospect just said: "{}". '
                                "Chime in naturally with a brief, relevant contribution."
                            ).format(context)
                        else:
                            prompt = (
                                "There is a pause in the conversation. "
                                "Chime in naturally with a brief comment."
                            )

                        logger.info(
                            "Prompting teammate (turn=%d): %s",
                            self.conversation_turns,
                            prompt[:120],
                        )

                        try:
                            async for t_event in self._prompt_and_consume_teammate(
                                prompt, teammate_name
                            ):
                                yield t_event
                        except Exception as e:
                            logger.exception(
                                "Teammate interaction failed -- continuing with prospect only"
                            )

                        # After teammate finishes, drain any prospect events
                        # that accumulated during the teammate's turn.
                        while not queue.empty():
                            pending = queue.get_nowait()
                            if isinstance(pending, _Error):
                                raise pending.exc
                            if isinstance(pending, _TurnBoundary):
                                self.conversation_turns += 1
                                # Don't trigger another teammate turn back-to-back
                                continue
                            if isinstance(pending, _Event):
                                yield pending.data

                    current_prospect_text.clear()
                    continue

                # --- normal prospect event ---
                if isinstance(item, _Event):
                    ev = item.data
                    if ev.get("type") == "text" and ev.get("text"):
                        current_prospect_text.append(ev["text"])
                    yield ev
                    continue

        finally:
            reader_task.cancel()
            try:
                await reader_task
            except asyncio.CancelledError:
                pass

    # ------------------------------------------------------------------
    # Teammate prompt + response consumption
    # ------------------------------------------------------------------

    async def _prompt_and_consume_teammate(
        self, prompt: str, teammate_name: str
    ) -> AsyncIterator[dict]:
        """
        Send *prompt* to the teammate and yield response events until turn_complete.
        """
        session = self.teammate_manager.session
        if not session:
            logger.warning("Teammate session is None -- skipping")
            return

        self._teammate_speaking = True
        try:
            await session.send_client_content(
                turns=[
                    types.Content(
                        role="user",
                        parts=[types.Part(text=prompt)],
                    )
                ],
                turn_complete=True,
            )

            event_count = 0
            t_start = time.monotonic()
            is_first_text = True
            receive_stream = session.receive()
            async for response in receive_stream:
                if time.monotonic() - t_start > 20:
                    logger.warning(
                        "Teammate exceeded 20 s safety timeout (%d events)", event_count
                    )
                    break

                # --- output transcription ---
                if (
                    response.server_content
                    and response.server_content.output_transcription
                    and response.server_content.output_transcription.text
                ):
                    event_count += 1
                    text = response.server_content.output_transcription.text
                    if is_first_text:
                        text = "[{}] {}".format(teammate_name, text)
                        is_first_text = False
                    yield {
                        "type": "text",
                        "text": text,
                        "speaker": "teammate",
                    }

                # --- audio data ---
                if response.server_content and response.server_content.model_turn:
                    for part in response.server_content.model_turn.parts:
                        if part.inline_data and part.inline_data.data:
                            event_count += 1
                            yield {
                                "type": "audio",
                                "data": part.inline_data.data,
                                "mime_type": (
                                    part.inline_data.mime_type
                                    or "audio/pcm;rate=24000"
                                ),
                                "speaker": "teammate",
                            }

                # --- turn complete -> stop ---
                if response.server_content and response.server_content.turn_complete:
                    self.teammate_last_spoke_turn = self.conversation_turns
                    self.last_speaker = "teammate"
                    event_count += 1
                    yield {"type": "turn_complete", "speaker": "teammate"}
                    logger.info(
                        "Teammate turn complete (%d events, %.1fs)",
                        event_count,
                        time.monotonic() - t_start,
                    )
                    return

                if response.server_content and response.server_content.waiting_for_input:
                    self.teammate_last_spoke_turn = self.conversation_turns
                    self.last_speaker = "teammate"
                    event_count += 1
                    yield {"type": "waiting_for_input", "speaker": "teammate"}
                    logger.info(
                        "Teammate waiting_for_input (%d events, %.1fs)",
                        event_count,
                        time.monotonic() - t_start,
                    )
                    return

            logger.info(
                "Teammate receive stream ended naturally (%d events, %.1fs)",
                event_count,
                time.monotonic() - t_start,
            )

        except Exception:
            logger.exception("Error in teammate prompt/consume")
        finally:
            self._teammate_speaking = False

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------

    async def inject_context_message(self, message: str, to_whom: str = "both"):
        """Send a context message to prospect, teammate, or both."""
        if to_whom in ("prospect", "both"):
            await self.prospect_manager.send_text_message(message, turn_complete=False)
        if to_whom in ("teammate", "both"):
            await self.teammate_manager.send_text_message(message, turn_complete=False)
