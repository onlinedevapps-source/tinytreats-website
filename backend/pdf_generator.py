from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import cm
import io

def generate_invoice_pdf(invoice, order):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    elements = []

    styles = getSampleStyleSheet()
    title_style = styles["Heading1"]
    title_style.alignment = 1 # Center
    
    # Logo
    try:
        from reportlab.platypus import Image
        logo = Image("logo.png", width=2.5*cm, height=2.5*cm) # Adjust size as needed
        elements.append(logo)
        elements.append(Spacer(1, 0.5*cm))
    except Exception as e:
        print(f"Logo not found or error loading: {e}")

    # Header
    elements.append(Paragraph("TinyTreats Invoice 🍩", title_style))
    elements.append(Spacer(1, 1*cm))
    
    # Invoice & Customer Info
    info_data = [
        [f"Invoice Number: {invoice.invoice_number}", f"Date: {invoice.created_at.strftime('%Y-%m-%d')}"],
        [f"Customer Name: {order.customer_name}", f"Phone: {order.phone}"],
    ]
    info_table = Table(info_data, colWidths=[8*cm, 8*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 1*cm))
    
    # Items Table Header
    items_data = [["Item Name", "Quantity", "Unit Price", "Subtotal"]]
    
    # Add items
    for item in order.items:
        product_name = item.product.name if item.product else "Unknown Product"
        subtotal = item.quantity * item.unit_price
        items_data.append([
            product_name,
            str(item.quantity),
            f"Rs. {item.unit_price:,.2f}",
            f"Rs. {subtotal:,.2f}"
        ])
    
    # Total Row
    items_data.append(["", "", "Total:", f"Rs. {order.total:,.2f}"])
    
    # Table Styling
    table = Table(items_data, colWidths=[7*cm, 3*cm, 3*cm, 3*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.Color(1, 0.52, 0.63)), # TinyTreats Pink
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('ALIGN', (0,1), (0,-1), 'LEFT'), # Left align item names
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 12),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('BACKGROUND', (0,1), (-1,-2), colors.whitesmoke),
        ('GRID', (0,0), (-1,-2), 1, colors.grey),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,-1), (-1,-1), 12),
        ('TOPPADDING', (0,-1), (-1,-1), 12),
        ('ALIGN', (2,-1), (2,-1), 'RIGHT'),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 2*cm))
    
    # Signature Section
    signature_data = [
        ["Authorized Signature:", "__________________________"],
        ["", "(TinyTreats Management)"]
    ]
    signature_table = Table(signature_data, colWidths=[5*cm, 8*cm])
    signature_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,0), 20), # Space for signature
    ]))
    elements.append(Spacer(1, 1*cm))
    elements.append(signature_table)

    # Footer
    elements.append(Spacer(1, 1*cm))
    footer_style = styles["Normal"]
    footer_style.alignment = 1
    elements.append(Paragraph("Thank you for your order! Follow us for more sweetness 🍩", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer
