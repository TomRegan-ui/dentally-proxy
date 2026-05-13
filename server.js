require("dotenv").config();
const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());

const API_KEY = process.env.DENTALLY_API_KEY;
const BASE_URL = "https://api.dentally.co/v1";

// ------------------------------
// Patients (X-API-Key)
// ------------------------------
app.get("/patients", async (req, res) => {
  try {
    const response = await axios.get(`${BASE_URL}/patients`, {
      headers: {
        "X-API-Key": API_KEY,
        "Accept": "application/json",
        "User-Agent": "YeastarPBX"
      }
    });

    res.json(response.data);
  } catch (err) {
    console.error("Patients error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch patients" });
  }
});

// ------------------------------
// Users (Bearer Token)
// ------------------------------
app.get("/users", async (req, res) => {
  try {
    const response = await axios.get(`${BASE_URL}/users`, {
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Accept": "application/json",
        "User-Agent": "YeastarPBX"
      }
    });

    // Dentally returns { users: [...] }
    // Yeastar needs just [...]
    const users = response.data.users || [];

    res.json(users);
  } catch (err) {
    console.error("Users error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ------------------------------
// Start server
// ------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Dentally proxy running on port ${PORT}`);
});