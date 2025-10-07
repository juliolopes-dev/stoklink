-- ================================================
-- COPIE TUDO ABAIXO E COLE NO PHPMYADMIN
-- ================================================

USE stoklink;

-- 1. Verificar se o campo cor já existe
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'stoklink' 
  AND TABLE_NAME = 'tags' 
  AND COLUMN_NAME = 'cor';

-- 2. Adicionar campo cor (só adiciona se não existir)
SET @dbname = DATABASE();
SET @tablename = 'tags';
SET @columnname = 'cor';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT "Campo cor já existe" as info',
  'ALTER TABLE tags ADD COLUMN cor VARCHAR(7) DEFAULT "#1e3c72" COMMENT "Cor da tag em hexadecimal" AFTER nome'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 3. Atualizar todas as tags com cor padrão onde está vazio
UPDATE tags 
SET cor = '#1e3c72' 
WHERE cor IS NULL OR cor = '';

-- 4. Verificar resultado
SELECT '✅ TUDO PRONTO!' as status;
SELECT id, nome, cor, empresa_id FROM tags ORDER BY id;

-- 5. Verificar estrutura da tabela
DESCRIBE tags;
