from datetime import datetime
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel

class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    price: float
    description: Optional[str] = None
    image_url: Optional[str] = None
    stock: int = Field(default=0)
    unit: Optional[str] = None # e.g., "Pack of 4"
    is_active: bool = Field(default=True)
    
    order_items: List["OrderItem"] = Relationship(back_populates="product")

class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    cloud_id: Optional[str] = Field(default=None, index=True, unique=True) # ID from Supabase
    customer_name: str
    phone: str
    total: float
    status: str = Field(default="pending") # pending, confirmed, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    items: List["OrderItem"] = Relationship(back_populates="order")
    invoice: Optional["Invoice"] = Relationship(back_populates="order")

class OrderItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id")
    product_id: int = Field(foreign_key="product.id")
    quantity: int
    unit_price: float
    
    order: Order = Relationship(back_populates="items")
    product: Product = Relationship(back_populates="order_items")

class Invoice(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id", unique=True)
    invoice_number: str = Field(index=True, unique=True) # INV-YYYY-XXXX
    file_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    order: Order = Relationship(back_populates="invoice")

class SyncLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    orders_synced: int
    status: str # success, failure
    error_message: Optional[str] = None

class AdminConfig(SQLModel, table=True):
    key: str = Field(primary_key=True)
    value: str
