from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.services.analysis.analysis_graph_service import analysis_graph


output_path = BACKEND_DIR / "analysis_graph.png"
output_path.write_bytes(analysis_graph.get_graph().draw_mermaid_png())

print(f"saved {output_path}")
