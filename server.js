const express = require("express");
const app = express();
const pg = require("pg");
const client = new pg.Client(
  process.env.DATABASE_URL || "postgres://localhost/acme_hr_directory"
);

app.use(express.json());
app.use(require("morgan")("dev"));

app.get("/api/employees", async (req, res, next) => {
  try {
    const SQL = `
      SELECT * from employees 
    `;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/departments", async (req, res, next) => {
  try {
    const SQL = `
      SELECT * from departments 
    `;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (ex) {
    next(ex);
  }
});

app.put("/api/employees/:id", async (req, res, next) => {
  try {
    const SQL = `
      UPDATE employees
      SET name=$1, department_id=$2, updated_at=now()
      WHERE id=$3 RETURNING *
    `;
    const response = await client.query(SQL, [
      req.body.name,
      req.body.department_id,
      req.params.id,
    ]);
    res.send(response.rows[0]);
  } catch (ex) {
    next(ex);
  }
});

app.delete("/api/employees/:id", async (req, res, next) => {
  try {
    const SQL = `
      DELETE from employees
      WHERE id = $1
    `;
    const response = await client.query(SQL, [req.params.id]);
    res.sendStatus(204);
  } catch (ex) {
    next(ex);
  }
});

app.post("/api/employees", async (req, res, next) => {
  try {
    const SQL = `
      INSERT INTO employees(name, department_id)
      VALUES($1, $2)
      RETURNING *
    `;
    const response = await client.query(SQL, [
      req.body.name,
      req.body.department_id,
    ]);
    res.send(response.rows[0]);
  } catch (ex) {
    next(ex);
  }
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).send({ error: err });
});

const init = async () => {
  await client.connect();
  console.log("connected to database");
  let SQL = /*sql*/`
    DROP TABLE IF EXISTS employees;
    DROP TABLE IF EXISTS departments;

    CREATE TABLE departments(
      id SERIAL PRIMARY KEY,
      name VARCHAR(100)
    );

    CREATE TABLE employees(
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now(),
      name VARCHAR(255) NOT NULL,
      department_id INTEGER REFERENCES departments(id) NOT NULL
    );
  `;
  await client.query(SQL);
  console.log("tables created");
   SQL = /*sql*/`
    INSERT INTO departments(name) VALUES('HR');
    INSERT INTO departments(name) VALUES('Finance');
    INSERT INTO departments(name) VALUES('Engineering');
    INSERT INTO departments(name) VALUES('Operations');
    INSERT INTO employees(name, department_id) VALUES('moe', (SELECT id FROM departments WHERE name='HR'));
    INSERT INTO employees(name, department_id) VALUES('lucy', (SELECT id FROM departments WHERE name='Engineering'));
    INSERT INTO employees(name, department_id) VALUES('ethyl', (SELECT id FROM departments WHERE name='Operations'));
    INSERT INTO employees(name, department_id) VALUES('larry', (SELECT id FROM departments WHERE name='HR'));
    INSERT INTO employees(name, department_id) VALUES('curl', (SELECT id FROM departments WHERE name='HR'));
  `;
  await client.query(SQL);
  console.log("data seeded");
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`listening on port ${port}`));
};

init();