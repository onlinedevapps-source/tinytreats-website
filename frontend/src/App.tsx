import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, Heart, Send } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

let supabase;
try {
    if (supabaseUrl && supabaseAnonKey) {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    } else {
        console.warn("Supabase credentials missing. Order submission will be disabled.");
        supabase = { from: () => ({ insert: () => ({ select: () => ({ data: null, error: "Supabase not configured" }) }) }) };
    }
} catch (e: any) {
    console.error("Failed to initialize Supabase client:", e);
    supabase = { from: () => ({ insert: () => ({ select: () => ({ data: null, error: e.message }) }) }) };
}

const App = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [isOrdering, setIsOrdering] = useState(false);
    const [customer, setCustomer] = useState({ name: '', phone: '' });
    const [isCartOpen, setIsCartOpen] = useState(false);

    const API_BASE = "http://localhost:8000";

    const fetchProducts = async () => {
        try {
            const res = await axios.get(`${API_BASE}/products`);
            setProducts(res.data.length > 0 ? res.data : [
                { id: 1, name: "Birthday Surprise Box", price: 2500, description: "Candies, toys and more!", image_url: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&q=80" },
                { id: 2, name: "Sweet Treats Jar", price: 1500, description: "Assorted premium gummies.", image_url: "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=500&q=80" }
            ]);
        } catch (err) {
            console.warn("Backend offline, using fallback products.");
            setProducts([
                { id: 1, name: "Birthday Surprise Box", price: 2500, description: "Candies, toys and more!", image_url: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&q=80" },
                { id: 2, name: "Sweet Treats Jar", price: 1500, description: "Assorted premium gummies.", image_url: "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=500&q=80" }
            ]);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const addToCart = (product: any) => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
        setIsCartOpen(true);
    };

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const placeOrder = async () => {
        if (!customer.name || !customer.phone) {
            alert("Please enter your name and phone number");
            return;
        }

        setIsOrdering(true);

        const orderData = {
            customer_name: customer.name,
            phone: customer.phone,
            items: cart,
            total_price: total,
            status: 'pending'
        };

        try {
            // 1. Save to Supabase (if configured)
            if (supabase && typeof supabase.from === 'function') {
                await supabase.from('orders').insert([orderData]).select();
            }

            // 2. WhatsApp Message
            let savedPhone = localStorage.getItem('whatsapp_number') || import.meta.env.VITE_WHATSAPP_NUMBER || "";
            // Ensure 92 for Pakistan if not present and start with 0
            if (!savedPhone) {
                console.warn("WhatsApp number not configured.");
            } else if (savedPhone.startsWith('0')) {
                savedPhone = '92' + savedPhone.substring(1);
            } else if (!savedPhone.startsWith('92') && savedPhone.length > 5) { // Assuming a valid number would be longer than 5 digits
                savedPhone = '92' + savedPhone;
            }

            const message = `*New Order: TinyTreats*%0A%0A*Name:* ${customer.name}%0A*Phone:* ${customer.phone}%0A%0A*Items:*%0A${cart.map(i => `- ${i.name} (x${i.quantity})`).join('%0A')}%0A%0A*Total:* Rs. ${total.toLocaleString()}%0A%0A*Order Received - We will confirm shortly.*`;
            const whatsappUrl = `https://wa.me/${savedPhone.replace(/[^0-9]/g, '')}?text=${message}`;

            console.log("Redirecting to:", whatsappUrl);
            window.open(whatsappUrl, '_blank');

            alert("Order received! Redirecting to WhatsApp for confirmation.");
            setCart([]);
            setCustomer({ name: '', phone: '' });
            setIsCartOpen(false);
        } catch (err) {
            console.error(err);
            alert("Error placing order. Please try again.");
        } finally {
            setIsOrdering(false);
        }
    };

    return (
        <div className="app">
            <div className="animated-background">
                <div className="balloon"></div>
                <div className="balloon"></div>
                <div className="balloon"></div>
                <div className="balloon"></div>
                <div className="balloon"></div>
                <div className="balloon"></div>

                <div className="confetti"></div>
                <div className="confetti"></div>
                <div className="confetti"></div>
                <div className="confetti"></div>
                <div className="confetti"></div>
                <div className="confetti"></div>

                <div className="firework"></div>
                <div className="firework"></div>
                <div className="firework"></div>
            </div>
            <header>
                <div className="container nav-container">
                    <a href="#" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src="/logo.png" alt="TinyTreats" style={{ width: '40px', height: '40px' }} />
                        Tiny<span>Treats</span>
                    </a>
                    <div className="cart-icon" onClick={() => setIsCartOpen(!isCartOpen)}>
                        <ShoppingCart color="#ff85a1" />
                        {cart.length > 0 && <span className="cart-count">{cart.reduce((a, b) => a + b.quantity, 0)}</span>}
                    </div>
                </div>
            </header>

            <section className="hero">
                <div className="container fade-in">
                    <h1>Sweet Moments in a Jar</h1>
                    <p>Hand-picked gift packs and candy jars for your special ones. Always available, always sweet.</p>
                </div>
            </section>

            <main className="container">
                <h2 style={{ marginTop: '0', textAlign: 'center', color: 'var(--secondary)', fontSize: '2.5rem', marginBottom: '20px' }}>Our Collection</h2>
                <div className="product-grid">
                    {products.map(p => {
                        const imgSrc = p.image_url?.startsWith('/uploads') ? `${API_BASE}${p.image_url}` : p.image_url;
                        return (
                            <div key={p.id} className="product-card fade-in">
                                <img src={imgSrc || "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&q=80"} alt={p.name} className="product-image" />
                                <div className="product-info">
                                    <h3 className="product-name">{p.name}</h3>
                                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>{p.description}</p>
                                    <div className="product-price">
                                        Rs. {p.price?.toLocaleString()}
                                        {p.unit && <span style={{ fontSize: '0.8rem', color: '#ff85a1', marginLeft: '5px' }}>/ {p.unit}</span>}
                                    </div>
                                    <button onClick={() => addToCart(p)} className="btn btn-primary" style={{ width: '100%' }}>
                                        Add to Cart
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div id="checkout-sidebar" className={`sidebar-checkout ${isCartOpen ? 'open' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ color: 'var(--primary)', margin: 0 }}>Your Sweet Pack 🎁</h2>
                        <button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}>×</button>
                    </div>

                    {cart.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#888', marginTop: '50px' }}>Your pack is empty! Add some treats.</p>
                    ) : (
                        <>
                            {cart.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.9rem', color: '#888' }}>Quantity: {item.quantity}</div>
                                    </div>
                                    <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Rs. {(item.price * item.quantity).toLocaleString()}</span>
                                </div>
                            ))}

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', margin: '30px 0' }}>
                                <span>Total</span>
                                <span>Rs. {total.toLocaleString()}</span>
                            </div>

                            <div style={{ display: 'grid', gap: '15px' }}>
                                <input
                                    type="text" placeholder="Your Name"
                                    value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })}
                                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', width: '100%' }}
                                />
                                <input
                                    type="text" placeholder="WhatsApp Number"
                                    value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', width: '100%' }}
                                />
                                <button disabled={isOrdering} onClick={placeOrder} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%' }}>
                                    <Send size={18} /> {isOrdering ? 'Sending...' : 'Order via WhatsApp'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </main>

            <footer style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
                <p>© 2026 TinyTreats. All rights reserved.</p>
                <p style={{ fontSize: '0.8rem' }}>Availability subject to confirmation.</p>
            </footer>
        </div>
    );
};

export default App;
