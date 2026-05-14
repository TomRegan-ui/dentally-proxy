require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const DENTALLY_API_KEY = process.env.DENTALLY_API_KEY;
const DENTALLY_API_URL = "https://api.dentally.co/v1/users";

app.get("/", (req, res) => {
  res.send("Dentally Proxy is running");
});

app.get("/users", async (req, res) => {
  try {
    const response = await axios.get(DENTALLY_API_URL, {
      headers: {
        Authorization: `Token ${DENTALLY_API_KEY}`,
      },
    });

    console.log("Dentally response:", response.data);

    let users = response.data;

    if (!Array.isArray(users)) {
      console.log("Users is not an array. Full response:", response.data);
      return res.status(500).json({ error: "Dentally did not return a user list" });
    }

    users = users.map(u => ({
      ...u,
      mobile_phone: u.mobile_phone || "00000000000"
    }));

    res.json(users);
  } catch (error) {
    console.error("Users error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
