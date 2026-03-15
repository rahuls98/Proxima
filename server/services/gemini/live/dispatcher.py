# server/services/gemini/live/dispatcher.py

import json
import inspect
from typing import Callable, Any, Dict

class ToolDispatcher:
    """
    Manages function registration and dynamic execution.
    Decouples business logic functions from API transport.
    """
    def __init__(self):
        self._registry: Dict[str, Callable] = {}

    def register(self, name: str, func: Callable):
        """Registers a Python function to be callable by the model."""
        self._registry[name] = func

    async def execute(self, tool_call: Any) -> Dict[str, Any]:
        """
        Executes a function based on model request.
        
        :param tool_call: The model-generated tool call object.
        :return: A dictionary containing the result or error.
        """
        func = self._registry.get(tool_call.name)
        if not func:
            return {"error": f"Tool '{tool_call.name}' not registered."}
        
        try:
            # Parse arguments if passed as JSON string
            args = (
                json.loads(tool_call.args)
                if isinstance(tool_call.args, str)
                else tool_call.args
            )
            if inspect.iscoroutinefunction(func):
                await func(**args)
            else:
                func(**args)
            # Always return passive status to avoid model re-speaking tool output
            return {"status": "ok"}
        except Exception as e:
            return {"error": str(e)}
