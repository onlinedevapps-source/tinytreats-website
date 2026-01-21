import sqlite3

def cleanup():
    conn = sqlite3.connect('tinytreats.db')
    cursor = conn.cursor()
    
    # List tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [t[0] for t in cursor.fetchall()]
    print(f"Existing tables: {tables}")
    
    target_table = "product" if "product" in tables else "Product"
    
    if target_table in tables:
        # Delete products with empty names
        cursor.execute(f"DELETE FROM \"{target_table}\" WHERE name = '' OR name IS NULL")
        print(f"Deleted {cursor.rowcount} empty products from {target_table}")
    else:
        print(f"Target table not found in {tables}")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    cleanup()

