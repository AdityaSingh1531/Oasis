# Oasis Backend API (Firebase + Gemini)

This document provides the API specifications for the Oasis crisis-relief frontend to communicate with the Node.js/Firebase backend.

## 1. Report Emergency (Smart Extraction)
**Endpoint:** `POST /api/report`
Send a text message in English, Hindi, or Hinglish. The backend uses Gemini 2.0 Flash to extract specific emergency data.

**Request Body:**
```json
{
  "raw_text": "<string, required, max 500 chars>",
  "priority": "<string, optional, e.g., 'routine', 'high', 'critical'>",
  "category": "<string, optional, e.g., 'medical', 'food', 'shelter', 'logistics'>"
}
```

**Response (201 Created):**
```json
{
  "message": "Help request created successfully",
  "data": {
    "id": "<string, Document ID>",
    "raw_text": "<string>",
    "priority": "<string>",
    "category": "<string>",
    "quantity": "<number>",
    "location": {
      "lat": "<number>",
      "lng": "<number>"
    },
    "road_conditions": "<string>",
    "vehicle_match": "<string>",
    "status": "pending",
    "createdAt": "<ISO-8601 Date String>"
  }
}
```

## 2. Get Live Map Data
**Endpoint:** `GET /api/active-needs`
Fetches all active requests (status `pending`) to plot on the Google Map.

**Response (200 OK):**
```json
{
  "needs": [
    {
      "id": "<string, Document ID>",
      "raw_text": "<string>",
      "priority": "<string>",
      "category": "<string>",
      "quantity": "<number>",
      "location": { "lat": "<number>", "lng": "<number>" },
      "road_conditions": "<string>",
      "vehicle_match": "<string>",
      "status": "pending"
    }
  ]
}
```

## 3. Find Nearby Volunteers
**Endpoint:** `GET /api/nearby-volunteers?lat=<number>&lng=<number>`
Returns a list of active volunteers currently matching within approximately a 2km radius.

**Response (200 OK):**
```json
{
  "volunteers": [
    {
      "id": "<string, Document ID>",
      "name": "<string>",
      "phone": "<string>",
      "status": "active",
      "distance_km": "<string, formatted number>"
    }
  ]
}
```

## 4. Register Volunteer
**Endpoint:** `POST /api/volunteers/register`

**Request Body:**
```json
{
  "name": "<string, required>",
  "phone": "<string, required>"
}
```

**Response (201 Created):**
```json
{
  "message": "Volunteer registered successfully!",
  "volunteer": {
    "id": "<string, Document ID>",
    "name": "<string>",
    "totalPoints": 0,
    "monthlyPoints": 0,
    "sessionToken": "<string, UUID>"
  }
}
```

## 5. Login Volunteer
**Endpoint:** `POST /api/volunteers/login`

**Request Body:**
```json
{
  "phone": "<string, required>"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful!",
  "volunteer": {
    "id": "<string, Document ID>",
    "name": "<string>",
    "totalPoints": "<number>",
    "monthlyPoints": "<number>",
    "sessionToken": "<string, UUID>"
  }
}
```

## 6. Volunteer Task Verification
**Endpoint:** `POST /api/verify`
(Requires Volunteer Session Token)

**Headers:**
`Authorization: Bearer <sessionToken>`

**Request Body:**
```json
{
  "request_id": "<string, Document ID>",
  "otp": "<string, currently hardcoded to '1234'>"
}
```

**Response (200 OK):**
```json
{
  "message": "Task resolved! +<points> points awarded.",
  "pointsEarned": "<number>",
  "totalPoints": "<number>",
  "monthlyPoints": "<number>"
}
```

## 7. Leaderboard
**Endpoint:** `GET /api/leaderboard`
Returns the top 10 volunteers based on monthly points.

**Response (200 OK):**
```json
{
  "leaderboard": [
    {
      "rank": "<number>",
      "name": "<string>",
      "monthlyPoints": "<number>",
      "totalPoints": "<number>"
    }
  ],
  "month": "<string, YYYY-MM>"
}
```
