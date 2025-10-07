-- ================================================
-- ATUALIZAR CORES DAS TAGS EXISTENTES
-- ================================================

USE stoklink;

-- Atualizar tags que não têm cor definida
UPDATE tags 
SET cor = '#1e3c72' 
WHERE cor IS NULL OR cor = '';

-- Verificar tags
SELECT id, nome, cor, empresa_id FROM tags;

SELECT '✅ Cores das tags atualizadas!' as status;
