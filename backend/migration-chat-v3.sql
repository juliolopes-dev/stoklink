-- ================================================
-- MIGRAÇÃO: Adicionar filial aos usuários
-- ================================================

-- Adicionar campo de filial aos usuários
ALTER TABLE usuarios
ADD COLUMN filial VARCHAR(100) NULL COMMENT 'Filial do usuário' AFTER empresa_id;

-- Atualizar usuários existentes com filial padrão (você deve ajustar manualmente depois)
-- UPDATE usuarios SET filial = 'CD' WHERE id = 1;
-- UPDATE usuarios SET filial = 'Picos' WHERE id = 2;
-- etc...

-- Verificar estrutura
DESCRIBE usuarios;

-- Ver usuários para atualizar manualmente
SELECT id, nome, email, filial FROM usuarios;
