-- ================================================
-- DELETAR DADOS DE EXEMPLO DAS FILIAIS
-- ================================================

USE stoklink;

-- Deletar filiais de exemplo da empresa 1
DELETE FROM filiais 
WHERE empresa_id = 1 
AND nome IN ('Matriz', 'Filial Rio de Janeiro', 'Filial Minas Gerais', 'SP-Matriz', 'RJ-Filial', 'MG-Filial');

-- Verificar se deletou
SELECT * FROM filiais;
