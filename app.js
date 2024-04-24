const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const sql = require('mssql');

app.use(express.json());


app.get('/', async (req, res) => {
  res.send('API reached');
});


// Returns all employees in the database
app.get('/Employee', async (req, res) => {
  ret = await query(`SELECT * FROM dbo.EMPLOYEE;`);
  res.send(ret);
});


// Returns all projects in the database
app.get('/Project', async (req, res) => {
  ret = await query(`SELECT * FROM dbo.PROJECT;`);
  res.send(ret);
});


// Returns the description of all projects that the employee is working
// on. The parameter is the employee id
app.get('/Employee/Project/:id', async (req, res) => {
  const id = req.params.id;
  ret = await query(
    `SELECT DISTINCT PROJECT_NAME, DESCRIPTION, ESTIMATED_TIME FROM dbo.PROJECT INNER JOIN dbo.EMPLOYEE_PROJECT ON (dbo.PROJECT.PROJECT_ID = dbo.EMPLOYEE_PROJECT.PROJECT_ID) INNER JOIN dbo.EMPLOYEE ON (dbo.EMPLOYEE.EMPLOYEE_ID = dbo.EMPLOYEE_PROJECT.EMPLOYEE_ID) WHERE dbo.EMPLOYEE.EMPLOYEE_ID = ${id};`
  );
  res.send(ret);
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