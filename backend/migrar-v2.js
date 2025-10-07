const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function migrarParaV2() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    try {
        console.log('🔄 Migrando para v2 (autenticação + multi-tenant)...');
        
        const sql = fs.readFileSync('./database-v2.sql', 'utf8');
        await connection.query(sql);
        
        console.log('✅ Migração concluída!');
        console.log('');
        console.log('📊 Estrutura criada:');
        console.log('   - empresas (multi-tenant)');
        console.log('   - usuarios (autenticação)');
        console.log('   - transferencias (com empresa_id)');
        console.log('   - itens_transferencia');
        console.log('   - tags (por empresa)');
        console.log('   - transferencia_tags');
        console.log('');
        console.log('👤 Usuário admin criado:');
        console.log('   Email: admin@stoklink.com');
        console.log('   Senha: admin123');
        
    } catch (error) {
        console.error('❌ Erro na migração:', error.message);
    } finally {
        await connection.end();
    }
}

migrarParaV2();
