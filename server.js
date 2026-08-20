import express from "express";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || "postgres://postgres:dev@db:5432/tasks",
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN DEFAULT FALSE
    );
  `);

  const { rows } = await pool.query("SELECT COUNT(*) AS count FROM tasks");
  if (parseInt(rows[0].count, 10) === 0) {
    await pool.query(
      `INSERT INTO tasks (title, done) VALUES ($1, $2), ($3, $4), ($5, $6)`,
      [
        "Buy groceries",
        false,
        "Complete Week 2 Assigments",
        false,
        "Learn SQL Fundamentals",
        true,
      ],
    );
    console.log("Seeded initial tasks into Postgres.");
  }
}

initDb().catch(console.error);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to our FlyRank.AI Backend" });
});

app.get("/status", (req, res) => {
  res.json({ status: "online", timestamp: new Date() });
});

app.get("/tasks", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, title, done FROM tasks ORDER BY id ASC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/tasks/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, title, done FROM tasks WHERE id = $1",
      [req.params.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    return res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/tasks", async (req, res) => {
  const { title } = req.body;

  if (!title || typeof title !== "string" || title.trim() === "") {
    return res
      .status(400)
      .json({ error: "Title is required and must be a string" });
  }

  try {
    const { rows } = await pool.query(
      "INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING id, title, done",
      [title.trim(), false],
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/tasks/:id", async (req, res) => {
  const taskId = req.params.id;
  const { title, done } = req.body;

  try {
    const { rows: existing } = await pool.query(
      "SELECT * FROM tasks WHERE id = $1",
      [taskId],
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const existingTask = existing[0];
    const newTitle = title !== undefined ? title : existingTask.title;
    const newDone = done !== undefined ? done : existingTask.done;

    const { rows } = await pool.query(
      "UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING id, title, done",
      [newTitle, newDone, taskId],
    );

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/tasks/:id", async (req, res) => {
  const taskId = req.params.id;
  try {
    const result = await pool.query("DELETE FROM tasks WHERE id = $1", [
      taskId,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
