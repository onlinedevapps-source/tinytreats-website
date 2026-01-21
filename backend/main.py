from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, File, UploadFile
from fastapi.responses import StreamingResponse
from pdf_generator import generate_invoice_pdf
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select
from typing import List
from models import Product, Order, OrderItem, Invoice, SyncLog
from sync import engine, sync_orders as run_sync
import os
import shutil
from datetime import datetime
from sqlmodel import SQLModel

app = FastAPI(title="TinyTreats Local Backend")

# Ensure uploads directory exists
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_session():
    with Session(engine) as session:
        yield session



@app.get("/products", response_model=List[Product])
def get_products(session: Session = Depends(get_session)):
    return session.exec(select(Product)).all()

@app.post("/products", response_model=Product)
def create_product(product: Product, session: Session = Depends(get_session)):
    session.add(product)
    session.commit()
    session.refresh(product)
    return product

@app.put("/products/{product_id}", response_model=Product)
def update_product(product_id: int, updated_product: Product, session: Session = Depends(get_session)):
    db_product = session.get(Product, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product_data = updated_product.model_dump(exclude_unset=True)
    for key, value in product_data.items():
        if key != "id":
            setattr(db_product, key, value)
            
    session.add(db_product)
    session.commit()
    session.refresh(db_product)
    return db_product

@app.delete("/products/{product_id}")
def delete_product(product_id: int, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    session.delete(product)
    session.commit()
    return {"message": "Product deleted"}

@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"url": f"/uploads/{file.filename}"}

@app.put("/products/{product_id}/stock")
def update_stock(product_id: int, stock: int, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.stock = stock
    session.add(product)
    session.commit()
    session.refresh(product)
    return product

@app.get("/orders", response_model=List[Order])
def get_orders(session: Session = Depends(get_session)):
    # Include items in the response
    return session.exec(select(Order)).all()

@app.get("/invoices", response_model=List[Invoice])
def get_invoices(session: Session = Depends(get_session)):
    return session.exec(select(Invoice)).all()

@app.post("/sync")
def trigger_sync(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_sync)
    return {"message": "Sync started in background"}

@app.post("/orders/{order_id}/confirm")
def confirm_order(order_id: int, session: Session = Depends(get_session)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status != "pending":
        raise HTTPException(status_code=400, detail="Order already processed")
    
    # Check inventory and deduct
    for item in order.items:
        product = session.get(Product, item.product_id)
        if product.stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")
        product.stock -= item.quantity
        session.add(product)
    
    order.status = "confirmed"
    
    # Generate Invoice Number
    year = datetime.now().year
    invoice_count = session.exec(select(Invoice)).all()
    inv_num = f"INV-{year}-{len(invoice_count) + 1:04d}"
    
    new_invoice = Invoice(order_id=order.id, invoice_number=inv_num)
    session.add(new_invoice)
    session.add(order)
    session.commit()
    
    return {"message": "Order confirmed and inventory updated", "invoice_number": inv_num}

@app.post("/orders/manual")
def create_manual_order(order_data: dict, session: Session = Depends(get_session)):
    # Extract nested items
    items_data = order_data.pop("items", [])
    
    # Add unique dummy cloud_id to bypass NOT NULL constraint
    order_data["cloud_id"] = f"manual_{int(datetime.now().timestamp())}"
    
    # Create order object
    order = Order(**order_data)
    session.add(order)
    session.commit()
    session.refresh(order)
    
    for item_data in items_data:
        item = OrderItem(**item_data, order_id=order.id)
        session.add(item)
        # Deduct stock
        db_product = session.get(Product, item.product_id)
        if db_product:
            db_product.stock -= item.quantity
            session.add(db_product)
            
    session.commit()
    session.refresh(order)
    
    # Automatically generate invoice
    year = datetime.now().year
    invoice_count = session.exec(select(Invoice)).all()
    inv_num = f"INV-{year}-{len(invoice_count) + 1:04d}"
    
    new_invoice = Invoice(order_id=order.id, invoice_number=inv_num)
    session.add(new_invoice)
    session.commit()
    
    return order

@app.get("/invoices/{invoice_id}/pdf")
def get_invoice_pdf(invoice_id: int, session: Session = Depends(get_session)):
    invoice = session.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    order = invoice.order
    if not order:
        raise HTTPException(status_code=404, detail="Related order not found")
    
    # Ensure items and products are loaded
    # SQLModel relationships are lazy by default if not configured otherwise
    # Accessing them triggers the load
    items = order.items
    for item in items:
        _ = item.product
    
    pdf_buffer = generate_invoice_pdf(invoice, order)
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=invoice_{invoice.invoice_number}.pdf"}
    )

from passlib.context import CryptContext
from models import AdminConfig
from pydantic import BaseModel

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

class LoginRequest(BaseModel):
    password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class ResetPasswordRequest(BaseModel):
    master_key: str
    new_password: str

MASTER_KEY = "MASTER_KEY_123" # Hardcoded master key for recovery

@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        # Initialize admin password if not exists
        admin_pass = session.get(AdminConfig, "admin_password")
        if not admin_pass:
            # Default password: admin
            hashed = pwd_context.hash("admin")
            session.add(AdminConfig(key="admin_password", value=hashed))
            session.commit()

@app.post("/admin/login")
def admin_login(req: LoginRequest, session: Session = Depends(get_session)):
    admin_pass = session.get(AdminConfig, "admin_password")
    if not admin_pass or not pwd_context.verify(req.password, admin_pass.value):
        raise HTTPException(status_code=401, detail="Invalid password")
    return {"message": "Login successful"}

@app.post("/admin/change-password")
def change_password(req: ChangePasswordRequest, session: Session = Depends(get_session)):
    admin_pass = session.get(AdminConfig, "admin_password")
    if not admin_pass or not pwd_context.verify(req.old_password, admin_pass.value):
        raise HTTPException(status_code=401, detail="Invalid old password")
    
    hashed = pwd_context.hash(req.new_password)
    admin_pass.value = hashed
    session.add(admin_pass)
    session.commit()
    return {"message": "Password updated successfully"}

@app.post("/admin/reset-password")
def reset_password(req: ResetPasswordRequest, session: Session = Depends(get_session)):
    if req.master_key != MASTER_KEY:
        raise HTTPException(status_code=401, detail="Invalid Master Key")
    
    admin_pass = session.get(AdminConfig, "admin_password")
    if not admin_pass:
        admin_pass = AdminConfig(key="admin_password", value="")
    
    hashed = pwd_context.hash(req.new_password)
    admin_pass.value = hashed
    session.add(admin_pass)
    session.commit()
    return {"message": "Password reset successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
