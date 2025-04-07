const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();

app.use(cors()).use(express.json());
const PORT = 3000;

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const response = await axios.post("http://localhost:5000/rag", { message });
    res.json({ content: response.data.answer });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Python backend error" });
  }
});

app.listen(PORT, () => console.log(`🧠 Node server running: http://localhost:${PORT}`));
