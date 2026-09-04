from qdrant_client import QdrantClient

from app.core.config import settings

def get_qdrant_client() -> QdrantClient:
    return QdrantClient(
        host=settings.qdrant_host,
        port=settings.qdrant_port,
        timeout=30,
    )


def check_qdrant_connection() -> bool:
    client = get_qdrant_client()
    collections = client.get_collections()
    return collections is not None