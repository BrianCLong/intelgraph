from sqlalchemy import Column, Integer, String, Float, JSON
from .database import Base


class Entity(Base):
    __tablename__ = "entities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    type = Column(String, nullable=True)
    cluster_id = Column(Integer, nullable=True)


class AttributeEvidence(Base):
    __tablename__ = "attribute_evidence"

    id = Column(Integer, primary_key=True)
    pair_id = Column(String, index=True)
    attribute = Column(String)
    weight = Column(Float)
    score = Column(Float)


class Scorecard(Base):
    __tablename__ = "scorecards"

    id = Column(Integer, primary_key=True)
    pair_id = Column(String, unique=True)
    total_score = Column(Float)
