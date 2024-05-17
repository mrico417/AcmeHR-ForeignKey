// setup the express server
const express = require('express');

// setup the PG client connection
const pg = require('pg');

// create the client connection to the database
const client = new pg.Client(process.env.DATABASE_URL || 'postgres://localhost/acme_hr');


// create the app from express
const app = express();

// setup the app with json
app.use(express.json());

// setup the app with logging for dev role
app.use(require('morgan')('dev'));

// routes
// GET Employees Route
// GET /api/employees - returns array of employees
app.get('/api/employees', async(req,res,next) => {

    const sqlSelectEmployees = `
        SELECT * FROM employee
    ;`;
    try {
        
        const response = await client.query(sqlSelectEmployees);
        res.send(response.rows);
        return
    } catch (error) {
        next(error);
    }

});

// GET Department Route
// GET /api/departments - returns an array of departments
app.get('/api/departments', async(req,res,next) => {

    const sqlSelectDepartments = `
        SELECT * FROM department
    ;`;
    try {
        const response = await client.query(sqlSelectDepartments);
        res.send(response.rows);
        return
    } catch (error) {
        next(error);
    }

});

// POST Route
// POST /api/employees - payload: the employee to create, returns the created employee
app.post('/api/employees', async(req,res,next) => {

    const sqlInsertEmployee = `
        INSERT INTO employee(name,department_id) VALUES($1,(SELECT id FROM department WHERE name=$2))
        RETURNING *
    ;`;
    try {
        const response = await client.query(sqlInsertEmployee, [req.body.name,req.body.department_name]);
        res.send(response.rows[0]);
        return
    } catch (error) {
        next(error);
    }
});

// DELETE Route
// DELETE /api/employees/:id - the id of the employee to delete is passed in the URL, returns nothing

app.delete('/api/employees/:id', async(req,res,next) => {

    const sqlDeleteEmployee = `
        DELETE FROM employee
        WHERE id=$1
    ;`;
    try {
        const response = await client.query(sqlDeleteEmployee,[req.params.id]);
        res.sendStatus(204);
        return
    } catch (error) {
        next(error);
    }
});
// PUT route
// PUT /api/employees/:id - payload: the updated employee returns the updated employee
app.put('/api/employees/:id', async (req,res,next)=> {
    
    const sqlUpdateEmployee = `
        UPDATE employee
        SET name=$1, department_id=(SELECT id FROM department WHERE name=$2), updated_at=now()
        WHERE id=$3
        RETURNING *
    ;`;
    try {
        const response = await client.query(sqlUpdateEmployee,[req.body.name,req.body.department_name,req.params.id])
        res.send(response.rows[0]);
        return
    } catch (error) {
        next(error)
    }
});

// Error Handling
// Includes an error handling route which returns an object with an error property.
app.use((error, req, res, next)=> {
    res.status(res.status || 500).send({ error: error });
  });

const init = async() => {
    
    const sqlCreateTables = `
    DROP TABLE IF EXISTS department CASCADE;
    CREATE TABLE department(
        id SERIAL PRIMARY KEY,
        name VARCHAR(50)
    );
    DROP TABLE IF EXISTS employee;
    CREATE TABLE employee(
            id SERIAL PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now(),
            department_id INTEGER REFERENCES department(id)
    );
    

      
    ;`;

    const sqlSeedTables = `

        INSERT INTO department(name) VALUES('Avengers');
        INSERT INTO department(name) VALUES('Xmen');
        
        INSERT INTO employee(name,department_id) VALUES('Iron Man',(SELECT id FROM department WHERE name='Avengers'));
        INSERT INTO employee(name,department_id) VALUES('Captain America',(SELECT id FROM department WHERE name='Avengers'));
        INSERT INTO employee(name,department_id) VALUES('Black Panther',(SELECT id FROM department WHERE name='Avengers'));
        INSERT INTO employee(name,department_id) VALUES('Thor',(SELECT id FROM department WHERE name='Avengers'));

    ;`;
    
    try {
        
        await client.connect();
        await client.query(sqlCreateTables);
        console.log("Created tables");

        await client.query(sqlSeedTables);
        console.log("Seeded data into tables...")

        const PORT = process.env.PORT || 3000;
        app.listen(PORT,() => { console.log(`App is listening on port ${PORT}`)});
        
    } catch (error) {
        console.log(error);
    }


};

init();


