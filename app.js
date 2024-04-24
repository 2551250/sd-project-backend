const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const sql = require('mssql');

app.get('/', async (req, res) => {
  res.send('API reached');
});

app.get('/Employee', async (req, res) => {
  ret = await query(`SELECT * FROM dbo.EMPLOYEE;`);
  res.send(ret);
});

app.get('/Project', async (req, res) => {
  ret = await query(`SELECT * FROM dbo.PROJECT;`);
  res.send(ret);
});

app.get('/Employee/Project/:id', async (req, res) => {
  const id = req.params.id;
  ret = await query(
    `SELECT DISTINCT PROJECT_NAME, DESCRIPTION, ESTIMATED_TIME FROM dbo.PROJECT INNER JOIN dbo.EMPLOYEE_PROJECT ON (dbo.PROJECT.PROJECT_ID = dbo.EMPLOYEE_PROJECT.PROJECT_ID) INNER JOIN dbo.EMPLOYEE ON (dbo.EMPLOYEE.EMPLOYEE_ID = dbo.EMPLOYEE_PROJECT.EMPLOYEE_ID) WHERE dbo.EMPLOYEE.EMPLOYEE_ID = ${id};`
  );
  res.send(ret);
});

const config = {
  user: 'workwise-backend-server-admin', // better stored in an app setting such as process.env.DB_USER
  password: 'projectpassword1@3', // better stored in an app setting such as process.env.DB_PASSWORD
  server: 'workwise-backend-server.database.windows.net', // better stored in an app setting such as process.env.DB_SERVER
  port: 1433, // optional, defaults to 1433, better stored in an app setting such as process.env.DB_PORT
  database: 'workwise-backend-database', // better stored in an app setting such as process.env.DB_NAME
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