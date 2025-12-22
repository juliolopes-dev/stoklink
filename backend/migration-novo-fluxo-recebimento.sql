-- =============================================
-- MIGRAÇÃO: Novo Fluxo de Recebimento
-- Data: 2024-12-22
-- =============================================
-- Fluxo:
-- 1. Lançamento (aguardando)
-- 2. Confirmação de Recebimento - volumes (recebido)
-- 3. Conferência de Produtos - códigos (conferido)
-- 4. Filial Origem Confirma (finalizado)
-- =============================================

USE stoklink;

-- 1. Alterar ENUM de status para incluir 'finalizado'
ALTER TABLE recebimentos_fabrica 
MODIFY COLUMN status ENUM('aguardando', 'recebido', 'conferido', 'finalizado') DEFAULT 'aguardando';

-- 2. Adicionar campo para divergência de volumes
ALTER TABLE recebimentos_fabrica 
ADD COLUMN IF NOT EXISTS divergencia_volumes BOOLEAN DEFAULT FALSE AFTER volumes_recebidos,
ADD COLUMN IF NOT EXISTS volumes_divergencia INT DEFAULT 0 AFTER divergencia_volumes,
ADD COLUMN IF NOT EXISTS observacao_divergencia_volumes TEXT AFTER volumes_divergencia;

-- 3. Adicionar campos para conferência de produtos
ALTER TABLE recebimentos_fabrica 
ADD COLUMN IF NOT EXISTS divergencia_produtos BOOLEAN DEFAULT FALSE AFTER observacao_divergencia_volumes,
ADD COLUMN IF NOT EXISTS observacao_conferencia TEXT AFTER divergencia_produtos;

-- 4. Adicionar campos para confirmação da filial origem
ALTER TABLE recebimentos_fabrica 
ADD COLUMN IF NOT EXISTS data_confirmacao_origem DATETIME AFTER data_conferencia,
ADD COLUMN IF NOT EXISTS usuario_confirmacao_origem_id INT AFTER usuario_conferencia_id,
ADD COLUMN IF NOT EXISTS observacao_confirmacao_origem TEXT AFTER data_confirmacao_origem;

-- 5. Adicionar foreign key para usuário de confirmação origem
ALTER TABLE recebimentos_fabrica 
ADD CONSTRAINT fk_usuario_confirmacao_origem 
FOREIGN KEY (usuario_confirmacao_origem_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- 6. Modificar tabela de divergências para separar tipo (volume vs produto)
ALTER TABLE recebimento_divergencias 
ADD COLUMN IF NOT EXISTS etapa ENUM('recebimento', 'conferencia') DEFAULT 'conferencia' AFTER recebimento_id;

-- 7. Criar índice para etapa
CREATE INDEX IF NOT EXISTS idx_divergencias_etapa ON recebimento_divergencias(etapa);
