const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function adicionarRascunho() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('🔄 Adicionando status "rascunho"...');
        
        const sql = fs.readFileSync('./adicionar-rascunho.sql', 'utf8');
        await connection.query(sql);
        
        console.log('✅ Status "rascunho" adicionado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await connection.end();
    }
}

adicionarRascunho();
