-- ================================================
-- ADICIONAR CAMPO COR NAS TAGS
-- ================================================

USE stoklink;

-- Adicionar campo cor (se não existir)
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
  'SELECT 1', -- Campo já existe
  'ALTER TABLE tags ADD COLUMN cor VARCHAR(7) DEFAULT "#1e3c72" COMMENT "Cor da tag em hexadecimal" AFTER nome'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Verificar
DESCRIBE tags;

SELECT '✅ Campo cor adicionado com sucesso!' as status;
