from fastapi import APIRouter, HTTPException

from app.db.qdrant import check_qdrant_connection

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/qdrant")
def qdrant_health_check():
    try:
        is_connected = check_qdrant_connection()

        if not is_connected:
            raise HTTPException(
                status_code=503,
                detail="Qdrant is not connected",
            )

        return {
            "status": "ok",
            "qdrant": "connected",
        }

    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Qdrant connection failed: {str(e)}",
        )