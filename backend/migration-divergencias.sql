-- Tabela para armazenar itens de divergência no recebimento
CREATE TABLE IF NOT EXISTS recebimento_divergencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recebimento_id INT NOT NULL,
    tipo ENUM('faltando', 'sobrando') NOT NULL,
    codigo_referencia VARCHAR(100) NOT NULL,
    quantidade INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recebimento_id) REFERENCES recebimentos_fabrica(id) ON DELETE CASCADE
);

-- Índice para busca rápida
CREATE INDEX idx_divergencias_recebimento ON recebimento_divergencias(recebimento_id);
