-- ================================================
-- MIGRAÇÃO: Adicionar reações às mensagens
-- ================================================

-- Adicionar coluna de reações (armazena JSON)
ALTER TABLE mensagens
ADD COLUMN reacoes JSON NULL COMMENT 'Reações dos usuários (emoji e usuario_id)' AFTER mensagem;

-- Exemplo de estrutura JSON das reações:
-- {"👍": [1, 3, 5], "❤️": [2, 4], "😂": [1]}
-- Onde os números são os IDs dos usuários que reagiram

-- Verificar estrutura
DESCRIBE mensagens;
