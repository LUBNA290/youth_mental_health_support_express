import mysql from "mysql";

export const db = mysql.createPool({
    connectionLimit: 100,
    host: 'localhost',
    user: 'root',
    password: 'H@cker22',
    database: 'youth_mental_health_support'
})
