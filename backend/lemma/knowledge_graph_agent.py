from services.knowledge_graph_service import build_knowledge_graph

class KnowledgeGraphAgent:
    def process(self, text: str, doc_type: str = "Unknown"):
        print("[Lemma] KnowledgeGraphAgent building graph...")
        try:
            return build_knowledge_graph(text, doc_type)
        except Exception as exc:
            print(f"[OpsTwin] Knowledge graph failed: {exc}")
            return None
