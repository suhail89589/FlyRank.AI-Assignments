import express from "express";
import Database from "better-sqlite3";

const app = express();
const PORT = 8000;

app.use(express.json());

const db = new Database("tasks.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0
  )
`);

const taskCount = db.prepare("SELECT COUNT(*) AS count FROM tasks").get().count;
if (taskCount === 0) {
  const insertStmt = db.prepare("INSERT INTO tasks (title, done) VALUES (?,?)");
  insertStmt.run("Buy groceries", 0);
  insertStmt.run("Complete Week 2 Assigments", 0);
  insertStmt.run("Learn SQL Fundamentals", 1);
}

app.get("/", (req, res) => {
  res.json({ message: "Welcome to our FlyRank.AI Backend" });
});

app.get("/status", (req, res) => {
  res.json({ status: "online", timestamp: new Date() });
});

app.get("/tasks", (Req, res) => {
  const tasks = db.prepare("SELECT id, title, done FROM tasks").all();

  const formattedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    done: Boolean(t.done),
  }));

  res.json(formattedTasks);
});

app.get("/tasks/:id", (req, res) => {
  const task = db
    .prepare("SELECT id, title, done FROM tasks WHERE id = ?")
    .get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }
  return res.json({
    id: task.id,
    title: task.title,
    done: Boolean(task.done),
  });
});

app.post("/tasks", (req, res) => {
  const { title } = req.body;

  if (!title || typeof title !== "string" || title.trim() === "") {
    return res
      .status(400)
      .json({ error: "Title is required and must be a string" });
  }

  const insertStmt = db.prepare(
    "INSERT INTO tasks (title, done) VALUES (?, ?)",
  );
  const result = insertStmt.run(title.trim(), 0);

  res.status(201).json({
    id: Number(result.lastInsertRowid),
    title: title.trim(),
    done: false,
  });
});

app.put("/tasks/:id", (req, res) => {
  const taskId = req.params.id;
  const { title, done } = req.body;

  const existingTask = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(taskId);
  if (!existingTask) {
    return res.status(404).json({ error: "Task not found" });
  }

  const newTitle = title !== undefined ? title : existingTask.title;
  const newDone = done !== undefined ? (done ? 1 : 0) : existingTask.done;

  db.prepare("UPDATE tasks SET title = ?, done = ? WHERE id = ?").run(
    newTitle,
    newDone,
    taskId,
  );

  res.json({
    id: Number(taskId),
    title: newTitle,
    done: Boolean(newDone),
  });
});

app.delete("/tasks/:id", (req, res) => {
  const taskId = req.params.id;
  const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Task not found" });
  }

  res.status(200).json({ message: "Task deleted successfully" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
