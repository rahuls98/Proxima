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
import array
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
        self._teammate_interrupt_sent: bool = False
        self._teammate_interrupted_by_user: bool = False
        self._teammate_audio_started: bool = False
        self._user_bargein_frames: int = 0
        # Set True while the server knows the user is actively speaking.
        # Used by the handler (via user_interrupt_agents) to immediately mute
        # any pending agent audio and seize the conversational floor.
        self._user_is_speaking: bool = False
        # Global Turn ID — the core of the Turn-Aware Buffer.
        # Incremented every time:
        #   - The user starts speaking (via user_interrupt_agents)
        #   - Any agent completes a turn (prospect _TurnBoundary, teammate turn_complete)
        # _prompt_and_consume_teammate captures this at prompt-time and compares
        # it before yielding each audio chunk.  If they differ, the response is
        # stale (conversation has moved forward) and is silently dropped.
        self.global_turn_id: int = 0
        # Background keepalive task handle (set in connect(), cancelled in close()).
        self._keepalive_task: asyncio.Task | None = None

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
        """Build Gemini Live config for the teammate AI.

        Follows the Star Topology reference architecture:
        - VAD disabled: prevents the teammate from being triggered by ambient
          audio (prospect speech or echo).  The server acts as the sole arbiter
          of when the teammate speaks.
        - NO_INTERRUPTION: the server—not Gemini's VAD—controls turn boundaries.
        - TURN_INCLUDES_ALL_INPUT: teammate accumulates full audio context even
          without activity markers, giving it complete conversational history.
        """
        from proxima.config import DEFAULT_VOICE_NAME

        teammate_prompt = build_teammate_system_prompt(self.teammate_config)
        teammate_voice = "Kore" if DEFAULT_VOICE_NAME == "Schedar" else "Schedar"

        # Append the orchestration STRICT RULE to the generated persona prompt.
        # This is the model-level gate from the reference architecture:
        # even with VAD disabled, Gemini can still internally decide to generate
        # a response when it accumulates audio context.  The STRICT RULE overrides
        # that planning-level behaviour — the model is told its ONLY trigger to
        # speak is an explicit text message from the server.
        strict_rule = (
            "\n\n"
            "## STRICT ORCHESTRATION RULE — HIGHEST PRIORITY\n"
            "You are operating inside a server-managed 3-way conversation system. "
            "You will passively receive audio from the conversation for context, "
            "but you must NEVER self-initiate a response based on audio input alone. "
            "You will ONLY speak when the server explicitly sends you a text message "
            "as a conversation cue. Treat all incoming audio as background context — "
            "do not interrupt, do not respond spontaneously, do not speak until prompted.\n"
            "ADDITIONALLY: You must NEVER speak at the same time as the prospect. "
            "Wait for the prospect to finish their thought completely before speaking. "
            "If the user (trainee) interrupts you at any point, stop speaking immediately "
            "and listen — do not attempt to finish your sentence."
        )

        return types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=teammate_prompt + strict_rule,
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=teammate_voice,
                    )
                ),
                language_code="en-US",
            ),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            realtime_input_config=types.RealtimeInputConfig(
                # VAD disabled: server explicitly controls when teammate responds.
                # This is the core Star Topology principle — the server acts as
                # the "Ear" and decides what audio each agent hears.
                automatic_activity_detection=types.AutomaticActivityDetection(disabled=True),
                # Agents will not be interrupted by incoming audio; only explicit
                # activity_start signals (sent by the server) can interrupt.
                activity_handling=types.ActivityHandling.NO_INTERRUPTION,
                # Include all input (not just activity windows) so the teammate
                # accumulates the full conversation context passively.
                turn_coverage=types.TurnCoverage.TURN_INCLUDES_ALL_INPUT,
            ),
        )

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def connect(self):
        """Connect both prospect and teammate AI sessions."""
        await self.prospect_manager.connect(self.prospect_config)
        await self.teammate_manager.connect(self.teammate_config_live)
        # Start keepalive for the teammate session.  Without real-time audio
        # routing, the teammate WebSocket is otherwise idle between turns and
        # times out with a keepalive ping timeout (1011 error).
        self._keepalive_task = asyncio.create_task(
            self._teammate_keepalive(), name="teammate_keepalive"
        )
        return self

    async def close(self):
        """Close both AI sessions."""
        if self._keepalive_task and not self._keepalive_task.done():
            self._keepalive_task.cancel()
            try:
                await self._keepalive_task
            except asyncio.CancelledError:
                pass
            self._keepalive_task = None
        await asyncio.gather(
            self.prospect_manager.close(),
            self.teammate_manager.close(),
        )
        logger.info("Multi-participant session closed")

    async def _teammate_keepalive(self) -> None:
        """Periodically send PCM silence to keep the teammate WebSocket alive.

        The teammate session has VAD disabled and receives no real-time audio
        between turns (we removed that routing to fix latency-induced desync).
        Without any WebSocket traffic, the Gemini Live API times out via
        keepalive ping (1011 close code) after ~30–60 s of inactivity.

        Sending a tiny silence burst every 20 s keeps the connection warm.
        VAD is disabled so silence never triggers a teammate response — it
        is purely a WebSocket heartbeat at the application layer.
        """
        # 320 bytes = 160 samples of signed-16 PCM silence @ 16 kHz (20 ms)
        silence = bytes(320)
        while True:
            try:
                await asyncio.sleep(20)
            except asyncio.CancelledError:
                return
            if self._teammate_speaking:
                continue  # don't interfere while teammate is mid-response
            session = self.teammate_manager.session
            if not session:
                continue
            try:
                await session.send_realtime_input(
                    audio=types.Blob(data=silence, mime_type="audio/pcm;rate=16000")
                )
                logger.debug("Teammate keepalive sent")
            except asyncio.CancelledError:
                return
            except Exception:
                logger.debug("Teammate keepalive ping failed — session may be dead")

    # ------------------------------------------------------------------
    # Input streaming - audio/video goes ONLY to prospect
    # ------------------------------------------------------------------

    async def stream_input(self, pcm_data: bytes, sample_rate: int = 16000):
        """Stream user audio to prospect AND teammate (star topology: user is master).

        Per the reference architecture, user audio is always forwarded to both
        agents — the user has "Master Priority."

        When the teammate is speaking, a sustained PCM amplitude gate detects
        barge-in and sends an activity_start signal (equivalent to end_of_turn=True
        in the reference) to interrupt it.  VAD is disabled on the teammate so the
        server must send this signal explicitly.

        When the teammate is idle, user audio is forwarded passively (no activity
        markers) so the teammate accumulates full conversational context without
        triggering an unsolicited response.
        """
        # ---- barge-in detection when teammate is speaking ----
        if (
            self._teammate_speaking
            and self._teammate_audio_started
            and not self._teammate_interrupt_sent
        ):
            if self._is_likely_user_speech(pcm_data):
                self._user_bargein_frames += 1
                if self._user_bargein_frames >= 6:
                    self._teammate_interrupted_by_user = True
                    try:
                        # With VAD disabled, activity_start is the explicit
                        # interrupt signal (end_of_turn=True equivalent from reference).
                        await self.teammate_manager.begin_activity()
                        self._teammate_interrupt_sent = True
                    except Exception:
                        logger.exception("Failed to signal teammate interruption")
            else:
                self._user_bargein_frames = 0
        else:
            self._user_bargein_frames = 0

        # ---- always forward to prospect ----
        await self.prospect_manager.stream_input(pcm_data, sample_rate)
        # NOTE: We intentionally do NOT forward user audio to the teammate in
        # real-time (Doc 2 §1 — "Wait for Finish" hand-off).  The teammate
        # receives full context via the explicit text prompt in
        # _prompt_and_consume_teammate after the prospect's turn_complete fires.
        # Real-time forwarding caused the latency-induced desync: the teammate
        # began generating before the prospect was done, producing stale responses.

    async def stream_video_input(self, frame_data: bytes, mime_type: str = "image/jpeg"):
        """Stream video to the prospect only."""
        await self.prospect_manager.stream_video_input(frame_data, mime_type)

    async def user_interrupt_agents(self) -> None:
        """Seize the conversational floor for the user immediately.

        Called by the handler on the first audio frame from the user.  This is
        the Global Interruption logic from the reference (Doc 2, §1):

        - Prospect: has VAD enabled, so incoming user audio naturally triggers
          Gemini's own interruption mechanism — no explicit signal needed.
        - Teammate: has VAD disabled, so we must send activity_start explicitly.
          Only sent if the teammate is actively generating audio (i.e., the user
          is genuinely trying to cut it off, not just speaking in a quiet window).

        The outbound_queue audio drain (muting pending agent audio chunks from
        the client's speaker) is handled by the WebSocket handler, which has
        direct access to that queue.
        """
        self._user_is_speaking = True

        # Advance the global turn ID immediately: any teammate response still
        # generating at this moment is now stale (the user has seized the floor).
        self.global_turn_id += 1
        logger.debug("user_interrupt_agents: global_turn_id → %d", self.global_turn_id)

        # Interrupt teammate only if it has started generating audio — the same
        # condition checked by the PCM barge-in gate, but triggered immediately
        # without waiting for the 6-frame threshold.
        if (
            self._teammate_speaking
            and self._teammate_audio_started
            and not self._teammate_interrupt_sent
        ):
            self._teammate_interrupted_by_user = True
            self._teammate_interrupt_sent = True
            try:
                await self.teammate_manager.begin_activity()
                logger.info("user_interrupt_agents: teammate interrupted immediately")
            except Exception:
                logger.exception("user_interrupt_agents: failed to interrupt teammate")

    def user_stopped_speaking(self) -> None:
        """Clear the user-speaking flag.  Called when the prospect's turn starts."""
        self._user_is_speaking = False

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

        if self.conversation_turns < 1:
            result = False
        else:
            turns_since = self.conversation_turns - self.teammate_last_spoke_turn
            archetype = self.teammate_config.get("behavior_archetype", "supportive")

            thresholds = {
                "dominator": 1,
                "overly_excited": 1,
                "supportive": 2,
                "strategic_ae": 2,
                "nervous_junior": 4,
                "passive": 6,
            }
            # Safety fallback: even passive archetypes should not remain silent
            # for too many turns during testing/short sessions.
            effective_threshold = min(thresholds.get(archetype, 2), 3)
            result = turns_since >= effective_threshold

        logger.info(
            "_should_teammate_speak: turn=%d, last_spoke=%d -> %s",
            self.conversation_turns,
            self.teammate_last_spoke_turn,
            result,
        )
        return result

    @staticmethod
    def _merge_text_with_overlap(existing: str, chunk: str) -> str:
        """Merge incremental transcript chunks while avoiding duplicated overlap."""
        if not existing:
            return chunk
        if not chunk:
            return existing
        if chunk in existing:
            return existing

        max_overlap = min(len(existing), len(chunk))
        for overlap in range(max_overlap, 0, -1):
            if existing.endswith(chunk[:overlap]):
                return existing + chunk[overlap:]
        return existing + chunk

    async def _inject_teammate_context_for_prospect(
        self,
        teammate_name: str,
        teammate_utterance: str,
    ) -> None:
        """Feed teammate utterance back to prospect so prospect can react to it."""
        cleaned = teammate_utterance.strip()
        if not cleaned:
            return

        context_message = (
            f'Teammate {teammate_name} just said: "{cleaned}". '
            "Acknowledge or respond naturally in your next turn when relevant."
        )
        try:
            # Use turn_complete=False so this is queued as context for the prospect's
            # NEXT turn rather than forcibly ending any turn that is currently active.
            # Using turn_complete=True would interrupt the prospect if it has already
            # started speaking again after the teammate's turn.
            await self.prospect_manager.send_text_message(context_message, turn_complete=False)
        except Exception:
            logger.exception("Failed to inject teammate context into prospect session")

    @staticmethod
    def _is_likely_user_speech(pcm_data: bytes) -> bool:
        """Conservative PCM16 gate for user barge-in detection."""
        if not pcm_data:
            return False
        sample_count = min(len(pcm_data) // 2, 1600)
        if sample_count <= 0:
            return False
        try:
            samples = array.array("h")
            samples.frombytes(pcm_data[: sample_count * 2])
        except Exception:
            return False

        avg_abs = sum(abs(sample) for sample in samples) / len(samples)
        return avg_abs > 1200

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
                            # Set the server-side turn lock: prospect is now actively
                            # generating.  We stop routing audio to the teammate during
                            # this window to prevent ghost interruptions (reference:
                            # ProximaRoomOrchestrator.current_speaker lock).
                            self._prospect_generating = True
                            # Prospect speaking → user must have finished speaking.
                            # Clear the user-speaking flag so future user audio frames
                            # from the handler don't drain the outbound queue unnecessarily.
                            self.user_stopped_speaking()
                            for part in response.server_content.model_turn.parts:
                                if part.inline_data and part.inline_data.data:
                                    await queue.put(_Event({
                                        "type": "audio",
                                        "data": part.inline_data.data,
                                        "mime_type": part.inline_data.mime_type or "audio/pcm;rate=24000",
                                        "speaker": "prospect",
                                    }))
                                    # NOTE: We intentionally do NOT route prospect audio
                                    # to the teammate here.  Routing live generation audio
                                    # to the teammate session is exactly the trigger for
                                    # ghost interruptions: the teammate's API instance
                                    # detects the incoming audio while prospect is speaking
                                    # and internally flags activity, which can silence the
                                    # prospect stream.  The teammate gets full conversation
                                    # context via:
                                    #   1. Passively-routed USER audio (in stream_input)
                                    #   2. The explicit text prompt in _prompt_and_consume_teammate

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

                        # --- turn signals ---
                        # Prefer explicit floor-yield (`waiting_for_input`), but
                        # keep a safe fallback on `turn_complete` because some
                        # model turns omit waiting_for_input. Boundary is deduped
                        # when both flags appear in the same response.
                        pushed_boundary = False
                        if response.server_content and response.server_content.turn_complete:
                            # Prospect turn done: release the server-side turn lock.
                            self._prospect_generating = False
                            await queue.put(_Event({"type": "turn_complete", "speaker": "prospect"}))
                            await queue.put(_TurnBoundary())
                            pushed_boundary = True
                            # NOTE: We do NOT send activity_end here.
                            # Sending it unconditionally would auto-trigger an unsolicited
                            # teammate response (Gemini interprets TURN_INCLUDES_ALL_INPUT +
                            # activity_end as an implicit turn trigger).  Those stale events
                            # would then pollute the next _prompt_and_consume_teammate call.
                            # Instead, activity_end is sent inside _prompt_and_consume_teammate
                            # right before the explicit prompt — only when we're ready to read
                            # the response from the teammate's receive stream.

                        if response.server_content and response.server_content.waiting_for_input:
                            self._prospect_generating = False
                            await queue.put(_Event({"type": "waiting_for_input", "speaker": "prospect"}))
                            if not pushed_boundary:
                                await queue.put(_TurnBoundary())

                    # session.receive() stream ended.
                    # This can happen naturally between turns; continue reading.
                    await asyncio.sleep(0.01)
                    continue

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
        last_prospect_activity_ts = time.monotonic()

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
                    self.global_turn_id += 1  # prospect completed a turn
                    self.last_speaker = "prospect"
                    logger.debug("_TurnBoundary: global_turn_id → %d", self.global_turn_id)

                    # Boundary signals can arrive slightly before the final
                    # prospect text/audio chunks. Drain a short burst of
                    # late prospect events first so teammate output does not
                    # appear interleaved or prematurely in the transcript.
                    drain_deadline = time.monotonic() + 0.6
                    while True:
                        remaining = drain_deadline - time.monotonic()
                        if remaining <= 0:
                            break
                        try:
                            pending = await asyncio.wait_for(queue.get(), timeout=remaining)
                        except asyncio.TimeoutError:
                            break

                        if isinstance(pending, _Error):
                            raise pending.exc
                        if isinstance(pending, _TurnBoundary):
                            self.conversation_turns += 1
                            continue
                        if isinstance(pending, _Event):
                            ev_pending = pending.data
                            if ev_pending.get("type") == "text" and ev_pending.get("text"):
                                current_prospect_text.append(ev_pending["text"])
                            if ev_pending.get("type") in {"text", "audio"}:
                                last_prospect_activity_ts = time.monotonic()
                            yield ev_pending

                    # Ensure the prospect has been quiet for a short window
                    # before letting teammate start, preventing overlap.
                    quiet_window_seconds = 1.0
                    while True:
                        remaining_quiet = quiet_window_seconds - (
                            time.monotonic() - last_prospect_activity_ts
                        )
                        if remaining_quiet <= 0:
                            break
                        try:
                            pending = await asyncio.wait_for(
                                queue.get(), timeout=remaining_quiet
                            )
                        except asyncio.TimeoutError:
                            break

                        if isinstance(pending, _Error):
                            raise pending.exc
                        if isinstance(pending, _TurnBoundary):
                            self.conversation_turns += 1
                            continue
                        if isinstance(pending, _Event):
                            ev_pending = pending.data
                            if ev_pending.get("type") == "text" and ev_pending.get("text"):
                                current_prospect_text.append(ev_pending["text"])
                            if ev_pending.get("type") in {"text", "audio"}:
                                last_prospect_activity_ts = time.monotonic()
                            yield ev_pending

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
                    if ev.get("type") in {"text", "audio"}:
                        last_prospect_activity_ts = time.monotonic()
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
            logger.warning("Teammate session is None -- reconnecting")
            try:
                await self.teammate_manager.connect(self.teammate_config_live)
            except Exception:
                logger.exception("Failed to reconnect teammate session")
                return
            session = self.teammate_manager.session
            if not session:
                logger.warning("Teammate session unavailable after reconnect -- skipping")
                return

        self._teammate_speaking = True
        try:
            self._teammate_interrupted_by_user = False
            self._teammate_audio_started = False

            # Mark the end of passively-accumulated audio context before sending
            # the explicit text prompt.  This is the correct point to send activity_end:
            # we are about to open the receive stream, so any Gemini response triggered
            # by this boundary will be captured (not left as stale buffer events).
            try:
                await session.send_realtime_input(activity_end=types.ActivityEnd())
            except Exception:
                logger.debug("Failed to send pre-prompt activity_end to teammate")

            # Send the explicit text prompt, triggering the teammate's response.
            # Wrap in a dead-session reconnect: a non-None session may still have
            # a dead WebSocket if the keepalive failed (1011 ping timeout).  On
            # ConnectionClosedError we reconnect once and retry the send.
            for _attempt in range(2):
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
                    break  # sent successfully
                except Exception as _exc:
                    if _attempt == 0 and "1011" in str(_exc) or "closed" in str(_exc).lower():
                        logger.warning(
                            "Teammate session dead on send (%s) — reconnecting", _exc
                        )
                        try:
                            await self.teammate_manager.close()
                            await self.teammate_manager.connect(self.teammate_config_live)
                            session = self.teammate_manager.session
                            if not session:
                                logger.warning("Teammate session unavailable after reconnect on send")
                                return
                        except Exception:
                            logger.exception("Failed to reconnect teammate on send failure")
                            return
                    else:
                        raise

            event_count = 0
            t_start = time.monotonic()
            teammate_utterance = ""
            teammate_audio_emitted = False
            pending_text_chunks: list[str] = []
            emitted_teammate_text = ""
            is_first_text_chunk = True
            # Snapshot the turn ID at the moment we send the prompt.
            # If global_turn_id advances before we yield audio, the response is
            # stale — the conversation has moved forward and we must drop it.
            turn_id_at_prompt = self.global_turn_id
            receive_stream = session.receive()
            async for response in receive_stream:
                # ---- Stale-response gate (Doc 1 §2) ----
                # If global_turn_id has advanced since we sent the prompt, the
                # conversation context has changed (user interrupted or another
                # turn completed).  Drop this response immediately.
                if self.global_turn_id != turn_id_at_prompt:
                    logger.info(
                        "Teammate response stale (prompt turn=%d, current=%d) — dropping",
                        turn_id_at_prompt,
                        self.global_turn_id,
                    )
                    return

                # ---- Forced Silence / Physical Mute (Doc 2 §2) ----
                # While the prospect is actively generating audio, the teammate
                # must be completely silent.  Drop everything until the prospect
                # stops.  This is a hard server-side mute independent of the
                # stale-turn check above.
                if self._prospect_generating:
                    logger.debug("Teammate muted: prospect is generating")
                    continue

                if self._teammate_interrupted_by_user:
                    while pending_text_chunks and teammate_audio_emitted:
                        chunk = pending_text_chunks.pop(0)
                        next_text = self._merge_text_with_overlap(emitted_teammate_text, chunk)
                        delta = next_text[len(emitted_teammate_text):]
                        emitted_teammate_text = next_text
                        if not delta:
                            continue
                        if is_first_text_chunk:
                            delta = "[{}] {}".format(teammate_name, delta)
                            is_first_text_chunk = False
                        event_count += 1
                        yield {
                            "type": "text",
                            "text": delta,
                            "speaker": "teammate",
                        }
                    await self._inject_teammate_context_for_prospect(
                        teammate_name,
                        teammate_utterance,
                    )
                    event_count += 1
                    yield {"type": "interruption", "speaker": "teammate"}
                    logger.info(
                        "Teammate interrupted by user activity (%d events, %.1fs)",
                        event_count,
                        time.monotonic() - t_start,
                    )
                    return

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
                    text_chunk = response.server_content.output_transcription.text
                    teammate_utterance = self._merge_text_with_overlap(
                        teammate_utterance,
                        text_chunk,
                    )
                    pending_text_chunks.append(text_chunk)

                # --- audio data ---
                if response.server_content and response.server_content.model_turn:
                    for part in response.server_content.model_turn.parts:
                        if part.inline_data and part.inline_data.data:
                            teammate_audio_emitted = True
                            self._teammate_audio_started = True
                            if self._teammate_interrupted_by_user:
                                while pending_text_chunks and teammate_audio_emitted:
                                    chunk = pending_text_chunks.pop(0)
                                    next_text = self._merge_text_with_overlap(emitted_teammate_text, chunk)
                                    delta = next_text[len(emitted_teammate_text):]
                                    emitted_teammate_text = next_text
                                    if not delta:
                                        continue
                                    if is_first_text_chunk:
                                        delta = "[{}] {}".format(teammate_name, delta)
                                        is_first_text_chunk = False
                                    event_count += 1
                                    yield {
                                        "type": "text",
                                        "text": delta,
                                        "speaker": "teammate",
                                    }
                                await self._inject_teammate_context_for_prospect(
                                    teammate_name,
                                    teammate_utterance,
                                )
                                event_count += 1
                                yield {"type": "interruption", "speaker": "teammate"}
                                logger.info(
                                    "Teammate interrupted during audio emission (%d events, %.1fs)",
                                    event_count,
                                    time.monotonic() - t_start,
                                )
                                return

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

                            if pending_text_chunks:
                                chunk = pending_text_chunks.pop(0)
                                next_text = self._merge_text_with_overlap(emitted_teammate_text, chunk)
                                delta = next_text[len(emitted_teammate_text):]
                                emitted_teammate_text = next_text
                                if delta:
                                    if is_first_text_chunk:
                                        delta = "[{}] {}".format(teammate_name, delta)
                                        is_first_text_chunk = False
                                    event_count += 1
                                    yield {
                                        "type": "text",
                                        "text": delta,
                                        "speaker": "teammate",
                                    }

                # --- turn complete -> stop ---
                if response.server_content and response.server_content.turn_complete:
                    while pending_text_chunks and teammate_audio_emitted:
                        chunk = pending_text_chunks.pop(0)
                        next_text = self._merge_text_with_overlap(emitted_teammate_text, chunk)
                        delta = next_text[len(emitted_teammate_text):]
                        emitted_teammate_text = next_text
                        if not delta:
                            continue
                        if is_first_text_chunk:
                            delta = "[{}] {}".format(teammate_name, delta)
                            is_first_text_chunk = False
                        event_count += 1
                        yield {
                            "type": "text",
                            "text": delta,
                            "speaker": "teammate",
                        }

                    await self._inject_teammate_context_for_prospect(
                        teammate_name,
                        teammate_utterance,
                    )
                    self.teammate_last_spoke_turn = self.conversation_turns
                    self.last_speaker = "teammate"
                    # Teammate completed its turn — advance global_turn_id.
                    self.global_turn_id += 1
                    logger.debug("Teammate turn_complete: global_turn_id → %d", self.global_turn_id)
                    event_count += 1
                    yield {"type": "turn_complete", "speaker": "teammate"}
                    logger.info(
                        "Teammate turn complete (%d events, %.1fs)",
                        event_count,
                        time.monotonic() - t_start,
                    )
                    return

                if response.server_content and response.server_content.waiting_for_input:
                    while pending_text_chunks and teammate_audio_emitted:
                        chunk = pending_text_chunks.pop(0)
                        next_text = self._merge_text_with_overlap(emitted_teammate_text, chunk)
                        delta = next_text[len(emitted_teammate_text):]
                        emitted_teammate_text = next_text
                        if not delta:
                            continue
                        if is_first_text_chunk:
                            delta = "[{}] {}".format(teammate_name, delta)
                            is_first_text_chunk = False
                        event_count += 1
                        yield {
                            "type": "text",
                            "text": delta,
                            "speaker": "teammate",
                        }

                    await self._inject_teammate_context_for_prospect(
                        teammate_name,
                        teammate_utterance,
                    )
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

                if response.server_content and response.server_content.interrupted:
                    while pending_text_chunks and teammate_audio_emitted:
                        chunk = pending_text_chunks.pop(0)
                        next_text = self._merge_text_with_overlap(emitted_teammate_text, chunk)
                        delta = next_text[len(emitted_teammate_text):]
                        emitted_teammate_text = next_text
                        if not delta:
                            continue
                        if is_first_text_chunk:
                            delta = "[{}] {}".format(teammate_name, delta)
                            is_first_text_chunk = False
                        event_count += 1
                        yield {
                            "type": "text",
                            "text": delta,
                            "speaker": "teammate",
                        }

                    await self._inject_teammate_context_for_prospect(
                        teammate_name,
                        teammate_utterance,
                    )
                    event_count += 1
                    yield {"type": "interruption", "speaker": "teammate"}
                    logger.info(
                        "Teammate interrupted (%d events, %.1fs)",
                        event_count,
                        time.monotonic() - t_start,
                    )
                    return

            while pending_text_chunks and teammate_audio_emitted:
                chunk = pending_text_chunks.pop(0)
                next_text = self._merge_text_with_overlap(emitted_teammate_text, chunk)
                delta = next_text[len(emitted_teammate_text):]
                emitted_teammate_text = next_text
                if not delta:
                    continue
                if is_first_text_chunk:
                    delta = "[{}] {}".format(teammate_name, delta)
                    is_first_text_chunk = False
                event_count += 1
                yield {
                    "type": "text",
                    "text": delta,
                    "speaker": "teammate",
                }

            await self._inject_teammate_context_for_prospect(
                teammate_name,
                teammate_utterance,
            )

            logger.info(
                "Teammate receive stream ended naturally (%d events, %.1fs)",
                event_count,
                time.monotonic() - t_start,
            )

        except Exception:
            logger.exception("Error in teammate prompt/consume")
        finally:
            if self._teammate_interrupt_sent:
                try:
                    await self.teammate_manager.end_activity()
                except Exception:
                    logger.exception("Failed to end teammate interruption activity")
                self._teammate_interrupt_sent = False
            self._teammate_audio_started = False
            self._user_bargein_frames = 0
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
