from services.document_analyzer import analyze_document

class DocumentAgent:
    def process(self, text: str) -> dict:
        print("[Lemma] DocumentAgent processing document...")
        return analyze_document(text)
