from app.services.chat_graph_service import chat_graph

png = chat_graph.get_graph().draw_mermaid_png()

with open("chat_graph.png", "wb") as f:
    f.write(png)

print("saved chat_graph.png")