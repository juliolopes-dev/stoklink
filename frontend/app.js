// ====================================
// CONFIGURAÇÃO DA API
// ====================================

const API_URL = window.location.origin;

// Função auxiliar para fazer requisições autenticadas
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('stoklink_token');
    
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
            localStorage.removeItem('stoklink_token');
            localStorage.removeItem('stoklink_user');
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
        
        // Configurar modal
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        btnCancel.style.display = 'none';
        btnConfirm.textContent = 'OK';
        
        // Ícones por tipo
        const icons = {
            success: '✓',
            warning: '⚠',
            danger: '✕',
            info: 'ℹ'
        };
        
        modalIcon.textContent = icons[type] || icons.info;
        modalIcon.className = `modal-icon ${type}`;
        
        // Mostrar modal
        modal.classList.add('show');
        
        // Event listeners
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
        
        // Configurar modal
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        btnCancel.style.display = 'inline-flex';
        btnConfirm.textContent = 'Confirmar';
        
        // Ícones por tipo
        const icons = {
            success: '✓',
            warning: '⚠',
            danger: '✕',
            info: '?'
        };
        
        modalIcon.textContent = icons[type] || icons.warning;
        modalIcon.className = `modal-icon ${type}`;
        
        // Mostrar modal
        modal.classList.add('show');
        
        // Event listeners
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
    // --- Verificar Autenticação ---
    const token = localStorage.getItem('stoklink_token');
    const usuario = JSON.parse(localStorage.getItem('stoklink_user') || '{}');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Exibir nome do usuário logado
    console.log('Usuário logado:', usuario.nome);
    document.getElementById('user-name').textContent = usuario.nome || 'Usuário';
    
    // Mostrar botão de admin se for admin
    if (usuario.role === 'admin') {
        const btnAdmin = document.getElementById('btn-admin');
        if (btnAdmin) {
            btnAdmin.style.display = 'flex';
            btnAdmin.addEventListener('click', () => {
                window.location.href = 'admin.html';
            });
        }
    }
    
    // --- Elementos da UI ---
    const views = { 
        dashboard: document.getElementById('dashboard-view'), 
        cadastro: document.getElementById('cadastro-view'), 
        visualizacao: document.getElementById('visualizacao-view'), 
        detalhe: document.getElementById('detalhe-view'),
    };
    const navButtons = { 
        dashboard: document.getElementById('btn-show-dashboard'), 
        cadastro: document.getElementById('btn-show-cadastro'), 
        visualizacao: document.getElementById('btn-show-visualizacao'),
    };
    const form = document.getElementById('transfer-form');
    const btnAddItem = document.getElementById('btn-add-item');
    const btnSalvarRascunho = document.getElementById('btn-salvar-rascunho');
    const itensContainer = document.getElementById('itens-container');
    const transferListContainer = document.getElementById('transfer-list-container');
    const dashboardTransferList = document.getElementById('dashboard-transfer-list');
    const btnVoltarLista = document.getElementById('btn-voltar-lista');
    const tagInput = document.getElementById('tag-input');
    const btnAddTag = document.getElementById('btn-add-tag');
    const selectedTagsContainer = document.getElementById('selected-tags-container');
    const tagDatalist = document.getElementById('predefined-tags');

    // --- Armazenamento de Dados ---
    let transferencias = [];
    let nextId = 1;
    let previousView = 'dashboard';
    let globalTags = ['Urgente', 'Retirar no local', 'Frágil', 'Cliente VIP'];
    let currentTransferTags = [];
    let editandoRascunhoId = null; // ID do rascunho sendo editado

    // --- Funções Auxiliares ---
    const formatDate = (date) => new Intl.DateTimeFormat('pt-BR').format(date);
    const generateNewId = () => {
        const year = new Date().getFullYear();
        const paddedId = String(nextId++).padStart(3, '0');
        return `TRANSF-${year}-${paddedId}`;
    };
    function animateCountUp(element, endValue) {
        let startValue = 0; const duration = 800; const stepTime = 15; const steps = duration / stepTime;
        const increment = endValue / steps;
        const counter = setInterval(() => {
            startValue += increment;
            if (startValue >= endValue) { 
                element.textContent = endValue; 
                clearInterval(counter);
            } else { 
                element.textContent = Math.ceil(startValue); 
            }
        }, stepTime);
    }

    // --- Funções de Navegação ---
    function showView(viewName) {
        Object.values(views).forEach(view => view.style.display = 'none');
        views[viewName].style.display = 'block';
        Object.values(navButtons).forEach(btn => btn.classList.remove('active'));
        if(navButtons[viewName]) navButtons[viewName].classList.add('active');
        lucide.createIcons();
    }

    // --- Funções de Renderização de Tags ---
    function populateDatalist() {
        tagDatalist.innerHTML = '';
        globalTags.forEach(tag => {
            tagDatalist.innerHTML += `<option value="${tag}">`;
        });
    }
    function renderTags(tagsArray) {
        if (!tagsArray || tagsArray.length === 0) return '';
        return tagsArray.map(tag => {
            const cor = getTagColor(tag);
            return `<span class="tag-item" style="background: ${cor}; color: white;">${tag}</span>`;
        }).join('');
    }
    function renderFormTags() {
        selectedTagsContainer.innerHTML = '';
        currentTransferTags.forEach((tag, index) => {
            const cor = getTagColor(tag);
            
            const tagEl = document.createElement('span');
            tagEl.className = 'tag-item';
            tagEl.style.background = cor;
            tagEl.style.color = 'white';
            tagEl.textContent = tag;
            
            const removeEl = document.createElement('i');
            removeEl.className = 'remove-tag';
            removeEl.setAttribute('data-lucide', 'x');
            removeEl.style.width = '16px';
            removeEl.style.height = '16px';

            removeEl.onclick = () => {
                currentTransferTags.splice(index, 1);
                renderFormTags();
            };
            tagEl.appendChild(removeEl);
            selectedTagsContainer.appendChild(tagEl);
        });
        lucide.createIcons();
    }

    // --- Funções de Renderização Principal ---
    function renderTransferList(container, filterFn) {
        container.innerHTML = '';
        const data = filterFn ? transferencias.filter(filterFn) : transferencias;
        if (data.length === 0) { 
            container.innerHTML = '<p>Nenhuma transferência encontrada.</p>'; 
            return; 
        }
        data.forEach(t => {
            const card = document.createElement('div');
            card.className = 'card transfer-card';
            card.dataset.id = t.id;
            const statusInfo = getStatusInfo(t.status);
            card.innerHTML = `
                <strong>${t.id}</strong>
                <div><strong>Origem:</strong><span> ${t.origem}</span></div>
                <div><strong>Destino:</strong><span> ${t.destino}</span></div>
                <div><strong>Solicitante:</strong><span> ${t.solicitante}</span></div>
                <div class="tags-container">${renderTags(t.tags)}</div>
                <span class="status-tag ${statusInfo.className}">${statusInfo.text}</span>`;
            card.addEventListener('click', () => {
                previousView = (container === dashboardTransferList) ? 'dashboard' : 'visualizacao';
                showDetalhes(t.id);
            });
            container.appendChild(card);
        });
        lucide.createIcons();
    }
    function updateDashboard() {
        const rascunhos = transferencias.filter(t => t.status === 'rascunho').length;
        const pendentes = transferencias.filter(t => t.status === 'pendente').length;
        const separacao = transferencias.filter(t => t.status === 'em_separacao').length;
        const lancamento = transferencias.filter(t => t.status === 'aguardando_lancamento').length;
        animateCountUp(document.getElementById('summary-rascunho'), rascunhos);
        animateCountUp(document.getElementById('summary-pendente'), pendentes);
        animateCountUp(document.getElementById('summary-separacao'), separacao);
        animateCountUp(document.getElementById('summary-lancamento'), lancamento);
        renderTransferList(dashboardTransferList, t => t.status !== 'concluido');
    }
    function showDetalhes(transferId) {
        const t = transferencias.find(transf => transf.id === transferId); 
        if (!t) return;
        const statusInfo = getStatusInfo(t.status);
        document.getElementById('detalhe-id').textContent = t.id;
        document.getElementById('detalhe-status-tag').innerHTML = `<span class="status-tag ${statusInfo.className}">${statusInfo.text}</span>`;
        document.getElementById('detalhe-origem').textContent = t.origem;
        document.getElementById('detalhe-destino').textContent = t.destino;
        document.getElementById('detalhe-solicitante').textContent = t.solicitante;
        document.getElementById('detalhe-data').textContent = t.data;
        const wrapperInterno = document.getElementById('detalhe-interno-wrapper');
        if (t.status === 'concluido') { 
            wrapperInterno.style.display = 'block'; 
            document.getElementById('detalhe-interno').textContent = t.numeroTransferenciaInterna;
        } else { 
            wrapperInterno.style.display = 'none'; 
        }
        const wrapperObs = document.getElementById('detalhe-obs-wrapper');
        if (t.tags && t.tags.length > 0) { 
            wrapperObs.style.display = 'block'; 
            document.getElementById('detalhe-observacao').innerHTML = renderTags(t.tags);
        } else { 
            wrapperObs.style.display = 'none'; 
        }
        const itensLista = document.getElementById('detalhe-itens-lista');
        itensLista.innerHTML = '';
        t.itens.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'detalhe-item-row';
            if (t.status === 'em_separacao') {
                itemDiv.innerHTML = `<div><strong>Código:</strong> ${item.codigo}</div><div><strong>Qtd. Solicitada:</strong> ${item.solicitada}</div><div class="form-group" style="margin:0;"><label>Qtd. Atendida:</label><input type="number" class="qtd-atendida-input" value="${item.atendida}" min="0" max="${item.solicitada}"></div>`;
            } else {
                 itemDiv.innerHTML = `<div><strong>Código:</strong> ${item.codigo}</div><div><strong>Qtd. Solicitada:</strong> ${item.solicitada}</div><div><strong>Qtd. Atendida:</strong> ${item.atendida}</div>`;
            }
            itensLista.appendChild(itemDiv);
        });
        const acoesContainer = document.getElementById('detalhe-acoes');
        acoesContainer.innerHTML = '';
        if (t.status === 'rascunho') {
            const btnEnviar = document.createElement('button');
            btnEnviar.className = 'btn btn-primary'; 
            btnEnviar.innerHTML = '<i data-lucide="send"></i> Enviar Solicitação';
            btnEnviar.onclick = async () => {
                const confirmado = await showConfirm(
                    'Deseja enviar esta solicitação de transferência?',
                    'Confirmar Envio',
                    'info'
                );
                if (confirmado) {
                    await mudarStatus(t.id, 'pendente');
                    await showAlert('Solicitação enviada com sucesso!', 'Sucesso', 'success');
                }
            };
            acoesContainer.appendChild(btnEnviar);
        } else if (t.status === 'pendente') {
            const btn = document.createElement('button');
            btn.className = 'btn btn-info'; 
            btn.innerHTML = '<i data-lucide="play"></i> Iniciar Separação';
            btn.onclick = () => mudarStatus(t.id, 'em_separacao');
            acoesContainer.appendChild(btn);
        } else if (t.status === 'em_separacao') {
            const btn = document.createElement('button');
            btn.className = 'btn btn-success'; 
            btn.innerHTML = '<i data-lucide="package-check"></i> Finalizar Separação';
            btn.onclick = () => finalizarSeparacao(t.id);
            acoesContainer.appendChild(btn);
        } else if (t.status === 'aguardando_lancamento') {
            acoesContainer.innerHTML = `<div class="form-group"><label for="input-transf-interna">Nº da Transferência (Sistema Principal) *</label><input type="text" id="input-transf-interna" placeholder="Digite o número da transferência"></div><button class="btn btn-primary" id="btn-lancar-transferencia"><i data-lucide="send"></i> Lançamento Concluído</button>`;
            acoesContainer.querySelector('#btn-lancar-transferencia').onclick = () => lancarTransferencia(t.id);
        } else { 
            acoesContainer.innerHTML = '<p>Esta transferência foi concluída.</p>'; 
        }
        showView('detalhe');
    }
    const getStatusInfo = (status) => {
        switch(status) {
            case 'rascunho': return { text: 'Rascunho', className: 'status-rascunho' };
            case 'pendente': return { text: 'Pendente', className: 'status-pendente' };
            case 'em_separacao': return { text: 'Em Separação', className: 'status-em-separacao' };
            case 'aguardando_lancamento': return { text: 'Aguardando Lançamento', className: 'status-aguardando-lancamento' };
            case 'concluido': return { text: 'Concluído', className: 'status-concluido' };
            default: return { text: 'Desconhecido', className: '' };
        }
    };
    async function mudarStatus(transferId, novoStatus) {
        try {
            const response = await apiFetch(`/api/transferencias/${transferId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: novoStatus })
            });
            
            if (response.ok) {
                await carregarTransferencias();
                showDetalhes(transferId); 
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao atualizar status', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro ao mudar status:', error);
            await showAlert('Erro de conexão com o servidor', 'Erro', 'danger');
        }
    }
    
    async function finalizarSeparacao(transferId) {
        const t = transferencias.find(transf => transf.id === transferId); 
        if (!t) return;
        
        const itemInputs = document.querySelectorAll('#detalhe-itens-lista .qtd-atendida-input');
        const itensAtualizados = [];
        
        itemInputs.forEach((input, index) => {
            const atendida = parseInt(input.value, 10);
            if (!isNaN(atendida)) {
                itensAtualizados.push({
                    codigo: t.itens[index].codigo,
                    atendida: atendida
                });
            }
        });
        
        try {
            // Atualizar quantidades atendidas
            const responseItens = await apiFetch(`/api/transferencias/${transferId}/itens`, {
                method: 'PUT',
                body: JSON.stringify({ itens: itensAtualizados })
            });
            
            if (responseItens.ok) {
                // Mudar status para aguardando lançamento
                await mudarStatus(transferId, 'aguardando_lancamento');
            } else {
                const error = await responseItens.json();
                await showAlert(error.error || 'Erro ao atualizar itens', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro ao finalizar separação:', error);
            await showAlert('Erro de conexão com o servidor', 'Erro', 'danger');
        }
    }
    
    async function lancarTransferencia(transferId) {
        const numInternoInput = document.getElementById('input-transf-interna');
        const numInterno = numInternoInput.value.trim();
        
        if (numInterno === "") { 
            await showAlert(
                "O número da transferência do sistema principal é obrigatório.",
                "Campo Obrigatório",
                "warning"
            );
            return; 
        }
        
        try {
            const response = await apiFetch(`/api/transferencias/${transferId}/finalizar`, {
                method: 'PUT',
                body: JSON.stringify({ numeroTransferenciaInterna: numInterno })
            });
            
            if (response.ok) {
                await showAlert('Transferência concluída com sucesso!', 'Sucesso', 'success');
                await carregarTransferencias();
                showDetalhes(transferId);
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao finalizar transferência', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro ao lançar transferência:', error);
            await showAlert('Erro de conexão com o servidor', 'Erro', 'danger');
        }
    }
    function adicionarItem() {
        const itemRow = document.createElement('div');
        itemRow.className = 'item-row';
        itemRow.innerHTML = `<div class="form-group"><label>Código do Produto *</label><input type="text" class="item-codigo" required placeholder="Código do produto"></div><div class="form-group"><label>Qtd. Solicitada *</label><input type="number" class="item-quantidade" required min="1" placeholder="Ex: 10"></div><button type="button" class="btn-remover-item"><i data-lucide="trash-2"></i></button>`;
        itemRow.querySelector('.btn-remover-item').addEventListener('click', () => itemRow.remove());
        itensContainer.appendChild(itemRow);
        lucide.createIcons();
    }
    
    // Função editarRascunho desabilitada - será implementada com endpoint PUT na API
    // function editarRascunho(transferId) { ... }
    
    async function salvarRascunho(comoRascunho = true) {
        const itens = [];
        const itemRows = itensContainer.querySelectorAll('.item-row');
        if(itemRows.length === 0) { 
            await showAlert(
                'Adicione pelo menos um item para salvar.',
                'Item Obrigatório',
                'warning'
            );
            return false;
        }
        
        itemRows.forEach(row => {
            itens.push({
                codigo: row.querySelector('.item-codigo').value,
                solicitada: parseInt(row.querySelector('.item-quantidade').value, 10),
                atendida: 0 
            });
        });
        
        try {
            const novaTransferencia = {
                id: generateNewId(),
                origem: document.getElementById('origem').value,
                destino: document.getElementById('destino').value,
                solicitante: document.getElementById('solicitante').value,
                tags: [...currentTransferTags],
                data: new Date().toISOString().split('T')[0], 
                status: comoRascunho ? 'rascunho' : 'pendente',
                itens: itens
            };
            
            const response = await apiFetch('/api/transferencias', {
                method: 'POST',
                body: JSON.stringify(novaTransferencia)
            });
            
            if (response.ok) {
                form.reset(); 
                itensContainer.innerHTML = ''; 
                currentTransferTags = []; 
                renderFormTags(); 
                adicionarItem();
                editandoRascunhoId = null;
                
                // Recarregar transferências
                await carregarTransferencias();
                
                return true;
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao salvar transferência', 'Erro', 'danger');
                return false;
            }
        } catch (error) {
            console.error('Erro ao salvar transferência:', error);
            await showAlert('Erro de conexão com o servidor', 'Erro', 'danger');
            return false;
        }
    }

    // --- Event Listeners ---
    navButtons.dashboard.addEventListener('click', () => showView('dashboard'));
    navButtons.cadastro.addEventListener('click', () => showView('cadastro'));
    navButtons.visualizacao.addEventListener('click', () => { 
        renderTransferList(transferListContainer); 
        showView('visualizacao'); 
    });
    btnVoltarLista.addEventListener('click', () => { 
        showView(previousView); 
    });
    btnAddItem.addEventListener('click', adicionarItem);
    btnAddTag.addEventListener('click', () => {
        const newTag = tagInput.value.trim();
        if (newTag && !currentTransferTags.includes(newTag)) {
            currentTransferTags.push(newTag);
            if (!globalTags.includes(newTag)) {
                globalTags.push(newTag);
                populateDatalist();
            }
            renderFormTags();
        }
        tagInput.value = '';
    });

    // Botão "Salvar Rascunho"
    btnSalvarRascunho.addEventListener('click', async () => {
        const salvo = await salvarRascunho(true);
        if (salvo) {
            await showAlert(
                'Rascunho salvo com sucesso! Você pode continuar editando depois.',
                'Rascunho Salvo',
                'success'
            );
            showView('dashboard');
        }
    });
    
    // Botão "Enviar Solicitação" (submit do form)
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        const salvo = await salvarRascunho(false);
        if (salvo) {
            const ultimaTransf = transferencias[transferencias.length - 1];
            await showAlert(
                `Transferência ${ultimaTransf.id} criada com sucesso!`,
                'Sucesso',
                'success'
            );
            showView('dashboard');
        }
    });
    document.getElementById('btn-cancelar').addEventListener('click', () => {
         form.reset(); 
         itensContainer.innerHTML = ''; 
         currentTransferTags = []; 
         renderFormTags(); 
         adicionarItem();
         showView('dashboard');
    });

    // --- Carregar Transferências da API ---
    async function carregarTransferencias() {
        try {
            const response = await apiFetch('/api/transferencias');
            
            if (response.ok) {
                transferencias = await response.json();
                
                // Calcular próximo ID baseado nas transferências existentes
                if (transferencias.length > 0) {
                    const lastId = transferencias[transferencias.length - 1].id;
                    const match = lastId.match(/TRANSF-\d{4}-(\d{3})/);
                    if (match) {
                        nextId = parseInt(match[1], 10) + 1;
                    }
                }
                
                updateDashboard();
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao carregar transferências', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro ao carregar transferências:', error);
            await showAlert('Erro de conexão com o servidor', 'Erro', 'danger');
        }
    }
    
    // --- Carregar Tags da API ---
    let globalTagsData = []; // Armazena tags completas com cores
    
    async function carregarTags() {
        try {
            const response = await apiFetch('/api/tags');
            
            if (response.ok) {
                const tags = await response.json();
                globalTagsData = tags; // Salvar tags completas (nome + cor)
                globalTags = tags.map(t => t.nome);
                populateDatalist();
            }
        } catch (error) {
            console.error('Erro ao carregar tags:', error);
            // Usar tags padrão se houver erro
            globalTags = ['Urgente', 'Retirar no local', 'Frágil', 'Cliente VIP'];
            globalTagsData = globalTags.map(t => ({ nome: t, cor: '#1e3c72' }));
            populateDatalist();
        }
    }
    
    // Função auxiliar para buscar cor da tag
    function getTagColor(tagNome) {
        // Busca case-insensitive
        const tag = globalTagsData.find(t => t.nome.toLowerCase() === tagNome.toLowerCase());
        const cor = tag ? (tag.cor || '#1e3c72') : '#1e3c72';
        console.log('getTagColor:', tagNome, '→', cor, 'globalTagsData:', globalTagsData);
        return cor;
    }
    
    // --- Carregar Filiais da API ---
    async function carregarFiliais() {
        try {
            const response = await apiFetch('/api/filiais');
            
            if (response.ok) {
                const filiais = await response.json();
                const selectOrigem = document.getElementById('origem');
                const selectDestino = document.getElementById('destino');
                
                // Limpar selects mantendo primeira opção
                selectOrigem.innerHTML = '<option value="">Selecione</option>';
                selectDestino.innerHTML = '<option value="">Selecione</option>';
                
                // Adicionar filiais ativas
                filiais
                    .filter(f => f.ativo)
                    .forEach(filial => {
                        const optionOrigem = document.createElement('option');
                        optionOrigem.value = filial.nome;
                        optionOrigem.textContent = filial.nome;
                        selectOrigem.appendChild(optionOrigem);
                        
                        const optionDestino = document.createElement('option');
                        optionDestino.value = filial.nome;
                        optionDestino.textContent = filial.nome;
                        selectDestino.appendChild(optionDestino);
                    });
            }
        } catch (error) {
            console.error('Erro ao carregar filiais:', error);
        }
    }
    
    // Logout
    document.getElementById('btn-logout').addEventListener('click', async () => {
        const confirmado = await showConfirm(
            'Tem certeza que deseja sair do sistema?',
            'Confirmar Saída',
            'warning'
        );
        
        if (confirmado) {
            localStorage.removeItem('stoklink_token');
            localStorage.removeItem('stoklink_user');
            window.location.href = 'login.html';
        }
    });

    // --- Inicialização ---
    adicionarItem();
    carregarTags();
    carregarFiliais();
    carregarTransferencias();
    showView('dashboard');
    lucide.createIcons(); // Renderiza todos os ícones iniciais
});
