const express = require('express');
const app = express();
const port = process.env.PORT || 3001;
const sql = require('mssql');
const crypto = require('crypto');
const cors = require('cors');
const corsOptions = {
  origin: '*'
}
app.use(cors(corsOptions));
app.use(express.json());

// Default API endpoint
app.get('/', async (req, res) => {
  res.status(200).send('API reached');
});

// Returns all employees in the database
app.get('/Employee', async (req, res) => {
  ret = await query(`SELECT EMPLOYEE_ID, EMAIL, NAME, SURNAME, ROLE FROM dbo.EMPLOYEE;`);
  res.status(200).send(ret);
});

app.put('/VerifyLogin', async (req, res) => {
  const { email } = req.body;
  const { password } = req.body;
  let salt = "";
  const temp = await query(`SELECT SALT FROM dbo.EMPLOYEE WHERE EMAIL = '${email}'`);
  if( temp.length !== 0){
    salt = temp[0].SALT;
  }
  if(salt == null){
    salt = "";
  }
  const hashed_password = crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`);
  ret = await query(`SELECT EMPLOYEE_ID, EMAIL, NAME, SURNAME, ROLE FROM dbo.EMPLOYEE
  WHERE EMAIL = '${email}' and PASSWORD = '${hashed_password}';`);
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
    `SELECT DISTINCT PROJECT_NAME, DESCRIPTION, TIME_SPENT, ESTIMATED_TIME, MANAGER_ID, PROJECT.PROJECT_ID, EMP_PROJ_ID FROM dbo.PROJECT INNER JOIN dbo.EMPLOYEE_PROJECT ON (dbo.PROJECT.PROJECT_ID = dbo.EMPLOYEE_PROJECT.PROJECT_ID) INNER JOIN dbo.EMPLOYEE ON (dbo.EMPLOYEE.EMPLOYEE_ID = dbo.EMPLOYEE_PROJECT.EMPLOYEE_ID) WHERE dbo.EMPLOYEE.EMPLOYEE_ID = ${id};`
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
    res.status(201).send("Project successfully created");
  } else {
    res.status(400).send("Error: project not created");
  }
});

// Inserts a new review into the review table 
// Request body is the id of the person sending the review, the id of the person receiving the review, the review itself and the project id
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
    res.status(400).send("Error: review not created");
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
    res.status(400).send("Error: staff not assigned to project");
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

// Returns all the reviews written about a user
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
    res.status(400).send(ret);
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
    `SELECT * FROM dbo.TIMES WHERE (EMPLOYEE_ID = ${employee_id} AND DATE = '${date}') AND ((START_TIME <= '${start_time}' AND END_TIME >= '${end_time}') OR (START_TIME < '${start_time}' AND '${start_time}' < END_TIME) OR (START_TIME < '${end_time}' AND '${end_time}' < END_TIME) OR ('${start_time}' < START_TIME AND '${end_time}' > END_TIME))`
  );
  res.status(200).send(ret)
});

// Adds time worked on the project into the database
// Body is the employee_id, the project_id, the current data, the start time and the end time
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
    res.status(400).send("Error: time not added to database");
  }
});

// Inserts a new message into the message table 
// Request body is the id of the person sending the messsage, the id of the person receiving the message, the message itself and the project id
app.post("/Message", async (req, res) =>{
  const { message_sent_by } = req.body;
  const { message_text } = req.body;
  const { project_id } = req.body;
  const { time } = req.body;
  const { date } = req.body;

  ret = await query(
    `INSERT INTO dbo.MESSAGES (MESSAGE_SENT_BY, MESSAGE_TEXT, PROJECT_ID, TIME, DATE) VALUES (${message_sent_by}, '${message_text}', ${project_id}, '${time}', '${date}')`
  );
  if (ret === undefined) {
    res.status(201).send("Message successfully created");
  } else {
    res.status(400).send("Error: message not created");
  }
});

// Fetchs the messages sent by an employee 
// The parameter is the employee id
app.get("/SentMessages/:id", async (req, res) =>{
  const { id } = req.params;
  ret = await query(
    `SELECT * FROM dbo.MESSAGES WHERE MESSAGE_SENT_BY = ${id}`
  );
  res.status(200).send(ret);
})

app.get("/ProjectMessages/:id", async (req, res) =>{
  const { id } = req.params;
  ret = await query(
    `SELECT * FROM dbo.MESSAGES WHERE PROJECT_ID = ${id}`
  );
  res.status(200).send(ret);
});


// Removes a manager from the database
// The projects the manager manages are updated so that there manager is NULL (but still exist)
// The messages sent to and sent by the manager are deleted permanently
// The manager is deleted from the employee table permanently
// The parameter is the manager id
app.delete("/RemoveManager/:id", async (req, res) =>{
  const { id } = req.params;
  ret = await query(
    `UPDATE dbo.PROJECT SET MANAGER_ID = NULL WHERE MANAGER_ID = ${id};
    DELETE FROM dbo.MESSAGES WHERE MESSAGE_SENT_BY = ${id};
    DELETE FROM dbo.BOOKINGS WHERE EMPLOYEE_ID = ${id};
    DELETE FROM EMPLOYEE WHERE EMPLOYEE_ID = ${id};`
  );
  if (ret === undefined) {
    res.status(200).send("Manager successfully removed");
  } else {
    res.status(400).send("Error: manager not removed");
  }
});

// Removes a staff member from the database 
// The staff is unassigned from all projects
// The reviews written by and written about the staff member are deleted permanently
// The messages sent by and sent to the staff member are deleted permanently
// The times entered by a staff are deleted permanently
// The staff member is deleted from the employee table permanently
// The parameter is the staff id
app.delete("/RemoveStaff/:id", async(req, res) =>{
  const { id } = req.params;
  ret = await query(
    `DELETE FROM dbo.EMPLOYEE_PROJECT WHERE EMPLOYEE_ID = ${id};
    DELETE FROM dbo.REVIEW WHERE REVIEW_OF = ${id} OR REVIEW_BY = ${id};
    DELETE FROM dbo.MESSAGES WHERE MESSAGE_SENT_BY = ${id};
    DELETE FROM dbo.TIMES WHERE EMPLOYEE_ID = ${id};
    DELETE FROM dbo.BOOKINGS WHERE EMPLOYEE_ID = ${id};
    DELETE FROM EMPLOYEE WHERE EMPLOYEE_ID = ${id};`
  );
  if (ret === undefined) {
    res.status(200).send("Employee successfully removed");
  } else {
    res.status(400).send("Error: employee not removed");
  }
});

// Fetches all meals for an entered day from the database
// Parameter is the date that the meal is for
app.get("/Meal/:date", async (req, res) =>{
  const { date } = req.params;
  
  ret = await query(
    `SELECT * FROM dbo.MEALS WHERE DATE = '${date}'`
  );
  res.status(200).send(ret);
});

// Adds a meal to the database
// Body consits of meal name, meal description and the date
app.post("/Meal", async (req, res) =>{
  const { meal_name } = req.body;
  const { meal_description } = req.body;
  const { date } = req.body;
  ret = await query(
    `INSERT INTO dbo.MEALS (MEAL_NAME,  MEAL_DESCRIPTION, DATE) VALUES ('${meal_name}', '${meal_description}', '${date}')`
  );
  if (ret === undefined) {
    res.status(201).send("Meal option successfully created");
  } else {
    res.status(400).send("Error: meal option not created");
  }
});

// Returns all meal bookings made by that employee
// Parameter is the employee id
app.get("/BookingByEmployee/:id", async (req, res) =>{
  const { id } = req.params;

  ret = await query(
    `SELECT dbo.BOOKINGS.EMPLOYEE_ID, dbo.MEALS.MEAL_ID, MEAL_NAME, MEAL_DESCRIPTION, DATE FROM dbo.BOOKINGS INNER JOIN dbo.MEALS ON dbo.MEALS.MEAL_ID = dbo.BOOKINGS.MEAL_ID WHERE EMPLOYEE_ID = '${id}'`
  );
  res.status(200).send(ret);
});

// Returns all booking of that meal
// Parameter is the meal id
app.get("/BookingByMeal/:id", async (req, res) =>{
  const { id } = req.params;

  ret = await query(
    `SELECT dbo.EMPLOYEE.EMPLOYEE_ID, NAME, SURNAME FROM dbo.BOOKINGS INNER JOIN dbo.EMPLOYEE ON dbo.EMPLOYEE.EMPLOYEE_ID = dbo.BOOKINGS.EMPLOYEE_ID WHERE MEAL_ID = '${id}'`
  );
  res.status(200).send(ret);
});

// Creates a new booking for a meal
// Request body is employee id and meal id
app.post("/Booking", async (req, res) =>{
  const { employee_id } = req.body;
  const { meal_id } = req.body;
  ret = await query(
    `INSERT INTO dbo.BOOKINGS(EMPLOYEE_ID,  MEAL_ID) VALUES (${employee_id}, ${meal_id})`
  );
  if (ret === undefined) {
    res.status(201).send("Booking successfully created");
  } else {
    res.status(400).send("Error: booking not created");
  }
});

// Parameter is the project id
// Returns the time spent each day by each employee for the indicated project per day
// The time spent on each day is returned
app.get("/TimeSpentByProjectByDate/:project_id", async (req, res) =>{
  const { project_id } = req.params;
  ret = await query(
    `SELECT EMPLOYEE.EMPLOYEE_ID, NAME, SURNAME, EMPLOYEE_PROJECT.PROJECT_ID, FORMAT (DATE, 'yyyy-MM-dd') AS DATE, ISNULL(SUM(DATEDIFF(MINUTE, START_TIME, END_TIME)) * 1.0 / 60, 0) AS TIME
    FROM dbo.EMPLOYEE_PROJECT INNER JOIN dbo.EMPLOYEE ON dbo.EMPLOYEE_PROJECT.EMPLOYEE_ID = dbo.EMPLOYEE.EMPLOYEE_ID LEFT JOIN dbo.TIMES ON EMPLOYEE_PROJECT.EMPLOYEE_ID = TIMES.EMPLOYEE_ID AND EMPLOYEE_PROJECT.PROJECT_ID = TIMES.PROJECT_ID
    WHERE EMPLOYEE_PROJECT.PROJECT_ID = ${project_id}
    GROUP BY EMPLOYEE.EMPLOYEE_ID, NAME, SURNAME, EMPLOYEE_PROJECT.PROJECT_ID, DATE`
  );
  res.status(200).send(ret);
});

// Parameter is the project id 
// Returns the time spent by each employee over all days
app.get("/TimeSpentByProjectCumulative/:project_id", async (req, res) =>{
  const { project_id } = req.params;
  ret = await query(
    `SELECT EMPLOYEE.EMPLOYEE_ID, NAME, SURNAME, EMPLOYEE_PROJECT.PROJECT_ID, ISNULL(SUM(DATEDIFF(MINUTE, START_TIME, END_TIME)) * 1.0 / 60, 0) AS TIME
    FROM dbo.EMPLOYEE_PROJECT INNER JOIN dbo.EMPLOYEE ON dbo.EMPLOYEE_PROJECT.EMPLOYEE_ID = dbo.EMPLOYEE.EMPLOYEE_ID LEFT JOIN dbo.TIMES ON EMPLOYEE_PROJECT.EMPLOYEE_ID = TIMES.EMPLOYEE_ID AND EMPLOYEE_PROJECT.PROJECT_ID = TIMES.PROJECT_ID
    WHERE EMPLOYEE_PROJECT.PROJECT_ID = ${project_id}
    GROUP BY EMPLOYEE.EMPLOYEE_ID, NAME, SURNAME, EMPLOYEE_PROJECT.PROJECT_ID`
  );
  res.status(200).send(ret);
});

app.get("/TimeSpentTotal/:project_id", async (req, res) =>{
  const { project_id } = req.params;
  ret = await query(
    `SELECT DBO.PROJECT.PROJECT_ID, ESTIMATED_TIME, ISNULL(SUM(TIME_SPENT), 0) AS TIME_SPENT
    FROM dbo.PROJECT LEFT JOIN EMPLOYEE_PROJECT ON dbo.PROJECT.PROJECT_ID = dbo.EMPLOYEE_PROJECT.PROJECT_ID
    WHERE dbo.PROJECT.PROJECT_ID = ${project_id}
    GROUP BY DBO.PROJECT.PROJECT_ID, ESTIMATED_TIME`
  );
  res.status(200).send(ret);
});

app.put("/Password", async (req, res) => {
  const { password } = req.body;
  const { email } = req.body;
  const salt = crypto.randomBytes(16).toString('hex');
  const hashed_password = crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString('hex');
  ret = await query(
    `UPDATE dbo.EMPLOYEE SET PASSWORD = '${hashed_password}', SALT = '${salt}' WHERE EMAIL = '${email}'`
  );
  if (ret === undefined) {
    res.status(201).send("Password successfully updated");
  } else {
    res.status(400).send(ret);
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