from sqlalchemy import Column, String

from app.db.mysql import Base


class DiseaseMaster(Base):
    __tablename__ = "disease_master"

    disease_code = Column(String(20), primary_key=True)
    disease_name = Column(String(255), nullable=False)