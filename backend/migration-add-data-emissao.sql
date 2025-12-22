-- =============================================
-- MIGRAÇÃO: Adicionar campo data_emissao
-- Data: 2024-12-22
-- =============================================

USE stoklink;

-- Adicionar campo data_emissao na tabela recebimentos_fabrica
-- Se a coluna já existir, o comando irá falhar mas não causará problemas
ALTER TABLE recebimentos_fabrica 
ADD COLUMN data_emissao DATE AFTER numero_nota_fiscal;
