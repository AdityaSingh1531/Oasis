require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const crypto = require('crypto');

// ─── Firebase Admin SDK Initialization ───────────────────────────────────────
let db = null;
try {
  if (process.env.FIREBASE_CONFIG || process.env.K_SERVICE) {
    // We are in a Cloud environment (Firebase App Hosting / Cloud Run)
    admin.initializeApp();
    console.log("✅ Firebase Admin initialized via Application Default Credentials");
  } else {
    // Local development
    const SERVICE_ACCOUNT_PATH = './oasisvelvet-b23-12-firebase-adminsdk-fbsvc-7639a836fb.json';
    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    console.log(`✅ Firebase Admin initialized locally — project: ${serviceAccount.project_id}`);
  }
  db = admin.firestore();
} catch (error) {
  console.error('❌ Firebase Admin init failed:', error.message);
  console.warn('   Server will attempt to run in degraded mode.');
}

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client', 'dist')));

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getCoordinatesFromAddress(address) {
  if (!GOOGLE_MAPS_API_KEY) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + ', Dehradun')}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'OK') {
      return data.results[0].geometry.location;
    }
  } catch (error) {
    console.error('Geocoding error:', error.message);
  }
  return null;
}

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
    const { raw_text, priority: manualPriority, category: manualCategory, user_location } = req.body;
    if (!raw_text) return res.status(400).json({ error: 'raw_text is required' });
    if (typeof raw_text !== 'string' || raw_text.trim().length === 0)
      return res.status(400).json({ error: 'raw_text must be a non-empty string' });
    if (raw_text.length > 500)
      return res.status(400).json({ error: 'raw_text exceeds the 500-character limit' });

    const safe_text = raw_text.trim().replace(/[`"\\]/g, '');

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
        You are the Oasis Tactical Emergency AI. 
        Analyze this report (English/Hindi/Hinglish): "${safe_text}"
        
        CRITICAL: 
        1. Determine if this is a GENUINE emergency or crisis-related request. 
        2. If it is chatter, a test message, or unrelated (e.g., "I like butter", "Hello world"), set is_emergency to false.
        3. If it is a real request, identify the EXACT location (landmarks/house numbers).

        Return ONLY a JSON object:
        - is_emergency: boolean
        - priority: ["routine", "high", "critical"]
        - category: ["medical", "food", "shelter", "logistics"]
        - quantity: integer
        - location_name: Precise address/landmark (string).
        - summary: A tactical 5-word summary.
      `;

      const aiResult = await model.generateContent(prompt);
      const responseText = aiResult.response.text().trim().replace(/```json|```/g, '');
      let extractedData = {};
      try {
        extractedData = JSON.parse(responseText);
        if (extractedData.is_emergency === false) {
          return res.status(400).json({ error: 'Chatter detected. Only emergency reports are permitted.' });
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', responseText);
        return res.status(500).json({ error: 'AI failed to extract structured data' });
      }

      let location = user_location || { lat: 30.3165, lng: 78.0322 };
      if (!user_location && extractedData.location_name) {
        const geoCoords = await getCoordinatesFromAddress(extractedData.location_name);
        if (geoCoords) location = geoCoords;
      }

      const requestDoc = {
        raw_text,
        priority: manualPriority || extractedData.priority || 'high',
        category: manualCategory || extractedData.category || 'logistics',
        quantity: extractedData.quantity || 1,
        location,
        location_name: extractedData.location_name || 'Dehradun',
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
    console.error('Error with Gemini API:', err.message);
    console.log('Falling back to default AI extraction so the app can continue working.');
    
    // Fallback if Gemini fails
    const lowText = raw_text.toLowerCase();
    
    // Smart Priority Detection
    let priority = 'high';
    if (lowText.match(/critical|emergency|dying|blood|fire|trapped|stuck|breathing/)) {
      priority = 'critical';
    } else if (lowText.match(/food|water|blanket|clothes|routine|info/)) {
      priority = 'routine';
    }

    // Smart Category Detection
    let category = 'logistics';
    if (lowText.match(/doctor|blood|injury|medicine|hospital|pain|sick/)) {
      category = 'medical';
    } else if (lowText.match(/food|water|hungry|ration|eat/)) {
      category = 'food';
    } else if (lowText.match(/stay|sleep|house|homeless|roof|tent/)) {
      category = 'shelter';
    }

    const fallbackDoc = {
      raw_text,
      priority: manualPriority || priority,
      category: manualCategory || category,
      quantity: 1,
      location: { lat: 30.3165, lng: 78.0322 }, // Default Dehradun
      road_conditions: priority === 'critical' ? 'blocked' : 'clear',
      vehicle_match: priority === 'critical' ? '4x4' : 'scooty',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (db) {
      try {
        const docRef = await db.collection('requests').add(fallbackDoc);
        return res.status(201).json({ message: 'Help request created (AI Fallback)', data: { id: docRef.id, ...fallbackDoc } });
      } catch (dbErr) {
        return res.status(500).json({ error: 'Database error after AI fallback' });
      }
    }
    return res.status(201).json({ message: '[MOCK] Created (AI Fallback & DB Offline)', data: { id: 'mock-id-'+Date.now(), ...fallbackDoc } });
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
  const { name, phone, vehicle } = req.body;
  if (!name || !phone || !vehicle) return res.status(400).json({ error: 'name, phone and vehicle are required' });
  if (typeof name !== 'string' || name.trim().length === 0) return res.status(400).json({ error: 'Invalid name' });
  if (typeof phone !== 'string' || phone.trim().length === 0) return res.status(400).json({ error: 'Invalid phone' });
  if (!db) return res.status(503).json({ error: 'Database not available' });

  try {
    const existing = await db.collection('volunteers').where('phone','==',phone.trim()).limit(1).get();
    if (!existing.empty) return res.status(409).json({ error: 'Phone already registered. Please login instead.' });

    const sessionToken = crypto.randomUUID();
    const currentMonth = getCurrentMonth();
    const volunteerDoc = {
      name: name.trim(), phone: phone.trim(), vehicle: vehicle.toLowerCase(), sessionToken,
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

// ─── 1.5 POST /api/report/voice (Audio to Data) ──────────────────────────────
app.post('/api/report/voice', async (req, res) => {
  const { audio } = req.body; // base64 string
  if (!audio) return res.status(400).json({ error: 'Audio data is required' });

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          data: audio,
          mimeType: "audio/webm"
        }
      },
      "Transcribe this audio. If it is an emergency, extract: is_emergency (bool), priority (routine/high/critical), category (medical/food/shelter/logistics), location_name (exact address/landmark). Return ONLY JSON."
    ]);

    const responseText = result.response.text().trim().replace(/```json|```/g, '');
    let extractedData = JSON.parse(responseText);

    if (extractedData.is_emergency === false) {
      return res.status(400).json({ error: 'No emergency detected in audio.' });
    }

    res.status(200).json({ 
      text: extractedData.location_name ? `Emergency: ${extractedData.category} at ${extractedData.location_name}` : "Emergency detected.",
      extracted: extractedData 
    });
  } catch (err) {
    console.error('Voice processing error:', err);
    res.status(500).json({ error: 'Voice processing failed' });
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

// ─── 7. POST /api/volunteers/location ─────────────────────────────────────────
app.post('/api/volunteers/location', verifyVolunteerToken, async (req, res) => {
  const { location } = req.body;
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return res.status(400).json({ error: 'Valid location {lat, lng} is required' });
  }

  try {
    await req.volunteer.ref.update({
      currentLocation: location,
      lastSeen: new Date().toISOString()
    });
    res.status(200).json({ message: 'Location updated' });
  } catch (err) {
    console.error('Error updating location:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── 8. Safety Buddy (Dead-Man's Switch) ─────────────────────────────────────

/**
 * Activate Safety Buddy: Server starts a countdown.
 * If no check-in by expiry, the buddy is alerted.
 */
app.post('/api/safety/activate', verifyVolunteerToken, async (req, res) => {
  const { buddy_name, buddy_phone, duration_mins } = req.body;
  if (!buddy_name || !buddy_phone || !duration_mins) {
    return res.status(400).json({ error: 'Buddy info and duration are required' });
  }

  const expiryTime = new Date(Date.now() + duration_mins * 60000).toISOString();

  try {
    const safetyDoc = {
      volunteerId: req.volunteer.id,
      volunteerName: req.volunteer.name,
      buddy_name,
      buddy_phone,
      expiryTime,
      status: 'active',
      lastLocation: req.volunteer.currentLocation || null,
      path: req.volunteer.currentLocation ? [req.volunteer.currentLocation] : [],
      activatedAt: new Date().toISOString()
    };

    // Store in a new 'safety_sessions' collection
    const docRef = await db.collection('safety_sessions').add(safetyDoc);
    res.status(201).json({ id: docRef.id, expiryTime, message: 'Safety Buddy Activated' });
  } catch (err) {
    console.error('Safety activation error:', err);
    res.status(500).json({ error: 'Failed to activate safety protocol' });
  }
});

app.post('/api/safety/checkin', verifyVolunteerToken, async (req, res) => {
  const { session_id, status } = req.body; // status: 'safe' (deactivates) or 'extend'
  if (!session_id) return res.status(400).json({ error: 'session_id required' });

  try {
    const docRef = db.collection('safety_sessions').doc(session_id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Session not found' });

    if (status === 'safe') {
      await docRef.update({ status: 'resolved', deactivatedAt: new Date().toISOString() });
      return res.status(200).json({ message: 'Protocol Deactivated. You are safe.' });
    }
    
    res.status(400).json({ error: 'Invalid status update' });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ─── 9. GET /api/volunteers/nearby ──────────────────────────────────────────
/**
 * Find volunteers within a 2km radius of a specific location.
 */
app.get('/api/volunteers/nearby', async (req, res) => {
  const { lat, lng, radius = 2 } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });

  try {
    const snap = await db.collection('volunteers').get();
    const nearby = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(v => {
        if (!v.currentLocation) return false;
        const dist = getDistanceFromLatLonInKm(
          parseFloat(lat), parseFloat(lng),
          v.currentLocation.lat, v.currentLocation.lng
        );
        return dist <= parseFloat(radius);
      });

    res.status(200).json({ volunteers: nearby });
  } catch (err) {
    console.error('Proximity search error:', err);
    res.status(500).json({ error: 'Proximity search failed' });
  }
});

// ─── 10. GET /api/leaderboard ──────────────────────────────────────────────────
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

// ─── 11. DELETE /api/missions/:id (Admin Only) ─────────────────────────────
app.delete('/api/missions/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[ADMIN] Attempting to delete mission: ${id}`);
  try {
    await db.collection('help_requests').doc(id).delete();
    console.log(`[ADMIN] Successfully deleted mission: ${id}`);
    res.status(200).json({ message: 'Mission Terminated.' });
  } catch (err) {
    console.error(`[ADMIN] ERROR deleting mission ${id}:`, err);
    res.status(500).json({ error: 'Failed to delete mission' });
  }
});

// ─── 12. DELETE /api/volunteers/:id (Admin Only) ───────────────────────────
app.delete('/api/volunteers/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[ADMIN] Attempting to delete volunteer: ${id}`);
  try {
    await db.collection('volunteers').doc(id).delete();
    console.log(`[ADMIN] Successfully deleted volunteer: ${id}`);
    res.status(200).json({ message: 'Volunteer Excised.' });
  } catch (err) {
    console.error(`[ADMIN] ERROR deleting volunteer ${id}:`, err);
    res.status(500).json({ error: 'Failed to delete volunteer' });
  }
});

app.listen(port, '127.0.0.1', () => console.log(`Oasis API running on http://127.0.0.1:${port}`));

module.exports = app;
