from services.bottleneck_service import detect_bottlenecks

class ComplianceAgent:
    def process(self, workflow_data: dict, kg_data: dict, document_text: str):
        print("[Lemma] ComplianceAgent analyzing bottlenecks...")
        try:
            return detect_bottlenecks(workflow_data, kg_data, document_text)
        except Exception as exc:
            print(f"[OpsTwin] Bottleneck detection failed: {exc}")
            return None
