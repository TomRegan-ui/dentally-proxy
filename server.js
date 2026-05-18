
console.log("✅ SERVER VERSION: FINAL YEASTAR SYNC FIX");

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

// -------------------------------
// Dentally API helper
// -------------------------------
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
// Pagination (IMPORTANT for sync)
// -------------------------------
async function getAllPatients() {
  let all = [];
  let page = 1;

  while (true) {
    const res = await dentallyGet(DENTALLY_PATIENTS_URL, { page });
    const patients = res?.patients || [];

    all = all.concat(patients);

    if (!res.meta?.pagination?.next_page) break;
    page++;
  }

  return all;
}

// -------------------------------
// 1. CRM AUTH
// -------------------------------
app.post("/crm/auth", (req, res) => {
  res.json({ success: true });
});

// -------------------------------
// 2. CORE CONTACT LOGIC
// -------------------------------
async function getContacts(phone) {
  console.log("📞 Incoming lookup:", phone || "FULL SYNC");

  const patients = await getAllPatients();

  const contacts = patients.map(p => {
    const phoneNumber =
      p.mobile_phone_normalized ||
      p.home_phone_normalized ||
      p.work_phone_normalized ||
      "";

    return {
      id: String(p.id),
      name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown",
      phone: phoneNumber,
      phone_number: phoneNumber,
      email: p.email_address || "",
      company: "" // Required for Yeastar compatibility
    };
  }).filter(c => c.phone);

  // Lookup mode
  if (phone) {
    const cleanSearch = phone.replace(/\D/g, "").slice(-9);

    const match = contacts.find(c =>
      c.phone.replace(/\D/g, "").endsWith(cleanSearch)
    );

    return {
      count: match ? 1 : 0,
      data: match ? [match] : []
    };
  }

  // Full sync
  return {
    count: contacts.length,
    data: contacts
  };
}

// -------------------------------
// 3. YEASTAR ENDPOINTS
// -------------------------------

// ✅ Main lookup endpoint
app.get("/crm/contact", async (req, res) => {
  try {
    const result = await getContacts(req.query.phone);
    res.json(result);
  } catch (err) {
    console.error("CRM контакт error:", err.message);
    res.json({ count: 0, data: [] });
  }
});

// ✅ Full sync endpoint
app.get("/crm/patients", async (req, res) => {
  try {
    const result = await getContacts();
    res.json(result);
  } catch (err) {
    console.error("CRM patients error:", err.message);
    res.json({ count: 0, data: [] });
  }
});

// -------------------------------
// 4. USERS
// -------------------------------
app.get("/crm/users", async (req, res) => {
  try {
    const raw = await dentallyGet(DENTALLY_USERS_URL);

    let users =
      raw?.data ||
      raw?.users ||
      raw?.results ||
      (Array.isArray(raw) ? raw : []);

    const cleaned = users
      .filter(u => u.email)
      .map(u => ({
        id: String(u.id),
        name: `${u.first_name} ${u.last_name}`.trim(),
        email: u.email.trim(),
        phone: u.mobile_phone_normalized
          ? u.mobile_phone_normalized.trim()
          : ""
      }));

    res.json({ users: cleaned });

  } catch (err) {
    console.error("CRM users error:", err.message);
    res.json({ users: [] });
  }
});

// -------------------------------
// 5. CALL LOG
// -------------------------------
app.post("/crm/calllog", async (req, res) => {
  try {
    res.json({ success: true });
  } catch (err) {
    console.error("CRM calllog error:", err.message);
    res.json({ success: false });
  }
});

// -------------------------------
// TEST
// -------------------------------
app.get("/", (req, res) => {
  res.send("✅ Dentally CRM Connector Running");
});

// -------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

