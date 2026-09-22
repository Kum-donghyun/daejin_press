const mysql = require('mysql2')

// 3) DB 정보 기재 
const conn = mysql.createConnection({
    host : 'project-db-campus.smhrd.com',
    user : 'smhrd_teacher_kyb',
    password : '1234', 
    port : 3306,
    database : 'smhrd_teacher_kyb'
})

conn.connect()
module.exports = conn;