from services.workflow_optimizer import optimize_workflow

class OptimizationAgent:
    def process(self, workflow_data: dict, document_text: str):
        print("[Lemma] OptimizationAgent optimizing workflow...")
        try:
            return optimize_workflow(workflow_data, document_text)
        except Exception as exc:
            print(f"[OpsTwin] Workflow optimization failed: {exc}")
            return None
