const mysql = require('mysql2/promise');
require('dotenv').config();

// Pool de conexões para melhor performance
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '-03:00', // Horário de Brasília (UTC-3)
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000, // 10 segundos
    idleTimeout: 60000, // 60 segundos
    connectTimeout: 10000 // 10 segundos para timeout de conexão
});

// Testar conexão
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conectado ao MySQL com sucesso!');
        connection.release();
    } catch (error) {
        console.error('❌ Erro ao conectar ao MySQL:', error.message);
    }
}

testConnection();

module.exports = pool;
