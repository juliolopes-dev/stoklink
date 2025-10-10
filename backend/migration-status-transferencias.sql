-- ================================================
-- MIGRAÇÃO: Adicionar status/etapa nas transferências
-- ================================================

-- 1. Aumentar tamanho da coluna status (se já existir)
ALTER TABLE transferencias MODIFY COLUMN status VARCHAR(50);

-- 2. Adicionar colunas de data (uma por vez para evitar erros)
ALTER TABLE transferencias ADD COLUMN data_separacao DATETIME NULL;
ALTER TABLE transferencias ADD COLUMN data_envio DATETIME NULL;
ALTER TABLE transferencias ADD COLUMN data_recebimento DATETIME NULL;

-- Verificar estrutura
SELECT COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'transferencias' 
AND TABLE_SCHEMA = 'stoklink';

-- Status possíveis:
-- 'aguardando_separacao' - Transferência criada, aguardando separação dos itens
-- 'em_separacao' - Origem está separando os produtos
-- 'separado' - Produtos separados, aguardando envio
-- 'em_transito' - Produtos enviados, aguardando recebimento
-- 'recebido' - Destino recebeu os produtos
-- 'concluido' - Transferência finalizada
-- 'cancelado' - Transferência cancelada
