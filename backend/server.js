const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { verificarToken, verificarRole } = require('./auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
    origin: '*', // Permitir todas as origens em desenvolvimento
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
}));
app.use(express.json());

// Log de todas as requisições
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path} - ${new Date().toLocaleTimeString()}`);
    next();
});

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend')));

async function validarAcessoTransferencia(transferenciaId, usuario) {
    let filialUsuarioId = usuario.filial_id ? Number(usuario.filial_id) : null;

    if (!filialUsuarioId) {
        const [usuarios] = await db.query(
            'SELECT filial_id FROM usuarios WHERE id = ? AND empresa_id = ?',
            [usuario.id, usuario.empresa_id]
        );

        if (usuarios.length > 0) {
            filialUsuarioId = usuarios[0].filial_id ? Number(usuarios[0].filial_id) : null;
            usuario.filial_id = filialUsuarioId;
        }
    }

    const [transferencias] = await db.query(
        'SELECT id, filial_origem_id, filial_destino_id FROM transferencias WHERE id = ? AND empresa_id = ?',
        [transferenciaId, usuario.empresa_id]
    );

    if (transferencias.length === 0) {
        return { autorizado: false, status: 404, mensagem: 'Transferência não encontrada' };
    }

    if (!filialUsuarioId) {
        return { autorizado: false, status: 403, mensagem: 'Usuário sem filial vinculada não pode alterar esta transferência' };
    }

    const transferencia = transferencias[0];
    if (
        transferencia.filial_origem_id !== filialUsuarioId &&
        transferencia.filial_destino_id !== filialUsuarioId
    ) {
        return { autorizado: false, status: 403, mensagem: 'Apenas as filiais de origem ou destino podem alterar esta transferência' };
    }

    return { autorizado: true, transferencia };
}

// ========================================
// ROTAS DE AUTENTICAÇÃO
// ========================================

// POST - Login
app.post('/api/auth/login', async (req, res) => {
    const { email, senha } = req.body;
    
    try {
        const [usuarios] = await db.query(`
            SELECT u.*, e.nome as empresa_nome, f.nome as filial_nome 
            FROM usuarios u
            INNER JOIN empresas e ON u.empresa_id = e.id
            LEFT JOIN filiais f ON u.filial_id = f.id
            WHERE u.email = ? AND u.ativo = TRUE AND e.ativo = TRUE
        `, [email]);

        if (usuarios.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas ou cadastro aguardando aprovação' });
        }

        const usuario = usuarios[0];
        const filialNome = usuario.filial_nome || usuario.filial || null;
        const filialId = usuario.filial_id || null;
        
        // Debug: verificar dados do usuário
        console.log('=== DEBUG LOGIN ===');
        console.log('Email:', email);
        console.log('Filial ID no banco:', usuario.filial_id);
        console.log('Filial nome retornada:', filialNome);
        console.log('==================');
        
        // Verificar senha com bcrypt
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        
        if (!senhaValida) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Gerar token JWT
        const token = jwt.sign({
            id: usuario.id,
            empresa_id: usuario.empresa_id,
            email: usuario.email,
            nome: usuario.nome,
            role: usuario.role,
            filial: filialNome,
            filial_id: filialId
        }, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.json({
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                role: usuario.role,
                filial: filialNome,
                filial_id: filialId,
                empresa: {
                    id: usuario.empresa_id,
                    nome: usuario.empresa_nome
                }
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

// GET - Dados do usuário logado
app.get('/api/auth/me', verificarToken, async (req, res) => {
    try {
        const [usuarios] = await db.query(`
            SELECT u.id, u.nome, u.email, u.role, u.filial_id,
                   f.nome as filial_nome,
                   e.id as empresa_id, e.nome as empresa_nome
            FROM usuarios u
            INNER JOIN empresas e ON u.empresa_id = e.id
            LEFT JOIN filiais f ON u.filial_id = f.id
            WHERE u.id = ?
        `, [req.usuario.id]);

        if (usuarios.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const usuario = usuarios[0];
        const filialNome = usuario.filial_nome || null;
        
        console.log('🔍 DEBUG /api/auth/me:', {
            usuarioId: req.usuario.id,
            filial: filialNome,
            filialIsNull: filialNome === null,
            dados: usuario
        });
        
        res.json({
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            role: usuario.role,
            filial: filialNome,
            filial_id: usuario.filial_id,
            empresa: {
                id: usuario.empresa_id,
                nome: usuario.empresa_nome
            }
        });
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }
});

// DEBUG - Ver estrutura da tabela usuarios (REMOVER DEPOIS)
app.get('/api/debug/usuarios-estrutura', verificarToken, async (req, res) => {
    try {
        const [estrutura] = await db.query('DESCRIBE usuarios');
        const [meuUsuario] = await db.query('SELECT * FROM usuarios WHERE id = ?', [req.usuario.id]);
        
        res.json({
            estruturaTabela: estrutura,
            meusDados: meuUsuario[0],
            temCampoFilial: estrutura.some(col => col.Field === 'filial')
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST - Registro público (novo cliente)
app.post('/api/auth/registrar-publico', async (req, res) => {
    const { nome, email, senha, empresa } = req.body;
    
    try {
        // Verificar se email já existe
        const [usuariosExistentes] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (usuariosExistentes.length > 0) {
            return res.status(400).json({ error: 'E-mail já cadastrado' });
        }
        
        // Verificar se empresa já existe
        let empresa_id;
        const [empresasExistentes] = await db.query('SELECT id FROM empresas WHERE nome = ?', [empresa]);
        
        if (empresasExistentes.length > 0) {
            empresa_id = empresasExistentes[0].id;
        } else {
            // Criar nova empresa (inativa)
            const [resultEmpresa] = await db.query(
                'INSERT INTO empresas (nome, ativo) VALUES (?, FALSE)',
                [empresa]
            );
            empresa_id = resultEmpresa.insertId;
        }
        
        // Hash da senha
        const senhaHash = await bcrypt.hash(senha, 10);
        
        // Criar usuário (inativo, aguardando aprovação)
        await db.query(
            'INSERT INTO usuarios (nome, email, senha, role, empresa_id, ativo) VALUES (?, ?, ?, ?, ?, FALSE)',
            [nome, email, senhaHash, 'operador', empresa_id]
        );
        
        res.json({ 
            message: 'Cadastro realizado com sucesso! Aguarde aprovação do administrador.',
            aguardando_aprovacao: true
        });
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ error: 'Erro ao realizar cadastro' });
    }
});

// POST - Registrar novo usuário (apenas admin)
app.post('/api/auth/registrar', verificarToken, verificarRole('admin'), async (req, res) => {
    const { nome, email, senha, role } = req.body;
    const empresa_id = req.usuario.empresa_id;
    
    try {
        const senhaHash = await bcrypt.hash(senha, 10);
        
        await db.query(
            'INSERT INTO usuarios (empresa_id, nome, email, senha, role) VALUES (?, ?, ?, ?, ?)',
            [empresa_id, nome, email, senhaHash, role || 'operador']
        );
        
        res.status(201).json({ message: 'Usuário criado com sucesso' });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// ========================================
// ROTAS DE TRANSFERÊNCIAS (Protegidas)
// ========================================

// GET - Listar todas as transferências (apenas da empresa do usuário)
app.get('/api/transferencias', verificarToken, async (req, res) => {
    try {
        const empresa_id = req.usuario.empresa_id;
        
        const [transferencias] = await db.query(`
            SELECT t.*, u.nome as usuario_nome
            FROM transferencias t
            LEFT JOIN usuarios u ON t.usuario_id = u.id
            WHERE t.empresa_id = ?
            ORDER BY COALESCE(t.updated_at, t.data_fim_separacao, t.data_criacao) DESC
        `, [empresa_id]);

        // Para cada transferência, buscar itens e tags
        for (let transf of transferencias) {
            // Buscar itens
            const [itens] = await db.query(
                'SELECT codigo_produto as codigo, quantidade_solicitada as solicitada, quantidade_atendida as atendida FROM itens_transferencia WHERE transferencia_id = ?',
                [transf.id]
            );
            transf.itens = itens;

            // Buscar tags
            const [tags] = await db.query(`
                SELECT t.nome 
                FROM tags t
                INNER JOIN transferencia_tags tt ON t.id = tt.tag_id
                WHERE tt.transferencia_id = ?
            `, [transf.id]);
            transf.tags = tags.map(t => t.nome);
            transf.numeroTransferenciaInterna = transf.numero_transferencia_interna;
        }

        res.json(transferencias);
    } catch (error) {
        console.error('Erro ao buscar transferências:', error);
        res.status(500).json({ error: 'Erro ao buscar transferências' });
    }
});

// GET - Buscar transferência por ID
app.get('/api/transferencias/:id', verificarToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT t.*, u.nome as usuario_nome
            FROM transferencias t
            LEFT JOIN usuarios u ON t.usuario_id = u.id
            WHERE t.id = ?
            ORDER BY COALESCE(t.updated_at, t.data_fim_separacao, t.data_criacao) DESC
        `, [req.params.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Transferência não encontrada' });
        }

        const transf = rows[0];

        // Buscar itens
        const [itens] = await db.query(
            'SELECT codigo_produto as codigo, quantidade_solicitada as solicitada, quantidade_atendida as atendida FROM itens_transferencia WHERE transferencia_id = ?',
            [transf.id]
        );
        transf.itens = itens;

        // Buscar tags
        const [tags] = await db.query(`
            SELECT t.nome 
            FROM tags t
            INNER JOIN transferencia_tags tt ON t.id = tt.tag_id
            WHERE tt.transferencia_id = ?
        `, [transf.id]);
        transf.tags = tags.map(t => t.nome);
        transf.numeroTransferenciaInterna = transf.numero_transferencia_interna;

        res.json(transf);
    } catch (error) {
        console.error('Erro ao buscar transferência:', error);
        res.status(500).json({ error: 'Erro ao buscar transferência' });
    }
});

// GET - Verificar se produto já está em transferência ativa para o destino
app.get('/api/verificar-produto/:codigo/:destino', verificarToken, async (req, res) => {
    try {
        const { codigo, destino } = req.params;
        const empresa_id = req.usuario.empresa_id;
        
        const [rows] = await db.query(`
            SELECT t.id, t.origem, t.destino, t.status, it.quantidade_solicitada
            FROM itens_transferencia it
            INNER JOIN transferencias t ON it.transferencia_id = t.id
            WHERE it.codigo_produto = ?
              AND t.destino = ?
              AND t.empresa_id = ?
              AND t.status IN ('pendente', 'em_separacao', 'aguardando_lancamento', 'concluido')
            ORDER BY t.created_at DESC
            LIMIT 1
        `, [codigo, destino, empresa_id]);
        
        if (rows.length > 0) {
            const transferencia = rows[0];
            const statusTexto = {
                'pendente': 'Pendente',
                'em_separacao': 'Em Separação',
                'aguardando_lancamento': 'Aguardando Lançamento',
                'concluido': 'Concluído'
            }[transferencia.status] || transferencia.status;
            
            return res.json({
                duplicado: true,
                transferencia_id: transferencia.id,
                status: statusTexto,
                quantidade: transferencia.quantidade_solicitada,
                mensagem: `Este produto já está na transferência ${transferencia.id} (Status: ${statusTexto}) para o destino ${transferencia.destino}.`
            });
        }
        
        res.json({ duplicado: false });
    } catch (error) {
        console.error('Erro ao verificar produto:', error);
        res.status(500).json({ error: 'Erro ao verificar produto' });
    }
});

// POST - Criar nova transferência
app.post('/api/transferencias', verificarToken, async (req, res) => {
    const { id, origem, destino, filial_origem_id, filial_destino_id, solicitante, data, status, tags, itens } = req.body;
    const empresa_id = req.usuario.empresa_id;
    const usuario_id = req.usuario.id;
    
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        // Inserir transferência
        await connection.query(
            'INSERT INTO transferencias (id, empresa_id, usuario_id, origem, destino, filial_origem_id, filial_destino_id, solicitante, data_criacao, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, empresa_id, usuario_id, origem, destino, filial_origem_id, filial_destino_id, solicitante, data, status || 'pendente']
        );

        // Inserir itens
        if (itens && itens.length > 0) {
            for (let item of itens) {
                await connection.query(
                    'INSERT INTO itens_transferencia (transferencia_id, codigo_produto, quantidade_solicitada, quantidade_atendida) VALUES (?, ?, ?, ?)',
                    [id, item.codigo, item.solicitada, item.atendida || 0]
                );
            }
        }

        // Inserir tags
        if (tags && tags.length > 0) {
            for (let tagNome of tags) {
                // Buscar ou criar tag (por empresa)
                let [tagRows] = await connection.query(
                    'SELECT id FROM tags WHERE nome = ? AND empresa_id = ?', 
                    [tagNome, empresa_id]
                );
                let tagId;

                if (tagRows.length === 0) {
                    const [result] = await connection.query(
                        'INSERT INTO tags (nome, empresa_id) VALUES (?, ?)', 
                        [tagNome, empresa_id]
                    );
                    tagId = result.insertId;
                } else {
                    tagId = tagRows[0].id;
                }

                // Relacionar tag com transferência
                await connection.query(
                    'INSERT INTO transferencia_tags (transferencia_id, tag_id) VALUES (?, ?)',
                    [id, tagId]
                );
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'Transferência criada com sucesso', id });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao criar transferência:', error);
        res.status(500).json({ error: 'Erro ao criar transferência' });
    } finally {
        connection.release();
    }
});

// PUT - Atualizar rascunho
app.put('/api/transferencias/:id', verificarToken, async (req, res) => {
    const { origem, destino, filial_origem_id, filial_destino_id, solicitante, tags, itens } = req.body;
    const id = req.params.id;
    const usuarioId = req.usuario.id;
    const empresaUsuarioId = req.usuario.empresa_id;
    
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Verificar status e proprietário
        const [transf] = await connection.query(
            'SELECT status, usuario_id, empresa_id FROM transferencias WHERE id = ?',
            [id]
        );
        
        if (transf.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Transferência não encontrada' });
        }

        const transferencia = transf[0];

        if (transferencia.empresa_id !== empresaUsuarioId) {
            await connection.rollback();
            return res.status(403).json({ error: 'Você não tem permissão para editar esta transferência' });
        }

        const isRascunho = transferencia.status === 'rascunho';
        const isPendenteDoCriador = transferencia.status === 'pendente' && transferencia.usuario_id === usuarioId;

        if (!isRascunho && !isPendenteDoCriador) {
            await connection.rollback();
            return res.status(403).json({ error: 'Apenas rascunhos ou transferências pendentes criadas por você podem ser editadas' });
        }
        
        // Atualizar transferência
        await connection.query(
            'UPDATE transferencias SET origem = ?, destino = ?, filial_origem_id = ?, filial_destino_id = ?, solicitante = ? WHERE id = ?',
            [origem, destino, filial_origem_id, filial_destino_id, solicitante, id]
        );
        
        // Remover itens antigos
        await connection.query(
            'DELETE FROM itens_transferencia WHERE transferencia_id = ?',
            [id]
        );
        
        // Inserir novos itens
        if (itens && itens.length > 0) {
            for (let item of itens) {
                await connection.query(
                    'INSERT INTO itens_transferencia (transferencia_id, codigo_produto, quantidade_solicitada, quantidade_atendida) VALUES (?, ?, ?, ?)',
                    [id, item.codigo, item.solicitada, item.atendida || 0]
                );
            }
        }
        
        // Remover tags antigas
        await connection.query(
            'DELETE FROM transferencia_tags WHERE transferencia_id = ?',
            [id]
        );
        
        // Inserir novas tags
        if (tags && tags.length > 0) {
            const empresa_id = req.usuario.empresa_id;
            for (let tagNome of tags) {
                let [tagRows] = await connection.query(
                    'SELECT id FROM tags WHERE nome = ? AND empresa_id = ?',
                    [tagNome, empresa_id]
                );
                let tagId;
                
                if (tagRows.length === 0) {
                    const [result] = await connection.query(
                        'INSERT INTO tags (nome, empresa_id) VALUES (?, ?)',
                        [tagNome, empresa_id]
                    );
                    tagId = result.insertId;
                } else {
                    tagId = tagRows[0].id;
                }
                
                await connection.query(
                    'INSERT INTO transferencia_tags (transferencia_id, tag_id) VALUES (?, ?)',
                    [id, tagId]
                );
            }
        }
        
        await connection.commit();
        res.json({ message: 'Transferência atualizada com sucesso' });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao atualizar transferência:', error);
        res.status(500).json({ error: 'Erro ao atualizar transferência' });
    } finally {
        connection.release();
    }
});

// PUT - Atualizar status da transferência
app.put('/api/transferencias/:id/status', verificarToken, async (req, res) => {
    const { status } = req.body;
    
    try {
        const acesso = await validarAcessoTransferencia(req.params.id, req.usuario);
        if (!acesso.autorizado) {
            return res.status(acesso.status).json({ error: acesso.mensagem });
        }

        // Montar query dinâmica baseada no status
        let updateFields = 'status = ?';
        let updateValues = [status];
        
        // Registrar timestamps automaticamente
        if (status === 'em_separacao') {
            updateFields += ', data_inicio_separacao = NOW()';
        } else if (status === 'aguardando_lancamento') {
            updateFields += ', data_fim_separacao = NOW()';
        } else if (status === 'recebido') {
            updateFields += ', data_recebimento = NOW()';
        }
        
        updateValues.push(req.params.id);
        
        await db.query(
            `UPDATE transferencias SET ${updateFields} WHERE id = ?`,
            updateValues
        );
        res.json({ message: 'Status atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ error: 'Erro ao atualizar status' });
    }
});

// PUT - Atualizar quantidades atendidas
app.put('/api/transferencias/:id/itens', verificarToken, async (req, res) => {
    const { itens } = req.body;
    let connection;
    
    try {
        const acesso = await validarAcessoTransferencia(req.params.id, req.usuario);
        if (!acesso.autorizado) {
            return res.status(acesso.status).json({ error: acesso.mensagem });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        for (let item of itens) {
            await connection.query(
                'UPDATE itens_transferencia SET quantidade_atendida = ? WHERE transferencia_id = ? AND codigo_produto = ?',
                [item.atendida, req.params.id, item.codigo]
            );
        }

        await connection.commit();
        res.json({ message: 'Quantidades atualizadas com sucesso' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro ao atualizar itens:', error);
        res.status(500).json({ error: 'Erro ao atualizar itens' });
    } finally {
        if (connection) connection.release();
    }
});

// PUT - Atualizar etapa/status da transferência
app.put('/api/transferencias/:id/etapa', verificarToken, async (req, res) => {
    const { status, observacao_recebimento, adicionarTagDivergencia } = req.body;
    const id = req.params.id;
    
    let query = '';
    let params = [];
    
    try {
        const acesso = await validarAcessoTransferencia(id, req.usuario);
        if (!acesso.autorizado) {
            return res.status(acesso.status).json({ error: acesso.mensagem });
        }

        const statusValidos = ['aguardando_separacao', 'em_separacao', 'separado', 'aguardando_lancamento', 'recebido', 'concluido', 'cancelado'];
        if (!statusValidos.includes(status)) {
            return res.status(400).json({ error: 'Status inválido' });
        }
        
        const [columns] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'transferencias' 
              AND TABLE_SCHEMA = DATABASE()
        `);
        
        const columnNames = columns.map(c => c.COLUMN_NAME);
        const hasDateColumns = columnNames.includes('data_inicio_separacao');
        
        let campoData = null;
        if (hasDateColumns) {
            if (status === 'em_separacao') {
                campoData = 'data_inicio_separacao';
            } else if (status === 'separado' || status === 'aguardando_lancamento') {
                campoData = 'data_fim_separacao';
            } else if (status === 'recebido' || status === 'concluido') {
                campoData = 'data_recebimento';
            }
        }
        
        query = 'UPDATE transferencias SET status = ?';
        params = [status];

        let deveAtualizarObservacao = false;
        let observacaoNormalizada = null;
        if (status === 'recebido' && typeof observacao_recebimento !== 'undefined') {
            deveAtualizarObservacao = true;
            if (typeof observacao_recebimento === 'string') {
                const texto = observacao_recebimento.trim();
                observacaoNormalizada = texto.length > 0 ? texto : null;
            } else if (observacao_recebimento === null) {
                observacaoNormalizada = null;
            }
        }
        
        if (campoData) {
            query += `, ${campoData} = NOW()`;
        }

        if (deveAtualizarObservacao) {
            query += ', observacao_recebimento = ?';
            params.push(observacaoNormalizada);
        }
        
        query += ' WHERE id = ?';
        params.push(id);
        
        console.log('🛠️ Atualizando status:', { id, status, query, params, hasDateColumns });
        
        await db.query(query, params);

        if (status === 'recebido' && adicionarTagDivergencia) {
            const empresaId = req.usuario.empresa_id;
            const tagNome = 'Divergencia';

            let [tagRows] = await db.query(
                'SELECT id FROM tags WHERE nome = ? AND empresa_id = ?',
                [tagNome, empresaId]
            );
            let tagId;

            if (tagRows.length === 0) {
                const [result] = await db.query(
                    'INSERT INTO tags (nome, empresa_id) VALUES (?, ?)',
                    [tagNome, empresaId]
                );
                tagId = result.insertId;
            } else {
                tagId = tagRows[0].id;
            }

            const [relacao] = await db.query(
                'SELECT 1 FROM transferencia_tags WHERE transferencia_id = ? AND tag_id = ?',
                [id, tagId]
            );

            if (relacao.length === 0) {
                await db.query(
                    'INSERT INTO transferencia_tags (transferencia_id, tag_id) VALUES (?, ?)',
                    [id, tagId]
                );
            }
        }
        
        console.log('✅ Status atualizado com sucesso');
        res.json({ message: 'Status atualizado com sucesso', status });
    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
        console.error('Query:', query);
        console.error('Params:', params);
        res.status(500).json({ error: 'Erro ao atualizar status', detalhes: error.message });
    }
});
// PUT - Finalizar transferência (adicionar número interno)
app.put('/api/transferencias/:id/finalizar', verificarToken, async (req, res) => {
    const { numeroTransferenciaInterna } = req.body;
    
    try {
        const acesso = await validarAcessoTransferencia(req.params.id, req.usuario);
        if (!acesso.autorizado) {
            return res.status(acesso.status).json({ error: acesso.mensagem });
        }

        await db.query(
            'UPDATE transferencias SET numero_transferencia_interna = ?, status = ? WHERE id = ?',
            [numeroTransferenciaInterna, 'concluido', req.params.id]
        );
        res.json({ message: 'Transferência finalizada com sucesso' });
    } catch (error) {
        console.error('Erro ao finalizar transferência:', error);
        res.status(500).json({ error: 'Erro ao finalizar transferência' });
    }
});

// DELETE - Excluir transferência (somente administradores)
app.delete('/api/transferencias/:id', verificarToken, verificarRole('admin'), async (req, res) => {
    const { id } = req.params;
    const empresa_id = req.usuario.empresa_id;
    
    try {
        const [result] = await db.query(
            'DELETE FROM transferencias WHERE id = ? AND empresa_id = ?',
            [id, empresa_id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Transferência não encontrada' });
        }
        
        res.json({ message: 'Transferência excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir transferência:', error);
        res.status(500).json({ error: 'Erro ao excluir transferência' });
    }
});


// ========================================
// ROTAS DE FILIAIS
// ========================================

// GET - Listar todas as filiais da empresa
app.get('/api/filiais', verificarToken, async (req, res) => {
    try {
        const empresa_id = req.usuario.empresa_id;
        
        const [filiais] = await db.query(
            'SELECT * FROM filiais WHERE empresa_id = ? ORDER BY nome',
            [empresa_id]
        );
        
        res.json(filiais);
    } catch (error) {
        console.error('Erro ao buscar filiais:', error);
        res.status(500).json({ error: 'Erro ao buscar filiais' });
    }
});

// POST - Criar nova filial (apenas admin)
app.post('/api/filiais', verificarToken, verificarRole('admin'), async (req, res) => {
    const { nome, codigo, endereco, cidade, estado, telefone } = req.body;
    const empresa_id = req.usuario.empresa_id;
    
    try {
        // Verificar se já existe filial com esse nome na empresa
        const [existente] = await db.query(
            'SELECT id FROM filiais WHERE empresa_id = ? AND nome = ?',
            [empresa_id, nome]
        );
        
        if (existente.length > 0) {
            return res.status(400).json({ error: 'Já existe uma filial com este nome' });
        }
        
        const [result] = await db.query(
            'INSERT INTO filiais (empresa_id, nome, codigo, endereco, cidade, estado, telefone) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [empresa_id, nome, codigo, endereco, cidade, estado, telefone]
        );
        
        res.status(201).json({ 
            message: 'Filial criada com sucesso',
            id: result.insertId
        });
    } catch (error) {
        console.error('Erro ao criar filial:', error);
        res.status(500).json({ error: 'Erro ao criar filial' });
    }
});

// PUT - Atualizar filial (apenas admin)
app.put('/api/filiais/:id', verificarToken, verificarRole('admin'), async (req, res) => {
    const { nome, codigo, endereco, cidade, estado, telefone, ativo } = req.body;
    const empresa_id = req.usuario.empresa_id;
    const filial_id = req.params.id;
    
    try {
        // Verificar se a filial pertence à empresa
        const [filial] = await db.query(
            'SELECT id FROM filiais WHERE id = ? AND empresa_id = ?',
            [filial_id, empresa_id]
        );
        
        if (filial.length === 0) {
            return res.status(404).json({ error: 'Filial não encontrada' });
        }
        
        await db.query(
            'UPDATE filiais SET nome = ?, codigo = ?, endereco = ?, cidade = ?, estado = ?, telefone = ?, ativo = ? WHERE id = ?',
            [nome, codigo, endereco, cidade, estado, telefone, ativo, filial_id]
        );
        
        res.json({ message: 'Filial atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar filial:', error);
        res.status(500).json({ error: 'Erro ao atualizar filial' });
    }
});

// DELETE - Deletar filial (apenas admin)
app.delete('/api/filiais/:id', verificarToken, verificarRole('admin'), async (req, res) => {
    const empresa_id = req.usuario.empresa_id;
    const filial_id = req.params.id;
    
    try {
        // Verificar se a filial pertence à empresa
        const [filial] = await db.query(
            'SELECT id FROM filiais WHERE id = ? AND empresa_id = ?',
            [filial_id, empresa_id]
        );
        
        if (filial.length === 0) {
            return res.status(404).json({ error: 'Filial não encontrada' });
        }
        
        // Verificar se há usuários vinculados
        const [usuarios] = await db.query(
            'SELECT COUNT(*) as total FROM usuarios WHERE filial_id = ?',
            [filial_id]
        );
        
        if (usuarios[0].total > 0) {
            return res.status(400).json({ 
                error: `Não é possível deletar. Existem ${usuarios[0].total} usuário(s) vinculado(s) a esta filial.` 
            });
        }
        
        await db.query('DELETE FROM filiais WHERE id = ?', [filial_id]);
        
        res.json({ message: 'Filial deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar filial:', error);
        res.status(500).json({ error: 'Erro ao deletar filial' });
    }
});

// ========================================
// ROTAS DE USUÁRIOS (GERENCIAMENTO)
// ========================================

// GET - Listar usuários da empresa (apenas admin e gerente)
app.get('/api/usuarios', verificarToken, verificarRole('admin', 'gerente'), async (req, res) => {
    try {
        const empresa_id = req.usuario.empresa_id;
        const filial_id = req.query.filial_id; // Opcional: filtrar por filial
        
        let query = `
            SELECT u.id, u.nome, u.email, u.role, u.ativo, u.filial_id,
                   f.nome as filial_nome, u.created_at
            FROM usuarios u
            LEFT JOIN filiais f ON u.filial_id = f.id
            WHERE u.empresa_id = ?
        `;
        const params = [empresa_id];
        
        if (filial_id) {
            query += ' AND u.filial_id = ?';
            params.push(filial_id);
        }
        
        query += ' ORDER BY u.nome';
        
        const [usuarios] = await db.query(query, params);
        
        res.json(usuarios);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

// POST - Criar usuário na filial (apenas admin)
app.post('/api/usuarios', verificarToken, verificarRole('admin'), async (req, res) => {
    const { nome, email, senha, role, filial_id } = req.body;
    const empresa_id = req.usuario.empresa_id;
    
    try {
        // Verificar se email já existe
        const [usuariosExistentes] = await db.query(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );
        
        if (usuariosExistentes.length > 0) {
            return res.status(400).json({ error: 'E-mail já cadastrado' });
        }
        
        // Verificar se a filial pertence à empresa
        if (filial_id) {
            const [filial] = await db.query(
                'SELECT id FROM filiais WHERE id = ? AND empresa_id = ?',
                [filial_id, empresa_id]
            );
            
            if (filial.length === 0) {
                return res.status(400).json({ error: 'Filial inválida' });
            }
        }
        
        // Hash da senha
        const senhaHash = await bcrypt.hash(senha, 10);
        
        await db.query(
            'INSERT INTO usuarios (empresa_id, filial_id, nome, email, senha, role, ativo) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
            [empresa_id, filial_id, nome, email, senhaHash, role || 'operador']
        );
        
        res.status(201).json({ message: 'Usuário criado com sucesso' });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// PUT - Atualizar usuário (apenas admin)
app.put('/api/usuarios/:id', verificarToken, verificarRole('admin'), async (req, res) => {
    const { nome, email, role, filial_id, ativo, senha } = req.body;
    const empresa_id = req.usuario.empresa_id;
    const usuario_id = req.params.id;
    
    try {
        // Verificar se o usuário pertence à empresa
        const [usuario] = await db.query(
            'SELECT id FROM usuarios WHERE id = ? AND empresa_id = ?',
            [usuario_id, empresa_id]
        );
        
        if (usuario.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        // Verificar se a filial pertence à empresa
        if (filial_id) {
            const [filial] = await db.query(
                'SELECT id FROM filiais WHERE id = ? AND empresa_id = ?',
                [filial_id, empresa_id]
            );
            
            if (filial.length === 0) {
                return res.status(400).json({ error: 'Filial inválida' });
            }
        }
        
        let query = 'UPDATE usuarios SET nome = ?, email = ?, role = ?, filial_id = ?, ativo = ?';
        let params = [nome, email, role, filial_id, ativo];
        
        // Se enviou nova senha, atualizar
        if (senha) {
            const senhaHash = await bcrypt.hash(senha, 10);
            query += ', senha = ?';
            params.push(senhaHash);
        }
        
        query += ' WHERE id = ?';
        params.push(usuario_id);
        
        await db.query(query, params);
        
        res.json({ message: 'Usuário atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

// DELETE - Deletar usuário (apenas admin)
app.delete('/api/usuarios/:id', verificarToken, verificarRole('admin'), async (req, res) => {
    const empresa_id = req.usuario.empresa_id;
    const usuario_id = req.params.id;
    
    try {
        // Não permitir deletar a si mesmo
        if (req.usuario.id == usuario_id) {
            return res.status(400).json({ error: 'Você não pode deletar sua própria conta' });
        }
        
        // Verificar se o usuário pertence à empresa
        const [usuario] = await db.query(
            'SELECT id FROM usuarios WHERE id = ? AND empresa_id = ?',
            [usuario_id, empresa_id]
        );
        
        if (usuario.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        await db.query('DELETE FROM usuarios WHERE id = ?', [usuario_id]);
        
        res.json({ message: 'Usuário deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
});

// ========================================
// ROTAS DE TAGS
// ========================================

// GET - Listar todas as tags (filtradas por empresa)
app.get('/api/tags', verificarToken, async (req, res) => {
    try {
        const empresa_id = req.usuario.empresa_id;
        const [tags] = await db.query(
            'SELECT * FROM tags WHERE empresa_id = ? ORDER BY nome',
            [empresa_id]
        );
        res.json(tags);
    } catch (error) {
        console.error('Erro ao buscar tags:', error);
        res.status(500).json({ error: 'Erro ao buscar tags' });
    }
});

// POST - Criar nova tag (admin/gerente)
app.post('/api/tags', verificarToken, verificarRole('admin', 'gerente'), async (req, res) => {
    const { nome, cor } = req.body;
    const empresa_id = req.usuario.empresa_id;
    
    if (!nome || nome.trim() === '') {
        return res.status(400).json({ error: 'O nome da tag é obrigatório' });
    }
    
    try {
        // Verificar se já existe
        const [existente] = await db.query(
            'SELECT id FROM tags WHERE empresa_id = ? AND nome = ?',
            [empresa_id, nome.trim()]
        );
        
        if (existente.length > 0) {
            return res.status(400).json({ error: 'Já existe uma tag com este nome' });
        }
        
        const corFinal = cor || '#1e3c72'; // Cor padrão se não especificada
        
        const [result] = await db.query(
            'INSERT INTO tags (empresa_id, nome, cor) VALUES (?, ?, ?)',
            [empresa_id, nome.trim(), corFinal]
        );
        
        res.status(201).json({ 
            message: 'Tag criada com sucesso',
            id: result.insertId,
            nome: nome.trim(),
            cor: corFinal
        });
    } catch (error) {
        console.error('Erro ao criar tag:', error);
        res.status(500).json({ error: 'Erro ao criar tag' });
    }
});

// PUT - Atualizar tag (admin/gerente)
app.put('/api/tags/:id', verificarToken, verificarRole('admin', 'gerente'), async (req, res) => {
    const { id } = req.params;
    const { nome, cor } = req.body;
    const empresa_id = req.usuario.empresa_id;
    
    if (!nome || nome.trim() === '') {
        return res.status(400).json({ error: 'O nome da tag é obrigatório' });
    }
    
    try {
        // Verificar se a tag pertence à empresa
        const [tag] = await db.query(
            'SELECT id FROM tags WHERE id = ? AND empresa_id = ?',
            [id, empresa_id]
        );
        
        if (tag.length === 0) {
            return res.status(404).json({ error: 'Tag não encontrada' });
        }
        
        // Verificar se já existe outra tag com esse nome
        const [existente] = await db.query(
            'SELECT id FROM tags WHERE empresa_id = ? AND nome = ? AND id != ?',
            [empresa_id, nome.trim(), id]
        );
        
        if (existente.length > 0) {
            return res.status(400).json({ error: 'Já existe outra tag com este nome' });
        }
        
        const corFinal = cor || '#1e3c72';
        
        await db.query(
            'UPDATE tags SET nome = ?, cor = ? WHERE id = ? AND empresa_id = ?',
            [nome.trim(), corFinal, id, empresa_id]
        );
        
        res.json({ message: 'Tag atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar tag:', error);
        res.status(500).json({ error: 'Erro ao atualizar tag' });
    }
});

// DELETE - Deletar tag (admin/gerente)
app.delete('/api/tags/:id', verificarToken, verificarRole('admin', 'gerente'), async (req, res) => {
    const { id } = req.params;
    const empresa_id = req.usuario.empresa_id;
    
    try {
        // Verificar se a tag pertence à empresa
        const [tag] = await db.query(
            'SELECT id FROM tags WHERE id = ? AND empresa_id = ?',
            [id, empresa_id]
        );
        
        if (tag.length === 0) {
            return res.status(404).json({ error: 'Tag não encontrada' });
        }
        
        await db.query(
            'DELETE FROM tags WHERE id = ? AND empresa_id = ?',
            [id, empresa_id]
        );
        
        res.json({ message: 'Tag deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar tag:', error);
        res.status(500).json({ error: 'Erro ao deletar tag' });
    }
});

// ========================================
// ROTA DE TESTE
// ========================================

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'API StokLink funcionando!' });
});

// ========================================
// ROTAS DE CHAT
// ========================================

// GET - Buscar mensagens do chat entre duas filiais
app.get('/api/mensagens', verificarToken, async (req, res) => {
    try {
        const empresa_id = req.usuario.empresa_id;
        const minhaFilial = req.query.minhaFilial;
        const outraFilial = req.query.outraFilial;
        const limite = parseInt(req.query.limite) || 50;
        const ultimoId = parseInt(req.query.ultimoId) || 0;
        
        console.log('📥 Buscando mensagens:', { empresa_id, minhaFilial, outraFilial, limite, ultimoId });
        
        if (!minhaFilial || !outraFilial) {
            return res.status(400).json({ error: 'minhaFilial e outraFilial são obrigatórios' });
        }
        
        // Buscar mensagens entre as duas filiais (nos dois sentidos)
        let query = `
            SELECT m.id, m.mensagem, m.created_at, m.filial_origem, m.filial_destino, m.reacoes, m.reply_to_id,
                   u.nome as usuario_nome, u.id as usuario_id,
                   rm.mensagem as reply_mensagem, ru.nome as reply_usuario_nome
            FROM mensagens m
            INNER JOIN usuarios u ON m.usuario_id = u.id
            LEFT JOIN mensagens rm ON m.reply_to_id = rm.id
            LEFT JOIN usuarios ru ON rm.usuario_id = ru.id
            WHERE m.empresa_id = ?
              AND (
                  (m.filial_origem = ? AND m.filial_destino = ?)
                  OR 
                  (m.filial_origem = ? AND m.filial_destino = ?)
              )
        `;
        
        const params = [empresa_id, minhaFilial, outraFilial, outraFilial, minhaFilial];
        
        // Se tem ultimoId, buscar apenas mensagens novas
        if (ultimoId > 0) {
            query += ' AND m.id > ?';
            params.push(ultimoId);
        }
        
        query += ' ORDER BY m.created_at DESC LIMIT ?';
        params.push(limite);
        
        const [mensagens] = await db.query(query, params);
        
        console.log(`✅ ${mensagens.length} mensagens encontradas`);
        
        // Inverter ordem para exibir do mais antigo para o mais novo
        res.json(mensagens.reverse());
    } catch (error) {
        console.error('❌ Erro ao buscar mensagens:', error);
        res.status(500).json({ error: 'Erro ao buscar mensagens', detalhes: error.message });
    }
});

// POST - Enviar mensagem no chat
app.post('/api/mensagens', verificarToken, async (req, res) => {
    try {
        const { mensagem, filialOrigem, filialDestino, replyToId } = req.body;
        const empresa_id = req.usuario.empresa_id;
        const usuario_id = req.usuario.id;
        
        console.log('📨 Nova mensagem:', { empresa_id, usuario_id, filialOrigem, filialDestino, replyToId, mensagem: mensagem?.substring(0, 50) });
        
        if (!mensagem || mensagem.trim().length === 0) {
            return res.status(400).json({ error: 'Mensagem não pode ser vazia' });
        }
        
        if (!filialOrigem || !filialDestino) {
            return res.status(400).json({ error: 'Filial de origem e destino são obrigatórios' });
        }
        
        if (mensagem.length > 1000) {
            return res.status(400).json({ error: 'Mensagem muito longa (máximo 1000 caracteres)' });
        }
        
        const [result] = await db.query(
            'INSERT INTO mensagens (empresa_id, usuario_id, mensagem, filial_origem, filial_destino, reply_to_id) VALUES (?, ?, ?, ?, ?, ?)',
            [empresa_id, usuario_id, mensagem.trim(), filialOrigem, filialDestino, replyToId || null]
        );
        
        console.log('✅ Mensagem inserida, ID:', result.insertId);
        
        // Buscar a mensagem recém-criada com dados do usuário
        const [mensagens] = await db.query(`
            SELECT m.id, m.mensagem, m.created_at, m.filial_origem, m.filial_destino, m.reacoes, m.reply_to_id,
                   u.nome as usuario_nome, u.id as usuario_id,
                   rm.mensagem as reply_mensagem, ru.nome as reply_usuario_nome
            FROM mensagens m
            INNER JOIN usuarios u ON m.usuario_id = u.id
            LEFT JOIN mensagens rm ON m.reply_to_id = rm.id
            LEFT JOIN usuarios ru ON rm.usuario_id = ru.id
            WHERE m.id = ?
        `, [result.insertId]);
        
        res.status(201).json(mensagens[0]);
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Erro ao enviar mensagem', detalhes: error.message });
    }
});

// POST - Adicionar/Remover reação em mensagem
app.post('/api/mensagens/:id/reacao', verificarToken, async (req, res) => {
    try {
        const mensagemId = parseInt(req.params.id);
        const { emoji } = req.body;
        const usuarioId = req.usuario.id;
        
        if (!emoji) {
            return res.status(400).json({ error: 'Emoji é obrigatório' });
        }
        
        // Buscar mensagem atual
        const [mensagens] = await db.query('SELECT reacoes FROM mensagens WHERE id = ?', [mensagemId]);
        
        if (mensagens.length === 0) {
            return res.status(404).json({ error: 'Mensagem não encontrada' });
        }
        
        // Parse das reações existentes
        let reacoes = mensagens[0].reacoes || {};
        if (typeof reacoes === 'string') {
            reacoes = JSON.parse(reacoes);
        }
        
        // Se o emoji não existe, criar array
        if (!reacoes[emoji]) {
            reacoes[emoji] = [];
        }
        
        // Verificar se o usuário já reagiu com esse emoji
        const indexUsuario = reacoes[emoji].indexOf(usuarioId);
        
        if (indexUsuario > -1) {
            // Remover reação
            reacoes[emoji].splice(indexUsuario, 1);
            // Se não tem mais ninguém com esse emoji, remover o emoji
            if (reacoes[emoji].length === 0) {
                delete reacoes[emoji];
            }
        } else {
            // Adicionar reação
            reacoes[emoji].push(usuarioId);
        }
        
        // Atualizar no banco
        await db.query(
            'UPDATE mensagens SET reacoes = ? WHERE id = ?',
            [JSON.stringify(reacoes), mensagemId]
        );
        
        res.json({ success: true, reacoes });
    } catch (error) {
        console.error('❌ Erro ao reagir à mensagem:', error);
        res.status(500).json({ error: 'Erro ao processar reação' });
    }
});

// ========================================
// INICIAR SERVIDOR
// ========================================

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📡 API disponível em http://localhost:${PORT}/api`);
});
