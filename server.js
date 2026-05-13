require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const DENTALLY_API_URL = "https://api.dentally.co/v1/users";
const DENTALLY_API_KEY = process.env.DENTALLY_API_KEY;

// USERS ENDPOINT
app.get("/users", async (req, res) => {
  try {
    const response = await axios.get(DENTALLY_API_URL, {
      headers: {
        Authorization: `Bearer ${DENTALLY_API_KEY}`,
      },
    });

    let users = response.data;

    // ⭐ HARD-CODED FALLBACK MOBILE NUMBER ⭐
    users = users.map(u => ({
      ...u,
      mobile_phone: u.mobile_phone || "00000000000"
    }));

    res.json(users); // flat array for Yeastar Cloud
  } catch (error) {
    console.error("Users error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ROOT
app.get("/", (req, res) => {
  res.send("Dentally Proxy is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));