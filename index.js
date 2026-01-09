// index.js
const express = require("express");

const app = express();
const PORT = 5000;

// middleware
app.use(express.json());

// test route
app.get("/", (req, res) => {
    res.json({ message: "PAWS backend is running 🐾" });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
