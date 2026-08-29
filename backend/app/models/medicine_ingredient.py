from sqlalchemy import Column, Integer, String

from app.db.mysql import Base


class MedicineIngredient(Base):
    __tablename__ = "medicine_ingredient"

    item_seq = Column(Integer, primary_key=True)
    product_name = Column(String(512), nullable=True)
    ingredient_seq = Column(Integer, primary_key=True)
    ingredient_code = Column(String(50), nullable=True)
    ingredient_name = Column(String(512), nullable=True)
    quantity = Column(String(50), nullable=True)
    unit = Column(String(50), nullable=True)
