-- Migração para adicionar campos de recebimento
-- Executar no banco de dados stoklink

-- Adicionar campos para controle de recebimento
ALTER TABLE recebimentos_fabrica 
ADD COLUMN IF NOT EXISTS volumes_recebidos INT DEFAULT NULL COMMENT 'Quantidade de volumes efetivamente recebidos',
ADD COLUMN IF NOT EXISTS situacao_recebimento ENUM('ok', 'faltando', 'sobrando', 'avariada') DEFAULT 'ok' COMMENT 'Situação da mercadoria no recebimento',
ADD COLUMN IF NOT EXISTS observacao_recebimento TEXT DEFAULT NULL COMMENT 'Observações do recebimento (divergências, avarias, etc)',
ADD COLUMN IF NOT EXISTS filial_recebimento_id INT DEFAULT NULL COMMENT 'Filial onde a mercadoria realmente chegou',
ADD COLUMN IF NOT EXISTS data_chegada_destino DATETIME DEFAULT NULL COMMENT 'Data/hora que a mercadoria chegou na filial de destino',
ADD COLUMN IF NOT EXISTS usuario_chegada_destino_id INT DEFAULT NULL COMMENT 'Usuário que confirmou chegada no destino';

-- Verificar se as colunas foram criadas
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'stoklink' 
AND TABLE_NAME = 'recebimentos_fabrica'
AND COLUMN_NAME IN ('volumes_recebidos', 'situacao_recebimento', 'observacao_recebimento', 'filial_recebimento_id', 'data_chegada_destino', 'usuario_chegada_destino_id');
