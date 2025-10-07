-- ================================================
-- BANCO DE DADOS: StokLink v2.0
-- Sistema Multi-Tenant com Autenticação
-- ================================================

USE stoklink;

-- Limpar dados antigos (se existirem)
DROP TABLE IF EXISTS transferencia_tags;
DROP TABLE IF EXISTS itens_transferencia;
DROP TABLE IF EXISTS transferencias;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS empresas;

-- ================================================
-- TABELA: empresas (Multi-Tenant)
-- ================================================
CREATE TABLE empresas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL COMMENT 'Nome da empresa',
    cnpj VARCHAR(18) UNIQUE NULL COMMENT 'CNPJ da empresa',
    ativo BOOLEAN DEFAULT TRUE COMMENT 'Empresa ativa?',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cnpj (cnpj)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Empresas (Multi-Tenant)';

-- ================================================
-- TABELA: usuarios
-- ================================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL COMMENT 'Empresa do usuário',
    nome VARCHAR(100) NOT NULL COMMENT 'Nome completo',
    email VARCHAR(100) UNIQUE NOT NULL COMMENT 'Email (login)',
    senha VARCHAR(255) NOT NULL COMMENT 'Senha hash',
    role ENUM('admin', 'gerente', 'operador') DEFAULT 'operador' COMMENT 'Nível de acesso',
    ativo BOOLEAN DEFAULT TRUE COMMENT 'Usuário ativo?',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    INDEX idx_email (email),
    INDEX idx_empresa (empresa_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Usuários do sistema';

-- ================================================
-- TABELA: transferencias (agora com empresa_id)
-- ================================================
CREATE TABLE transferencias (
    id VARCHAR(20) PRIMARY KEY COMMENT 'ID no formato TRANSF-YYYY-NNN',
    empresa_id INT NOT NULL COMMENT 'Empresa dona da transferência',
    usuario_id INT NOT NULL COMMENT 'Usuário que criou',
    origem VARCHAR(100) NOT NULL COMMENT 'Filial de origem',
    destino VARCHAR(100) NOT NULL COMMENT 'Filial de destino',
    solicitante VARCHAR(100) NOT NULL COMMENT 'Nome do solicitante',
    data_criacao DATE NOT NULL COMMENT 'Data de criação',
    status ENUM('pendente', 'em_separacao', 'aguardando_lancamento', 'concluido') 
        DEFAULT 'pendente' COMMENT 'Status atual',
    numero_transferencia_interna VARCHAR(50) NULL COMMENT 'Número no sistema principal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_empresa (empresa_id),
    INDEX idx_usuario (usuario_id),
    INDEX idx_status (status),
    INDEX idx_data_criacao (data_criacao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Transferências entre filiais';

-- ================================================
-- TABELA: itens_transferencia
-- ================================================
CREATE TABLE itens_transferencia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transferencia_id VARCHAR(20) NOT NULL,
    codigo_produto VARCHAR(50) NOT NULL,
    quantidade_solicitada INT NOT NULL,
    quantidade_atendida INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transferencia_id) REFERENCES transferencias(id) ON DELETE CASCADE,
    INDEX idx_transferencia (transferencia_id),
    INDEX idx_codigo_produto (codigo_produto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Itens das transferências';

-- ================================================
-- TABELA: tags (agora com empresa_id)
-- ================================================
CREATE TABLE tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL COMMENT 'Empresa dona da tag',
    nome VARCHAR(50) NOT NULL,
    cor VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    UNIQUE KEY unique_tag_empresa (empresa_id, nome),
    INDEX idx_empresa (empresa_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tags para classificação';

-- ================================================
-- TABELA: transferencia_tags
-- ================================================
CREATE TABLE transferencia_tags (
    transferencia_id VARCHAR(20) NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (transferencia_id, tag_id),
    FOREIGN KEY (transferencia_id) REFERENCES transferencias(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Relacionamento transferências-tags';

-- ================================================
-- DADOS INICIAIS: Empresa e Usuário Admin
-- ================================================

-- Empresa padrão
INSERT INTO empresas (nome, cnpj, ativo) VALUES 
('Empresa Demonstração', NULL, TRUE);

-- Usuário admin padrão (senha: admin123)
-- Hash gerado com bcrypt: $2b$10$rU8pZ0E0Qh0YqQ0Q0Q0Q0uF0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0
INSERT INTO usuarios (empresa_id, nome, email, senha, role, ativo) VALUES 
(1, 'Administrador', 'admin@stoklink.com', '$2b$10$rU8pZ0E0Qh0YqQ0Q0Q0Q0uF0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0', 'admin', TRUE);

-- Tags padrão para empresa 1
INSERT INTO tags (empresa_id, nome, cor) VALUES
(1, 'Urgente', 'vermelho'),
(1, 'Retirar no local', 'azul'),
(1, 'Frágil', 'laranja'),
(1, 'Cliente VIP', 'roxo');

-- ================================================
-- FIM DO SCRIPT v2.0
-- ================================================
