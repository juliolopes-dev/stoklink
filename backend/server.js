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
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// ========================================
// ROTAS DE AUTENTICAÇÃO
// ========================================

// POST - Login
app.post('/api/auth/login', async (req, res) => {
    const { email, senha } = req.body;
    
    try {
        const [usuarios] = await db.query(`
            SELECT u.*, e.nome as empresa_nome 
            FROM usuarios u
            INNER JOIN empresas e ON u.empresa_id = e.id
            WHERE u.email = ? AND u.ativo = TRUE AND e.ativo = TRUE
        `, [email]);

        if (usuarios.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas ou cadastro aguardando aprovação' });
        }

        const usuario = usuarios[0];
        
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
            role: usuario.role
        }, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.json({
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                role: usuario.role,
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
            SELECT * FROM transferencias 
            WHERE empresa_id = ?
            ORDER BY data_criacao DESC
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

            // Formatar data
            transf.data = new Date(transf.data_criacao).toLocaleDateString('pt-BR');
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
        const [rows] = await db.query('SELECT * FROM transferencias WHERE id = ?', [req.params.id]);
        
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

        transf.data = new Date(transf.data_criacao).toLocaleDateString('pt-BR');
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
    const { id, origem, destino, solicitante, data, status, tags, itens } = req.body;
    const empresa_id = req.usuario.empresa_id;
    const usuario_id = req.usuario.id;
    
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        // Inserir transferência
        await connection.query(
            'INSERT INTO transferencias (id, empresa_id, usuario_id, origem, destino, solicitante, data_criacao, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, empresa_id, usuario_id, origem, destino, solicitante, data, status || 'pendente']
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

// PUT - Atualizar status da transferência
app.put('/api/transferencias/:id/status', verificarToken, async (req, res) => {
    const { status } = req.body;
    
    try {
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
    const connection = await db.getConnection();
    
    try {
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
        await connection.rollback();
        console.error('Erro ao atualizar itens:', error);
        res.status(500).json({ error: 'Erro ao atualizar itens' });
    } finally {
        connection.release();
    }
});

// PUT - Finalizar transferência (adicionar número interno)
app.put('/api/transferencias/:id/finalizar', verificarToken, async (req, res) => {
    const { numeroTransferenciaInterna } = req.body;
    
    try {
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

// GET - Buscar mensagens do chat da empresa
app.get('/api/mensagens', verificarToken, async (req, res) => {
    try {
        const empresa_id = req.usuario.empresa_id;
        const limite = parseInt(req.query.limite) || 50;
        const ultimoId = parseInt(req.query.ultimoId) || 0;
        
        let query = `
            SELECT m.id, m.mensagem, m.created_at,
                   u.nome as usuario_nome, u.id as usuario_id
            FROM mensagens m
            INNER JOIN usuarios u ON m.usuario_id = u.id
            WHERE m.empresa_id = ?
        `;
        
        const params = [empresa_id];
        
        // Se tem ultimoId, buscar apenas mensagens novas
        if (ultimoId > 0) {
            query += ' AND m.id > ?';
            params.push(ultimoId);
        }
        
        query += ' ORDER BY m.created_at DESC LIMIT ?';
        params.push(limite);
        
        const [mensagens] = await db.query(query, params);
        
        // Inverter ordem para exibir do mais antigo para o mais novo
        res.json(mensagens.reverse());
    } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
        res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }
});

// POST - Enviar mensagem no chat
app.post('/api/mensagens', verificarToken, async (req, res) => {
    try {
        const { mensagem } = req.body;
        const empresa_id = req.usuario.empresa_id;
        const usuario_id = req.usuario.id;
        
        console.log('📨 Nova mensagem:', { empresa_id, usuario_id, mensagem: mensagem?.substring(0, 50) });
        
        if (!mensagem || mensagem.trim().length === 0) {
            return res.status(400).json({ error: 'Mensagem não pode ser vazia' });
        }
        
        if (mensagem.length > 1000) {
            return res.status(400).json({ error: 'Mensagem muito longa (máximo 1000 caracteres)' });
        }
        
        const [result] = await db.query(
            'INSERT INTO mensagens (empresa_id, usuario_id, mensagem) VALUES (?, ?, ?)',
            [empresa_id, usuario_id, mensagem.trim()]
        );
        
        console.log('✅ Mensagem inserida, ID:', result.insertId);
        
        // Buscar a mensagem recém-criada com dados do usuário
        const [mensagens] = await db.query(`
            SELECT m.id, m.mensagem, m.created_at,
                   u.nome as usuario_nome, u.id as usuario_id
            FROM mensagens m
            INNER JOIN usuarios u ON m.usuario_id = u.id
            WHERE m.id = ?
        `, [result.insertId]);
        
        res.status(201).json(mensagens[0]);
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Erro ao enviar mensagem', detalhes: error.message });
    }
});

// ========================================
// INICIAR SERVIDOR
// ========================================

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📡 API disponível em http://localhost:${PORT}/api`);
});
