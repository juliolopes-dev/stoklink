// Script para adicionar campo cor nas tags
const db = require('./db');

async function adicionarCorTags() {
    try {
        console.log('🔧 Iniciando atualização...');
        
        // 1. Verificar se campo existe
        console.log('\n[1/3] Verificando estrutura da tabela...');
        const [columns] = await db.query(
            "SHOW COLUMNS FROM tags LIKE 'cor'"
        );
        
        if (columns.length === 0) {
            console.log('Campo "cor" não existe. Criando...');
            await db.query(
                "ALTER TABLE tags ADD COLUMN cor VARCHAR(7) DEFAULT '#1e3c72' COMMENT 'Cor da tag em hexadecimal' AFTER nome"
            );
            console.log('✅ Campo "cor" criado com sucesso!');
        } else {
            console.log('✅ Campo "cor" já existe!');
        }
        
        // 2. Atualizar tags sem cor
        console.log('\n[2/3] Atualizando tags sem cor...');
        const [result] = await db.query(
            "UPDATE tags SET cor = '#1e3c72' WHERE cor IS NULL OR cor = ''"
        );
        console.log(`✅ ${result.affectedRows} tag(s) atualizada(s)!`);
        
        // 3. Mostrar resultado
        console.log('\n[3/3] Tags cadastradas:');
        const [tags] = await db.query('SELECT id, nome, cor, empresa_id FROM tags');
        console.table(tags);
        
        console.log('\n🎉 CONCLUÍDO COM SUCESSO!');
        console.log('\nAgora reinicie o backend:');
        console.log('  npm start');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }
}

adicionarCorTags();
