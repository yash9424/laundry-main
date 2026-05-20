'use client'

import { useState, useEffect } from 'react'
import ResponsiveLayout from '../../components/ResponsiveLayout'
import Modal from '../../components/Modal'

interface PricingItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  createdAt: string;
}

interface Category {
  _id: string;
  name: string;
  image: string;
  order: number;
}

export default function PricingPage() {
  const [items, setItems] = useState<PricingItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [editingItem, setEditingItem] = useState<PricingItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImage, setNewCategoryImage] = useState('');
  const [newCategoryFile, setNewCategoryFile] = useState<File | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryImage, setEditCategoryImage] = useState('');
  const [editCategoryFile, setEditCategoryFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({ name: '', price: '', category: '' })
  const [itemFile, setItemFile] = useState<File | null>(null)
  const [editingItemFile, setEditingItemFile] = useState<File | null>(null)
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' as 'info' | 'success' | 'error' });
  
  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [activeCategory]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/pricing/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
        if (data.data.length > 0 && !formData.category) {
          setFormData(prev => ({ ...prev, category: data.data[0].name }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };
  
  const fetchItems = async () => {
    try {
      const response = await fetch(`/api/pricing?category=${activeCategory}`);
      const data = await response.json();
      if (data.success) {
        setItems(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };
  
  const handleAdd = async () => {
    try {
      setUploadingImage(true);
      let imageUrl = '';
      if (itemFile) imageUrl = await uploadImage(itemFile);
      const response = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, price: Number(formData.price), category: (formData.category || 'All').trim(), image: imageUrl })
      });
      const data = await response.json();
      if (response.ok) {
        setFormData({ name: '', price: '', category: categories[0]?.name || '' });
        setItemFile(null);
        setShowAddForm(false);
        fetchItems();
        setModal({ isOpen: true, title: 'Success', message: 'Item added successfully!', type: 'success' });
      } else {
        setModal({ isOpen: true, title: 'Error', message: data.error || 'Failed to add item', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to add item:', error);
      setModal({ isOpen: true, title: 'Error', message: 'Failed to add item', type: 'error' });
    } finally { setUploadingImage(false); }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    return data.success ? data.url : '';
  };

  const handleAddCategory = async () => {
    try {
      setUploadingImage(true);
      let imageUrl = newCategoryImage;
      if (newCategoryFile) imageUrl = await uploadImage(newCategoryFile);
      const response = await fetch('/api/pricing/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName, image: imageUrl })
      });
      if (response.ok) {
        setNewCategoryName(''); setNewCategoryImage(''); setNewCategoryFile(null);
        setShowCategoryForm(false);
        fetchCategories();
      }
    } catch (error) {
      console.error('Failed to add category:', error);
    } finally { setUploadingImage(false); }
  };

  const handleEditCategory = async () => {
    if (!editingCategory) return;
    setUploadingImage(true);
    let imageUrl = editCategoryImage;
    if (editCategoryFile) imageUrl = await uploadImage(editCategoryFile);
    const response = await fetch('/api/pricing/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingCategory._id, name: editCategoryName, image: imageUrl })
    });
    setUploadingImage(false);
    if (response.ok) { setEditingCategory(null); setEditCategoryFile(null); fetchCategories(); }
  };

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    const newCats = [...categories];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newCats.length) return;
    [newCats[index], newCats[swapIdx]] = [newCats[swapIdx], newCats[index]];
    setCategories(newCats);
    await fetch('/api/pricing/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reorder: newCats.map((c, i) => ({ id: c._id, order: i })) })
    });
  };

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newItems.length) return;
    [newItems[index], newItems[swapIdx]] = [newItems[swapIdx], newItems[index]];
    setItems(newItems);
    await fetch('/api/pricing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reorder: newItems.map((item, i) => ({ id: item._id, order: i })) })
    });
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const response = await fetch(`/api/pricing/categories?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchCategories();
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };
  
  const handleUpdate = async (item: PricingItem) => {
    try {
      setUploadingImage(true);
      let imageUrl = item.image || '';
      if (editingItemFile) imageUrl = await uploadImage(editingItemFile);
      const response = await fetch('/api/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item._id, name: item.name, price: item.price, category: item.category, image: imageUrl })
      });
      if (response.ok) {
        setEditingItem(null);
        setEditingItemFile(null);
        fetchItems();
      }
    } catch (error) {
      console.error('Failed to update item:', error);
    } finally { setUploadingImage(false); }
  };
  
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/pricing?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchItems();
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  return (
    <ResponsiveLayout activePage="Pricing" title="Pricing Management" searchPlaceholder="Search Item">
        
        <div style={{ padding: '1.5rem' }}>
          {/* Category Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setActiveCategory('All')}
                style={{ 
                  padding: '0.5rem 1rem', 
                  backgroundColor: activeCategory === 'All' ? '#2563eb' : 'white', 
                  color: activeCategory === 'All' ? 'white' : '#2563eb', 
                  border: activeCategory === 'All' ? 'none' : '1px solid #2563eb', 
                  borderRadius: '6px', 
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                All
              </button>
              {categories.map((category, index) => (
                <div key={category._id} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '2px', border: '1px solid #2563eb', borderRadius: '6px', backgroundColor: activeCategory === category.name ? '#2563eb' : 'white', overflow: 'visible' }}>
                  <button
                    onClick={() => setActiveCategory(category.name)}
                    style={{ padding: '0.5rem 0.5rem', backgroundColor: 'transparent', color: activeCategory === category.name ? 'white' : '#2563eb', border: 'none', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500 }}
                  >
                    {category.name}
                  </button>
                  <button onClick={() => { setEditingCategory(category); setEditCategoryName(category.name); setEditCategoryImage(category.image || ''); setEditCategoryFile(null); }} title="Edit" style={{ padding: '0.25rem', backgroundColor: 'transparent', color: activeCategory === category.name ? 'white' : '#2563eb', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>✏️</button>
                  <button onClick={() => moveCategory(index, 'up')} disabled={index === 0} title="Move up" style={{ padding: '0.25rem', backgroundColor: 'transparent', color: activeCategory === category.name ? 'white' : '#6b7280', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', fontSize: '0.7rem', opacity: index === 0 ? 0.3 : 1 }}>▲</button>
                  <button onClick={() => moveCategory(index, 'down')} disabled={index === categories.length - 1} title="Move down" style={{ padding: '0.25rem 0.4rem 0.25rem 0.1rem', backgroundColor: 'transparent', color: activeCategory === category.name ? 'white' : '#6b7280', border: 'none', cursor: index === categories.length - 1 ? 'not-allowed' : 'pointer', fontSize: '0.7rem', opacity: index === categories.length - 1 ? 0.3 : 1 }}>▼</button>
                  <button onClick={() => handleDeleteCategory(category._id)} style={{ position: 'absolute', top: '-8px', right: '-8px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#ef4444', color: 'white', border: 'none', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                </div>
              ))}
              <button 
                onClick={() => setShowCategoryForm(true)}
                style={{ 
                  padding: '0.5rem 1rem', 
                  backgroundColor: 'white', 
                  color: '#2563eb', 
                  border: '1px solid #2563eb', 
                  borderRadius: '6px', 
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                + Add Category
              </button>
            </div>
            <button 
              onClick={() => setShowAddForm(true)}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer' }}
            >
              Add New Item
            </button>
          </div>

          {/* Items Table */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', display: 'grid', gridTemplateColumns: '50px 2fr 2fr 1.5fr 3fr', gap: '1rem', fontSize: '0.9rem', fontWeight: '600', color: '#6b7280', border: 'none' }}>
              <div>Image</div>
              <div>Item Name</div>
              <div>Price</div>
              <div>Last Updated</div>
              <div>Actions</div>
            </div>

            {items.map((item, index) => (
              <div key={item._id} style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '50px 2fr 2fr 1.5fr 3fr', gap: '1rem', borderTop: '1px solid #f3f4f6', fontSize: '0.9rem', alignItems: 'center' }}>
                <div>
                  {editingItem?._id === item._id ? (
                    <div>
                      {(editingItemFile ? URL.createObjectURL(editingItemFile) : (editingItem.image || '')) ? (
                        <img src={editingItemFile ? URL.createObjectURL(editingItemFile) : editingItem.image} alt="preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', marginBottom: '4px' }} />
                      ) : null}
                      <input type="file" accept="image/*" title="Upload item image" onChange={(e) => setEditingItemFile(e.target.files?.[0] || null)} style={{ fontSize: '0.7rem', width: '100%' }} />
                    </div>
                  ) : item.image ? (
                    <img src={item.image} alt={item.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>👕</div>
                  )}
                </div>
                <div>
                  {editingItem?._id === item._id ? (
                    <input type="text" value={editingItem.name} onChange={(e) => setEditingItem({...editingItem, name: e.target.value})} style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }} />
                  ) : (
                    item.name
                  )}
                </div>
                <div>
                  {editingItem?._id === item._id ? (
                    <input type="number" placeholder="Price" value={editingItem.price} onChange={(e) => setEditingItem({...editingItem, price: Number(e.target.value)})} style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', width: '80px' }} />
                  ) : (
                    `₹${item.price}`
                  )}
                </div>
                <div>{new Date(item.createdAt).toLocaleDateString()}</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button onClick={() => moveItem(index, 'up')} disabled={index === 0} title="Move up" style={{ padding: '0.5rem 0.6rem', backgroundColor: index === 0 ? '#e5e7eb' : '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.75rem', cursor: index === 0 ? 'not-allowed' : 'pointer' }}>▲</button>
                  <button onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1} title="Move down" style={{ padding: '0.5rem 0.6rem', backgroundColor: index === items.length - 1 ? '#e5e7eb' : '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.75rem', cursor: index === items.length - 1 ? 'not-allowed' : 'pointer' }}>▼</button>
                  <button
                    onClick={() => setEditingItem(item)}
                    style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => editingItem?._id === item._id ? handleUpdate(editingItem) : null}
                    disabled={editingItem?._id !== item._id}
                    style={{ padding: '0.5rem 1rem', backgroundColor: editingItem?._id === item._id ? '#10b981' : '#9ca3af', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', cursor: editingItem?._id === item._id ? 'pointer' : 'not-allowed' }}
                  >
                    Update
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    style={{ padding: '0.5rem 1px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Item Form */}
          {showAddForm && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', width: '90%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: '600', textAlign: 'center' }}>Add New Item</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Item Name</label>
                    <input 
                      type="text" 
                      placeholder="Enter item name" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Current Price</label>
                    <input 
                      type="number" 
                      placeholder="Enter price" 
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Category</label>
                    <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}>
                      {categories.map(cat => (
                        <option key={cat._id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Item Image (optional)</label>
                    {itemFile && <img src={URL.createObjectURL(itemFile)} alt="preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.5rem', border: '1px solid #2563eb' }} />}
                    <input type="file" accept="image/*" title="Upload item image" onChange={(e) => setItemFile(e.target.files?.[0] || null)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button onClick={handleAdd} disabled={!formData.name || !formData.price || uploadingImage} style={{ padding: '0.75rem 1.5rem', backgroundColor: formData.name && formData.price && !uploadingImage ? '#10b981' : '#9ca3af', color: 'white', border: 'none', borderRadius: '6px', cursor: formData.name && formData.price ? 'pointer' : 'not-allowed', fontSize: '0.9rem', fontWeight: '500' }}>
                    {uploadingImage ? 'Saving...' : 'Add Item'}
                  </button>
                  <button onClick={() => { setShowAddForm(false); setItemFile(null); }} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Category Modal */}
          {editingCategory && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: '600', textAlign: 'center' }}>Edit Category</h3>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Category Name</label>
                  <input type="text" value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)} placeholder="Enter category name" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Category Image</label>
                  {editCategoryImage && !editCategoryFile && (
                    <img src={editCategoryImage} alt="current" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.5rem', border: '1px solid #e5e7eb' }} />
                  )}
                  {editCategoryFile && (
                    <img src={URL.createObjectURL(editCategoryFile)} alt="preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.5rem', border: '1px solid #2563eb' }} />
                  )}
                  <input type="file" accept="image/*" title="Upload category image" onChange={(e) => setEditCategoryFile(e.target.files?.[0] || null)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button onClick={handleEditCategory} disabled={!editCategoryName || uploadingImage} style={{ padding: '0.75rem 1.5rem', backgroundColor: editCategoryName && !uploadingImage ? '#10b981' : '#9ca3af', color: 'white', border: 'none', borderRadius: '6px', cursor: editCategoryName ? 'pointer' : 'not-allowed', fontSize: '0.9rem', fontWeight: '500' }}>{uploadingImage ? 'Saving...' : 'Save'}</button>
                  <button onClick={() => setEditingCategory(null)} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Category Form */}
          {showCategoryForm && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: '600', textAlign: 'center' }}>Add New Category</h3>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Category Name</label>
                  <input type="text" placeholder="Enter category name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }} />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Category Image</label>
                  {newCategoryFile && (
                    <img src={URL.createObjectURL(newCategoryFile)} alt="preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.5rem', border: '1px solid #2563eb' }} />
                  )}
                  <input type="file" accept="image/*" title="Upload category image" onChange={(e) => setNewCategoryFile(e.target.files?.[0] || null)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button onClick={handleAddCategory} disabled={!newCategoryName || uploadingImage} style={{ padding: '0.75rem 1.5rem', backgroundColor: newCategoryName && !uploadingImage ? '#10b981' : '#9ca3af', color: 'white', border: 'none', borderRadius: '6px', cursor: newCategoryName ? 'pointer' : 'not-allowed', fontSize: '0.9rem', fontWeight: '500' }}>
                    {uploadingImage ? 'Saving...' : 'Add'}
                  </button>
                  <button onClick={() => { setShowCategoryForm(false); setNewCategoryFile(null); }} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* No Items */}
          {items.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '2rem' }}>
              <img src="/pricing page.svg" alt="No items" style={{ width: '100px', height: 'auto' }} />
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', margin: '0 0 0.5rem 0' }}>No items found.</h3>
                <p style={{ color: '#6b7280', fontSize: '1rem', margin: 0 }}>Try adjusting your search or filter to find what you're looking for.</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>{items.length} items</div>
          </div>

          <Modal
            isOpen={modal.isOpen}
            onClose={() => setModal({ ...modal, isOpen: false })}
            title={modal.title}
            message={modal.message}
            type={modal.type}
          />
      </div>
    </ResponsiveLayout>
  )
}
