-- ================================================
-- MIGRAÇÃO: Adicionar timestamps e status 'recebido'
-- ================================================

-- 1. Adicionar novo status 'recebido'
ALTER TABLE transferencias 
MODIFY COLUMN status ENUM('rascunho', 'pendente', 'em_separacao', 'aguardando_lancamento', 'concluido', 'recebido') 
DEFAULT 'pendente' 
COMMENT 'Status atual da transferência';

-- 2. Adicionar campos de timestamp
ALTER TABLE transferencias
ADD COLUMN data_inicio_separacao DATETIME NULL COMMENT 'Data/hora que iniciou a separação' AFTER status,
ADD COLUMN data_fim_separacao DATETIME NULL COMMENT 'Data/hora que finalizou a separação' AFTER data_inicio_separacao,
ADD COLUMN data_recebimento DATETIME NULL COMMENT 'Data/hora que foi recebida no destino' AFTER data_fim_separacao;

-- 3. Criar índices para melhor performance
CREATE INDEX idx_data_recebimento ON transferencias(data_recebimento);

-- Verificar estrutura atualizada
DESCRIBE transferencias;
