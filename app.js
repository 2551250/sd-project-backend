const express = require('express');
const app = express();
const port = process.env.PORT || 3001;
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
// Request body is the id of the person sending the review, the id of the person recieving the review, the review itself and the project id
app.post("/Review", async (req, res) =>{
  const { review_of } = req.body;
  const { review_by } = req.body;
  const { description } = req.body;
  const { project_id } = req.body;
  ret = await query(
    `INSERT INTO dbo.REVIEW (REVIEW_BY, REVIEW_OF, DESCRIPTION, PROJECT_ID) VALUES (${review_by}, ${review_of}, '${description}', ${project_id})`
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

// Returns all the reviews written by the user
// The parameter is the employee id
app.get("/CreatedReviews/:id", async (req, res) =>{
  const { id } = req.params;
  ret = await query(
    `SELECT * FROM dbo.REVIEW WHERE REVIEW_BY = ${id}`
  );
  res.status(200).send(ret);
}
);

// Returns all the reviews written of a user
// The parameter is the employee id
app.get("/ReceivedReviews/:id", async (req, res) =>{
  const { id } = req.params;
  ret = await query(
    `SELECT * FROM dbo.REVIEW WHERE REVIEW_OF = ${id}`
  );
  res.status(200).send(ret);
})

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

// Returns conflicting times 
// Body consists of employee_id, project_id, data, start_time and end_time
app.post("/GetTime", async (req, res) =>{
  const { employee_id } = req.body;
  const { project_id } = req.body;
  const { date } = req.body;
  const { start_time } = req.body;
  const { end_time } = req.body;
  ret = await query(
    `SELECT * FROM dbo.TIMES WHERE (EMPLOYEE_ID = ${employee_id} AND PROJECT_ID = ${project_id} AND DATE = '${date}') AND ((START_TIME <= '${start_time}' AND END_TIME >= '${end_time}') OR (START_TIME < '${start_time}' AND '${start_time}' < END_TIME) OR (START_TIME < '${end_time}' AND '${end_time}' < END_TIME) OR ('${start_time}' < START_TIME AND '${end_time}' > END_TIME))`
  );
  res.status(200).send(ret)
});

app.post("/Time", async (req, res) => {
  const { employee_id } = req.body;
  const { project_id } = req.body;
  const { date } = req.body;
  const { start_time } = req.body;
  const { end_time } = req.body;
  ret = await query(
    `INSERT INTO dbo.TIMES (EMPLOYEE_ID, PROJECT_ID, DATE, START_TIME, END_TIME) VALUES (${employee_id}, ${project_id}, '${date}', '${start_time}', '${end_time}')`
  );
  if (ret === undefined) {
    res.status(201).send("Time successfully added to database");
  } else {
    res.status(400).send("Error, time not added to database");
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