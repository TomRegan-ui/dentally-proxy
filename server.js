console.log("SERVER VERSION: CRM ROUTES ENABLED");
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

    const response = await dentallyGet(DENTALLY_PATIENTS_URL);
    const patients = response?.patients || [];

    const contacts = patients.map(p => {
      const phoneNumber =
        p.mobile_phone_normalized ||
        p.home_phone_normalized ||
        p.work_phone_normalized ||
        "";

      return {
        id: String(p.id),
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim(),
        phone: phoneNumber,
        phone_number: phoneNumber,
        email: p.email_address || ""
      };
    }).filter(c => c.phone);

    if (phone) {
      const cleanSearch = phone.replace(/\D/g, "").slice(-9);

      const match = contacts.find(c =>
        c.phone.replace(/\D/g, "").endsWith(cleanSearch)
      );

      return res.json({ data: match ? [match] : [] });
    }

    res.json({ data: contacts });

  } catch (err) {
    console.error("Error in /patients:", err.response?.data || err.message);
    res.json([]);
  }
});

// ✅ Yeastar endpoints (MUST be top-level)

app.get("/crm/contact", (req, res) => {
  req.url = "/patients?" + new URLSearchParams(req.query).toString();
  app._router.handle(req, res);
});

app.get("/crm/patients", (req, res) => {
  req.url = "/patients?" + new URLSearchParams(req.query).toString();
  app._router.handle(req, res);


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
