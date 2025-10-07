const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function limparUsuarios() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    try {
        console.log('🔄 Limpando usuários...');
        
        const sql = fs.readFileSync('./limpar-usuarios.sql', 'utf8');
        await connection.query(sql);
        
        console.log('✅ Todos os usuários foram removidos!');
        console.log('📝 Agora os clientes podem se cadastrar pelo sistema.');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await connection.end();
    }
}

limparUsuarios();
