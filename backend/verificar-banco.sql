-- ================================================
-- VERIFICAR ESTADO ATUAL DO BANCO
-- Execute este arquivo para ver o que já existe
-- ================================================

USE stoklink;

-- 1. VERIFICAR SE TABELA FILIAIS EXISTE
SELECT 'VERIFICANDO TABELA FILIAIS:' as info;
SHOW TABLES LIKE 'filiais';

-- 2. VERIFICAR ESTRUTURA DA TABELA USUARIOS
SELECT 'ESTRUTURA DA TABELA USUARIOS:' as info;
DESCRIBE usuarios;

-- 3. VERIFICAR ESTRUTURA DA TABELA TRANSFERENCIAS
SELECT 'ESTRUTURA DA TABELA TRANSFERENCIAS:' as info;
DESCRIBE transferencias;

-- 4. LISTAR FILIAIS EXISTENTES
SELECT 'FILIAIS EXISTENTES:' as info;
SELECT * FROM filiais;

-- 5. LISTAR USUÁRIOS
SELECT 'USUÁRIOS CADASTRADOS:' as info;
SELECT u.id, u.nome, u.email, u.role, u.ativo, u.filial_id, e.nome as empresa, e.ativo as empresa_ativa
FROM usuarios u
INNER JOIN empresas e ON u.empresa_id = e.id;

-- 6. LISTAR EMPRESAS
SELECT 'EMPRESAS CADASTRADAS:' as info;
SELECT * FROM empresas;
