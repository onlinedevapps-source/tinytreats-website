from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from models import Order, Invoice
import os

def generate_invoice_pdf(order: Order, invoice: Invoice):
    directory = "invoices"
    if not os.path.exists(directory):
        os.makedirs(directory)
    
    filename = f"{directory}/{invoice.invoice_number}.pdf"
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, height - 50, "TinyTreats - Purchase Invoice")
    
    c.setFont("Helvetica", 12)
    c.drawString(100, height - 80, f"Invoice Number: {invoice.invoice_number}")
    c.drawString(100, height - 100, f"Date: {invoice.created_at.strftime('%Y-%m-%d %H:%M')}")
    c.drawString(100, height - 120, f"Customer: {order.customer_name}")
    c.drawString(100, height - 140, f"Phone: {order.phone}")
    
    c.line(100, height - 160, 500, height - 160)
    
    y = height - 180
    c.drawString(100, y, "Item")
    c.drawString(300, y, "Qty")
    c.drawString(400, y, "Price")
    c.drawString(500, y, "Total")
    
    c.setFont("Helvetica", 10)
    for item in order.items:
        y -= 20
        c.drawString(100, y, item.product.name)
        c.drawString(300, y, str(item.quantity))
        c.drawString(400, y, f"${item.unit_price:.2f}")
        c.drawString(500, y, f"${(item.quantity * item.unit_price):.2f}")
    
    c.line(100, y - 20, 500, y - 20)
    y -= 40
    c.setFont("Helvetica-Bold", 12)
    c.drawString(400, y, "TOTAL:")
    c.drawString(500, y, f"${order.total:.2f}")
    
    c.save()
    return filename
