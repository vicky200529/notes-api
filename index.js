const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json());

let notes = [];

let creationTimestamps = [];

function rateLimit(req, res, next) {
  const now = Date.now();
  creationTimestamps = creationTimestamps.filter(
    t => now - t < 60 * 1000
  );

  if (creationTimestamps.length >= 5) {
    return res.status(429).json({
      error: "Rate limit exceeded: Max 5 notes per minute"
    });
  }

  creationTimestamps.push(now);
  next();
}

function cleanString(str) {
  if (typeof str !== "string") return "";
  return str.trim();
}

function isEmpty(str) {
  return !str || str.trim() === "";
}

app.post("/notes", rateLimit, (req, res) => {
  let { title, content } = req.body;

  title = cleanString(title);
  content = cleanString(content);

  if (isEmpty(title) || isEmpty(content)) {
    return res.status(400).json({
      error: "Title and content are required and cannot be empty"
    });
  }

  const now = new Date();
  const note = {
    id: uuidv4(),
    title,
    content,
    created_at: now,
    updated_at: now
  };

  notes.push(note);
  res.status(201).json(note);
});

app.get("/notes", (req, res) => {
  const sorted = [...notes].sort(
    (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
  );
  res.json(sorted);
});


app.put("/notes/:id", (req, res) => {
  const note = notes.find(n => n.id === req.params.id);

  if (!note) {
    return res.status(404).json({ error: "Note not found" });
  }

  let { title, content } = req.body;
  let updated = false;

  if (title !== undefined) {
    title = cleanString(title);
    if (isEmpty(title)) {
      return res.status(400).json({ error: "Title cannot be empty" });
    }
    if (title !== note.title) {
      note.title = title;
      updated = true;
    }
  }

  if (content !== undefined) {
    content = cleanString(content);
    if (isEmpty(content)) {
      return res.status(400).json({ error: "Content cannot be empty" });
    }
    if (content !== note.content) {
      note.content = content;
      updated = true;
    }
  }

  if (!updated) {
    return res.status(200).json({
      message: "No changes detected",
      note
    });
  }

  note.updated_at = new Date();
  res.json(note);
});


app.get("/notes/search", (req, res) => {
  let q = req.query.q;

  if (!q || q.trim() === "") {
    return res.status(400).json({
      error: "Search query cannot be empty"
    });
  }

  q = q.trim().toLowerCase();

  const results = notes.filter(note =>
    note.title.toLowerCase().includes(q) ||
    note.content.toLowerCase().includes(q)
  );

  res.json(results);
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
