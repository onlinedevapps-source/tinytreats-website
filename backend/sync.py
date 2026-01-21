import os
import time
from datetime import datetime
from supabase import create_client, Client
from sqlmodel import Session, create_engine, select
from models import Order, OrderItem, Product, SyncLog
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./tinytreats.db")

engine = create_engine(DATABASE_URL)

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Error initializing Supabase: {e}")
else:
    print("Supabase environment variables missing. Cloud sync will be disabled.")

def sync_orders():
    if not supabase:
        print("Sync skipped: Supabase not configured.")
        return
    
    print(f"[{datetime.now()}] Starting sync...")
    
    # 1. Fetch pending orders from Supabase
    response = supabase.table("orders").select("*").eq("status", "pending").execute()
    cloud_orders = response.data
    
    if not cloud_orders:
        print("No pending orders found.")
        return

    synced_count = 0
    with Session(engine) as session:
        for co in cloud_orders:
            # Check if already synced
            existing = session.exec(select(Order).where(Order.cloud_id == co["id"])).first()
            if existing:
                continue
            
            try:
                # Create local order
                new_order = Order(
                    cloud_id=co["id"],
                    customer_name=co["customer_name"],
                    phone=co["phone"],
                    total=co["total_price"],
                    status="pending",
                    created_at=datetime.fromisoformat(co["created_at"].replace("Z", "+00:00"))
                )
                session.add(new_order)
                session.commit()
                session.refresh(new_order)
                
                # Add items
                for item in co["items"]:
                    # Try to find product by ID or Name
                    product = session.exec(select(Product).where(Product.name == item["name"])).first()
                    if product:
                        order_item = OrderItem(
                            order_id=new_order.id,
                            product_id=product.id,
                            quantity=item["quantity"],
                            unit_price=item["price"]
                        )
                        session.add(order_item)
                
                # Update status in Supabase
                supabase.table("orders").update({"status": "synced"}).eq("id", co["id"]).execute()
                
                session.commit()
                synced_count += 1
                print(f"Synced order {co['id']}")
            except Exception as e:
                print(f"Error syncing order {co['id']}: {e}")
                session.rollback()
        
        # Log sync
        log = SyncLog(orders_synced=synced_count, status="success")
        session.add(log)
        session.commit()

if __name__ == "__main__":
    sync_orders()
