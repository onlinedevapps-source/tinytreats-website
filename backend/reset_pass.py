from sqlmodel import Session, select
from models import AdminConfig
from passlib.context import CryptContext
from sync import engine

# engine = create_engine("sqlite:///database.db") # Removed to ensure consistency
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

with Session(engine) as session:
    admin_config = session.get(AdminConfig, "admin_password")
    if admin_config:
        print(f"Found existing password hash: {admin_config.value}")
        admin_config.value = pwd_context.hash("admin")
        session.add(admin_config)
        session.commit()
        print("Updated password to 'admin' using pbkdf2_sha256")
    else:
        print("No admin password found. Creating new one.")
        session.add(AdminConfig(key="admin_password", value=pwd_context.hash("admin")))
        session.commit()
