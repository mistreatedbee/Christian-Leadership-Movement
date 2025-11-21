# MongoDB Migration - Practical Example

## 📝 **Quick Example: Converting One Feature**

This shows how a single feature (Prayer Requests) would be converted from InsForge to MongoDB.

---

## 🔄 **Current Implementation (InsForge)**

### **Frontend Code:**
```typescript
// src/pages/PrayerRequestsPage.tsx
import { insforge } from '../../lib/insforge';

// Fetch prayer requests
const { data } = await insforge.database
  .from('prayer_requests')
  .select('*, users(nickname, email)')
  .eq('is_public', true)
  .order('created_at', { ascending: false });

// Create prayer request
const { data: newRequest } = await insforge.database
  .from('prayer_requests')
  .insert({
    user_id: user.id,
    title: 'Healing Request',
    request: 'Please pray for my health',
    is_public: true
  })
  .select()
  .single();
```

---

## 🆕 **New Implementation (MongoDB + Backend API)**

### **1. MongoDB Schema (Mongoose)**
```javascript
// backend/models/PrayerRequest.js
const mongoose = require('mongoose');

const prayerResponseSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: String,
  created_at: { type: Date, default: Date.now }
});

const prayerRequestSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  request: { type: String, required: true },
  is_public: { type: Boolean, default: false },
  is_anonymous: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['active', 'answered', 'archived'], 
    default: 'active' 
  },
  prayer_count: { type: Number, default: 0 },
  responses: [prayerResponseSchema],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Indexes
prayerRequestSchema.index({ user_id: 1 });
prayerRequestSchema.index({ status: 1 });
prayerRequestSchema.index({ is_public: 1 });
prayerRequestSchema.index({ created_at: -1 });

module.exports = mongoose.model('PrayerRequest', prayerRequestSchema);
```

### **2. Backend API Endpoints**
```javascript
// backend/routes/prayerRequests.js
const express = require('express');
const router = express.Router();
const PrayerRequest = require('../models/PrayerRequest');
const { authenticateToken } = require('../middleware/auth');

// GET /api/prayer-requests (public requests)
router.get('/', async (req, res) => {
  try {
    const requests = await PrayerRequest
      .find({ is_public: true, status: 'active' })
      .populate('user_id', 'nickname email')
      .sort({ created_at: -1 })
      .limit(50);
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/prayer-requests/:id
router.get('/:id', async (req, res) => {
  try {
    const request = await PrayerRequest
      .findById(req.params.id)
      .populate('user_id', 'nickname email')
      .populate('responses.user_id', 'nickname');
    
    if (!request) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/prayer-requests (create)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const request = new PrayerRequest({
      user_id: req.user.id,
      title: req.body.title,
      request: req.body.request,
      is_public: req.body.is_public || false,
      is_anonymous: req.body.is_anonymous || false
    });
    
    const saved = await request.save();
    await saved.populate('user_id', 'nickname email');
    
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/prayer-requests/:id/pray (add prayer response)
router.post('/:id/pray', authenticateToken, async (req, res) => {
  try {
    const request = await PrayerRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    // Check if user already prayed
    const existingResponse = request.responses.find(
      r => r.user_id.toString() === req.user.id
    );
    
    if (existingResponse) {
      return res.status(400).json({ error: 'Already prayed' });
    }
    
    request.responses.push({
      user_id: req.user.id,
      message: req.body.message
    });
    request.prayer_count += 1;
    
    await request.save();
    res.json(request);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
```

### **3. Frontend API Client**
```typescript
// src/lib/api.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API Error');
  }
  
  return response.json();
}

export const api = {
  // Prayer Requests
  prayerRequests: {
    getAll: () => apiCall('/prayer-requests'),
    getById: (id: string) => apiCall(`/prayer-requests/${id}`),
    create: (data: any) => apiCall('/prayer-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    addPrayer: (id: string, message?: string) => apiCall(`/prayer-requests/${id}/pray`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  },
  
  // Add other endpoints...
};
```

### **4. Updated Frontend Code**
```typescript
// src/pages/PrayerRequestsPage.tsx
import { api } from '../../lib/api';
import { useState, useEffect } from 'react';

export function PrayerRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await api.prayerRequests.getAll();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    try {
      const newRequest = await api.prayerRequests.create(formData);
      setRequests([newRequest, ...requests]);
    } catch (error) {
      console.error('Error creating request:', error);
    }
  };

  // ... rest of component
}
```

---

## 📊 **Comparison**

### **Lines of Code:**
- **InsForge**: ~10 lines per feature
- **MongoDB**: ~150+ lines per feature (backend + frontend changes)

### **Files Needed:**
- **InsForge**: 1 file (frontend page)
- **MongoDB**: 3+ files (model, routes, frontend, middleware)

### **Complexity:**
- **InsForge**: Direct database queries
- **MongoDB**: API layer, authentication, error handling, validation

---

## 🎯 **Full Migration Scope**

For your **38 pages** and **30+ tables**, you'd need:

- **30+ Mongoose Models** (one per table)
- **100+ API Endpoints** (CRUD for each feature)
- **50+ Frontend Files** updated
- **Authentication System** (JWT, refresh tokens)
- **File Upload System** (GridFS or S3)
- **Error Handling** throughout
- **Validation** on all endpoints
- **Testing** for everything

**Estimated Total Code:**
- Backend: ~5,000-8,000 lines
- Frontend changes: ~2,000-3,000 lines
- Configuration: ~500 lines

---

## 💡 **Recommendation**

Given the scope, I'd suggest:

1. **Start Small**: Migrate one feature as a proof-of-concept
2. **Evaluate**: See if it's worth the effort
3. **Decide**: Continue or stay with InsForge

Would you like me to:
- ✅ Build a complete MongoDB backend for one feature?
- ✅ Create the full migration plan?
- ✅ Set up the backend infrastructure?

Let me know what you'd like to do! 🚀

