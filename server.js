require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DENTALLY_API_KEY = process.env.DENTALLY_API_KEY;

// Dentally endpoints
const DENTALLY_PATIENTS_URL = "https://api.dentally.co/v1/patients";
const DENTALLY_USERS_URL = "https://api.dentally.co/v1/users";

// Shared Dentally request helper
async function dentallyGet(url, params = {}) {
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${DENTALLY_API_KEY}`,
      Accept: "application/json",
      "User-Agent": "Dentally-Yeastar-CRM/1.0"
    },
    params
  });
  return response.data;
}

// -------------------------------
// 1. CRM AUTH ENDPOINT
// -------------------------------
app.post("/crm/auth", (req, res) => {
  // Yeastar only needs a success response
  res.json({ success: true });
});

// -------------------------------
// 2. CRM CONTACT LOOKUP (PATIENTS ONLY)
// -------------------------------
app.get("/patients", async (req, res) => {
  try {
    const phone = req.query.phone;

    // If Yeastar is doing a lookup by phone
    if (phone) {
      const patients = await dentallyGet(DENTALLY_PATIENTS_URL, { phone });
      const patients = response?.patients || [];
      return res.json(patients);
    }

    // If Yeastar is doing a full sync
    const response = await dentallyGet(DENTALLY_PATIENTS_URL);
    const allPatients = response?.patients || [];
    return res.json(allPatients);
  } catch (err) {
    console.error("Error in /patients:", err);
    return res.json([]);
  }
});

// -------------------------------
// 3. CRM CALL LOGGING
// -------------------------------
app.post("/crm/calllog", async (req, res) => {
  try {
    const log = req.body;

    // You can push call logs into Dentally here if needed.
    // Dentally supports notes, but not a dedicated call log endpoint.
    // Example: create a note on the patient record.

    res.json({ success: true });

  } catch (err) {
    console.error("CRM calllog error:", err.response?.data || err.message);
    res.json({ success: false });
  }
});

// -------------------------------
// 4. CRM USERS (for Yeastar UI)
// -------------------------------
app.get("/crm/users", async (req, res) => {
  try {
    const raw = await dentallyGet(DENTALLY_USERS_URL);

    let users =
      raw?.data ||
      raw?.users ||
      raw?.results ||
      (Array.isArray(raw) ? raw : []);

    // Normalize and clean users
    const cleaned = users
      .filter(u => u.email) // must have email
      .map(u => ({
        id: String(u.id),
        name: `${u.first_name} ${u.last_name}`.replace(/\s+/g, " ").trim(),
        email: u.email.trim(),
        phone: u.mobile_phone ? u.mobile_phone.trim() : ""
      }));

    // Remove duplicate names (Yeastar requirement)
    const unique = [];
    const seenNames = new Set();

    for (const u of cleaned) {
      if (!seenNames.has(u.name)) {
        seenNames.add(u.name);
        unique.push(u);
      }
    }

    res.json({ users: unique });

  } catch (err) {
    console.error("CRM users error:", err.response?.data || err.message);
    res.json({ users: [] });
  }
});

// -------------------------------
// 5. BASIC TEST ENDPOINT
// -------------------------------
app.get("/", (req, res) => {
  res.send("Dentally CRM Connector is running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
