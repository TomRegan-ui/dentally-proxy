"scripts": {
  "start": "node server.js"
}
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
