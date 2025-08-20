import os
import logging
from typing import Dict, List, Any

try:
    import openai  # type: ignore
except ImportError:  # pragma: no cover
    openai = None  # type: ignore

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class CopilotAgent:
    """Lightweight reasoning agent that wraps an LLM provider."""

    def __init__(self, model: str = "gpt-4-turbo") -> None:
        self.model = model
        self.conversations: Dict[str, List[Dict[str, str]]] = {}
        api_key = os.getenv("OPENAI_API_KEY")
        if openai and api_key:
            openai.api_key = api_key
            self._client = openai.ChatCompletion  # type: ignore[attr-defined]
        else:  # pragma: no cover
            self._client = None
            logger.warning("OpenAI client not configured; responses will be mocked.")

    def _record(self, case_id: str, role: str, content: str) -> None:
        self.conversations.setdefault(case_id, []).append({"role": role, "content": content})

    def ask(self, case_id: str, graph_snippet: str, question: str, expand_depth: int = 0) -> Dict[str, Any]:
        """Ask a question about a case graph and return reasoning data."""
        prompt = f"Graph:\n{graph_snippet}\nQuestion: {question}"
        self._record(case_id, "user", prompt)

        if self._client:
            response = self._client.create(
                model=self.model,
                messages=[{"role": m["role"], "content": m["content"]} for m in self.conversations[case_id]],
                temperature=0.2,
            )
            answer = response["choices"][0]["message"]["content"]  # type: ignore[index]
        else:  # pragma: no cover - mock fallback
            answer = "Mocked reasoning output."

        self._record(case_id, "assistant", answer)
        policy = {"allowed": True, "reason": ""}
        if "export" in question.lower():
            policy = {"allowed": False, "reason": "export blocked: data license X"}

        return {
            "reasoning": answer,
            "hypotheses": [],
            "confidence": 0.5,
            "expanded": expand_depth > 0,
            "preview": "MATCH (n) RETURN n LIMIT 5",
            "citations": [],
            "redactions": [],
            "policy": policy,
        }
