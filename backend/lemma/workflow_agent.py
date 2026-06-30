from services.gemini_workflow_service import discover_workflow_with_gemini
from services.workflow_discovery import discover_workflow

class WorkflowAgent:
    def process(self, text: str, doc_type: str = "Unknown", intel_ctx: dict = None) -> dict:
        print("[Lemma] WorkflowAgent discovering workflow...")
        try:
            return discover_workflow_with_gemini(text, doc_type, intel_ctx)
        except Exception as gemini_err:
            print(f"[OpsTwin] Gemini workflow discovery failed: {gemini_err}")
            print("[OpsTwin] Falling back to rule-based workflow discovery...")
            try:
                workflow = discover_workflow(text, doc_type)
                if workflow and isinstance(workflow, dict):
                    workflow.setdefault("insights", {})
                    workflow["insights"]["gemini_fallback"] = True
                    workflow["insights"]["gemini_error"] = str(gemini_err)
                return workflow
            except Exception as fallback_err:
                print(f"[OpsTwin] Rule-based workflow also failed: {fallback_err}")
                return None
