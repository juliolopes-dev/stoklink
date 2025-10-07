-- ================================================
-- VERSÃO SIMPLES - COPIE E COLE NO PHPMYADMIN
-- ================================================

USE stoklink;

-- Tentar adicionar campo cor (se der erro, ignore - significa que já existe)
ALTER TABLE tags ADD COLUMN cor VARCHAR(7) DEFAULT '#1e3c72' COMMENT 'Cor da tag em hexadecimal' AFTER nome;

-- Atualizar tags que não têm cor
UPDATE tags 
SET cor = '#1e3c72' 
WHERE cor IS NULL OR cor = '';

-- Verificar resultado
SELECT '✅ Tags atualizadas!' as mensagem;
SELECT id, nome, cor, empresa_id FROM tags;
