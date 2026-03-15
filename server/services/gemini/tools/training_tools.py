# server/services/gemini/tools/training_tools.py

from typing import Any

from google.genai import types  # type: ignore


TOOL_NAME_TRIGGER_UI_COACHING_HINT = "trigger_ui_coaching_hint"


class TrainingTools:
    """
    Real-time coaching tools for sales training scenarios.
    
    Provides tactical interventions that guide the sales rep during live conversation
    without breaking the prospect's persona immersion.
    """

    def register(self, dispatcher: Any):
        """Register training tools with the dispatcher."""
        dispatcher.register(TOOL_NAME_TRIGGER_UI_COACHING_HINT, self.trigger_ui_coaching_hint)

    def declarations(self) -> list[types.Tool]:
        """Return tool declarations for Gemini Live API."""
        return [
            types.Tool(
                function_declarations=[
                    types.FunctionDeclaration(
                        name=TOOL_NAME_TRIGGER_UI_COACHING_HINT,
                        description=(
                            "Send real-time coaching hints to the sales rep's UI during a training session. "
                            "Use this to provide tactical advice without breaking character as the prospect. "
                            "The hint appears silently on the rep's screen while you continue the conversation naturally."
                        ),
                        parameters={
                            "type": "object",
                            "properties": {
                                "intervention_type": {
                                    "type": "string",
                                    "enum": ["MONOLOGUE", "STUMBLING", "RESPONSE_ASSIST", "OBJECTION_RECOVERY", "INTERRUPTING"],
                                    "description": (
                                        "Category of coaching intervention:\n"
                                        "- MONOLOGUE: Rep is talking too long without a gap (>45 seconds)\n"
                                        "- STUMBLING: Rep is stuttering, using excessive 'um/uh', or sounds nervous\n"
                                        "- RESPONSE_ASSIST: Rep has paused too long (>3 seconds) or seems stuck on an objection\n"
                                        "- OBJECTION_RECOVERY: Rep handled an objection poorly and needs a pivot strategy\n"
                                        "- INTERRUPTING: Rep is cutting off or interrupting the prospect too frequently"
                                    ),
                                },
                                "suggested_action": {
                                    "type": "string",
                                    "description": (
                                        "The specific advice or exact script snippet to display. "
                                        "Examples: 'Slow down and breathe', 'Try: \"I understand your concern about timing...\"', "
                                        "'Ask a discovery question instead of pitching.'"
                                    ),
                                },
                            },
                            "required": ["intervention_type", "suggested_action"],
                        },
                    )
                ]
            )
        ]

    def trigger_ui_coaching_hint(
        self,
        intervention_type: str,
        suggested_action: str,
    ) -> dict[str, str]:
        """
        Trigger a coaching hint to be displayed in the rep's UI.
        
        This function is called by the model during a training session to provide
        real-time guidance to the sales rep. The model continues its persona as the
        prospect while this hint is delivered silently to the UI.
        
        Args:
            intervention_type: Category of coaching (MONOLOGUE, STUMBLING, RESPONSE_ASSIST, OBJECTION_RECOVERY, INTERRUPTING)
            suggested_action: The specific advice or script snippet to show
            
        Returns:
            Success confirmation message for the model to acknowledge
        """
        # This is a marker function. The actual UI event is generated in manager.py
        # by intercepting this tool call before execution.
        return {"status": "ok"}
