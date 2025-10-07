-- ================================================
-- SETUP COMPLETO DO SISTEMA
-- Execute este arquivo no MySQL Workbench ou outro cliente
-- ================================================

USE stoklink;

-- 1. DELETAR FILIAIS DE EXEMPLO
DELETE FROM filiais 
WHERE nome IN ('Matriz', 'Filial Rio de Janeiro', 'Filial Minas Gerais', 'SP-Matriz', 'RJ-Filial', 'MG-Filial');

-- 2. ATIVAR USUÁRIO CADASTRADO (ajuste o email)
UPDATE usuarios 
SET ativo = TRUE, role = 'admin' 
WHERE email = 'juliofranlopes10@gmail.com';

-- 3. ATIVAR EMPRESA DO USUÁRIO
UPDATE empresas 
SET ativo = TRUE 
WHERE id = (SELECT empresa_id FROM usuarios WHERE email = 'juliofranlopes10@gmail.com');

-- 4. VERIFICAR RESULTADOS
SELECT 'USUÁRIOS ATIVOS:' as info;
SELECT u.id, u.nome, u.email, u.role, u.ativo, e.nome as empresa, e.ativo as empresa_ativa
FROM usuarios u
INNER JOIN empresas e ON u.empresa_id = e.id
WHERE u.email = 'juliofranlopes10@gmail.com';

SELECT 'FILIAIS EXISTENTES:' as info;
SELECT * FROM filiais ORDER BY id;

SELECT '✅ SETUP CONCLUÍDO!' as status;
