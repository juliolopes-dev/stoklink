// ====================================
// CONFIGURAÇÃO DA API
// ====================================

console.log('✅ app.js carregado!');

// Detectar ambiente automaticamente
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname.includes('192.168') ||
                window.location.protocol === 'file:';

const API_URL = isLocal ? 'http://localhost:3001' : window.location.origin;

console.log('🔧 Ambiente:', isLocal ? 'Desenvolvimento Local' : 'Produção');
console.log('🌐 API URL:', API_URL);
console.log('📍 Hostname:', window.location.hostname);

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

let recebimentoModal;
let recebimentoObservacaoInput;
let recebimentoDivergenciaInput;
let recebimentoBtnConfirmar;
let recebimentoBtnCancelar;
let formularioAlterado = false;
let bloquearDeteccaoAlteracoes = false;

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

function solicitarDadosRecebimento() {
    if (!recebimentoModal) {
        return Promise.resolve({ observacao: '', adicionarDivergencia: false });
    }

    return new Promise((resolve) => {
        const modal = recebimentoModal;
        const campoObservacao = recebimentoObservacaoInput;
        const checkboxDivergencia = recebimentoDivergenciaInput;
        const btnConfirmar = recebimentoBtnConfirmar;
        const btnCancelar = recebimentoBtnCancelar;

        if (campoObservacao) campoObservacao.value = '';
        if (checkboxDivergencia) checkboxDivergencia.checked = false;
        modal.classList.add('show');

        const cleanup = () => {
            modal.classList.remove('show');
            if (btnConfirmar) btnConfirmar.removeEventListener('click', handleConfirm);
            if (btnCancelar) btnCancelar.removeEventListener('click', handleCancel);
            modal.removeEventListener('click', handleBackdrop);
        };

        const handleConfirm = () => {
            const observacao = campoObservacao ? campoObservacao.value.trim() : '';
            const adicionar = checkboxDivergencia ? checkboxDivergencia.checked : false;
            cleanup();
            resolve({ observacao, adicionarDivergencia: adicionar });
        };

        const handleCancel = () => {
            cleanup();
            resolve(null);
        };

        const handleBackdrop = (event) => {
            if (event.target === modal) {
                cleanup();
                resolve(null);
            }
        };

        if (btnConfirmar) btnConfirmar.addEventListener('click', handleConfirm);
        if (btnCancelar) btnCancelar.addEventListener('click', handleCancel);
        modal.addEventListener('click', handleBackdrop);
    });
}

function marcarFormularioAlterado() {
    if (!bloquearDeteccaoAlteracoes) {
        formularioAlterado = true;
    }
}

function resetFormularioAlterado() {
    formularioAlterado = false;
}

// ====================================
// CÓDIGO PRINCIPAL
// ====================================

document.addEventListener('DOMContentLoaded', async function() {
    // --- Verificar Autenticação ---
    const token = sessionStorage.getItem('stoklink_token');
    let usuario = JSON.parse(sessionStorage.getItem('stoklink_user') || '{}');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    if (!usuario.filial_id) {
        await sincronizarUsuario();
    }

    async function sincronizarUsuario() {
        try {
            const response = await apiFetch('/api/auth/me');
            if (response.ok) {
                const dados = await response.json();
                usuario = {
                    ...usuario,
                    ...dados,
                    empresa: dados.empresa
                };
                sessionStorage.setItem('stoklink_user', JSON.stringify(usuario));
            }
        } catch (error) {
            console.error('Erro ao sincronizar usuário:', error);
        }
    }

    // Exibir nome do usuário logado
    console.log('Usuário logado:', usuario.nome);
    document.getElementById('user-name').textContent = usuario.nome || 'Usuário';
    
    // Mostrar botão de admin se for admin
    if (usuario.role === 'admin') {
        const btnAdmin = document.getElementById('btn-admin');
        if (btnAdmin) {
            btnAdmin.style.display = 'flex';
            btnAdmin.addEventListener('click', async () => {
                if (await confirmarSaidaCadastro()) {
                    window.location.href = 'admin.html';
                }
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
    async function confirmarSaidaCadastro() {
        const cadastroVisivel = views.cadastro && views.cadastro.style.display !== 'none';
        if (!cadastroVisivel || !formularioAlterado) return true;
        return await showConfirm(
            'Existem alterações não salvas. Deseja sair mesmo assim?',
            'Alterações não salvas',
            'warning'
        );
    }
    const navButtons = { 
        dashboard: document.getElementById('btn-show-dashboard'), 
        cadastro: document.getElementById('btn-show-cadastro'), 
        visualizacao: document.getElementById('btn-show-visualizacao'),
    };
    window.addEventListener('beforeunload', (event) => {
        const cadastroVisivel = views.cadastro && views.cadastro.style.display !== 'none';
        if (cadastroVisivel && formularioAlterado) {
            event.preventDefault();
            event.returnValue = '';
        }
    });
    const form = document.getElementById('transfer-form');
    const btnAddItem = document.getElementById('btn-add-item');
    const btnSalvarRascunho = document.getElementById('btn-salvar-rascunho');
    const btnSubmitFormulario = form ? form.querySelector('button[type="submit"]') : null;
    const itensContainer = document.getElementById('itens-container');
    const transferListContainer = document.getElementById('transfer-list-container');
    const dashboardTransferList = document.getElementById('dashboard-transfer-list');
    const btnVoltarLista = document.getElementById('btn-voltar-lista');
    recebimentoModal = document.getElementById('recebimento-modal');
    recebimentoObservacaoInput = document.getElementById('recebimento-observacao');
    recebimentoDivergenciaInput = document.getElementById('recebimento-divergencia');
    recebimentoBtnConfirmar = document.getElementById('recebimento-btn-confirmar');
    recebimentoBtnCancelar = document.getElementById('recebimento-btn-cancelar');
    if (form) {
        form.addEventListener('input', marcarFormularioAlterado);
        form.addEventListener('change', marcarFormularioAlterado);
    }
    const tagInput = document.getElementById('tag-input');
    const btnAddTag = document.getElementById('btn-add-tag');
    const selectedTagsContainer = document.getElementById('selected-tags-container');
    const tagDatalist = document.getElementById('predefined-tags');
    const dashboardStatusFilter = document.getElementById('dashboard-status-filter');
    const filtroStatus = document.getElementById('filtro-status');
    const novoItemCodigo = document.getElementById('novo-item-codigo');
    const novoItemQuantidade = document.getElementById('novo-item-quantidade');

    // --- Armazenamento de Dados ---
    let transferencias = [];
    let transferenciasCarregadas = false;
    let nextId = 1;
    let previousView = 'dashboard';
    let currentView = 'dashboard';
    let globalTags = ['Urgente', 'Retirar no local', 'Frágil', 'Cliente VIP'];
    let globalTagsData = [];
    let currentTransferTags = [];
    let editandoRascunhoId = null; // ID do rascunho/transferência sendo editado
    let modoEdicaoTransferencia = null; // null | 'rascunho' | 'pendente'
    const salvarRascunhoDisplayPadrao = btnSalvarRascunho ? (btnSalvarRascunho.style.display || 'inline-flex') : null;
    let transferenciaEmDetalhe = null;
    let ultimaAtualizacaoTransferencias = 0;
    const INTERVALO_ATUALIZACAO_MS = 60 * 1000; // 1 minuto
    const STATUS_FILTER_OPTIONS = [
        { value: '', label: 'Todos os Status' },
        { value: 'rascunho', label: 'Rascunho' },
        { value: 'pendente', label: 'Pendente' },
        { value: 'em_separacao', label: 'Em Separação' },
        { value: 'aguardando_lancamento', label: 'Aguardando Lançamento' },
        { value: 'concluido', label: 'Recebimento Pendente' }
    ];
    const DASHBOARD_STATUS_ALLOWED = ['', 'rascunho', 'pendente', 'em_separacao', 'aguardando_lancamento', 'concluido'];
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');

    function showLoading(text = 'Processando...') {
        if (loadingText) loadingText.textContent = text;
        if (loadingOverlay) loadingOverlay.classList.add('show');
    }

    function hideLoading() {
        if (loadingOverlay) loadingOverlay.classList.remove('show');
    }

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
        
        currentView = viewName;
        if (viewName !== 'detalhe') {
            transferenciaEmDetalhe = null;
        }
        const exportButton = document.getElementById('btn-exportar-transferencia');
        if (exportButton) {
            exportButton.style.display = viewName === 'detalhe' && transferenciaEmDetalhe ? 'flex' : 'none';
        }

        lucide.createIcons();
    }

    // --- Funções de Renderização de Tags ---
    function populateDatalist() {
        if (tagDatalist) {
            tagDatalist.innerHTML = '';
            globalTags.forEach(tag => {
                tagDatalist.innerHTML += `<option value="${tag}">`;
            });
        }
        preencherSelectTags();
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
            
            const label = document.createElement('span');
            label.textContent = tag;
            tagEl.appendChild(label);

            const removeEl = document.createElement('button');
            removeEl.className = 'remove-tag-btn';
            removeEl.type = 'button';
            removeEl.textContent = '×';
            removeEl.setAttribute('aria-label', `Remover ${tag}`);
            removeEl.onclick = () => {
                currentTransferTags.splice(index, 1);
                renderFormTags();
                marcarFormularioAlterado();
            };

            tagEl.appendChild(removeEl);
            selectedTagsContainer.appendChild(tagEl);
        });
        lucide.createIcons();
    }

    function atualizarEstadoFormularioEdicao() {
        if (!btnSubmitFormulario) return;
        if (modoEdicaoTransferencia === 'pendente') {
            btnSubmitFormulario.innerHTML = '<i data-lucide="save"></i> Salvar Alterações';
            if (btnSalvarRascunho) {
                btnSalvarRascunho.style.display = 'none';
            }
        } else {
            btnSubmitFormulario.innerHTML = '<i data-lucide="send"></i> Enviar Solicitação';
            if (btnSalvarRascunho && salvarRascunhoDisplayPadrao !== null) {
                btnSalvarRascunho.style.display = salvarRascunhoDisplayPadrao;
            }
        }
        lucide.createIcons();
    }

    function limparModoEdicaoTransferencia() {
        editandoRascunhoId = null;
        modoEdicaoTransferencia = null;
        atualizarEstadoFormularioEdicao();
        resetFormularioAlterado();
    }

    function preencherFormularioTransferencia(t) {
        bloquearDeteccaoAlteracoes = true;
        const selectOrigem = document.getElementById('origem');
        const selectDestino = document.getElementById('destino');

        if (t.filial_origem_id) {
            selectOrigem.value = t.filial_origem_id;
        } else {
            const optionOrigem = Array.from(selectOrigem.options).find(opt => opt.text === t.origem);
            if (optionOrigem) selectOrigem.value = optionOrigem.value;
        }

        if (t.filial_destino_id) {
            selectDestino.value = t.filial_destino_id;
        } else {
            const optionDestino = Array.from(selectDestino.options).find(opt => opt.text === t.destino);
            if (optionDestino) selectDestino.value = optionDestino.value;
        }

        document.getElementById('solicitante').value = t.solicitante;

        currentTransferTags = [...(t.tags || [])];
        renderFormTags();

        itensContainer.innerHTML = '';
        t.itens.forEach(item => adicionarItem(item.codigo, item.solicitada));
        lucide.createIcons();
        bloquearDeteccaoAlteracoes = false;
        resetFormularioAlterado();
    }

    function iniciarEdicaoTransferencia(transferencia, modo) {
        if (!transferencia) return;
        modoEdicaoTransferencia = modo;
        editandoRascunhoId = transferencia.id;
        preencherFormularioTransferencia(transferencia);
        atualizarEstadoFormularioEdicao();
        showView('cadastro');
    }

    function editarTransferenciaPendente(transferId) {
        const t = transferencias.find(tr => tr.id === transferId);
        if (!t) {
            showAlert('Transferência não encontrada', 'Erro', 'danger');
            return;
        }
        iniciarEdicaoTransferencia(t, 'pendente');
        showAlert(
            'Você está editando esta transferência pendente. Ao salvar, o status permanecerá pendente.',
            'Editando Transferência',
            'info'
        );
    }

    async function excluirTransferencia(transferId) {
        const confirmar = await showConfirm(
            'Excluir esta transferência removerá todos os itens vinculados. Deseja continuar?',
            'Confirmar exclusão',
            'danger'
        );
        if (!confirmar) return;

        try {
            const response = await apiFetch(`/api/transferencias/${transferId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await showAlert('Transferência excluída com sucesso.', 'Excluída', 'success');
                await carregarTransferencias(true);
                previousView = 'visualizacao';
                showView('visualizacao');
                aplicarFiltros();
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao excluir transferência', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro ao excluir transferência:', error);
            await showAlert('Erro de conexão com o servidor', 'Erro', 'danger');
        }
    }

    atualizarEstadoFormularioEdicao();

    // --- Funções de Renderização Principal ---
    function renderTransferList(container, filterFn, dataset = null) {
        container.innerHTML = '';
        const base = dataset || transferencias;
        const data = filterFn ? base.filter(filterFn) : base;
        if (data.length === 0) { 
            container.innerHTML = '<p>Nenhuma transferência encontrada.</p>'; 
            return; 
        }
        
        // Criar tabela
        const table = document.createElement('table');
        table.className = 'transfer-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Data</th>
                    <th>Origem</th>
                    <th>Destino</th>
                    <th>Solicitante</th>
                    <th>Criado por</th>
                    <th>Nº Interno</th>
                    <th>Status</th>
                    <th>Itens</th>
                    <th>Tags</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        data.forEach(t => {
            const statusInfo = getStatusInfo(t.status);
            const row = document.createElement('tr');
            row.className = 'transfer-row';
            row.dataset.id = t.id;
            
            const numeroInterno = t.numeroTransferenciaInterna || '-';
            const dataFormatada = formatarData(t.data_criacao);
            const qtdItens = Array.isArray(t.itens) ? t.itens.length : (t.total_itens || 0);
            const labelItens = `${qtdItens} ${qtdItens === 1 ? 'item' : 'itens'}`;
            
            row.innerHTML = `
                <td><strong>${t.id}</strong></td>
                <td>${dataFormatada}</td>
                <td>${t.origem}</td>
                <td>${t.destino}</td>
                <td>${t.solicitante}</td>
                <td>${t.usuario_nome || '-'}</td>
                <td>${numeroInterno}</td>
                <td><span class="status-tag ${statusInfo.className}">${statusInfo.text}</span></td>
                <td><span class="badge badge-light">${labelItens}</span></td>
                <td><div class="tags-container">${renderTags(t.tags)}</div></td>
            `;
            
            row.addEventListener('click', () => {
                previousView = (container === dashboardTransferList) ? 'dashboard' : 'visualizacao';
                showDetalhes(t.id);
            });
            
            tbody.appendChild(row);
        });
        
        container.appendChild(table);
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
        renderDashboardList();
    }

    function ordenarPorAtualizacao(lista) {
        return [...lista].sort((a, b) => {
            const dataA = new Date(a.data_atualizacao || a.data_fim_separacao || a.data_criacao || 0);
            const dataB = new Date(b.data_atualizacao || b.data_fim_separacao || b.data_criacao || 0);
            return dataB - dataA;
        });
    }

    function renderDashboardList() {
        const filtroStatusDashboard = dashboardStatusFilter ? dashboardStatusFilter.value : '';
        const ordenadas = ordenarPorAtualizacao(transferencias);
        const filtered = ordenadas.filter(t => {
            const ativo = t.status !== 'recebido' && t.status !== 'concluido';
            if (!ativo) return false;
            if (filtroStatusDashboard && t.status !== filtroStatusDashboard) return false;
            return true;
        });
        renderTransferList(dashboardTransferList, null, filtered);
    }
    function showDetalhes(transferId) {
        const t = transferencias.find(transf => transf.id === transferId); 
        if (!t) {
            const exportButton = document.getElementById('btn-exportar-transferencia');
            if (exportButton) {
                exportButton.style.display = 'none';
                exportButton.onclick = null;
            }
            return;
        }
        transferenciaEmDetalhe = t;
        const exportButton = document.getElementById('btn-exportar-transferencia');
        if (exportButton) {
            exportButton.style.display = 'flex';
            exportButton.onclick = () => exportarTransferencia(t);
        }
        const statusInfo = getStatusInfo(t.status);
        const usuarioFilialId = usuario?.filial_id ? parseInt(usuario.filial_id, 10) : null;
        const podeEditarTransferencia = Boolean(
            usuarioFilialId &&
            (usuarioFilialId === t.filial_origem_id || usuarioFilialId === t.filial_destino_id)
        );
        const usuarioEhCriador = usuario?.id ? Number(usuario.id) === Number(t.usuario_id) : false;
        const usuarioEhAdmin = usuario?.role === 'admin';
        document.getElementById('detalhe-id').textContent = t.id;
        document.getElementById('detalhe-status-tag').innerHTML = `<span class="status-tag ${statusInfo.className}">${statusInfo.text}</span>`;
        document.getElementById('detalhe-origem').textContent = t.origem;
        document.getElementById('detalhe-destino').textContent = t.destino;
        document.getElementById('detalhe-solicitante').textContent = t.solicitante;
        document.getElementById('detalhe-criado-por').textContent = t.usuario_nome || '-';
        document.getElementById('detalhe-data').textContent = formatarData(t.data_criacao);
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
        const wrapperObsReceb = document.getElementById('detalhe-obs-recebimento-wrapper');
        if (wrapperObsReceb) {
            if (t.observacao_recebimento) {
                wrapperObsReceb.style.display = 'block';
                document.getElementById('detalhe-observacao-recebimento').textContent = t.observacao_recebimento;
            } else {
                wrapperObsReceb.style.display = 'none';
            }
        }
        const itensLista = document.getElementById('detalhe-itens-lista');
        itensLista.innerHTML = '';
        const hasAtendida = t.itens.some(item => typeof item.atendida !== 'undefined' && item.atendida !== null);
        const colunaAtendida = document.getElementById('detalhe-coluna-atendida');
        if (colunaAtendida) {
            colunaAtendida.style.display = (t.status === 'em_separacao' && podeEditarTransferencia) || hasAtendida ? 'block' : 'none';
        }

        const totalItens = document.getElementById('detalhe-total-itens');
        if (totalItens) {
            totalItens.textContent = `${t.itens.length} item${t.itens.length === 1 ? '' : 's'}`;
        }

        t.itens.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'detalhe-item-row';
            const podeEditarItem = t.status === 'em_separacao' && podeEditarTransferencia;
            if (podeEditarItem) {
                const valorAtendida = item.atendida > 0 ? item.atendida : '';
                itemDiv.innerHTML = `
                    <div><strong>Código:</strong> ${item.codigo}</div>
                    <div><strong>Qtd. Solicitada:</strong> ${item.solicitada}</div>
                    <div class="form-group" style="margin:0;">
                        <label>Qtd. Atendida:</label>
                        <input type="number" class="qtd-atendida-input" value="${valorAtendida}" min="0" max="${item.solicitada}" placeholder="0">
                    </div>`;
            } else {
                 itemDiv.innerHTML = `
                    <div><strong>Código:</strong> ${item.codigo}</div>
                    <div><strong>Qtd. Solicitada:</strong> ${item.solicitada}</div>
                    <div><strong>Qtd. Atendida:</strong> ${item.atendida ?? '-'}</div>`;
            }
            itensLista.appendChild(itemDiv);
        });
        const acoesContainer = document.getElementById('detalhe-acoes');
        acoesContainer.innerHTML = '';
        const statusComAcao = ['aguardando_separacao', 'em_separacao', 'separado', 'aguardando_lancamento'];
        const precisaPermissao = statusComAcao.includes(t.status) || (t.status === 'concluido' && !t.data_recebimento);
        
        if (precisaPermissao && !podeEditarTransferencia) {
            acoesContainer.innerHTML = '<p class="acoes-alerta">Apenas as filiais de origem ou destino podem alterar o status desta transferência.</p>';
        } else {
            // Novos status com workflow
            if (t.status === 'rascunho') {
                const btnEditar = document.createElement('button');
                btnEditar.className = 'btn btn-secondary'; 
                btnEditar.innerHTML = '<i data-lucide="edit"></i> Editar Rascunho';
                btnEditar.onclick = () => {
                    editarRascunho(t.id);
                };
                acoesContainer.appendChild(btnEditar);
                
                const btnEnviar = document.createElement('button');
                btnEnviar.className = 'btn btn-primary'; 
                btnEnviar.innerHTML = '<i data-lucide="send"></i> Enviar Solicitação';
                btnEnviar.style.marginLeft = '10px';
                btnEnviar.onclick = async () => {
                    const confirmado = await showConfirm(
                        'Deseja enviar esta solicitação de transferência?',
                        'Confirmar Envio',
                        'info'
                    );
                    if (confirmado) {
                        await atualizarEtapa(t.id, 'aguardando_separacao');
                        await showAlert('Solicitação enviada! Aguardando separação.', 'Sucesso', 'success');
                    }
                };
                acoesContainer.appendChild(btnEnviar);
            } else if (t.status === 'pendente') {
                const acoesLinha = document.createElement('div');
                acoesLinha.style.display = 'flex';
                acoesLinha.style.gap = '10px';
                acoesLinha.style.flexWrap = 'wrap';

                if (usuarioEhCriador) {
                    const btnEditar = document.createElement('button');
                    btnEditar.className = 'btn btn-secondary';
                    btnEditar.innerHTML = '<i data-lucide="edit"></i> Editar Transferência';
                    btnEditar.onclick = () => editarTransferenciaPendente(t.id);
                    acoesLinha.appendChild(btnEditar);
                }

                const btn = document.createElement('button');
                btn.className = 'btn btn-info';
                btn.innerHTML = '<i data-lucide="play"></i> Iniciar Separação';
                btn.onclick = async () => {
                    await atualizarEtapa(t.id, 'em_separacao');
                    await showAlert('Separação iniciada!', 'Sucesso', 'success');
                };
                acoesLinha.appendChild(btn);

                acoesContainer.appendChild(acoesLinha);
            } else if (t.status === 'aguardando_separacao') {
                const btn = document.createElement('button');
                btn.className = 'btn btn-info'; 
                btn.innerHTML = '<i data-lucide="play"></i> Iniciar Separação';
                btn.onclick = async () => {
                    await atualizarEtapa(t.id, 'em_separacao');
                    await showAlert('Separação iniciada!', 'Sucesso', 'success');
                };
                acoesContainer.appendChild(btn);
            } else if (t.status === 'em_separacao') {
                const btn = document.createElement('button');
                btn.className = 'btn btn-success'; 
                btn.innerHTML = '<i data-lucide="package-check"></i> Finalizar Separação';
                btn.onclick = async () => {
                    await atualizarEtapa(t.id, 'aguardando_lancamento');
                    await showAlert('Separação finalizada! Aguardando lançamento no sistema.', 'Sucesso', 'success');
                };
                acoesContainer.appendChild(btn);
            } else if (t.status === 'separado') {
                const btn = document.createElement('button');
                btn.className = 'btn btn-primary'; 
                btn.innerHTML = '<i data-lucide="clipboard-check"></i> Aguardando Lançamento';
                btn.onclick = async () => {
                    await atualizarEtapa(t.id, 'aguardando_lancamento');
                    await showAlert('Transferência enviada para lançamento no sistema!', 'Sucesso', 'success');
                };
                acoesContainer.appendChild(btn);
            } else if (t.status === 'recebido') {
                acoesContainer.innerHTML = '<p style="color: #28a745; font-weight: 600;">✅ Transferência finalizada com sucesso!</p>';
            } else if (t.status === 'concluido') {
                // Verificar se tem data de recebimento (transferência nova) ou não (transferência antiga)
                if (!t.data_recebimento) {
                    // Transferência antiga - permitir adicionar recebimento
                    const btnReceber = document.createElement('button');
                    btnReceber.className = 'btn btn-success';
                    btnReceber.innerHTML = '<i data-lucide="check-circle"></i> Marcar como Recebido';
                    btnReceber.onclick = async () => {
                        const dadosRecebimento = await solicitarDadosRecebimento();
                        if (!dadosRecebimento) return;
                        await atualizarEtapa(t.id, 'recebido', {
                            observacao_recebimento: dadosRecebimento.observacao,
                            adicionarTagDivergencia: dadosRecebimento.adicionarDivergencia
                        });
                        await showAlert('Recebimento registrado com sucesso!', 'Sucesso', 'success');
                    };
                    acoesContainer.appendChild(btnReceber);
                } else {
                    acoesContainer.innerHTML = '<p style="color: #28a745; font-weight: 600;">✅ Transferência concluída com sucesso!</p>';
                } 
            } else if (t.status === 'cancelado') {
                acoesContainer.innerHTML = '<p style="color: #dc3545; font-weight: 600;">❌ Transferência cancelada.</p>'; 
            } else if (t.status === 'aguardando_lancamento') {
                // Compatibilidade com status antigo
                acoesContainer.innerHTML = `<div class="form-group"><label for="input-transf-interna">Nº da Transferência (Sistema Principal) *</label><input type="text" id="input-transf-interna" placeholder="Digite o número da transferência"></div><button class="btn btn-primary" id="btn-lancar-transferencia"><i data-lucide="send"></i> Lançamento Concluído</button>`;
                acoesContainer.querySelector('#btn-lancar-transferencia').onclick = () => lancarTransferencia(t.id);
            } else { 
                acoesContainer.innerHTML = '<p>Status desconhecido.</p>'; 
            }
        }

        if (usuarioEhAdmin) {
            const adminActions = document.createElement('div');
            adminActions.style.marginTop = '20px';
            adminActions.style.display = 'flex';
            adminActions.style.justifyContent = 'flex-end';

            const btnExcluir = document.createElement('button');
            btnExcluir.className = 'btn btn-danger';
            btnExcluir.style.backgroundColor = '#dc3545';
            btnExcluir.innerHTML = '<i data-lucide="trash-2"></i> Excluir Transferência';
            btnExcluir.onclick = () => excluirTransferencia(t.id);

            adminActions.appendChild(btnExcluir);
            acoesContainer.appendChild(adminActions);
            lucide.createIcons();
        }
        
        // Mostrar timestamps se existirem
        const timelineCard = document.getElementById('detalhe-timeline-card');
        let hasTimeline = false;
        
        if (t.data_inicio_separacao) {
            hasTimeline = true;
            document.getElementById('detalhe-inicio-separacao-wrapper').style.display = 'block';
            document.getElementById('detalhe-inicio-separacao').textContent = formatarDataHora(t.data_inicio_separacao);
        } else {
            document.getElementById('detalhe-inicio-separacao-wrapper').style.display = 'none';
        }
        
        if (t.data_fim_separacao) {
            hasTimeline = true;
            document.getElementById('detalhe-fim-separacao-wrapper').style.display = 'block';
            document.getElementById('detalhe-fim-separacao').textContent = formatarDataHora(t.data_fim_separacao);
            
            // Calcular tempo de separação
            if (t.data_inicio_separacao) {
                const duracao = calcularDuracao(t.data_inicio_separacao, t.data_fim_separacao);
                document.getElementById('detalhe-tempo-separacao-wrapper').style.display = 'block';
                document.getElementById('detalhe-tempo-separacao').textContent = duracao;
            }
        } else {
            document.getElementById('detalhe-fim-separacao-wrapper').style.display = 'none';
            document.getElementById('detalhe-tempo-separacao-wrapper').style.display = 'none';
        }
        
        if (t.data_recebimento) {
            hasTimeline = true;
            document.getElementById('detalhe-recebimento-wrapper').style.display = 'block';
            document.getElementById('detalhe-recebimento').textContent = formatarDataHora(t.data_recebimento);
            
            // Calcular tempo total (do início da separação até recebimento)
            if (t.data_inicio_separacao) {
                const duracaoTotal = calcularDuracao(t.data_inicio_separacao, t.data_recebimento);
                document.getElementById('detalhe-tempo-total-wrapper').style.display = 'block';
                document.getElementById('detalhe-tempo-total').textContent = duracaoTotal;
            }
        } else {
            document.getElementById('detalhe-recebimento-wrapper').style.display = 'none';
            document.getElementById('detalhe-tempo-total-wrapper').style.display = 'none';
        }
        
        timelineCard.style.display = hasTimeline ? 'block' : 'none';
        
        showView('detalhe');
    }
    // Funções auxiliares para timestamps
    function formatarData(dataString) {
        if (!dataString) return '-';
        // Extrair apenas a parte da data (YYYY-MM-DD) sem considerar timezone
        const dataISO = dataString.split('T')[0];
        const [ano, mes, dia] = dataISO.split('-');
        return `${dia}/${mes}/${ano}`;
    }

    function getLocalISODate(date = new Date()) {
        return date.toLocaleDateString('en-CA');
    }

    function obterDataISO(dataString) {
        if (!dataString) return '';
        const data = new Date(dataString);
        if (isNaN(data.getTime())) return dataString.split('T')[0];
        return data.toLocaleDateString('en-CA');
    }
    
    function formatarDataHora(dataString) {
        if (!dataString) return '-';
        const data = new Date(dataString);
        return data.toLocaleString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    function preencherSelectTags() {
        if (!tagInput) return;
        tagInput.innerHTML = '<option value="">Selecione</option>';
        globalTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            tagInput.appendChild(option);
        });
    }
    function resetItemInputs() {
        if (novoItemCodigo) novoItemCodigo.value = '';
        if (novoItemQuantidade) novoItemQuantidade.value = '';
    }

    preencherSelectStatus(dashboardStatusFilter, DASHBOARD_STATUS_ALLOWED);
    preencherSelectStatus(filtroStatus);
    preencherSelectTags();

    function preencherSelectStatus(select, allowedValues = null) {
        if (!select) return;
        select.innerHTML = '';
        STATUS_FILTER_OPTIONS.forEach(opt => {
            if (allowedValues && !allowedValues.includes(opt.value)) return;
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            select.appendChild(option);
        });
    }
    
    function calcularDuracao(dataInicio, dataFim) {
        if (!dataInicio || !dataFim) return '-';
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        const diffMs = fim - inicio;
        
        const horas = Math.floor(diffMs / (1000 * 60 * 60));
        const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (horas > 24) {
            const dias = Math.floor(horas / 24);
            const horasRestantes = horas % 24;
            return `${dias}d ${horasRestantes}h ${minutos}min`;
        }
        
        return `${horas}h ${minutos}min`;
    }

    function exportarTransferencia(transferencia) {
        if (!transferencia || !Array.isArray(transferencia.itens) || transferencia.itens.length === 0) {
            showAlert('Não há itens para exportar nesta transferência.', 'Aviso', 'warning');
            return;
        }

        const destino = transferencia.destino || '-';
        const rows = [['Codigo', 'Quantidade', 'FilialDestino']];

        transferencia.itens.forEach(item => {
            const codigo = item.codigo || '';
            const quantidade = item.solicitada ?? item.quantidade ?? item.quantidade_solicitada ?? 0;
            rows.push([codigo, quantidade, destino]);
        });

        const csvContent = rows
            .map(cols => cols.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const fileName = `${transferencia.id || 'transferencia'}-itens.csv`;

        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    const getStatusInfo = (status) => {
        switch(status) {
            case 'rascunho': return { text: 'Rascunho', className: 'status-rascunho' };
            case 'aguardando_separacao': return { text: '⏳ Aguardando Separação', className: 'status-aguardando-separacao' };
            case 'em_separacao': return { text: '📦 Em Separação', className: 'status-em-separacao' };
            case 'separado': return { text: '✅ Separado', className: 'status-separado' };
            case 'aguardando_lancamento': return { text: '📋 Aguardando Lançamento', className: 'status-aguardando-lancamento' };
            case 'recebido': return { text: '🎉 Finalizado', className: 'status-recebido' };
            case 'concluido': return { text: '⏳ Recebimento Pendente', className: 'status-concluido' };
            case 'cancelado': return { text: '❌ Cancelado', className: 'status-cancelado' };
            // Status antigos (manter compatibilidade)
            case 'pendente': return { text: 'Pendente', className: 'status-pendente' };
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
    
    // Nova função para atualizar etapa com novo endpoint
    async function atualizarEtapa(transferId, novoStatus, extras = {}) {
        try {
            const response = await apiFetch(`/api/transferencias/${transferId}/etapa`, {
                method: 'PUT',
                body: JSON.stringify({ status: novoStatus, ...extras })
            });
            
            if (response.ok) {
                await carregarTransferencias();
                showDetalhes(transferId); 
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao atualizar status', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro ao atualizar etapa:', error);
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
    function adicionarItem(codigo, quantidade) {
        if (!codigo || typeof quantidade === 'undefined') return;
        const itemRow = document.createElement('div');
        itemRow.className = 'item-row';

        const codigoInfo = document.createElement('div');
        codigoInfo.className = 'item-info';
        codigoInfo.dataset.field = 'codigo';
        codigoInfo.innerHTML = `<strong class="item-codigo-label">${codigo}</strong>`;

        const quantidadeInfo = document.createElement('div');
        quantidadeInfo.className = 'item-info';
        quantidadeInfo.dataset.field = 'quantidade';
        quantidadeInfo.innerHTML = `<span class="item-quantidade-label">${quantidade}</span>`;

        const actions = document.createElement('div');
        actions.className = 'item-actions';

        const hiddenCodigo = document.createElement('input');
        hiddenCodigo.type = 'hidden';
        hiddenCodigo.className = 'item-codigo';
        hiddenCodigo.value = codigo;

        const hiddenQuantidade = document.createElement('input');
        hiddenQuantidade.type = 'hidden';
        hiddenQuantidade.className = 'item-quantidade';
        hiddenQuantidade.value = quantidade;

        itemRow.appendChild(codigoInfo);
        itemRow.appendChild(quantidadeInfo);
        itemRow.appendChild(actions);
        itemRow.appendChild(hiddenCodigo);
        itemRow.appendChild(hiddenQuantidade);

        configurarAcoesItem(itemRow);
        itensContainer.appendChild(itemRow);
        if (window.lucide) {
            lucide.createIcons();
        }
        marcarFormularioAlterado();
    }

    function configurarAcoesItem(itemRow) {
        const actions = itemRow.querySelector('.item-actions');
        if (!actions) return;
        actions.innerHTML = `
            <button type="button" class="btn-edit-item" aria-label="Editar item">
                <i data-lucide="edit-3"></i>
            </button>
            <button type="button" class="btn-remover-item" aria-label="Remover item">
                <i data-lucide="trash-2"></i>
            </button>
        `;

        const btnEditar = actions.querySelector('.btn-edit-item');
        const btnRemover = actions.querySelector('.btn-remover-item');

        if (btnEditar) {
            btnEditar.addEventListener('click', () => editarItem(itemRow));
        }
        if (btnRemover) {
            btnRemover.addEventListener('click', () => {
                if (itemRow.classList.contains('editing')) return;
                itemRow.remove();
                marcarFormularioAlterado();
            });
        }

        lucide.createIcons();
    }

    function editarItem(itemRow) {
        if (itemRow.classList.contains('editing')) return;
        itemRow.classList.add('editing');

        const codigoHidden = itemRow.querySelector('.item-codigo');
        const quantidadeHidden = itemRow.querySelector('.item-quantidade');
        const codigoInfo = itemRow.querySelector('.item-info[data-field="codigo"]');
        const quantidadeInfo = itemRow.querySelector('.item-info[data-field="quantidade"]');
        const actions = itemRow.querySelector('.item-actions');

        const inputCodigo = document.createElement('input');
        inputCodigo.type = 'text';
        inputCodigo.className = 'input-inline';
        inputCodigo.value = codigoHidden?.value || '';

        const inputQuantidade = document.createElement('input');
        inputQuantidade.type = 'number';
        inputQuantidade.min = '1';
        inputQuantidade.className = 'input-inline';
        inputQuantidade.value = quantidadeHidden?.value || 1;

        if (codigoInfo) {
            codigoInfo.innerHTML = '';
            codigoInfo.appendChild(inputCodigo);
        }
        if (quantidadeInfo) {
            quantidadeInfo.innerHTML = '';
            quantidadeInfo.appendChild(inputQuantidade);
        }

        if (actions) {
            actions.innerHTML = `
                <button type="button" class="btn-save-item" aria-label="Salvar item"><i data-lucide="check"></i></button>
                <button type="button" class="btn-cancel-item" aria-label="Cancelar edição"><i data-lucide="x"></i></button>
            `;

            const btnSalvar = actions.querySelector('.btn-save-item');
            const btnCancelar = actions.querySelector('.btn-cancel-item');

            btnSalvar?.addEventListener('click', async () => {
                const novoCodigo = inputCodigo.value.trim();
                const novaQuantidade = parseInt(inputQuantidade.value, 10);

                if (!novoCodigo) {
                    await showAlert('Informe o código do produto.', 'Campo obrigatório', 'warning');
                    inputCodigo.focus();
                    return;
                }
                if (!novaQuantidade || novaQuantidade <= 0) {
                    await showAlert('Informe uma quantidade válida.', 'Campo obrigatório', 'warning');
                    inputQuantidade.focus();
                    return;
                }

                if (codigoHidden) codigoHidden.value = novoCodigo;
                if (quantidadeHidden) quantidadeHidden.value = novaQuantidade;

                if (codigoInfo) {
                    codigoInfo.innerHTML = `<strong class="item-codigo-label">${novoCodigo}</strong>`;
                }
                if (quantidadeInfo) {
                    quantidadeInfo.innerHTML = `<span class="item-quantidade-label">${novaQuantidade}</span>`;
                }

                itemRow.classList.remove('editing');
                configurarAcoesItem(itemRow);
                marcarFormularioAlterado();
            });

            btnCancelar?.addEventListener('click', () => {
                if (codigoInfo) {
                    codigoInfo.innerHTML = `<strong class="item-codigo-label">${codigoHidden?.value || ''}</strong>`;
                }
                if (quantidadeInfo) {
                    quantidadeInfo.innerHTML = `<span class="item-quantidade-label">${quantidadeHidden?.value || 0}</span>`;
                }
                itemRow.classList.remove('editing');
                configurarAcoesItem(itemRow);
            });

            lucide.createIcons();
        }
    }

    btnAddItem.addEventListener('click', adicionarItemDoFormulario);
    if (novoItemCodigo) {
        novoItemCodigo.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                novoItemQuantidade?.focus();
            }
        });
    }
    if (novoItemQuantidade) {
        novoItemQuantidade.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                adicionarItemDoFormulario();
            }
        });
    }

    async function adicionarItemDoFormulario() {
        if (!novoItemCodigo || !novoItemQuantidade) return;
        const codigo = novoItemCodigo.value.trim();
        const quantidade = parseInt(novoItemQuantidade.value, 10);
        const destino = document.getElementById('destino').value;

        if (!codigo) {
            await showAlert('Informe o código do produto.', 'Campo obrigatório', 'warning');
            novoItemCodigo.focus();
            return;
        }

        if (!destino) {
            await showAlert('Selecione a filial de destino antes de adicionar itens.', 'Campo obrigatório', 'warning');
            return;
        }

        if (!quantidade || quantidade <= 0) {
            await showAlert('Informe uma quantidade válida.', 'Campo obrigatório', 'warning');
            novoItemQuantidade.focus();
            return;
        }

        const permitido = await verificarProdutoDuplicadoAoAdicionar(codigo, destino);
        if (!permitido) return;

        adicionarItem(codigo, quantidade);
        resetItemInputs();
        novoItemCodigo.focus();
    }

    async function verificarProdutoDuplicadoAoAdicionar(codigo, destino) {
        try {
            const response = await apiFetch(`/api/verificar-produto/${encodeURIComponent(codigo)}/${encodeURIComponent(destino)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.duplicado) {
                    const confirmado = await showConfirm(
                        `${data.mensagem}\n\nDeseja adicionar mesmo assim?`,
                        'Produto em Transferência Ativa',
                        'warning'
                    );
                    return confirmado;
                }
            }
        } catch (error) {
            console.error('Erro ao verificar produto:', error);
        }
        return true;
    }
    
    // Editar Rascunho
    function editarRascunho(transferId) {
        const t = transferencias.find(tr => tr.id === transferId);
        if (!t) {
            showAlert('Rascunho não encontrado', 'Erro', 'danger');
            return;
        }
        iniciarEdicaoTransferencia(t, 'rascunho');
        showAlert('Rascunho carregado! Faça as alterações e clique em "Salvar Rascunho".', 'Editando Rascunho', 'info');
    }
    
    async function salvarRascunho(comoRascunho = true) {
        showLoading(comoRascunho ? 'Salvando rascunho...' : 'Enviando solicitação...');
        const itens = [];
        const itemRows = itensContainer.querySelectorAll('.item-row');
        if(itemRows.length === 0) { 
            hideLoading();
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
            let response;
            
            if (editandoRascunhoId) {
                // Atualizando rascunho existente
                const selectOrigem = document.getElementById('origem');
                const selectDestino = document.getElementById('destino');
                const origemId = selectOrigem.value;
                const destinoId = selectDestino.value;
                const origemNome = selectOrigem.options[selectOrigem.selectedIndex]?.text || '';
                const destinoNome = selectDestino.options[selectDestino.selectedIndex]?.text || '';
                
                const transferencia = {
                    origem: origemNome,
                    destino: destinoNome,
                    filial_origem_id: origemId ? parseInt(origemId) : null,
                    filial_destino_id: destinoId ? parseInt(destinoId) : null,
                    solicitante: document.getElementById('solicitante').value,
                    tags: [...currentTransferTags],
                    itens: itens
                };
                
                response = await apiFetch(`/api/transferencias/${editandoRascunhoId}`, {
                    method: 'PUT',
                    body: JSON.stringify(transferencia)
                });
            } else {
                // Criando nova transferência
                const selectOrigem = document.getElementById('origem');
                const selectDestino = document.getElementById('destino');
                const origemId = selectOrigem.value;
                const destinoId = selectDestino.value;
                const origemNome = selectOrigem.options[selectOrigem.selectedIndex]?.text || '';
                const destinoNome = selectDestino.options[selectDestino.selectedIndex]?.text || '';
                
                const novaTransferencia = {
                    id: generateNewId(),
                    origem: origemNome,
                    destino: destinoNome,
                    filial_origem_id: origemId ? parseInt(origemId) : null,
                    filial_destino_id: destinoId ? parseInt(destinoId) : null,
                    solicitante: document.getElementById('solicitante').value,
                    tags: [...currentTransferTags],
                    data: new Date().toISOString().split('T')[0], 
                    status: comoRascunho ? 'rascunho' : 'pendente',
                    itens: itens
                };
                
                response = await apiFetch('/api/transferencias', {
                    method: 'POST',
                    body: JSON.stringify(novaTransferencia)
                });
            }
            
            if (response.ok) {
                bloquearDeteccaoAlteracoes = true;
                form.reset(); 
                itensContainer.innerHTML = ''; 
                currentTransferTags = []; 
                renderFormTags(); 
                resetItemInputs();
                bloquearDeteccaoAlteracoes = false;
                resetFormularioAlterado();
                
                let mensagem;
                if (editandoRascunhoId) {
                    mensagem = modoEdicaoTransferencia === 'pendente'
                        ? 'Transferência pendente atualizada com sucesso!'
                        : 'Rascunho atualizado com sucesso!';
                } else {
                    mensagem = comoRascunho ? 'Rascunho salvo com sucesso!' : 'Transferência salva com sucesso!';
                }
                hideLoading();
                await showAlert(mensagem, 'Sucesso', 'success');
                
                limparModoEdicaoTransferencia();
                
                // Recarregar transferências
                await carregarTransferencias();
                
                return true;
            } else {
                const error = await response.json();
                hideLoading();
                await showAlert(error.error || 'Erro ao salvar transferência', 'Erro', 'danger');
                return false;
            }
        } catch (error) {
            console.error('Erro ao salvar transferência:', error);
            hideLoading();
            await showAlert('Erro de conexão com o servidor', 'Erro', 'danger');
            return false;
        } finally {
            hideLoading();
        }
    }

    // --- Event Listeners ---
    navButtons.dashboard.addEventListener('click', async () => {
        if (!(await confirmarSaidaCadastro())) return;
        showView('dashboard');
        await atualizarTransferenciasSeNecessario();
    });
    navButtons.cadastro.addEventListener('click', async () => {
        if (!(await confirmarSaidaCadastro())) return;
        showView('cadastro');
    });
    navButtons.visualizacao.addEventListener('click', async () => { 
        if (!(await confirmarSaidaCadastro())) return;
        showView('visualizacao'); 
        await atualizarTransferenciasSeNecessario();
        aplicarFiltros();
    });
    btnVoltarLista.addEventListener('click', async () => { 
        showView(previousView); 
        if (previousView === 'dashboard' || previousView === 'visualizacao') {
            await atualizarTransferenciasSeNecessario();
            if (previousView === 'visualizacao') {
                aplicarFiltros();
            }
        }
    });
    if (dashboardStatusFilter) {
        dashboardStatusFilter.addEventListener('change', () => renderDashboardList());
    }
    
    // Importar XLSX/CSV em lote
    const btnImportarXlsx = document.getElementById('btn-importar-xlsx');
    const fileInputXlsx = document.getElementById('file-input-xlsx');
    const btnImportarCsv = document.getElementById('btn-importar-csv');
    const fileInputCsv = document.getElementById('file-input-csv');
    const inputItensPorTransferencia = document.getElementById('input-itens-por-transferencia');
    
    btnImportarXlsx.addEventListener('click', () => fileInputXlsx.click());
    
    fileInputXlsx.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const itens = await lerItensDeXlsx(file);

            if (itens.length === 0) {
                await showAlert('Nenhum item válido encontrado na planilha. Verifique as colunas \"Produto\" e \"Quantidade_Sugerida\".', 'Aviso', 'warning');
                return;
            }

            const usarLote = await showConfirm(
                `${itens.length} itens encontrados. Deseja gerar transferências automaticamente em lotes? (Cancelar apenas preenche o formulário)`,
                'Importar XLSX',
                'info'
            );

            if (usarLote) {
                const base = await obterDadosBaseTransferencia();
                if (!base) return;

                const itensPorTransferencia = Math.max(1, parseInt(inputItensPorTransferencia?.value, 10) || 50);
                const lotes = dividirEmLotes(itens, itensPorTransferencia);
                const confirmado = await showConfirm(
                    `Serão criadas ${lotes.length} transferências com até ${itensPorTransferencia} item(s). Deseja continuar?`,
                    'Importação em lote',
                    'warning'
                );
                if (!confirmado) return;

                showLoading('Criando transferências em lote...');
                const resultado = await criarTransferenciasEmLote(lotes, base);
                hideLoading();

                let mensagem = `${resultado.sucessos.length} transferência(s) criada(s).`;
                let titulo = 'Sucesso';
                let tipo = 'success';

                if (resultado.falhas.length > 0) {
                    titulo = 'Importação parcial';
                    tipo = 'warning';
                    mensagem += `\n${resultado.falhas.length} falharam: ${resultado.falhas.map(f => f.id).join(', ')}.`;
                }

                await showAlert(mensagem, titulo, tipo);
                await carregarTransferencias();
                showView('dashboard');
            } else {
                preencherFormularioComItens(itens);
                await showAlert(`${itens.length} itens importados para o formulário.`, 'Sucesso', 'success');
            }
        } catch (error) {
            console.error('Erro ao ler arquivo XLSX:', error);
            await showAlert(error.message || 'Erro ao processar arquivo XLSX. Verifique o formato.', 'Erro', 'danger');
        } finally {
            fileInputXlsx.value = '';
        }
    });

    if (btnImportarCsv && fileInputCsv) {
        btnImportarCsv.addEventListener('click', () => {
            fileInputCsv.click();
        });

        fileInputCsv.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            await processarImportacaoCsv(file);
        });
    }

    async function processarImportacaoCsv(file) {
        try {
            const base = await obterDadosBaseTransferencia();
            if (!base) {
                fileInputCsv.value = '';
                return;
            }

            showLoading('Processando CSV...');
            const conteudo = await file.text();
            const itens = parseCsvConteudo(conteudo);

            if (itens.length === 0) {
                hideLoading();
                await showAlert('Nenhum item válido encontrado no CSV.', 'Aviso', 'warning');
                fileInputCsv.value = '';
                return;
            }

            const itensPorTransferencia = Math.max(1, parseInt(inputItensPorTransferencia?.value, 10) || 50);
            const lotes = dividirEmLotes(itens, itensPorTransferencia);
            hideLoading();

            const confirmado = await showConfirm(
                `Serão criadas ${lotes.length} transferências a partir de ${itens.length} itens, com até ${itensPorTransferencia} item(s) em cada. Deseja continuar?`,
                'Importação em lote',
                'warning'
            );

            if (!confirmado) {
                fileInputCsv.value = '';
                return;
            }

            showLoading('Criando transferências em lote...');
            const resultado = await criarTransferenciasEmLote(lotes, base);
            hideLoading();

            let mensagem = `${resultado.sucessos.length} transferência(s) criada(s) com sucesso.`;
            let titulo = 'Sucesso';
            let tipo = 'success';

            if (resultado.falhas.length > 0) {
                titulo = 'Importação parcial';
                tipo = 'warning';
                const idsFalhos = resultado.falhas.map(f => f.id).join(', ');
                mensagem += `\n${resultado.falhas.length} falharam: ${idsFalhos}.`;
            }

            await showAlert(mensagem, titulo, tipo);
            await carregarTransferencias();
            showView('dashboard');
        } catch (error) {
            hideLoading();
            console.error('Erro ao importar CSV:', error);
            await showAlert(error.message || 'Erro ao processar o CSV. Verifique o formato e tente novamente.', 'Erro', 'danger');
        } finally {
            fileInputCsv.value = '';
        }
    }

    async function obterDadosBaseTransferencia() {
        const selectOrigem = document.getElementById('origem');
        const selectDestino = document.getElementById('destino');
        const solicitanteInput = document.getElementById('solicitante');

        const origemId = selectOrigem.value;
        const destinoId = selectDestino.value;
        const solicitante = solicitanteInput.value.trim();

        if (!origemId || !destinoId) {
            await showAlert('Selecione as filiais de origem e destino antes de importar o CSV.', 'Campos obrigatórios', 'warning');
            return null;
        }

        if (!solicitante) {
            await showAlert('Informe o nome do solicitante antes de importar o CSV.', 'Campos obrigatórios', 'warning');
            return null;
        }

        const origemNome = selectOrigem.options[selectOrigem.selectedIndex]?.text || '';
        const destinoNome = selectDestino.options[selectDestino.selectedIndex]?.text || '';

        return {
            origemId: origemId ? parseInt(origemId, 10) : null,
            destinoId: destinoId ? parseInt(destinoId, 10) : null,
            origemNome,
            destinoNome,
            solicitante
        };
    }

    function dividirEmLotes(array, tamanho) {
        const lotes = [];
        for (let i = 0; i < array.length; i += tamanho) {
            lotes.push(array.slice(i, i + tamanho));
        }
        return lotes;
    }

    function parseCsvConteudo(conteudo) {
        const linhas = conteudo.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (linhas.length === 0) return [];

        const delimitador = linhas[0].includes(';') ? ';' : ',';
        const cabecalho = dividirLinhaCsv(linhas[0], delimitador).map(h => h.replace(/"/g, '').trim().toLowerCase());

        const idxCodigo = cabecalho.findIndex(col => col.includes('codigo'));
        const idxQuantidade = cabecalho.findIndex(col => col.includes('quant'));

        if (idxCodigo === -1 || idxQuantidade === -1) {
            throw new Error('Cabeçalho inválido. Certifique-se de que existem colunas para código e quantidade.');
        }

        const itens = [];
        for (let i = 1; i < linhas.length; i++) {
            const valores = dividirLinhaCsv(linhas[i], delimitador);
            const codigo = (valores[idxCodigo] || '').trim();
            const quantidadeBruta = (valores[idxQuantidade] || '').replace(',', '.');
            const quantidade = Math.round(Number(quantidadeBruta));

            if (!codigo || isNaN(quantidade) || quantidade <= 0) continue;

            itens.push({
                codigo,
                solicitada: quantidade,
                atendida: 0
            });
        }

        return itens;
    }

    function dividirLinhaCsv(linha, delimitador) {
        const valores = [];
        let atual = '';
        let emAspas = false;

        for (let i = 0; i < linha.length; i++) {
            const char = linha[i];

            if (char === '"') {
                emAspas = !emAspas;
                continue;
            }

            if (char === delimitador && !emAspas) {
                valores.push(atual);
                atual = '';
            } else {
                atual += char;
            }
        }

        valores.push(atual);
        return valores.map(v => v.trim());
    }

    async function lerItensDeXlsx(file) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        let headerRowIndex = -1;
        let produtoColIndex = -1;
        let quantidadeColIndex = -1;

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i] || [];
            row.forEach((value, index) => {
                const cell = String(value || '').trim().toLowerCase();
                const normalized = cell.replace(/\s+/g, '').replace(/_/g, '');
                if (normalized === 'produto') {
                    headerRowIndex = i;
                    produtoColIndex = index;
                }
                if (normalized === 'quantidadesugerida' || normalized === 'quantidade') {
                    quantidadeColIndex = index;
                }
            });
            if (headerRowIndex >= 0 && produtoColIndex >= 0 && quantidadeColIndex >= 0) {
                break;
            }
        }

        if (headerRowIndex < 0 || produtoColIndex < 0 || quantidadeColIndex < 0) {
            throw new Error('Não foi possível encontrar as colunas "Produto" e "Quantidade_Sugerida" na planilha.');
        }

        const itens = [];
        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
            const row = rawData[i] || [];
            const codigo = row[produtoColIndex] ? String(row[produtoColIndex]).trim() : '';
            const quantidadeBruta = row[quantidadeColIndex];
            const quantidade = Number(String(quantidadeBruta || '').replace(',', '.'));

            if (!codigo || isNaN(quantidade) || quantidade <= 0) continue;

            itens.push({
                codigo,
                solicitada: Math.round(quantidade),
                atendida: 0
            });
        }

        return itens;
    }

    function preencherFormularioComItens(itens) {
        itensContainer.innerHTML = '';
        itens.forEach(({ codigo, solicitada }) => adicionarItem(codigo, solicitada));
        lucide.createIcons();
    }

    async function criarTransferenciasEmLote(lotes, base) {
        const resultado = { sucessos: [], falhas: [] };

        for (let index = 0; index < lotes.length; index++) {
            const itens = lotes[index];
            const transferId = generateNewId();

            const payload = {
                id: transferId,
                origem: base.origemNome,
                destino: base.destinoNome,
                filial_origem_id: base.origemId,
                filial_destino_id: base.destinoId,
                solicitante: base.solicitante,
                tags: [...currentTransferTags],
                data: new Date().toISOString().split('T')[0],
                status: 'pendente',
                itens: itens.map(item => ({ ...item }))
            };

            try {
                const response = await apiFetch('/api/transferencias', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.error || 'Erro ao criar transferência');
                }

                resultado.sucessos.push(transferId);
            } catch (error) {
                console.error('Erro ao criar transferência em lote:', error);
                resultado.falhas.push({ id: transferId, motivo: error.message });
            }
        }

        return resultado;
    }
    
    btnAddTag.addEventListener('click', adicionarTagSelecionada);
    if (tagInput) {
        tagInput.addEventListener('change', adicionarTagSelecionada);
    }

    function adicionarTagSelecionada() {
        const value = tagInput.value;
        if (!value) return;

        const tagSelecionada = globalTags.find(tag => String(tag) === value);
        if (!tagSelecionada) {
            showAlert('Selecione uma tag existente na lista.', 'Tag inválida', 'warning');
            tagInput.value = '';
            return;
        }

        if (currentTransferTags.includes(tagSelecionada)) {
            showAlert('Já existe uma tag selecionada. Remova antes de escolher outra.', 'Tag duplicada', 'warning');
            tagInput.value = '';
            return;
        }

        if (currentTransferTags.length >= 1) {
            showAlert('Você só pode adicionar uma tag por transferência. Remova a tag atual para escolher outra.', 'Limite de tags', 'warning');
            tagInput.value = '';
            return;
        }

        currentTransferTags.push(tagSelecionada);
        renderFormTags();
        marcarFormularioAlterado();
        tagInput.value = '';
    }

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
         resetItemInputs();
         showView('dashboard');
    });

    
    // --- Carregar dados iniciais ---
    async function carregarDadosIniciais() {
        try {
            showLoading('Carregando dados...');
            await carregarFiliais();
            await carregarTags();
            await carregarTransferencias();
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            await showAlert('Erro ao carregar informacoes iniciais. Tente atualizar a pagina.', 'Erro', 'danger');
        } finally {
            hideLoading();
            if (novoItemCodigo) novoItemCodigo.focus();
        }
    }

    await carregarDadosIniciais();

    async function atualizarTransferenciasSeNecessario(force = false, mostrarLoading = false) {
        const agora = Date.now();
        if (
            force ||
            !transferenciasCarregadas ||
            (agora - ultimaAtualizacaoTransferencias) > INTERVALO_ATUALIZACAO_MS
        ) {
            await carregarTransferencias(mostrarLoading);
        }
    }

    // --- Carregar Transferências da API ---
    async function carregarTransferencias(mostrarLoading = false) {
        try {
            if (mostrarLoading) {
                showLoading('Atualizando transferências...');
            }
            const response = await apiFetch('/api/transferencias');
            
            if (response.ok) {
                transferencias = await response.json();
                transferenciasCarregadas = true;
                ultimaAtualizacaoTransferencias = Date.now();
                
                // Calcular próximo ID baseado no maior sequencial do ano atual
                const anoAtual = new Date().getFullYear();
                let maiorSequencial = 0;
                
                transferencias.forEach(t => {
                    const match = t.id?.match(/TRANSF-(\d{4})-(\d{3})/);
                    if (match) {
                        const ano = parseInt(match[1], 10);
                        const sequencial = parseInt(match[2], 10);
                        if (ano === anoAtual && sequencial > maiorSequencial) {
                            maiorSequencial = sequencial;
                        }
                    }
                });
                
                nextId = maiorSequencial + 1;
                
                updateDashboard();

                if (views.visualizacao.style.display !== 'none') {
                    aplicarFiltros();
                }
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao carregar transferências', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro ao carregar transferências:', error);
            await showAlert('Erro de conexão com o servidor', 'Erro', 'danger');
        } finally {
            if (mostrarLoading) {
                hideLoading();
            }
        }
    }
    
    // --- Carregar Tags da API ---
    
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
                        optionOrigem.value = filial.id;
                        optionOrigem.textContent = filial.nome;
                        optionOrigem.dataset.nome = filial.nome;
                        selectOrigem.appendChild(optionOrigem);
                        
                        const optionDestino = document.createElement('option');
                        optionDestino.value = filial.id;
                        optionDestino.textContent = filial.nome;
                        optionDestino.dataset.nome = filial.nome;
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
            sessionStorage.removeItem('stoklink_token');
            sessionStorage.removeItem('stoklink_user');
            window.location.href = 'login.html';
        }
    });

    // --- Filtros ---
    const filtroTag = document.getElementById('filtro-tag');
    const filtroOrigem = document.getElementById('filtro-origem');
    const filtroDestino = document.getElementById('filtro-destino');
    const filtroDataOpcao = document.getElementById('filtro-data-opcao');
    const filtroDataPersonalizada = document.getElementById('filtro-data-personalizada');
    const filtroProduto = document.getElementById('filtro-produto');
    const filtroNumeroInterno = document.getElementById('filtro-numero-interno');
    const filtroMinhaFilial = document.getElementById('filtro-minha-filial');
    const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
    const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
    const btnAtualizarTransferencias = document.getElementById('btn-atualizar-transferencias');
    const minhaFilialNome = (usuario.filial || '').trim().toLowerCase();
    
    if (filtroMinhaFilial) {
        if (minhaFilialNome) {
            filtroMinhaFilial.checked = true;
        } else {
            filtroMinhaFilial.checked = false;
            filtroMinhaFilial.disabled = true;
        }
    }
    
    // Popular selects de filtro
    function popularFiltros() {
        // Popular tags
        filtroTag.innerHTML = '<option value="">Todas as Tags</option>';
        globalTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            filtroTag.appendChild(option);
        });
        
        // Popular filiais de origem e destino
        const selectOrigem = document.getElementById('origem');
        filtroOrigem.innerHTML = '<option value="">Todas as Origens</option>';
        filtroDestino.innerHTML = '<option value="">Todos os Destinos</option>';
        
        Array.from(selectOrigem.options).forEach(opt => {
            if (opt.value) {
                const nomeFilial = (opt.textContent || '').trim();
                const valorFilial = nomeFilial.toLowerCase();

                const optionOrigem = document.createElement('option');
                optionOrigem.value = valorFilial;
                optionOrigem.textContent = nomeFilial;
                filtroOrigem.appendChild(optionOrigem);
                
                const optionDestino = document.createElement('option');
                optionDestino.value = valorFilial;
                optionDestino.textContent = nomeFilial;
                filtroDestino.appendChild(optionDestino);
            }
        });

        aplicarFiltros();
    }
    
    // Aplicar filtros
    function aplicarFiltros() {
        if (!transferenciasCarregadas) {
            transferListContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #6c757d;">Carregando transferências...</p>';
            return;
        }

        const tagSelecionada = filtroTag.value.toLowerCase();
        const origemSelecionada = filtroOrigem.value.toLowerCase();
        const destinoSelecionado = filtroDestino.value.toLowerCase();
        const statusSelecionado = filtroStatus ? filtroStatus.value : '';
        const produtoDigitado = (filtroProduto.value || '').toLowerCase().trim();
        const numeroInternoDigitado = (filtroNumeroInterno.value || '').toLowerCase().trim();
        const apenasMinhaFilial = filtroMinhaFilial && filtroMinhaFilial.checked && minhaFilialNome;
        const dataOpcao = filtroDataOpcao ? filtroDataOpcao.value : '';
        const dataPersonalizada = filtroDataPersonalizada ? filtroDataPersonalizada.value : '';
        const hojeISO = getLocalISODate();

        const filtrados = transferencias.filter(t => {
            const origemLower = (t.origem || '').trim().toLowerCase();
            const destinoLower = (t.destino || '').trim().toLowerCase();
            const dataTransferencia = obterDataISO(t.data_criacao);

            if (apenasMinhaFilial) {
                const participa = origemLower === minhaFilialNome || destinoLower === minhaFilialNome;
                if (!participa) return false;
            }

            // Filtro por tag
            if (tagSelecionada && (!t.tags || !t.tags.some(tag => tag.toLowerCase() === tagSelecionada))) {
                return false;
            }
            
            // Filtro por origem
            if (origemSelecionada && origemLower !== origemSelecionada) {
                return false;
            }
            
            // Filtro por destino
            if (destinoSelecionado && destinoLower !== destinoSelecionado) {
                return false;
            }

            // Filtro por status
            if (statusSelecionado && t.status !== statusSelecionado) {
                return false;
            }

            if (dataOpcao === 'hoje' && dataTransferencia !== hojeISO) {
                return false;
            }

            if (dataOpcao === 'personalizada' && dataPersonalizada) {
                if (dataTransferencia !== dataPersonalizada) {
                    return false;
                }
            }
            
            // Filtro por código de produto
            if (produtoDigitado && (!t.itens || !t.itens.some(item => 
                (item.codigo || '').toLowerCase().includes(produtoDigitado)))) {
                return false;
            }

            if (numeroInternoDigitado) {
                const numeroInternoLower = (t.numeroTransferenciaInterna || t.numero_transferencia_interna || '-').toString().toLowerCase();
                if (!numeroInternoLower.includes(numeroInternoDigitado)) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Renderizar resultados filtrados
        renderTransferListFiltrada(filtrados.length > 0 ? filtrados : []);
    }
    
    // Renderizar lista filtrada
    function renderTransferListFiltrada(data) {
        const dataOrdenada = ordenarPorAtualizacao(data);
        transferListContainer.innerHTML = '';
        
        if (dataOrdenada.length === 0) {
            transferListContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #6c757d;">Nenhuma transferência encontrada com os filtros aplicados.</p>';
            return;
        }
        
        // Criar tabela
        const table = document.createElement('table');
        table.className = 'transfer-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Data</th>
                    <th>Origem</th>
                    <th>Destino</th>
                    <th>Solicitante</th>
                    <th>Criado por</th>
                    <th>Nº Interno</th>
                    <th>Status</th>
                    <th>Itens</th>
                    <th>Tags</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        dataOrdenada.forEach(t => {
            const statusInfo = getStatusInfo(t.status);
            const row = document.createElement('tr');
            row.className = 'transfer-row';
            row.dataset.id = t.id;
            
            const numeroInterno = t.numeroTransferenciaInterna || '-';
            const dataFormatada = formatarData(t.data_criacao);
            const qtdItens = Array.isArray(t.itens) ? t.itens.length : (t.total_itens || 0);
            const labelItens = `${qtdItens} ${qtdItens === 1 ? 'item' : 'itens'}`;
            
            row.innerHTML = `
                <td><strong>${t.id}</strong></td>
                <td>${dataFormatada}</td>
                <td>${t.origem}</td>
                <td>${t.destino}</td>
                <td>${t.solicitante}</td>
                <td>${t.usuario_nome || '-'}</td>
                <td>${numeroInterno}</td>
                <td><span class="status-tag ${statusInfo.className}">${statusInfo.text}</span></td>
                <td><span class="badge badge-light">${labelItens}</span></td>
                <td><div class="tags-container">${renderTags(t.tags)}</div></td>
            `;
            
            row.addEventListener('click', () => {
                previousView = 'visualizacao';
                showDetalhes(t.id);
            });
            
            tbody.appendChild(row);
        });
        
        transferListContainer.appendChild(table);
        lucide.createIcons();
    }
    
    // Limpar filtros
    function limparFiltros() {
        filtroTag.value = '';
        filtroOrigem.value = '';
        filtroDestino.value = '';
        filtroProduto.value = '';
        if (filtroNumeroInterno) {
            filtroNumeroInterno.value = '';
        }
        if (filtroStatus) {
            filtroStatus.value = '';
        }
        if (filtroDataOpcao) {
            filtroDataOpcao.value = '';
        }
        if (filtroDataPersonalizada) {
            filtroDataPersonalizada.value = '';
            filtroDataPersonalizada.style.display = 'none';
        }
        if (minhaFilialNome && filtroMinhaFilial && !filtroMinhaFilial.disabled) {
            filtroMinhaFilial.checked = true;
        }
        aplicarFiltros();
    }
    
    // Event listeners dos filtros
    btnAplicarFiltros.addEventListener('click', aplicarFiltros);
    btnLimparFiltros.addEventListener('click', limparFiltros);
    filtroTag.addEventListener('change', aplicarFiltros);
    filtroOrigem.addEventListener('change', aplicarFiltros);
    filtroDestino.addEventListener('change', aplicarFiltros);
    if (filtroStatus) {
        filtroStatus.addEventListener('change', aplicarFiltros);
    }
    if (filtroDataOpcao) {
        filtroDataOpcao.addEventListener('change', () => {
            const usarPersonalizada = filtroDataOpcao.value === 'personalizada';
            if (filtroDataPersonalizada) {
                filtroDataPersonalizada.style.display = usarPersonalizada ? 'block' : 'none';
                if (!usarPersonalizada) {
                    filtroDataPersonalizada.value = '';
                }
            }
            aplicarFiltros();
        });
    }
    if (filtroDataPersonalizada) {
        filtroDataPersonalizada.addEventListener('change', aplicarFiltros);
    }
    if (filtroMinhaFilial) {
        filtroMinhaFilial.addEventListener('change', aplicarFiltros);
    }
    filtroProduto.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') aplicarFiltros();
    });
    if (filtroNumeroInterno) {
        filtroNumeroInterno.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') aplicarFiltros();
        });
        filtroNumeroInterno.addEventListener('change', aplicarFiltros);
    }
    if (btnAtualizarTransferencias) {
        btnAtualizarTransferencias.addEventListener('click', () => atualizarTransferenciasSeNecessario(true, true));
    }
    
    // Popular filtros quando tags e filiais carregarem
    const popularFiltrosTimeout = setInterval(() => {
        if (globalTags.length > 0 && document.getElementById('origem').options.length > 1) {
            popularFiltros();
            clearInterval(popularFiltrosTimeout);
        }
    }, 500);

    // Atualização automática a cada 1 minuto nas telas de lista
    setInterval(async () => {
        if (currentView === 'dashboard' || currentView === 'visualizacao') {
            await atualizarTransferenciasSeNecessario(false, false);
            if (currentView === 'visualizacao') {
                aplicarFiltros();
            } else if (currentView === 'dashboard') {
                updateDashboard();
            }
        }
    }, INTERVALO_ATUALIZACAO_MS);
});
    



