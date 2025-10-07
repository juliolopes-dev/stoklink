-- ================================================
-- MIGRAÇÃO: Sistema de Filiais
-- Adiciona hierarquia: Empresa → Filiais → Usuários
-- ================================================

USE stoklink;

-- ================================================
-- TABELA: filiais
-- ================================================
CREATE TABLE IF NOT EXISTS filiais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL COMMENT 'Empresa dona da filial',
    nome VARCHAR(100) NOT NULL COMMENT 'Nome da filial (ex: SP-Matriz, RJ-Filial)',
    codigo VARCHAR(20) NULL COMMENT 'Código da filial (opcional)',
    endereco VARCHAR(255) NULL COMMENT 'Endereço da filial',
    cidade VARCHAR(100) NULL COMMENT 'Cidade',
    estado VARCHAR(2) NULL COMMENT 'UF',
    telefone VARCHAR(20) NULL COMMENT 'Telefone de contato',
    ativo BOOLEAN DEFAULT TRUE COMMENT 'Filial ativa?',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    UNIQUE KEY unique_filial_empresa (empresa_id, nome),
    INDEX idx_empresa (empresa_id),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Filiais das empresas';

-- ================================================
-- MODIFICAR TABELA: usuarios (adicionar filial_id)
-- ================================================
ALTER TABLE usuarios 
ADD COLUMN filial_id INT NULL COMMENT 'Filial do usuário' AFTER empresa_id,
ADD FOREIGN KEY (filial_id) REFERENCES filiais(id) ON DELETE SET NULL,
ADD INDEX idx_filial (filial_id);

-- ================================================
-- MODIFICAR TABELA: transferencias (adicionar filiais)
-- ================================================
ALTER TABLE transferencias 
ADD COLUMN filial_origem_id INT NULL COMMENT 'ID da filial de origem' AFTER origem,
ADD COLUMN filial_destino_id INT NULL COMMENT 'ID da filial de destino' AFTER destino,
ADD FOREIGN KEY (filial_origem_id) REFERENCES filiais(id) ON DELETE SET NULL,
ADD FOREIGN KEY (filial_destino_id) REFERENCES filiais(id) ON DELETE SET NULL,
ADD INDEX idx_filial_origem (filial_origem_id),
ADD INDEX idx_filial_destino (filial_destino_id);

-- ================================================
-- DADOS INICIAIS: Nenhum dado de exemplo
-- ================================================
-- As filiais serão criadas pelo admin através da interface

-- ================================================
-- FIM DA MIGRAÇÃO
-- ================================================

-- Para verificar as alterações:
-- SELECT * FROM filiais;
-- DESCRIBE usuarios;
-- DESCRIBE transferencias;
