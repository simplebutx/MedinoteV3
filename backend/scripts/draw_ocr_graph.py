from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from langchain_core.runnables.graph_mermaid import draw_mermaid_png

from app.services.ocr.ocr_graph_service import ocr_graph


output_path = BACKEND_DIR / "ocr_graph.png"
mermaid = ocr_graph.get_graph().draw_mermaid()
mermaid = mermaid.replace("-. &nbsp;extract&nbsp; .->", "-.->")
mermaid = mermaid.replace("-. &nbsp;match&nbsp; .->", "-.->")

output_path.write_bytes(draw_mermaid_png(mermaid))

print(f"saved {output_path}")
