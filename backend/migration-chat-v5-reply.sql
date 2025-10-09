-- ================================================
-- MIGRAÇÃO: Adicionar funcionalidade de responder mensagens
-- ================================================

-- Adicionar coluna para armazenar ID da mensagem sendo respondida
ALTER TABLE mensagens
ADD COLUMN reply_to_id INT NULL COMMENT 'ID da mensagem sendo respondida' AFTER filial_destino,
ADD FOREIGN KEY (reply_to_id) REFERENCES mensagens(id) ON DELETE SET NULL;

-- Criar índice para buscar respostas
CREATE INDEX idx_reply ON mensagens(reply_to_id);

-- Verificar estrutura
DESCRIBE mensagens;
