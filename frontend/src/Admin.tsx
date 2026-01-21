import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Admin = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', price: 0, stock: 0, description: '', image_url: '', unit: '' });
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [whatsappNumber, setWhatsappNumber] = useState(localStorage.getItem('whatsapp_number') || "");
    const [activeTab, setActiveTab] = useState('inventory'); // inventory, invoices, settings
    const [invoices, setInvoices] = useState<any[]>([]);

    // Manual Invoice State
    const [manualInvoice, setManualInvoice] = useState({
        customer_name: '',
        phone: '',
        items: [{ product_id: 0, quantity: 1, unit_price: 0 }]
    });

    const API_BASE = "http://localhost:8000";

    const fetchData = async () => {
        try {
            const pRes = await axios.get(`${API_BASE}/products`);
            const oRes = await axios.get(`${API_BASE}/orders`);
            const iRes = await axios.get(`${API_BASE}/invoices`);
            setProducts(pRes.data);
            setOrders(oRes.data);
            setInvoices(iRes.data);
        } catch (err) {
            console.error("Backend offline or error:", err);
        }
    };

    useEffect(() => {
        fetchData();
        if (!whatsappNumber && import.meta.env.VITE_WHATSAPP_NUMBER) {
            setWhatsappNumber(import.meta.env.VITE_WHATSAPP_NUMBER);
            localStorage.setItem('whatsapp_number', import.meta.env.VITE_WHATSAPP_NUMBER);
        }
    }, []);

    const saveWhatsapp = () => {
        localStorage.setItem('whatsapp_number', whatsappNumber);
        alert("WhatsApp number saved!");
        window.location.reload(); // Force refresh to sync App.tsx
    };

    const syncNow = async () => {
        setLoading(true);
        await axios.post(`${API_BASE}/sync`);
        setTimeout(fetchData, 2000); // Wait for sync worker
        setLoading(false);
    };

    const addProduct = async () => {
        if (editingProduct) {
            await axios.put(`${API_BASE}/products/${editingProduct.id}`, newProduct);
            setEditingProduct(null);
        } else {
            await axios.post(`${API_BASE}/products`, newProduct);
        }
        setNewProduct({ name: '', price: 0, stock: 0, description: '', image_url: '', unit: '' });
        fetchData();
    };

    const deleteProduct = async (id: number) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            await axios.delete(`${API_BASE}/products/${id}`);
            fetchData();
        }
    };

    const handleEditProduct = (p: any) => {
        setEditingProduct(p);
        setNewProduct({ name: p.name, price: p.price, stock: p.stock, description: p.description || '', image_url: p.image_url || '', unit: p.unit || '' });
    };

    const createManualInvoice = async () => {
        const total = manualInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const orderData = {
            ...manualInvoice,
            total,
            status: 'confirmed'
        };
        try {
            await axios.post(`${API_BASE}/orders/manual`, orderData);
            alert("Manual invoice created!");
            setManualInvoice({ customer_name: '', phone: '', items: [{ product_id: 0, quantity: 1, unit_price: 0 }] });
            fetchData();
        } catch (err) {
            alert("Error creating manual invoice");
        }
    };

    const updateManualItem = (index: number, field: string, value: any) => {
        const newItems = [...manualInvoice.items];
        newItems[index] = { ...newItems[index], [field]: value };
        if (field === 'product_id') {
            const p = products.find(x => x.id === parseInt(value));
            if (p) newItems[index].unit_price = p.price;
        }
        setManualInvoice({ ...manualInvoice, items: newItems });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post(`${API_BASE}/upload`, formData);
            setNewProduct({ ...newProduct, image_url: res.data.url });
        } catch (err) {
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const updateStock = async (id: number, newStock: string) => {
        try {
            await axios.put(`${API_BASE}/products/${id}/stock?stock=${newStock}`);
            fetchData();
        } catch (err: any) {
            alert("Error updating stock");
        }
    };

    const confirmOrder = async (id: number) => {
        try {
            await axios.post(`${API_BASE}/orders/${id}/confirm`);
            fetchData();
            alert("Order confirmed and invoice generated!");
        } catch (err: any) {
            alert(err.response?.data?.detail || "Error confirming order");
        }
    };

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    // Auth States
    const [oldPassword, setOldPassword] = useState('');
    const [newAdminPassword, setNewAdminPassword] = useState('');
    const [masterKey, setMasterKey] = useState('');
    const [resetSuccess, setResetSuccess] = useState('');
    const [showReset, setShowReset] = useState(false);

    const checkLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/admin/login`, { password: loginPassword });
            setIsAuthenticated(true);
            setLoginError('');
        } catch (err) {
            setLoginError("Invalid Password");
        }
    };

    const handleChangePassword = async () => {
        try {
            await axios.post(`${API_BASE}/admin/change-password`, { old_password: oldPassword, new_password: newAdminPassword });
            alert("Password changed successfully!");
            setOldPassword('');
            setNewAdminPassword('');
        } catch (err) {
            alert("Failed to change password. Check old password.");
        }
    };

    const handleResetPassword = async () => {
        try {
            await axios.post(`${API_BASE}/admin/reset-password`, { master_key: masterKey, new_password: newAdminPassword });
            alert("Password reset successfully! You can now login with the new password.");
            setShowReset(false);
            setMasterKey('');
            setNewAdminPassword('');
        } catch (err) {
            alert("Invalid Master Key");
        }
    };

    if (!isAuthenticated) {
        return (
            <div style={{ padding: '40px', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5' }}>
                <div style={{ background: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                    <h1 style={{ color: '#ff85a1', marginBottom: '30px' }}>Admin Login 🔒</h1>
                    {!showReset ? (
                        <form onSubmit={checkLogin}>
                            <input
                                type="password"
                                placeholder="Enter Admin Password"
                                value={loginPassword}
                                onChange={e => setLoginPassword(e.target.value)}
                                style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                            {loginError && <p style={{ color: 'red', marginBottom: '20px' }}>{loginError}</p>}
                            <button type="submit" style={{ width: '100%', padding: '12px', background: '#ff85a1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Login
                            </button>
                            <p style={{ marginTop: '20px', fontSize: '0.9rem', color: '#666', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setShowReset(true)}>
                                Forgot Password? (Use Master Key)
                            </p>
                        </form>
                    ) : (
                        <div>
                            <h3>Reset Password</h3>
                            <input
                                type="text"
                                placeholder="Master Key"
                                value={masterKey}
                                onChange={e => setMasterKey(e.target.value)}
                                style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                            <input
                                type="password"
                                placeholder="New Password"
                                value={newAdminPassword}
                                onChange={e => setNewAdminPassword(e.target.value)}
                                style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                            <button onClick={handleResetPassword} style={{ width: '100%', padding: '12px', background: '#7bdff2', color: 'black', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Reset Password
                            </button>
                            <p style={{ marginTop: '20px', fontSize: '0.9rem', color: '#666', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setShowReset(false)}>
                                Back to Login
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '40px', background: '#f5f7fb', minHeight: '100vh', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>TinyTreats Admin 🍩</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={syncNow} disabled={loading} style={{
                        padding: '10px 20px', background: '#7bdff2', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                    }}>
                        {loading ? 'Syncing...' : 'Sync Orders'}
                    </button>
                    <button onClick={() => setIsAuthenticated(false)} style={{
                        padding: '10px 20px', background: '#feb1b1', border: 'none', borderRadius: '8px', cursor: 'pointer'
                    }}>Logout</button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                <button onClick={() => setActiveTab('inventory')} style={{
                    padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    background: activeTab === 'inventory' ? '#ff85a1' : '#ddd',
                    color: activeTab === 'inventory' ? 'white' : 'black'
                }}>Inventory Management</button>
                <button onClick={() => setActiveTab('invoices')} style={{
                    padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    background: activeTab === 'invoices' ? '#ff85a1' : '#ddd',
                    color: activeTab === 'invoices' ? 'white' : 'black'
                }}>Invoice Management</button>
                <button onClick={() => setActiveTab('settings')} style={{
                    padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    background: activeTab === 'settings' ? '#ff85a1' : '#ddd',
                    color: activeTab === 'settings' ? 'white' : 'black'
                }}>Settings</button>
            </div>

            {activeTab === 'settings' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                    <section style={{ background: '#fff5f5', padding: '20px', borderRadius: '12px', border: '1px solid #ffccd5' }}>
                        <h3>⚙️ System Configuration</h3>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <input
                                type="text" placeholder="WhatsApp Number (e.g. 1234567890)"
                                value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                            <button onClick={saveWhatsapp} style={{ padding: '10px 20px', background: '#ff85a1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                Save Phone
                            </button>
                        </div>
                    </section>

                    <section style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <h3>🔒 Security Settings</h3>
                        <h4 style={{ marginTop: '20px' }}>Change Admin Password</h4>
                        <div style={{ display: 'grid', gap: '10px', maxWidth: '400px' }}>
                            <input
                                type="password" placeholder="Old Password"
                                value={oldPassword} onChange={e => setOldPassword(e.target.value)}
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                            <input
                                type="password" placeholder="New Password"
                                value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)}
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                            <button onClick={handleChangePassword} style={{ padding: '10px', background: '#7bdff2', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Update Password
                            </button>
                        </div>
                    </section>
                </div>
            )}

            {activeTab === 'inventory' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px' }}>
                    <section style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                        <div style={{ margin: '20px 0' }}>
                            <input type="text" placeholder="Name" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} style={{ display: 'block', width: '100%', padding: '8px', margin: '10px 0' }} />
                            <input type="number" placeholder="Price (PKR)" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })} style={{ display: 'block', width: '100%', padding: '8px', margin: '10px 0' }} />
                            <input type="number" placeholder="Stock" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) })} style={{ display: 'block', width: '100%', padding: '8px', margin: '10px 0' }} />
                            <input type="text" placeholder="Packaging Unit (e.g. Pack of 4)" value={newProduct.unit} onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })} style={{ display: 'block', width: '100%', padding: '8px', margin: '10px 0' }} />
                            <input type="text" placeholder="Description" value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} style={{ display: 'block', width: '100%', padding: '8px', margin: '10px 0' }} />
                            <div style={{ margin: '10px 0' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Product Photo:</label>
                                <input type="file" onChange={handleFileUpload} style={{ marginBottom: '10px' }} />
                                {uploading && <span>Uploading...</span>}
                                <input type="text" placeholder="Or Image URL" value={newProduct.image_url} onChange={e => setNewProduct({ ...newProduct, image_url: e.target.value })} style={{ display: 'block', width: '100%', padding: '8px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={addProduct} style={{ flex: 1, padding: '10px', background: '#ff85a1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                    {editingProduct ? 'Update Product' : 'Add Product'}
                                </button>
                                {editingProduct && (
                                    <button onClick={() => { setEditingProduct(null); setNewProduct({ name: '', price: 0, stock: 0, description: '', image_url: '', unit: '' }) }} style={{ padding: '10px', background: '#ddd', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                )}
                            </div>
                        </div>
                    </section>

                    <section style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <h2>Product List</h2>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                                    <th style={{ padding: '10px' }}>Product</th>
                                    <th>Price</th>
                                    <th>Stock</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(p => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                        <td style={{ padding: '15px 10px' }}>
                                            <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#666' }}>{p.description}</div>
                                            {p.unit && <div style={{ fontSize: '0.75rem', color: '#ff85a1', fontWeight: 'bold' }}>{p.unit}</div>}
                                        </td>
                                        <td>Rs. {p.price}</td>
                                        <td>
                                            <input
                                                type="number" defaultValue={p.stock}
                                                onBlur={(e) => updateStock(p.id, e.target.value)}
                                                style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #ddd' }}
                                            />
                                        </td>
                                        <td>
                                            <button onClick={() => handleEditProduct(p)} style={{ marginRight: '5px', padding: '5px 10px', background: '#7bdff2', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                                            <button onClick={() => deleteProduct(p.id)} style={{ padding: '5px 10px', background: '#feb1b1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                </div>
            )}

            {activeTab === 'invoices' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px' }}>
                    <section style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <h2>Create Manual Invoice</h2>
                        <div style={{ margin: '20px 0' }}>
                            <input type="text" placeholder="Customer Name" value={manualInvoice.customer_name} onChange={e => setManualInvoice({ ...manualInvoice, customer_name: e.target.value })} style={{ display: 'block', width: '100%', padding: '8px', margin: '10px 0' }} />
                            <input type="text" placeholder="Customer Phone" value={manualInvoice.phone} onChange={e => setManualInvoice({ ...manualInvoice, phone: e.target.value })} style={{ display: 'block', width: '100%', padding: '8px', margin: '10px 0' }} />

                            <h4>Items</h4>
                            {manualInvoice.items.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                                    <select value={item.product_id} onChange={e => updateManualItem(idx, 'product_id', e.target.value)} style={{ flex: 2, padding: '8px' }}>
                                        <option value="0">Select Product</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <input type="number" placeholder="Qty" value={item.quantity} onChange={e => updateManualItem(idx, 'quantity', parseInt(e.target.value))} style={{ flex: 1, padding: '8px' }} />
                                    <input type="number" placeholder="Price" value={item.unit_price} onChange={e => updateManualItem(idx, 'unit_price', parseFloat(e.target.value))} style={{ flex: 1, padding: '8px' }} />
                                </div>
                            ))}
                            <button onClick={() => setManualInvoice({ ...manualInvoice, items: [...manualInvoice.items, { product_id: 0, quantity: 1, unit_price: 0 }] })} style={{ width: '100%', padding: '5px', marginBottom: '10px' }}>+ Add Item</button>
                            <button onClick={createManualInvoice} style={{ width: '100%', padding: '10px', background: '#ff85a1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Generate Invoice</button>
                        </div>
                    </section>

                    <section style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <h2>Invoice History & Cloud Orders</h2>
                        <div style={{ marginBottom: '20px', background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                            <h3>Pending Cloud Orders</h3>
                            {orders.filter(o => o.status === 'pending').map(o => (
                                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee' }}>
                                    <span>{o.customer_name} ({o.phone}) - Rs. {o.total}</span>
                                    <button onClick={() => confirmOrder(o.id)} style={{ padding: '6px 12px', background: '#2c7a7b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Confirm & Generate Inv</button>
                                </div>
                            ))}
                            {orders.filter(o => o.status === 'pending').length === 0 && <small>No pending cloud orders.</small>}
                        </div>

                        <h3>Generated Invoices</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                                    <th style={{ padding: '10px' }}>Invoice ID</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map(i => (
                                    <tr key={i.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '10px' }}>{i.invoice_number}</td>
                                        <td>{new Date(i.created_at).toLocaleDateString()}</td>
                                        <td>INV Details...</td>
                                        <td>
                                            <a
                                                href={`${API_BASE}/invoices/${i.id}/pdf`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    padding: '4px 8px',
                                                    background: '#eee',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    textDecoration: 'none',
                                                    color: 'black',
                                                    display: 'inline-block',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                Download PDF
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                </div>
            )}

        </div>
    );
};

export default Admin;
