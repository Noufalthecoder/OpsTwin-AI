import fitz  # PyMuPDF
from typing import Tuple

def parse_pdf(file_path: str) -> Tuple[str, int]:
    """
    Extracts text and number of pages from a PDF file.
    Returns: (text, page_count)
    """
    try:
        doc = fitz.open(file_path)
        text_content = []
        page_count = len(doc)
        
        for page in doc:
            text_content.append(page.get_text())
            
        return "\n".join(text_content), page_count
    except Exception as e:
        raise Exception(f"Failed to parse PDF: {str(e)}")
