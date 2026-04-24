require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const crypto = require('crypto');

// ─── Firebase Admin SDK Initialization ───────────────────────────────────────
// Loads the service account JSON directly from the project root.
// Judges / teammates: just place the JSON file here and run `npm start`.
const SERVICE_ACCOUNT_PATH = './oasisvelvet-b23-12-firebase-adminsdk-fbsvc-7639a836fb.json';
let db = null;
try {
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  db = admin.firestore();
  console.log(`✅ Firebase Admin initialized — project: ${serviceAccount.project_id}`);
} catch (error) {
  console.error('❌ Firebase Admin init failed:', error.message);
  console.warn('   Ensure the service account JSON is at:', SERVICE_ACCOUNT_PATH);
  console.warn('   Server will run in mock/degraded mode.');
}

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
    Math.cos(lat1*(Math.PI/180))*Math.cos(lat2*(Math.PI/180))*
    Math.sin(dLon/2)*Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}

async function resetMonthlyIfNeeded(docRef, data) {
  const currentMonth = getCurrentMonth();
  if (data.lastResetMonth !== currentMonth) {
    await docRef.update({ monthlyPoints: 0, lastResetMonth: currentMonth });
    return { ...data, monthlyPoints: 0, lastResetMonth: currentMonth };
  }
  return data;
}

const POINTS_MAP = { critical: 30, high: 20, routine: 10 };

// ─── Middleware ───────────────────────────────────────────────────────────────

const verifyVolunteerToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing Bearer Token' });
  }
  const token = authHeader.split('Bearer ')[1];
  if (!db) return res.status(503).json({ error: 'Database not available' });
  try {
    const snap = await db.collection('volunteers').where('sessionToken','==',token).limit(1).get();
    if (snap.empty) return res.status(403).json({ error: 'Unauthorized: Invalid or expired session token' });
    req.volunteer = { id: snap.docs[0].id, ref: snap.docs[0].ref, ...snap.docs[0].data() };
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Auth check failed' });
  }
};

// ─── 1. POST /api/report ──────────────────────────────────────────────────────
app.post('/api/report', async (req, res) => {
  const { raw_text, priority: manualPriority, category: manualCategory } = req.body;
  if (!raw_text) return res.status(400).json({ error: 'raw_text is required' });
  if (typeof raw_text !== 'string' || raw_text.trim().length === 0)
    return res.status(400).json({ error: 'raw_text must be a non-empty string' });
  if (raw_text.length > 500)
    return res.status(400).json({ error: 'raw_text exceeds the 500-character limit' });

  const safe_text = raw_text.trim().replace(/[`"\\]/g, '');

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
      You are an expert emergency response dispatcher operating in the Dehradun, India area.
      The message below may be written in English, Hindi (Devanagari script), or Hinglish (a mix of Hindi and English).
      Understand the message regardless of language or script, then extract the precise details into a JSON object.
      Extract exactly these keys:
      - priority: One of ["routine", "high", "critical"]
      - category: One of ["medical", "food", "shelter", "logistics"]
      - quantity: Number of people affected (integer, default to 1 if not specified)
      - location: JSON object with "lat" and "lng" as numbers. Accurately guess the coordinates for the mentioned place in Dehradun.
      - road_conditions: One of ["narrow", "flooded", "blocked", "clear"]
      - vehicle_match: Best vehicle to dispatch. One of ["scooty", "truck", "4x4"]
      Return ONLY the raw JSON object, no markdown, no backticks.
      Message: "${safe_text}"
    `;

    const aiResult = await model.generateContent(prompt);
    const responseText = aiResult.response.text().trim().replace(/```json|```/g, '');
    let extractedData = {};
    try {
      extractedData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', responseText);
      return res.status(500).json({ error: 'AI failed to extract structured data' });
    }

    const requestDoc = {
      raw_text,
      priority: manualPriority || extractedData.priority || 'high',
      category: manualCategory || extractedData.category || 'logistics',
      quantity: extractedData.quantity || 1,
      location: extractedData.location || { lat: 30.3165, lng: 78.0322 },
      road_conditions: extractedData.road_conditions || 'clear',
      vehicle_match: extractedData.vehicle_match || '4x4',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (db) {
      try {
        const docRef = await db.collection('requests').add(requestDoc);
        return res.status(201).json({ message: 'Help request created successfully', data: { id: docRef.id, ...requestDoc } });
      } catch (dbErr) {
        console.error('Firestore insert failed:', dbErr.message);
        return res.status(201).json({ message: '[MOCK] Help request created (DB Error)', data: { id: 'mock-id-'+Date.now(), ...requestDoc } });
      }
    }
    return res.status(201).json({ message: '[MOCK] Created (Firebase not configured)', data: { id: 'mock-id-'+Date.now(), ...requestDoc } });

  } catch (err) {
    console.error('Error creating report:', err.message);
    return res.status(500).json({ error: 'Failed to process report: ' + err.message });
  }
});

// ─── 2. GET /api/active-needs ─────────────────────────────────────────────────
app.get('/api/active-needs', async (req, res) => {
  if (!db) return res.status(200).json({ needs: [] });
  try {
    const snapshot = await db.collection('requests').where('status','==','pending').get();
    const needs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ needs });
  } catch (err) {
    console.error('Error fetching active needs:', err.message);
    res.status(200).json({ needs: [{
      id:'mock-1', raw_text:'[MOCK] Firestore connection failed but server is running!',
      priority:'critical', category:'logistics', quantity:1,
      location:{lat:30.3165,lng:78.0322}, road_conditions:'blocked', vehicle_match:'4x4', status:'pending'
    }]});
  }
});

// ─── 3. GET /api/nearby-volunteers ───────────────────────────────────────────
app.get('/api/nearby-volunteers', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng query params required' });
  const centerLat = parseFloat(lat), centerLng = parseFloat(lng);
  try {
    const snapshot = await db.collection('volunteers').where('status','==','active').get();
    const nearby = [];
    snapshot.forEach(doc => {
      const vol = doc.data();
      if (vol.location?.lat && vol.location?.lng) {
        const distance = getDistanceFromLatLonInKm(centerLat, centerLng, vol.location.lat, vol.location.lng);
        if (distance <= 2.0) nearby.push({ id: doc.id, name: vol.name, distance_km: distance.toFixed(2), ...vol });
      }
    });
    res.status(200).json({ volunteers: nearby });
  } catch (err) {
    console.error('Error fetching volunteers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── 4. POST /api/volunteers/register ────────────────────────────────────────
app.post('/api/volunteers/register', async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'name and phone are required' });
  if (typeof name !== 'string' || name.trim().length === 0) return res.status(400).json({ error: 'Invalid name' });
  if (typeof phone !== 'string' || phone.trim().length === 0) return res.status(400).json({ error: 'Invalid phone' });
  if (!db) return res.status(503).json({ error: 'Database not available' });

  try {
    const existing = await db.collection('volunteers').where('phone','==',phone.trim()).limit(1).get();
    if (!existing.empty) return res.status(409).json({ error: 'Phone already registered. Please login instead.' });

    const sessionToken = crypto.randomUUID();
    const currentMonth = getCurrentMonth();
    const volunteerDoc = {
      name: name.trim(), phone: phone.trim(), sessionToken,
      totalPoints: 0, monthlyPoints: 0, lastResetMonth: currentMonth,
      status: 'active', createdAt: new Date().toISOString()
    };
    const docRef = await db.collection('volunteers').add(volunteerDoc);
    res.status(201).json({
      message: 'Volunteer registered successfully!',
      volunteer: { id: docRef.id, name: volunteerDoc.name, totalPoints: 0, monthlyPoints: 0, sessionToken }
    });
  } catch (err) {
    console.error('Error registering volunteer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── 5. POST /api/volunteers/login ───────────────────────────────────────────
app.post('/api/volunteers/login', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone is required' });
  if (!db) return res.status(503).json({ error: 'Database not available' });

  try {
    const snap = await db.collection('volunteers').where('phone','==',phone.trim()).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'No volunteer found. Please register first.' });

    const docRef = snap.docs[0].ref;
    let data = await resetMonthlyIfNeeded(docRef, snap.docs[0].data());
    const sessionToken = crypto.randomUUID();
    await docRef.update({ sessionToken });

    res.status(200).json({
      message: 'Login successful!',
      volunteer: { id: snap.docs[0].id, name: data.name, totalPoints: data.totalPoints, monthlyPoints: data.monthlyPoints, sessionToken }
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── 6. POST /api/verify (awards points) ─────────────────────────────────────
app.post('/api/verify', verifyVolunteerToken, async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });
  const { request_id, otp } = req.body;
  if (!request_id || !otp) return res.status(400).json({ error: 'request_id and otp are required' });
  if (otp !== '1234') return res.status(401).json({ error: 'Invalid OTP' });

  try {
    const docRef = db.collection('requests').doc(request_id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Request not found' });
    if (doc.data().status === 'resolved') return res.status(400).json({ error: 'Already resolved' });

    const priority = doc.data().priority || 'routine';
    const pointsEarned = POINTS_MAP[priority] || 10;

    await docRef.update({ status: 'resolved', resolvedBy: req.volunteer.id, resolvedByName: req.volunteer.name, resolvedAt: new Date().toISOString() });

    // Award points with lazy monthly reset
    const volRef = req.volunteer.ref;
    let volData = req.volunteer;
    const currentMonth = getCurrentMonth();
    let monthlyPoints = volData.lastResetMonth !== currentMonth ? 0 : (volData.monthlyPoints || 0);
    const newTotal = (volData.totalPoints || 0) + pointsEarned;
    const newMonthly = monthlyPoints + pointsEarned;

    await volRef.update({ totalPoints: newTotal, monthlyPoints: newMonthly, lastResetMonth: currentMonth });

    res.status(200).json({ message: `Task resolved! +${pointsEarned} points awarded.`, pointsEarned, totalPoints: newTotal, monthlyPoints: newMonthly });
  } catch (err) {
    console.error('Error verifying:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── 7. GET /api/leaderboard ──────────────────────────────────────────────────
app.get('/api/leaderboard', async (req, res) => {
  if (!db) return res.status(200).json({ leaderboard: [], month: getCurrentMonth() });
  try {
    const currentMonth = getCurrentMonth();
    const snap = await db.collection('volunteers').orderBy('monthlyPoints','desc').limit(10).get();
    const leaderboard = snap.docs.map((doc, i) => {
      const d = doc.data();
      return {
        rank: i+1, name: d.name,
        monthlyPoints: d.lastResetMonth === currentMonth ? (d.monthlyPoints||0) : 0,
        totalPoints: d.totalPoints || 0
      };
    });
    res.status(200).json({ leaderboard, month: currentMonth });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(200).json({ leaderboard: [], month: getCurrentMonth() });
  }
});

// ─── Catch-all for React Router ────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

app.listen(port, () => console.log(`Oasis API running on port ${port}`));
