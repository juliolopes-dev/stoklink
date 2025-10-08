-- ================================================
-- MIGRAÇÃO: Adicionar Chat entre filiais
-- ================================================

-- Criar tabela de mensagens
CREATE TABLE IF NOT EXISTS mensagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL COMMENT 'Empresa à qual pertence a mensagem',
    usuario_id INT NOT NULL COMMENT 'Usuário que enviou a mensagem',
    mensagem TEXT NOT NULL COMMENT 'Conteúdo da mensagem',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data/hora de envio',
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_empresa_created (empresa_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mensagens do chat entre filiais';

-- Verificar estrutura
DESCRIBE mensagens;
