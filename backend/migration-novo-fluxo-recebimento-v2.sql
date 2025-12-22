-- =============================================
-- MIGRAÇÃO: Novo Fluxo de Recebimento (Versão Corrigida)
-- Data: 2024-12-22
-- =============================================

USE stoklink;

-- 1. Alterar ENUM de status para incluir 'finalizado'
ALTER TABLE recebimentos_fabrica 
MODIFY COLUMN status ENUM('aguardando', 'recebido', 'conferido', 'finalizado') DEFAULT 'aguardando';

-- 2. Adicionar campos para divergência de volumes
ALTER TABLE recebimentos_fabrica 
ADD COLUMN divergencia_volumes BOOLEAN DEFAULT FALSE AFTER volumes_recebidos;

ALTER TABLE recebimentos_fabrica 
ADD COLUMN volumes_divergencia INT DEFAULT 0 AFTER divergencia_volumes;

ALTER TABLE recebimentos_fabrica 
ADD COLUMN observacao_divergencia_volumes TEXT AFTER volumes_divergencia;

-- 3. Adicionar campos para conferência de produtos
ALTER TABLE recebimentos_fabrica 
ADD COLUMN divergencia_produtos BOOLEAN DEFAULT FALSE AFTER observacao_divergencia_volumes;

ALTER TABLE recebimentos_fabrica 
ADD COLUMN observacao_conferencia TEXT AFTER divergencia_produtos;

-- 4. Adicionar campos para confirmação da filial origem
ALTER TABLE recebimentos_fabrica 
ADD COLUMN data_confirmacao_origem DATETIME AFTER data_conferencia;

ALTER TABLE recebimentos_fabrica 
ADD COLUMN usuario_confirmacao_origem_id INT AFTER usuario_conferencia_id;

ALTER TABLE recebimentos_fabrica 
ADD COLUMN observacao_confirmacao_origem TEXT AFTER data_confirmacao_origem;

-- 5. Adicionar foreign key para usuário de confirmação origem (se não existir)
-- Ignora erro se já existir
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
                  WHERE CONSTRAINT_SCHEMA = 'stoklink' 
                  AND TABLE_NAME = 'recebimentos_fabrica' 
                  AND CONSTRAINT_NAME = 'fk_usuario_confirmacao_origem');

SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE recebimentos_fabrica ADD CONSTRAINT fk_usuario_confirmacao_origem FOREIGN KEY (usuario_confirmacao_origem_id) REFERENCES usuarios(id) ON DELETE SET NULL',
    'SELECT "FK já existe" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. Modificar tabela de divergências para separar tipo
ALTER TABLE recebimento_divergencias 
ADD COLUMN etapa ENUM('recebimento', 'conferencia') DEFAULT 'conferencia' AFTER recebimento_id;
