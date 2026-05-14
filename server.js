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
app.get("/crm/contact", async (req, res) => {
  try {
    const phone = req.query.phone;
    if (!phone) return res.json({});

    // Search Dentally patients by phone
    const patients = await dentallyGet(DENTALLY_PATIENTS_URL, {
      phone: phone
    });

    if (!Array.isArray(patients) || patients.length === 0) {
      return res.json({});
    }

    const p = patients[0];

    res.json({
      name: `${p.first_name} ${p.last_name}`,
      phone: p.phone || "",
      email: p.email || "",
      url: `https://app.dentally.co/patients/${p.id}`
    });

  } catch (err) {
    console.error("CRM contact error:", err.response?.data || err.message);
    res.json({});
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
    const users = await dentallyGet(DENTALLY_USERS_URL);

    const formatted = users
      .filter(u => u.email) // Yeastar requires email
      .map(u => ({
        id: String(u.id), // MUST be string
        name: `${u.first_name} ${u.last_name}`.trim(),
        email: u.email,
        phone: u.mobile_phone || "" // MUST be phone, not mobile
      }));

    res.json({ users: formatted });

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
