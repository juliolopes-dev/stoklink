-- ================================================
-- EXECUTAR ESTE ARQUIVO - FAZ TUDO AUTOMATICAMENTE
-- ================================================

USE stoklink;

-- ================================================
-- PASSO 1: CRIAR TABELA FILIAIS
-- ================================================
CREATE TABLE IF NOT EXISTS filiais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL COMMENT 'Empresa dona da filial',
    nome VARCHAR(100) NOT NULL COMMENT 'Nome da filial (ex: SP-Matriz, RJ-Filial)',
    codigo VARCHAR(20) NULL COMMENT 'Código da filial (opcional)',
    endereco VARCHAR(255) NULL COMMENT 'Endereço da filial',
    cidade VARCHAR(100) NULL COMMENT 'Cidade',
    estado VARCHAR(2) NULL COMMENT 'UF',
    telefone VARCHAR(20) NULL COMMENT 'Telefone de contato',
    ativo BOOLEAN DEFAULT TRUE COMMENT 'Filial ativa?',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    UNIQUE KEY unique_filial_empresa (empresa_id, nome),
    INDEX idx_empresa (empresa_id),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Filiais das empresas';

-- ================================================
-- PASSO 2: ADICIONAR CAMPO FILIAL_ID EM USUARIOS (SE NÃO EXISTIR)
-- ================================================
SET @dbname = DATABASE();
SET @tablename = 'usuarios';
SET @columnname = 'filial_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1', -- Campo já existe, não faz nada
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT NULL COMMENT "Filial do usuário" AFTER empresa_id, ADD FOREIGN KEY (filial_id) REFERENCES filiais(id) ON DELETE SET NULL, ADD INDEX idx_filial (filial_id)')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ================================================
-- PASSO 3: ADICIONAR CAMPOS FILIAL EM TRANSFERENCIAS (SE NÃO EXISTIR)
-- ================================================
SET @tablename = 'transferencias';
SET @columnname = 'filial_origem_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1', -- Campo já existe
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN filial_origem_id INT NULL COMMENT "ID da filial de origem" AFTER origem, ADD COLUMN filial_destino_id INT NULL COMMENT "ID da filial de destino" AFTER destino, ADD FOREIGN KEY (filial_origem_id) REFERENCES filiais(id) ON DELETE SET NULL, ADD FOREIGN KEY (filial_destino_id) REFERENCES filiais(id) ON DELETE SET NULL, ADD INDEX idx_filial_origem (filial_origem_id), ADD INDEX idx_filial_destino (filial_destino_id)')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ================================================
-- PASSO 4: DELETAR FILIAIS DE EXEMPLO (SE EXISTIREM)
-- ================================================
DELETE FROM filiais 
WHERE nome IN ('Matriz', 'Filial Rio de Janeiro', 'Filial Minas Gerais', 'SP-Matriz', 'RJ-Filial', 'MG-Filial');

-- ================================================
-- PASSO 5: ATIVAR USUÁRIO COMO ADMIN
-- ================================================
UPDATE usuarios 
SET ativo = TRUE, role = 'admin' 
WHERE email = 'juliofranlopes10@gmail.com';

-- ================================================
-- PASSO 6: ATIVAR EMPRESA DO USUÁRIO
-- ================================================
UPDATE empresas 
SET ativo = TRUE 
WHERE id = (SELECT empresa_id FROM usuarios WHERE email = 'juliofranlopes10@gmail.com' LIMIT 1);

-- ================================================
-- VERIFICAR RESULTADOS
-- ================================================
SELECT '✅ MIGRAÇÃO CONCLUÍDA!' as status;
SELECT '';
SELECT 'USUÁRIO ATIVO:' as info;
SELECT u.id, u.nome, u.email, u.role, u.ativo, u.filial_id, e.nome as empresa, e.ativo as empresa_ativa
FROM usuarios u
INNER JOIN empresas e ON u.empresa_id = e.id
WHERE u.email = 'juliofranlopes10@gmail.com';

SELECT '';
SELECT 'FILIAIS CADASTRADAS:' as info;
SELECT COUNT(*) as total FROM filiais;

SELECT '';
SELECT 'ESTRUTURA DA TABELA USUARIOS:' as info;
DESCRIBE usuarios;

SELECT '';
SELECT '✅ SETUP COMPLETO! Pode fazer login agora.' as mensagem;
