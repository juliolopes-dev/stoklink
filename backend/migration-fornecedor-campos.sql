-- =============================================
-- MIGRAÇÃO: Adicionar campos codigo e nome_fantasia em fornecedores
-- Data: 2024-12-11
-- =============================================

USE stoklink;

-- Adicionar coluna codigo
ALTER TABLE fornecedores 
ADD COLUMN codigo VARCHAR(50) AFTER nome;

-- Adicionar coluna nome_fantasia
ALTER TABLE fornecedores 
ADD COLUMN nome_fantasia VARCHAR(255) AFTER codigo;

-- Adicionar índice para código
ALTER TABLE fornecedores
ADD INDEX idx_fornecedor_codigo (codigo);
