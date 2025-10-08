-- ================================================
-- MIGRAÇÃO: Adicionar filial de destino ao chat
-- ================================================

-- Adicionar colunas de origem e destino
ALTER TABLE mensagens
ADD COLUMN filial_origem VARCHAR(100) NULL COMMENT 'Filial que enviou a mensagem' AFTER usuario_id,
ADD COLUMN filial_destino VARCHAR(100) NULL COMMENT 'Filial que vai receber a mensagem' AFTER filial_origem;

-- Criar índice para buscar conversas entre filiais
CREATE INDEX idx_filiais ON mensagens(empresa_id, filial_origem, filial_destino, created_at DESC);

-- Verificar estrutura
DESCRIBE mensagens;
