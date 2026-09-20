from pathlib import Path
import sys


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))


from langchain_core.runnables.graph_mermaid import draw_mermaid_png

from app.services.agent.agent_graph_service import agent_graph


output_path = BACKEND_DIR / "agent_graph.png"

mermaid = agent_graph.get_graph().draw_mermaid()

output_path.write_bytes(
    draw_mermaid_png(mermaid)
)

print(f"saved {output_path}")