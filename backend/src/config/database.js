const mysql = require('mysql2')

// 3) DB 정보 기재 
const conn = mysql.createConnection({
    host : 'project-db-campus.smhrd.com',
    user : 'smhrd_teacher_kyb',
    password : 'smhrd', 
    port : 3307,
    database : 'smhrd_teacher_kyb'
})

conn.connect()
module.exports = conn;