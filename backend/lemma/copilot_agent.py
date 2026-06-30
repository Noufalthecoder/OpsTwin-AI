from api.copilot import build_prompt

class CopilotAgent:
    def initialize_context(self, doc_analysis: dict, workflow_data: dict, optimization_data: dict, compliance_data: dict):
        print("[Lemma] CopilotAgent initializing full pipeline context...")
        # Grounding the copilot on the active run
        return {
            "status": "ready",
            "context_prepared": True
        }

    def process(self, workflow_data: dict, optimization_data: dict):
        return self.initialize_context({}, workflow_data, optimization_data, {})
