const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const sql = require('mssql');

app.use(express.json());

// Default API endpoint
app.get('/', async (req, res) => {
  res.status(200).send('API reached');
});

// Returns all employees in the database
app.get('/Employee', async (req, res) => {
  ret = await query(`SELECT * FROM dbo.EMPLOYEE;`);
  res.status(200).send(ret);
});

// Returns all projects in the database
app.get('/Project', async (req, res) => {
  ret = await query(`SELECT * FROM dbo.PROJECT;`);
  res.status(200).send(ret);
});

// Returns all entries in the employee project database
app.get('/EmployeeProject', async (req, res) => {
  ret = await query(`SELECT * FROM dbo.EMPLOYEE_PROJECT`);
  res.status(200).send(ret);
});

// Returns the description of all projects to which the staff member is assigned
// The parameter is the employee id
app.get('/EmployeeProject/Employee/:id', async (req, res) => {
  const id = req.params.id;
  ret = await query(
    `SELECT DISTINCT PROJECT_NAME, DESCRIPTION, ESTIMATED_TIME, EMP_PROJ_ID FROM dbo.PROJECT INNER JOIN dbo.EMPLOYEE_PROJECT ON (dbo.PROJECT.PROJECT_ID = dbo.EMPLOYEE_PROJECT.PROJECT_ID) INNER JOIN dbo.EMPLOYEE ON (dbo.EMPLOYEE.EMPLOYEE_ID = dbo.EMPLOYEE_PROJECT.EMPLOYEE_ID) WHERE dbo.EMPLOYEE.EMPLOYEE_ID = ${id};`
  );
  res.status(200).send(ret);
});

// Returns all staff working on a project
// The parameter is the project id 
app.get('/EmployeeProject/Project/:id', async (req, res) => {
  const id = req.params.id;
  ret = await query(
    `SELECT DISTINCT EMPLOYEE.EMPLOYEE_ID, NAME, SURNAME, EMAIL FROM dbo.PROJECT INNER JOIN dbo.EMPLOYEE_PROJECT ON (dbo.PROJECT.PROJECT_ID = dbo.EMPLOYEE_PROJECT.PROJECT_ID) INNER JOIN dbo.EMPLOYEE ON (dbo.EMPLOYEE.EMPLOYEE_ID = dbo.EMPLOYEE_PROJECT.EMPLOYEE_ID) WHERE dbo.PROJECT.PROJECT_ID = ${id};`
  );
  res.status(200).send(ret);
});

// Returns the projects created by a manager 
// The parameter is the manager id 
app.get('/Project/:id', async (req, res) => {
  const id = req.params.id;
  ret = await query(
    `SELECT * FROM dbo.PROJECT WHERE MANAGER_ID = ${id}`
  );
  res.status(200).send(ret);
});

// Adds a new project to the project database
// The body consists of project_name, description, manager_id, estimated_time
app.post("/Project", async (req, res) => {
  const { project_name } = req.body;
  const { description } = req.body;
  const { manager_id } = req.body;
  const { estimated_time } = req.body;
  ret = await query(
    `INSERT INTO dbo.PROJECT (PROJECT_NAME, DESCRIPTION, MANAGER_ID, ESTIMATED_TIME) VALUES ('${project_name}', '${description}', '${manager_id}', ${estimated_time})`
  );
  if (ret === undefined) {
    res.status(201).send("Project succesfully creeated");
  } else {
    res.status(400).send("Error, project not created");
  }
});

// Inserts a new review into the review table 
// Request body is the emp_proj_id, the id of the person sending the review and the review itself
app.post("/Review", async (req, res) =>{
  const { emp_proj_id } = req.body;
  const { review_by } = req.body;
  const { description } = req.body;
  ret = await query(
    `INSERT INTO dbo.REVIEW (EMP_PROJ_ID, REVIEW_BY, DESCRIPTION) VALUES (${emp_proj_id}, ${review_by}, '${description}')`
  );
  if (ret === undefined) {
    res.status(201).send("Review successfully created");
  } else {
    res.status(400).send("Error, review not created");
  }
});

// Assigns a staff member to a project 
// The request body is the staff_id and the project_id
app.post("/EmployeeProject", async (req, res) => {
  const { project_id } = req.body;
  const { staff_id } = req.body;
  ret = await query(
    `INSERT INTO dbo.EMPLOYEE_PROJECT (PROJECT_ID, EMPLOYEE_ID, TIME_SPENT) VALUES (${project_id}, ${staff_id}, 0)`
  );
  if (ret === undefined) {
    res.status(201).send("Employee assigned to project");
  } else {
    res.status(400).send("Error, staff not assigned to project");
  }
});

// Returns all the reviews written the user
// The parameter is the employee id
app.get("/Review/:id", async (req, res) =>{
  const { id } = req.params;
  ret = await query(
    `SELECT REVIEW_ID, DESCRIPTION FROM dbo.REVIEW INNER JOIN dbo.EMPLOYEE_PROJECT ON REVIEW.EMP_PROJ_ID = EMPLOYEE_PROJECT.EMP_PROJ_ID WHERE EMPLOYEE_ID = ${id}`
  );
  res.status(200).send(ret);
}
);

// Updates the time spent on a project 
// Body consists of project_id, employee_id and time_spent
app.put("/EmployeeProject", async (req, res) => {
  const { project_id } = req.body;
  const { staff_id } = req.body;
  const { time_spent } = req.body;
  ret = await query(
    `UPDATE dbo.EMPLOYEE_PROJECT SET TIME_SPENT = TIME_SPENT + ${time_spent} WHERE EMPLOYEE_ID = '${staff_id}' AND PROJECT_ID = '${project_id}'`
  );
  if (ret === undefined) {
    res.status(201).send("Time spent on project successfully updated");
  } else {
    res.status(400).send("Error updating time spent");
  }
});

const config = {
  user: 'workwise-backend-server-admin',
  password: 'projectpassword1@3',
  server: 'workwise-backend-server.database.windows.net',
  port: 1433,
  database: 'workwise-backend-database',
  authentication: {
    type: 'default'
  },
  options: {
    encrypt: true
  }
}

async function query(query) {
  try {
    var poolConnection = await sql.connect(config);
    var resultSet = await poolConnection.request().query(query);
    poolConnection.close();
    return resultSet.recordset;
  } catch (err) {
    return err.message;
  }
}

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});