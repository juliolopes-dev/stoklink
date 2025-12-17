-- =============================================
-- MIGRAÇÃO: Recebimento de Mercadoria de Fábrica
-- Data: 2024-12-10
-- =============================================

USE stoklink;

-- 1. Adicionar permissão de acesso ao módulo de recebimento nos usuários
ALTER TABLE usuarios 
ADD COLUMN acesso_recebimento BOOLEAN DEFAULT FALSE AFTER role;

-- 2. Criar tabela de Fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18),
    telefone VARCHAR(20),
    email VARCHAR(255),
    endereco TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    INDEX idx_fornecedor_empresa (empresa_id),
    INDEX idx_fornecedor_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Criar tabela de Transportadoras
CREATE TABLE IF NOT EXISTS transportadoras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18),
    telefone VARCHAR(20),
    email VARCHAR(255),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    INDEX idx_transportadora_empresa (empresa_id),
    INDEX idx_transportadora_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Criar tabela de Recebimentos de Fábrica
CREATE TABLE IF NOT EXISTS recebimentos_fabrica (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL,
    
    -- Identificador único do recebimento (ex: REC-2024-001)
    codigo VARCHAR(20) NOT NULL,
    
    -- Dados do fornecedor e transporte
    fornecedor_id INT,
    transportadora_id INT,
    numero_nota_fiscal VARCHAR(50),
    
    -- Filiais
    filial_chegada_id INT NOT NULL,
    filial_destino_id INT,
    
    -- Informações adicionais
    volumes INT DEFAULT 1,
    peso_total DECIMAL(10,2),
    observacoes TEXT,
    
    -- Status do recebimento
    -- 'aguardando' = Aguardando chegada
    -- 'recebido' = Mercadoria chegou, aguardando conferência
    -- 'conferido' = Conferência concluída
    status ENUM('aguardando', 'recebido', 'conferido') DEFAULT 'aguardando',
    
    -- Reserva (bloqueio para venda)
    -- 'pendente' = Mercadoria bloqueada para venda
    -- 'liberado' = Mercadoria liberada para venda
    reserva ENUM('pendente', 'liberado') DEFAULT 'pendente',
    
    -- Urgência
    urgente BOOLEAN DEFAULT FALSE,
    
    -- Datas
    data_prevista DATE,
    data_chegada DATETIME,
    data_conferencia DATETIME,
    data_liberacao DATETIME,
    
    -- Usuários responsáveis
    usuario_cadastro_id INT,
    usuario_recebimento_id INT,
    usuario_conferencia_id INT,
    usuario_liberacao_id INT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL,
    FOREIGN KEY (transportadora_id) REFERENCES transportadoras(id) ON DELETE SET NULL,
    FOREIGN KEY (filial_chegada_id) REFERENCES filiais(id) ON DELETE RESTRICT,
    FOREIGN KEY (filial_destino_id) REFERENCES filiais(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_cadastro_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_recebimento_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_conferencia_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_liberacao_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    
    -- Índices
    INDEX idx_recebimento_empresa (empresa_id),
    INDEX idx_recebimento_status (status),
    INDEX idx_recebimento_reserva (reserva),
    INDEX idx_recebimento_codigo (codigo),
    INDEX idx_recebimento_filial_chegada (filial_chegada_id),
    UNIQUE INDEX idx_recebimento_codigo_empresa (empresa_id, codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Dar acesso ao admin existente (opcional - ajuste conforme necessário)
-- UPDATE usuarios SET acesso_recebimento = TRUE WHERE role = 'admin';

-- =============================================
-- DADOS DE EXEMPLO (opcional - remova em produção)
-- =============================================

-- Exemplo de fornecedores (descomente se quiser dados de teste)
-- INSERT INTO fornecedores (empresa_id, nome, cnpj) VALUES
-- (1, 'Fornecedor Exemplo 1', '00.000.000/0001-00'),
-- (1, 'Fornecedor Exemplo 2', '11.111.111/0001-11');

-- Exemplo de transportadoras (descomente se quiser dados de teste)
-- INSERT INTO transportadoras (empresa_id, nome, cnpj) VALUES
-- (1, 'Transportadora Exemplo', '22.222.222/0001-22');
