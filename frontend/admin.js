// ====================================
// CONFIGURAÇÃO DA API
// ====================================

// Detectar ambiente automaticamente
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname.includes('192.168') ||
                window.location.protocol === 'file:';

const API_URL = isLocal ? `http://${window.location.hostname}:3001` : window.location.origin;

// Função auxiliar para fazer requisições autenticadas
async function apiFetch(endpoint, options = {}) {
    const token = sessionStorage.getItem('stoklink_token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });
        
        // Se token expirou ou inválido, fazer logout
        if (response.status === 401) {
            sessionStorage.removeItem('stoklink_token');
            sessionStorage.removeItem('stoklink_user');
            window.location.href = 'login.html';
            throw new Error('Sessão expirada');
        }
        
        return response;
    } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
    }
}

// ====================================
// SISTEMA DE MODAL PERSONALIZADO
// ====================================

function showAlert(message, title = 'Aviso', type = 'info') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalIcon = document.getElementById('modal-icon');
        const btnConfirm = document.getElementById('modal-btn-confirm');
        const btnCancel = document.getElementById('modal-btn-cancel');
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        btnCancel.style.display = 'none';
        btnConfirm.textContent = 'OK';
        
        const icons = {
            success: '✓',
            warning: '⚠',
            danger: '✕',
            info: 'ℹ'
        };
        
        modalIcon.textContent = icons[type] || icons.info;
        modalIcon.className = `modal-icon ${type}`;
        
        modal.classList.add('show');
        
        const handleConfirm = () => {
            modal.classList.remove('show');
            btnConfirm.removeEventListener('click', handleConfirm);
            resolve(true);
        };
        
        btnConfirm.addEventListener('click', handleConfirm);
    });
}

function showConfirm(message, title = 'Confirmação', type = 'warning') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalIcon = document.getElementById('modal-icon');
        const btnConfirm = document.getElementById('modal-btn-confirm');
        const btnCancel = document.getElementById('modal-btn-cancel');
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        btnCancel.style.display = 'inline-flex';
        btnConfirm.textContent = 'Confirmar';
        
        const icons = {
            success: '✓',
            warning: '⚠',
            danger: '✕',
            info: '?'
        };
        
        modalIcon.textContent = icons[type] || icons.warning;
        modalIcon.className = `modal-icon ${type}`;
        
        modal.classList.add('show');
        
        const handleConfirm = () => {
            modal.classList.remove('show');
            cleanup();
            resolve(true);
        };
        
        const handleCancel = () => {
            modal.classList.remove('show');
            cleanup();
            resolve(false);
        };
        
        const cleanup = () => {
            btnConfirm.removeEventListener('click', handleConfirm);
            btnCancel.removeEventListener('click', handleCancel);
        };
        
        btnConfirm.addEventListener('click', handleConfirm);
        btnCancel.addEventListener('click', handleCancel);
    });
}

// ====================================
// CÓDIGO PRINCIPAL
// ====================================

document.addEventListener('DOMContentLoaded', function() {
    // Verificar Autenticação
    const token = sessionStorage.getItem('stoklink_token');
    const usuario = JSON.parse(sessionStorage.getItem('stoklink_user') || '{}');
    
    if (!token || usuario.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('user-name').textContent = usuario.nome || 'Admin';
    
    // Variáveis globais
    let filiais = [];
    let usuarios = [];
    let tags = [];
    let filialEditando = null;
    let usuarioEditando = null;
    let tagEditando = null;
    
    // Elementos
    const views = {
        filiais: document.getElementById('filiais-view'),
        usuarios: document.getElementById('usuarios-view'),
        tags: document.getElementById('tags-view'),
        fornecedores: document.getElementById('fornecedores-view'),
        transportadoras: document.getElementById('transportadoras-view')
    };
    
    const navButtons = {
        filiais: document.getElementById('btn-show-filiais'),
        usuarios: document.getElementById('btn-show-usuarios'),
        tags: document.getElementById('btn-show-tags'),
        fornecedores: document.getElementById('btn-show-fornecedores'),
        transportadoras: document.getElementById('btn-show-transportadoras')
    };
    
    // Funções de Navegação
    function showView(viewName) {
        Object.values(views).forEach(view => view.style.display = 'none');
        views[viewName].style.display = 'block';
        Object.values(navButtons).forEach(btn => btn.classList.remove('active'));
        if(navButtons[viewName]) navButtons[viewName].classList.add('active');
        lucide.createIcons();
    }
    
    // ========================================
    // GERENCIAMENTO DE FILIAIS
    // ========================================
    
    async function carregarFiliais() {
        try {
            const response = await apiFetch('/api/filiais');
            if (response.ok) {
                filiais = await response.json();
                renderFiliais();
                atualizarSelectsFiliais();
            }
        } catch (error) {
            console.error('Erro ao carregar filiais:', error);
            await showAlert('Erro ao carregar filiais', 'Erro', 'danger');
        }
    }
    
    function renderFiliais() {
        const container = document.getElementById('filiais-list');
        
        if (filiais.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #999;">Nenhuma filial cadastrada. Clique em "Nova Filial" para começar.</p>';
            return;
        }
        
        let html = '<table style="width: 100%; border-collapse: collapse;"><thead><tr><th style="text-align: left; padding: 15px; border-bottom: 2px solid #e0e0e0;">Nome</th><th style="text-align: left; padding: 15px; border-bottom: 2px solid #e0e0e0;">Código</th><th style="text-align: left; padding: 15px; border-bottom: 2px solid #e0e0e0;">Cidade/UF</th><th style="text-align: left; padding: 15px; border-bottom: 2px solid #e0e0e0;">Status</th><th style="text-align: center; padding: 15px; border-bottom: 2px solid #e0e0e0;">Ações</th></tr></thead><tbody>';
        
        filiais.forEach(filial => {
            const statusClass = filial.ativo ? 'status-tag status-concluido' : 'status-tag status-rascunho';
            const statusText = filial.ativo ? 'Ativa' : 'Inativa';
            const cidade = filial.cidade && filial.estado ? `${filial.cidade}/${filial.estado}` : '-';
            
            html += `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                    <td style="padding: 15px;"><strong>${filial.nome}</strong></td>
                    <td style="padding: 15px;">${filial.codigo || '-'}</td>
                    <td style="padding: 15px;">${cidade}</td>
                    <td style="padding: 15px;"><span class="${statusClass}">${statusText}</span></td>
                    <td style="padding: 15px; text-align: center;">
                        <button class="btn btn-secondary" style="padding: 8px 12px; margin: 0 5px;" onclick="editarFilial(${filial.id})">
                            <i data-lucide="edit" style="width: 16px; height: 16px;"></i>
                        </button>
                        <button class="btn" style="padding: 8px 12px; margin: 0 5px; background: #e74c3c; color: white;" onclick="deletarFilial(${filial.id}, '${filial.nome}')">
                            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
        lucide.createIcons();
    }
    
    function abrirModalFilial(filial = null) {
        filialEditando = filial;
        const modal = document.getElementById('modal-filial');
        const title = document.getElementById('modal-filial-title');
        const ativoContainer = document.getElementById('filial-ativo-container');
        
        if (filial) {
            title.textContent = 'Editar Filial';
            document.getElementById('filial-nome').value = filial.nome;
            document.getElementById('filial-codigo').value = filial.codigo || '';
            document.getElementById('filial-endereco').value = filial.endereco || '';
            document.getElementById('filial-cidade').value = filial.cidade || '';
            document.getElementById('filial-estado').value = filial.estado || '';
            document.getElementById('filial-telefone').value = filial.telefone || '';
            document.getElementById('filial-ativo').checked = filial.ativo;
            ativoContainer.style.display = 'block';
        } else {
            title.textContent = 'Nova Filial';
            document.getElementById('form-filial').reset();
            ativoContainer.style.display = 'none';
        }
        
        modal.classList.add('show');
        lucide.createIcons();
    }
    
    async function salvarFilial() {
        const dados = {
            nome: document.getElementById('filial-nome').value.trim(),
            codigo: document.getElementById('filial-codigo').value.trim(),
            endereco: document.getElementById('filial-endereco').value.trim(),
            cidade: document.getElementById('filial-cidade').value.trim(),
            estado: document.getElementById('filial-estado').value.trim().toUpperCase(),
            telefone: document.getElementById('filial-telefone').value.trim(),
            ativo: filialEditando ? document.getElementById('filial-ativo').checked : true
        };
        
        if (!dados.nome) {
            await showAlert('O nome da filial é obrigatório', 'Atenção', 'warning');
            return;
        }
        
        try {
            let response;
            if (filialEditando) {
                response = await apiFetch(`/api/filiais/${filialEditando.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(dados)
                });
            } else {
                response = await apiFetch('/api/filiais', {
                    method: 'POST',
                    body: JSON.stringify(dados)
                });
            }
            
            if (response.ok) {
                document.getElementById('modal-filial').classList.remove('show');
                await showAlert(
                    filialEditando ? 'Filial atualizada com sucesso!' : 'Filial criada com sucesso!',
                    'Sucesso',
                    'success'
                );
                await carregarFiliais();
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao salvar filial', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro ao salvar filial:', error);
            await showAlert('Erro de conexão com o servidor', 'Erro', 'danger');
        }
    }
    
    window.editarFilial = function(id) {
        const filial = filiais.find(f => f.id === id);
        if (filial) abrirModalFilial(filial);
    };
    
    window.deletarFilial = async function(id, nome) {
        const confirmado = await showConfirm(
            `Tem certeza que deseja deletar a filial "${nome}"?\n\nIsso não será possível se houver usuários vinculados.`,
            'Confirmar Exclusão',
            'danger'
        );
        
        if (!confirmado) return;
        
        try {
            const response = await apiFetch(`/api/filiais/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                await showAlert('Filial deletada com sucesso!', 'Sucesso', 'success');
                await carregarFiliais();
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao deletar filial', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro ao deletar filial:', error);
            await showAlert('Erro de conexão com o servidor', 'Erro', 'danger');
        }
    };
    
    // ========================================
    // GERENCIAMENTO DE USUÁRIOS
    // ========================================
    
    async function carregarUsuarios(filial_id = null) {
        try {
            let url = '/api/usuarios';
            if (filial_id) url += `?filial_id=${filial_id}`;
            
            const response = await apiFetch(url);
            if (response.ok) {
                usuarios = await response.json();
                renderUsuarios();
            }
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            await showAlert('Erro ao carregar usuários', 'Erro', 'danger');
        }
    }
    
    function renderUsuarios() {
        const container = document.getElementById('usuarios-list');
        
        if (usuarios.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #999;">Nenhum usuário cadastrado. Clique em "Novo Usuário" para começar.</p>';
            return;
        }
        
        let html = '<table style="width: 100%; border-collapse: collapse;"><thead><tr><th style="text-align: left; padding: 15px; border-bottom: 2px solid #e0e0e0;">Nome</th><th style="text-align: left; padding: 15px; border-bottom: 2px solid #e0e0e0;">E-mail</th><th style="text-align: left; padding: 15px; border-bottom: 2px solid #e0e0e0;">Filial</th><th style="text-align: left; padding: 15px; border-bottom: 2px solid #e0e0e0;">Nível</th><th style="text-align: left; padding: 15px; border-bottom: 2px solid #e0e0e0;">Status</th><th style="text-align: center; padding: 15px; border-bottom: 2px solid #e0e0e0;">Ações</th></tr></thead><tbody>';
        
        usuarios.forEach(user => {
            const statusClass = user.ativo ? 'status-tag status-concluido' : 'status-tag status-rascunho';
            const statusText = user.ativo ? 'Ativo' : 'Inativo';
            
            const roleText = {
                'admin': 'Administrador',
                'gerente': 'Gerente',
                'operador': 'Operador'
            }[user.role] || user.role;
            
            html += `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                    <td style="padding: 15px;"><strong>${user.nome}</strong></td>
                    <td style="padding: 15px;">${user.email}</td>
                    <td style="padding: 15px;">${user.filial_nome || '-'}</td>
                    <td style="padding: 15px;">${roleText}</td>
                    <td style="padding: 15px;"><span class="${statusClass}">${statusText}</span></td>
                    <td style="padding: 15px; text-align: center;">
                        <button class="btn btn-secondary" style="padding: 8px 12px; margin: 0 5px;" onclick="editarUsuario(${user.id})">
                            <i data-lucide="edit" style="width: 16px; height: 16px;"></i>
                        </button>
                        <button class="btn" style="padding: 8px 12px; margin: 0 5px; background: #e74c3c; color: white;" onclick="deletarUsuario(${user.id}, '${user.nome}')">
                            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
        lucide.createIcons();
    }
    
    function abrirModalUsuario(user = null) {
        usuarioEditando = user;
        const modal = document.getElementById('modal-usuario');
        const title = document.getElementById('modal-usuario-title');
        const ativoContainer = document.getElementById('usuario-ativo-container');
        const senhaField = document.getElementById('usuario-senha');
        const senhaHint = document.getElementById('senha-hint');
        
        if (user) {
            title.textContent = 'Editar Usuário';
            document.getElementById('usuario-nome').value = user.nome;
            document.getElementById('usuario-email').value = user.email;
            document.getElementById('usuario-filial').value = user.filial_id || '';
            document.getElementById('usuario-role').value = user.role;
            document.getElementById('usuario-ativo').checked = user.ativo;
            document.getElementById('usuario-acesso-recebimento').checked = user.acesso_recebimento || false;
            senhaField.value = '';
            senhaField.required = false;
            senhaHint.style.display = 'block';
            ativoContainer.style.display = 'block';
        } else {
            title.textContent = 'Novo Usuário';
            document.getElementById('form-usuario').reset();
            document.getElementById('usuario-acesso-recebimento').checked = false;
            senhaField.required = true;
            senhaHint.style.display = 'none';
            ativoContainer.style.display = 'none';
        }
        
        modal.classList.add('show');
        lucide.createIcons();
    }
    
    async function salvarUsuario() {
        const dados = {
            nome: document.getElementById('usuario-nome').value.trim(),
            email: document.getElementById('usuario-email').value.trim(),
            senha: document.getElementById('usuario-senha').value,
            filial_id: parseInt(document.getElementById('usuario-filial').value) || null,
            role: document.getElementById('usuario-role').value,
            ativo: usuarioEditando ? document.getElementById('usuario-ativo').checked : true,
            acesso_recebimento: document.getElementById('usuario-acesso-recebimento').checked
        };
        
        if (!dados.nome || !dados.email) {
            await showAlert('Nome e e-mail são obrigatórios', 'Atenção', 'warning');
            return;
        }
        
        if (!usuarioEditando && !dados.senha) {
            await showAlert('A senha é obrigatória para novos usuários', 'Atenção', 'warning');
            return;
        }
        
        // Se estiver editando e não digitou senha, não enviar campo senha
        if (usuarioEditando && !dados.senha) {
            delete dados.senha;
        }
        
        try {
            let response;
            if (usuarioEditando) {
                response = await apiFetch(`/api/usuarios/${usuarioEditando.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(dados)
                });
            } else {
                response = await apiFetch('/api/usuarios', {
                    method: 'POST',
                    body: JSON.stringify(dados)
                });
            }
            
            if (response.ok) {
                document.getElementById('modal-usuario').classList.remove('show');
                await showAlert(
                    usuarioEditando ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!',
                    'Sucesso',
                    'success'
                );
                await carregarUsuarios();
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao salvar usuário', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro ao salvar usuário:', error);
            await showAlert('Erro de conexão com o servidor', 'Erro', 'danger');
        }
    }
    
    window.editarUsuario = function(id) {
        const user = usuarios.find(u => u.id === id);
        if (user) abrirModalUsuario(user);
    };
    
    window.deletarUsuario = async function(id, nome) {
        const confirmado = await showConfirm(
            `Tem certeza que deseja deletar o usuário "${nome}"?`,
            'Confirmar Exclusão',
            'danger'
        );
        
        if (!confirmado) return;
        
        try {
            const response = await apiFetch(`/api/usuarios/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                await showAlert('Usuário deletado com sucesso!', 'Sucesso', 'success');
                await carregarUsuarios();
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao deletar usuário', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro ao deletar usuário:', error);
            await showAlert('Erro de conexão com o servidor', 'Erro', 'danger');
        }
    };
    
    function atualizarSelectsFiliais() {
        const selects = [
            document.getElementById('usuario-filial'),
            document.getElementById('filtro-filial')
        ];
        
        selects.forEach(select => {
            const valorAtual = select.value;
            const primeiraOpcao = select.querySelector('option');
            select.innerHTML = '';
            if (primeiraOpcao) select.appendChild(primeiraOpcao);
            
            filiais.forEach(filial => {
                if (filial.ativo) {
                    const option = document.createElement('option');
                    option.value = filial.id;
                    option.textContent = filial.nome;
                    select.appendChild(option);
                }
            });
            
            select.value = valorAtual;
        });
    }
    
    // ========================================
    // GERENCIAMENTO DE TAGS
    // ========================================
    
    async function carregarTags() {
        try {
            const response = await apiFetch('/api/tags');
            if (response.ok) {
                tags = await response.json();
                renderTags();
            }
        } catch (error) {
            console.error('Erro ao carregar tags:', error);
            await showAlert('Erro ao carregar tags', 'Erro', 'danger');
        }
    }
    
    function renderTags() {
        const container = document.getElementById('tags-list');
        
        if (tags.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #999;">Nenhuma tag cadastrada. Clique em "Nova Tag" para começar.</p>';
            return;
        }
        
        let html = '<table style="width: 100%; border-collapse: collapse;"><thead><tr><th style="text-align: left; padding: 15px; border-bottom: 2px solid #e0e0e0;">Nome da Tag</th><th style="text-align: center; padding: 15px; border-bottom: 2px solid #e0e0e0;">Ações</th></tr></thead><tbody>';
        
        tags.forEach(tag => {
            const cor = tag.cor || '#1e3c72';
            html += `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                    <td style="padding: 15px;"><span style="display: inline-block; padding: 6px 12px; background: ${cor}; color: white; border-radius: 15px; font-size: 14px;">${tag.nome}</span></td>
                    <td style="padding: 15px; text-align: center;">
                        <button class="btn btn-secondary" style="padding: 8px 12px; margin: 0 5px;" onclick="editarTag(${tag.id})">
                            <i data-lucide="edit" style="width: 16px; height: 16px;"></i>
                        </button>
                        <button class="btn" style="padding: 8px 12px; margin: 0 5px; background: #e74c3c; color: white;" onclick="deletarTag(${tag.id}, '${tag.nome}')">
                            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
        lucide.createIcons();
    }
    
    function abrirModalTag(tag = null) {
        tagEditando = tag;
        const modal = document.getElementById('modal-tag');
        const title = document.getElementById('modal-tag-title');
        const corInput = document.getElementById('tag-cor');
        const corText = document.getElementById('tag-cor-text');
        
        if (tag) {
            title.textContent = 'Editar Tag';
            document.getElementById('tag-nome').value = tag.nome;
            const cor = tag.cor || '#1e3c72';
            corInput.value = cor;
            corText.value = cor;
        } else {
            title.textContent = 'Nova Tag';
            document.getElementById('form-tag').reset();
            corInput.value = '#1e3c72';
            corText.value = '#1e3c72';
        }
        
        // Sincronizar inputs de cor
        corInput.addEventListener('input', (e) => {
            corText.value = e.target.value;
        });
        
        corText.addEventListener('input', (e) => {
            const valor = e.target.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(valor)) {
                corInput.value = valor;
            }
        });
        
        modal.classList.add('show');
        lucide.createIcons();
    }
    
    async function salvarTag() {
        const nome = document.getElementById('tag-nome').value.trim();
        const cor = document.getElementById('tag-cor').value;
        
        if (!nome) {
            await showAlert('O nome da tag é obrigatório', 'Atenção', 'warning');
            return;
        }
        
        try {
            let response;
            if (tagEditando) {
                response = await apiFetch(`/api/tags/${tagEditando.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ nome, cor })
                });
            } else {
                response = await apiFetch('/api/tags', {
                    method: 'POST',
                    body: JSON.stringify({ nome, cor })
                });
            }
            
            if (response.ok) {
                document.getElementById('modal-tag').classList.remove('show');
                await showAlert(
                    tagEditando ? 'Tag atualizada com sucesso!' : 'Tag criada com sucesso!',
                    'Sucesso',
                    'success'
                );
                await carregarTags();
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao salvar tag', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro ao salvar tag:', error);
            await showAlert('Erro de conexão com o servidor', 'Erro', 'danger');
        }
    }
    
    window.editarTag = function(id) {
        const tag = tags.find(t => t.id === id);
        if (tag) abrirModalTag(tag);
    };
    
    window.deletarTag = async function(id, nome) {
        const confirmado = await showConfirm(
            `Tem certeza que deseja deletar a tag "${nome}"?`,
            'Confirmar Exclusão',
            'danger'
        );
        
        if (!confirmado) return;
        
        try {
            const response = await apiFetch(`/api/tags/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                await showAlert('Tag deletada com sucesso!', 'Sucesso', 'success');
                await carregarTags();
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao deletar tag', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro ao deletar tag:', error);
            await showAlert('Erro de conexão com o servidor', 'Erro', 'danger');
        }
    };
    
    // ========================================
    // EVENT LISTENERS
    // ========================================
    
    navButtons.filiais.addEventListener('click', () => showView('filiais'));
    navButtons.usuarios.addEventListener('click', () => {
        showView('usuarios');
        carregarUsuarios();
    });
    navButtons.tags.addEventListener('click', () => {
        showView('tags');
        carregarTags();
    });
    
    document.getElementById('btn-nova-filial').addEventListener('click', () => abrirModalFilial());
    document.getElementById('btn-novo-usuario').addEventListener('click', () => abrirModalUsuario());
    document.getElementById('btn-nova-tag').addEventListener('click', () => abrirModalTag());
    
    document.getElementById('modal-filial-cancelar').addEventListener('click', () => {
        document.getElementById('modal-filial').classList.remove('show');
    });
    
    document.getElementById('modal-filial-salvar').addEventListener('click', salvarFilial);
    
    document.getElementById('modal-usuario-cancelar').addEventListener('click', () => {
        document.getElementById('modal-usuario').classList.remove('show');
    });
    
    document.getElementById('modal-usuario-salvar').addEventListener('click', salvarUsuario);
    
    document.getElementById('modal-tag-cancelar').addEventListener('click', () => {
        document.getElementById('modal-tag').classList.remove('show');
    });
    
    document.getElementById('modal-tag-salvar').addEventListener('click', salvarTag);
    
    document.getElementById('filtro-filial').addEventListener('change', (e) => {
        const filialId = e.target.value || null;
        carregarUsuarios(filialId);
    });
    
    document.getElementById('btn-voltar-sistema').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    document.getElementById('btn-logout').addEventListener('click', async () => {
        const confirmado = await showConfirm(
            'Tem certeza que deseja sair do sistema?',
            'Confirmar Saída',
            'warning'
        );
        
        if (confirmado) {
            sessionStorage.removeItem('stoklink_token');
            sessionStorage.removeItem('stoklink_user');
            window.location.href = 'login.html';
        }
    });
    
    document.getElementById('btn-show-dashboard').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    // ========================================
    // FORNECEDORES
    // ========================================
    
    let fornecedores = [];
    let fornecedorEditando = null;
    
    async function carregarFornecedores() {
        try {
            const response = await apiFetch('/api/fornecedores');
            if (response.ok) {
                fornecedores = await response.json();
                renderizarFornecedores();
            }
        } catch (error) {
            console.error('Erro ao carregar fornecedores:', error);
        }
    }
    
    function renderizarFornecedores() {
        const container = document.getElementById('fornecedores-list');
        if (!container) return;
        
        if (fornecedores.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i data-lucide="factory" style="width: 48px; height: 48px; opacity: 0.3;"></i>
                    <p style="margin-top: 15px;">Nenhum fornecedor cadastrado</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }
        
        let html = '<table class="admin-table"><thead><tr><th>Nome</th><th>CNPJ</th><th>Telefone</th><th>E-mail</th><th>Status</th><th>Ações</th></tr></thead><tbody>';
        
        fornecedores.forEach(f => {
            html += `
                <tr>
                    <td><strong>${f.nome}</strong></td>
                    <td>${f.cnpj || '-'}</td>
                    <td>${f.telefone || '-'}</td>
                    <td>${f.email || '-'}</td>
                    <td><span class="status-badge ${f.ativo !== false ? 'ativo' : 'inativo'}">${f.ativo !== false ? 'Ativo' : 'Inativo'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="editarFornecedor(${f.id})"><i data-lucide="edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="excluirFornecedor(${f.id})"><i data-lucide="trash-2"></i></button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
        lucide.createIcons();
    }
    
    function abrirModalFornecedor(fornecedor = null) {
        fornecedorEditando = fornecedor;
        const modal = document.getElementById('modal-fornecedor');
        const titulo = document.getElementById('modal-fornecedor-title');
        const ativoContainer = document.getElementById('fornecedor-ativo-container');
        
        document.getElementById('form-fornecedor').reset();
        
        if (fornecedor) {
            titulo.textContent = 'Editar Fornecedor';
            document.getElementById('fornecedor-nome').value = fornecedor.nome || '';
            document.getElementById('fornecedor-cnpj').value = fornecedor.cnpj || '';
            document.getElementById('fornecedor-telefone').value = fornecedor.telefone || '';
            document.getElementById('fornecedor-email').value = fornecedor.email || '';
            document.getElementById('fornecedor-endereco').value = fornecedor.endereco || '';
            document.getElementById('fornecedor-ativo').checked = fornecedor.ativo !== false;
            ativoContainer.style.display = 'block';
        } else {
            titulo.textContent = 'Novo Fornecedor';
            ativoContainer.style.display = 'none';
        }
        
        modal.classList.add('show');
        lucide.createIcons();
    }
    
    async function salvarFornecedor() {
        const dados = {
            nome: document.getElementById('fornecedor-nome').value.trim(),
            cnpj: document.getElementById('fornecedor-cnpj').value.trim() || null,
            telefone: document.getElementById('fornecedor-telefone').value.trim() || null,
            email: document.getElementById('fornecedor-email').value.trim() || null,
            endereco: document.getElementById('fornecedor-endereco').value.trim() || null,
            ativo: document.getElementById('fornecedor-ativo').checked
        };
        
        if (!dados.nome) {
            await showAlert('Informe o nome do fornecedor', 'Erro', 'danger');
            return;
        }
        
        try {
            let response;
            if (fornecedorEditando) {
                response = await apiFetch(`/api/fornecedores/${fornecedorEditando.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(dados)
                });
            } else {
                response = await apiFetch('/api/fornecedores', {
                    method: 'POST',
                    body: JSON.stringify(dados)
                });
            }
            
            if (response.ok) {
                document.getElementById('modal-fornecedor').classList.remove('show');
                await showAlert(fornecedorEditando ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!', 'Sucesso', 'success');
                carregarFornecedores();
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao salvar', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro:', error);
            await showAlert('Erro ao salvar fornecedor', 'Erro', 'danger');
        }
    }
    
    window.editarFornecedor = function(id) {
        const fornecedor = fornecedores.find(f => f.id === id);
        if (fornecedor) abrirModalFornecedor(fornecedor);
    };
    
    window.excluirFornecedor = async function(id) {
        const confirmado = await showConfirm('Tem certeza que deseja excluir este fornecedor?', 'Confirmar Exclusão', 'danger');
        if (!confirmado) return;
        
        try {
            const response = await apiFetch(`/api/fornecedores/${id}`, { method: 'DELETE' });
            if (response.ok) {
                await showAlert('Fornecedor excluído!', 'Sucesso', 'success');
                carregarFornecedores();
            }
        } catch (error) {
            await showAlert('Erro ao excluir fornecedor', 'Erro', 'danger');
        }
    };
    
    // ========================================
    // TRANSPORTADORAS
    // ========================================
    
    let transportadoras = [];
    let transportadoraEditando = null;
    
    async function carregarTransportadoras() {
        try {
            const response = await apiFetch('/api/transportadoras');
            if (response.ok) {
                transportadoras = await response.json();
                renderizarTransportadoras();
            }
        } catch (error) {
            console.error('Erro ao carregar transportadoras:', error);
        }
    }
    
    function renderizarTransportadoras() {
        const container = document.getElementById('transportadoras-list');
        if (!container) return;
        
        if (transportadoras.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i data-lucide="truck" style="width: 48px; height: 48px; opacity: 0.3;"></i>
                    <p style="margin-top: 15px;">Nenhuma transportadora cadastrada</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }
        
        let html = '<table class="admin-table"><thead><tr><th>Nome</th><th>CNPJ</th><th>Telefone</th><th>E-mail</th><th>Status</th><th>Ações</th></tr></thead><tbody>';
        
        transportadoras.forEach(t => {
            html += `
                <tr>
                    <td><strong>${t.nome}</strong></td>
                    <td>${t.cnpj || '-'}</td>
                    <td>${t.telefone || '-'}</td>
                    <td>${t.email || '-'}</td>
                    <td><span class="status-badge ${t.ativo !== false ? 'ativo' : 'inativo'}">${t.ativo !== false ? 'Ativo' : 'Inativo'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="editarTransportadora(${t.id})"><i data-lucide="edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="excluirTransportadora(${t.id})"><i data-lucide="trash-2"></i></button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
        lucide.createIcons();
    }
    
    function abrirModalTransportadora(transportadora = null) {
        transportadoraEditando = transportadora;
        const modal = document.getElementById('modal-transportadora');
        const titulo = document.getElementById('modal-transportadora-title');
        const ativoContainer = document.getElementById('transportadora-ativo-container');
        
        document.getElementById('form-transportadora').reset();
        
        if (transportadora) {
            titulo.textContent = 'Editar Transportadora';
            document.getElementById('transportadora-nome').value = transportadora.nome || '';
            document.getElementById('transportadora-cnpj').value = transportadora.cnpj || '';
            document.getElementById('transportadora-telefone').value = transportadora.telefone || '';
            document.getElementById('transportadora-email').value = transportadora.email || '';
            document.getElementById('transportadora-ativo').checked = transportadora.ativo !== false;
            ativoContainer.style.display = 'block';
        } else {
            titulo.textContent = 'Nova Transportadora';
            ativoContainer.style.display = 'none';
        }
        
        modal.classList.add('show');
        lucide.createIcons();
    }
    
    async function salvarTransportadora() {
        const dados = {
            nome: document.getElementById('transportadora-nome').value.trim(),
            cnpj: document.getElementById('transportadora-cnpj').value.trim() || null,
            telefone: document.getElementById('transportadora-telefone').value.trim() || null,
            email: document.getElementById('transportadora-email').value.trim() || null,
            ativo: document.getElementById('transportadora-ativo').checked
        };
        
        if (!dados.nome) {
            await showAlert('Informe o nome da transportadora', 'Erro', 'danger');
            return;
        }
        
        try {
            let response;
            if (transportadoraEditando) {
                response = await apiFetch(`/api/transportadoras/${transportadoraEditando.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(dados)
                });
            } else {
                response = await apiFetch('/api/transportadoras', {
                    method: 'POST',
                    body: JSON.stringify(dados)
                });
            }
            
            if (response.ok) {
                document.getElementById('modal-transportadora').classList.remove('show');
                await showAlert(transportadoraEditando ? 'Transportadora atualizada!' : 'Transportadora cadastrada!', 'Sucesso', 'success');
                carregarTransportadoras();
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao salvar', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro:', error);
            await showAlert('Erro ao salvar transportadora', 'Erro', 'danger');
        }
    }
    
    window.editarTransportadora = function(id) {
        const transportadora = transportadoras.find(t => t.id === id);
        if (transportadora) abrirModalTransportadora(transportadora);
    };
    
    window.excluirTransportadora = async function(id) {
        const confirmado = await showConfirm('Tem certeza que deseja excluir esta transportadora?', 'Confirmar Exclusão', 'danger');
        if (!confirmado) return;
        
        try {
            const response = await apiFetch(`/api/transportadoras/${id}`, { method: 'DELETE' });
            if (response.ok) {
                await showAlert('Transportadora excluída!', 'Sucesso', 'success');
                carregarTransportadoras();
            }
        } catch (error) {
            await showAlert('Erro ao excluir transportadora', 'Erro', 'danger');
        }
    };
    
    // ========================================
    // EVENT LISTENERS - FORNECEDORES E TRANSPORTADORAS
    // ========================================
    
    document.getElementById('btn-show-fornecedores').addEventListener('click', () => {
        showView('fornecedores');
        carregarFornecedores();
    });
    
    document.getElementById('btn-show-transportadoras').addEventListener('click', () => {
        showView('transportadoras');
        carregarTransportadoras();
    });
    
    document.getElementById('btn-novo-fornecedor').addEventListener('click', () => abrirModalFornecedor());
    document.getElementById('btn-nova-transportadora').addEventListener('click', () => abrirModalTransportadora());
    
    document.getElementById('modal-fornecedor-cancelar').addEventListener('click', () => {
        document.getElementById('modal-fornecedor').classList.remove('show');
    });
    
    document.getElementById('modal-fornecedor-salvar').addEventListener('click', salvarFornecedor);
    
    // ========================================
    // IMPORTAÇÃO DE FORNECEDORES VIA EXCEL
    // ========================================
    
    let dadosParaImportar = [];
    
    document.getElementById('btn-importar-fornecedores').addEventListener('click', () => {
        dadosParaImportar = [];
        document.getElementById('arquivo-fornecedores').value = '';
        document.getElementById('preview-importacao').style.display = 'none';
        document.getElementById('modal-importar-confirmar').disabled = true;
        document.getElementById('modal-importar-fornecedores').classList.add('show');
        lucide.createIcons();
    });
    
    document.getElementById('modal-importar-cancelar').addEventListener('click', () => {
        document.getElementById('modal-importar-fornecedores').classList.remove('show');
    });
    
    document.getElementById('arquivo-fornecedores').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet);
            
            if (jsonData.length === 0) {
                await showAlert('O arquivo está vazio ou não possui dados válidos', 'Erro', 'danger');
                return;
            }
            
            // Mapear colunas (COD, NOME, NOMEFANTASIA)
            dadosParaImportar = jsonData.map(row => {
                // Tentar encontrar as colunas (case insensitive)
                const keys = Object.keys(row);
                const getColunaValue = (nomes) => {
                    for (const nome of nomes) {
                        const key = keys.find(k => k.toUpperCase().trim() === nome.toUpperCase());
                        if (key) return row[key];
                    }
                    return null;
                };
                
                const codigo = getColunaValue(['COD', 'CODIGO', 'CÓDIGO', 'ID']);
                const nome = getColunaValue(['NOME', 'RAZAOSOCIAL', 'RAZÃO SOCIAL', 'RAZAO SOCIAL']);
                const nomeFantasia = getColunaValue(['NOMEFANTASIA', 'NOME FANTASIA', 'FANTASIA', 'NOME_FANTASIA']);
                
                return {
                    codigo: codigo ? String(codigo).trim() : null,
                    nome: nome ? String(nome).trim() : null,
                    nome_fantasia: nomeFantasia ? String(nomeFantasia).trim() : null
                };
            }).filter(f => f.nome); // Filtrar apenas os que têm nome
            
            if (dadosParaImportar.length === 0) {
                await showAlert('Nenhum fornecedor válido encontrado. Verifique se a coluna NOME existe.', 'Erro', 'danger');
                return;
            }
            
            // Mostrar preview
            let previewHtml = '<table class="admin-table"><thead><tr><th>Código</th><th>Nome</th><th>Nome Fantasia</th></tr></thead><tbody>';
            const maxPreview = Math.min(dadosParaImportar.length, 5);
            for (let i = 0; i < maxPreview; i++) {
                const f = dadosParaImportar[i];
                previewHtml += `<tr><td>${f.codigo || '-'}</td><td>${f.nome}</td><td>${f.nome_fantasia || '-'}</td></tr>`;
            }
            previewHtml += '</tbody></table>';
            
            document.getElementById('preview-tabela').innerHTML = previewHtml;
            document.getElementById('preview-total').textContent = `Total: ${dadosParaImportar.length} fornecedor(es) encontrado(s)`;
            document.getElementById('preview-importacao').style.display = 'block';
            document.getElementById('modal-importar-confirmar').disabled = false;
            
        } catch (error) {
            console.error('Erro ao ler arquivo:', error);
            await showAlert('Erro ao ler o arquivo Excel. Verifique se o formato está correto.', 'Erro', 'danger');
        }
    });
    
    document.getElementById('modal-importar-confirmar').addEventListener('click', async () => {
        if (dadosParaImportar.length === 0) return;
        
        const btnImportar = document.getElementById('modal-importar-confirmar');
        btnImportar.disabled = true;
        btnImportar.textContent = 'Importando...';
        
        try {
            const response = await apiFetch('/api/fornecedores/importar', {
                method: 'POST',
                body: JSON.stringify({ fornecedores: dadosParaImportar })
            });
            
            if (response.ok) {
                const result = await response.json();
                document.getElementById('modal-importar-fornecedores').classList.remove('show');
                await showAlert(`Importação concluída!\n${result.importados} fornecedor(es) importado(s).${result.duplicados > 0 ? `\n${result.duplicados} já existiam.` : ''}`, 'Sucesso', 'success');
                carregarFornecedores();
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro na importação', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro:', error);
            await showAlert('Erro ao importar fornecedores', 'Erro', 'danger');
        } finally {
            btnImportar.disabled = false;
            btnImportar.textContent = 'Importar';
        }
    });
    
    document.getElementById('modal-transportadora-cancelar').addEventListener('click', () => {
        document.getElementById('modal-transportadora').classList.remove('show');
    });
    
    document.getElementById('modal-transportadora-salvar').addEventListener('click', salvarTransportadora);
    
    // ========================================
    // INICIALIZAÇÃO
    // ========================================
    
    carregarFiliais();
    showView('filiais');
    lucide.createIcons();
});
