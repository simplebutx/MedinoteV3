from sqlalchemy import Column, Integer, String, Text

from app.db.mysql import Base


class MedicineInfo(Base):
    __tablename__ = "medicine_info"

    item_seq = Column(Integer, primary_key=True)
    caution = Column(Text, nullable=True)
    company_name = Column(String(512), nullable=True)
    efficacy = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    interaction = Column(Text, nullable=True)
    item_name = Column(String(512), nullable=True)
    side_effect = Column(Text, nullable=True)
    storage_method = Column(Text, nullable=True)
    update_de = Column(String(50), nullable=True)
    use_method = Column(Text, nullable=True)
    warning_before_use = Column(Text, nullable=True)
