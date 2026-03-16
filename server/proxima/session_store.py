# proxima/session_store.py
"""
In-memory session data store for training sessions.

This module provides simple in-memory storage for session transcripts
and metadata. For production, this should be replaced with persistent
storage (database, Redis, etc.).
"""

import logging
import time
import uuid
from dataclasses import dataclass, field
from threading import Lock
from typing import TypedDict


logger = logging.getLogger("session_store")


class Message(TypedDict):
    """Single message in a session transcript."""
    speaker: str  # "rep", "prospect", or "teammate"
    text: str
    timestamp: float  # Unix timestamp


@dataclass
class Session:
    """A single training session with transcript and metadata."""
    session_id: str
    created_at: float = field(default_factory=time.time)
    started_at: float | None = None
    ended_at: float | None = None
    transcript: list[Message] = field(default_factory=list)
    mode: str = "training"
    teammate_config: dict | None = None  # Optional teammate configuration
    
    def add_message(self, speaker: str, text: str, timestamp: float | None = None):
        """Add a message to the transcript."""
        if timestamp is None:
            timestamp = time.time()
        
        self.transcript.append({
            "speaker": speaker,
            "text": text,
            "timestamp": timestamp,
        })
    
    def start(self):
        """Mark session as started."""
        if self.started_at is None:
            self.started_at = time.time()
    
    def end(self):
        """Mark session as ended."""
        if self.ended_at is None:
            self.ended_at = time.time()
    
    def get_duration(self) -> float:
        """Get session duration in seconds."""
        if not self.started_at:
            return 0.0
        
        end_time = self.ended_at or time.time()
        return end_time - self.started_at
    
    def get_relative_transcript(self) -> list[dict]:
        """
        Get transcript with timestamps relative to session start.
        
        Returns:
            List of messages with timestamps in seconds from session start.
        """
        if not self.started_at:
            return []
        
        relative = []
        for msg in self.transcript:
            relative.append({
                "speaker": msg["speaker"],
                "text": msg["text"],
                "timestamp": msg["timestamp"] - self.started_at,
            })
        
        return relative


class SessionStore:
    """
    Thread-safe in-memory store for training session data.
    
    This is a simple implementation for development. For production,
    replace with a persistent store (PostgreSQL, MongoDB, Redis, etc.).
    """
    
    def __init__(self):
        self._sessions: dict[str, Session] = {}
        self._lock = Lock()
    
    def create_session(self, mode: str = "training", teammate_config: dict | None = None) -> str:
        """
        Create a new session and return its ID.
        
        Args:
            mode: Session mode (e.g., "training", "roleplay").
            teammate_config: Optional teammate configuration for multi-participant sessions.
        
        Returns:
            Newly created session ID.
        """
        session_id = str(uuid.uuid4())
        with self._lock:
            self._sessions[session_id] = Session(
                session_id=session_id,
                mode=mode,
                teammate_config=teammate_config,
            )
        
        logger.info("Created session %s (mode=%s, teammate=%s)", session_id, mode, bool(teammate_config))
        return session_id
    
    def get_session(self, session_id: str) -> Session | None:
        """
        Get a session by ID.
        
        Args:
            session_id: Session identifier.
        
        Returns:
            Session object or None if not found.
        """
        with self._lock:
            return self._sessions.get(session_id)
    
    def add_message(
        self,
        session_id: str,
        speaker: str,
        text: str,
        timestamp: float | None = None,
    ):
        """
        Add a message to a session transcript.
        
        Args:
            session_id: Session identifier.
            speaker: "rep" or "prospect".
            text: Message text.
            timestamp: Optional Unix timestamp (defaults to current time).
        """
        with self._lock:
            session = self._sessions.get(session_id)
            if session:
                session.add_message(speaker, text, timestamp)
    
    def start_session(self, session_id: str):
        """Mark a session as started."""
        with self._lock:
            session = self._sessions.get(session_id)
            if session:
                session.start()
                logger.info("Started session %s", session_id)
    
    def end_session(self, session_id: str):
        """Mark a session as ended."""
        with self._lock:
            session = self._sessions.get(session_id)
            if session:
                session.end()
                logger.info(
                    "Ended session %s (duration=%.1fs, messages=%d)",
                    session_id,
                    session.get_duration(),
                    len(session.transcript),
                )
    
    def delete_session(self, session_id: str):
        """Delete a session from the store."""
        with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]
                logger.info("Deleted session %s", session_id)
    
    def cleanup_old_sessions(self, max_age_seconds: float = 86400):
        """
        Remove sessions older than max_age_seconds.
        
        Args:
            max_age_seconds: Maximum age in seconds (default: 24 hours).
        """
        now = time.time()
        to_delete = []
        
        with self._lock:
            for session_id, session in self._sessions.items():
                age = now - session.created_at
                if age > max_age_seconds:
                    to_delete.append(session_id)
            
            for session_id in to_delete:
                del self._sessions[session_id]
        
        if to_delete:
            logger.info("Cleaned up %d old sessions", len(to_delete))


# Global singleton instance
_store = SessionStore()


def get_session_store() -> SessionStore:
    """Get the global session store instance."""
    return _store
