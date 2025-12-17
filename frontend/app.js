// ====================================
// CONFIGURAÇÃO DA API
// ====================================

// App carregado

// Otimização: debounce para lucide.createIcons (evita chamadas excessivas)
let lucideTimeout = null;
const lucideCreateIconsDebounced = () => {
    if (lucideTimeout) clearTimeout(lucideTimeout);
    lucideTimeout = setTimeout(() => {
        if (window.lucide) lucide.createIcons();
    }, 50);
};

// Detectar ambiente automaticamente
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname.includes('192.168') ||
                window.location.protocol === 'file:';

// Usar o mesmo hostname que o usuário está acessando para evitar problemas de CORS
const API_URL = isLocal ? `http://${window.location.hostname}:3001` : window.location.origin;

// Ambiente configurado

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
        // Fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout (2 min)
        
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        // Fetch OK
        
        // Se token expirou ou inválido, fazer logout
        if (response.status === 401) {
            sessionStorage.removeItem('stoklink_token');
            sessionStorage.removeItem('stoklink_user');
            window.location.href = 'login.html';
            throw new Error('Sessão expirada');
        }
        
        return response;
    } catch (error) {
        console.error(`❌ Erro no fetch ${endpoint}:`, error);
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

let transfRecebimentoModal;
let transfRecebimentoObservacaoInput;
let transfRecebimentoDivergenciaInput;
let transfRecebimentoBtnConfirmar;
let transfRecebimentoBtnCancelar;
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
    if (!transfRecebimentoModal) {
        return Promise.resolve({ observacao: '', adicionarDivergencia: false });
    }

    return new Promise((resolve) => {
        const modal = transfRecebimentoModal;
        const campoObservacao = transfRecebimentoObservacaoInput;
        const checkboxDivergencia = transfRecebimentoDivergenciaInput;
        const btnConfirmar = transfRecebimentoBtnConfirmar;
        const btnCancelar = transfRecebimentoBtnCancelar;

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
    // Usuário logado
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
    
    // Mostrar botão de recebimento se tiver permissão ou for admin
    const btnRecebimento = document.getElementById('btn-show-recebimento');
    if (btnRecebimento) {
        if (usuario.role === 'admin' || usuario.acesso_recebimento) {
            btnRecebimento.style.display = 'flex';
        } else {
            btnRecebimento.style.display = 'none';
        }
    }
    
    // --- Elementos da UI ---
    const views = { 
        dashboard: document.getElementById('dashboard-view'), 
        cadastro: document.getElementById('cadastro-view'), 
        visualizacao: document.getElementById('visualizacao-view'), 
        detalhe: document.getElementById('detalhe-view'),
        // Views de Recebimento de Fábrica (podem não existir se usuário não tem acesso)
        recebimentoFabrica: document.getElementById('recebimento-fabrica-view'),
        recebimentoCadastro: document.getElementById('recebimento-cadastro-view'),
        recebimentoDetalhe: document.getElementById('recebimento-detalhe-view'),
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
    transfRecebimentoModal = document.getElementById('transf-recebimento-modal');
    transfRecebimentoObservacaoInput = document.getElementById('transf-recebimento-observacao');
    transfRecebimentoDivergenciaInput = document.getElementById('transf-recebimento-divergencia');
    transfRecebimentoBtnConfirmar = document.getElementById('transf-recebimento-btn-confirmar');
    transfRecebimentoBtnCancelar = document.getElementById('transf-recebimento-btn-cancelar');
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
        Object.values(views).forEach(view => { if (view) view.style.display = 'none'; });
        if (views[viewName]) views[viewName].style.display = 'block';
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

        lucideCreateIconsDebounced();
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
        lucideCreateIconsDebounced();
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
        lucideCreateIconsDebounced();
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
        lucideCreateIconsDebounced();
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
        lucideCreateIconsDebounced();
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
            lucideCreateIconsDebounced();
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
            lucideCreateIconsDebounced();
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

        lucideCreateIconsDebounced();
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

            lucideCreateIconsDebounced();
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

        // Verificar se o item já existe na lista atual
        const itensExistentes = document.querySelectorAll('#itens-container .item-codigo');
        const codigoUpperCase = codigo.toUpperCase();
        for (const input of itensExistentes) {
            if (input.value.toUpperCase() === codigoUpperCase) {
                await showAlert(`O item "${codigo}" já foi adicionado nesta transferência.`, 'Item Duplicado', 'warning');
                novoItemCodigo.focus();
                novoItemCodigo.select();
                return;
            }
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
        lucideCreateIconsDebounced();
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
            hideLoading();
        } catch (error) {
            console.error('❌ Erro ao carregar dados iniciais:', error);
            hideLoading();
            showAlert('Erro ao carregar informacoes iniciais. Tente atualizar a pagina.', 'Erro', 'danger');
        }
        if (novoItemCodigo) novoItemCodigo.focus();
    }

    // Timeout de segurança para esconder loading após 10 segundos
    setTimeout(() => {
        hideLoading();
    }, 10000);

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

                if (views.visualizacao && views.visualizacao.style.display !== 'none') {
                    aplicarFiltros();
                }
            } else {
                const errorData = await response.json();
                console.error('Erro ao carregar transferências:', errorData);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar transferências:', error);
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
        return tag ? (tag.cor || '#1e3c72') : '#1e3c72';
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
        lucideCreateIconsDebounced();
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

    // ========================================
    // MÓDULO: RECEBIMENTO DE FÁBRICA
    // ========================================
    
    // Dados do módulo
    let recebimentos = [];
    let fornecedores = [];
    let transportadoras = [];
    let filiaisRecebimento = []; // Filiais para o módulo de recebimento
    let recebimentoEmEdicao = null;
    let modoRegistroChegada = false; // true = registrar chegada, false = cadastrar NF
    
    // Elementos do DOM - Recebimento
    const btnShowRecebimento = document.getElementById('btn-show-recebimento');
    const viewRecebimentoFabrica = document.getElementById('recebimento-fabrica-view');
    const viewRecebimentoCadastro = document.getElementById('recebimento-cadastro-view');
    const viewRecebimentoDetalhe = document.getElementById('recebimento-detalhe-view');
    const viewRegistrarChegada = document.getElementById('registrar-chegada-view');
    
    // Verificar se o módulo está disponível
    if (btnShowRecebimento && viewRecebimentoFabrica) {
        // Módulo Recebimento de Fábrica disponível
        
        // Botão do menu lateral
        btnShowRecebimento.addEventListener('click', async () => {
            if (await confirmarSaidaCadastro()) {
                await carregarRecebimentos();
                showRecebimentoView('lista');
            }
        });
        
        // Botão Cadastrar NF (Compras)
        const btnCadastrarNF = document.getElementById('btn-cadastrar-nf');
        if (btnCadastrarNF) {
            btnCadastrarNF.addEventListener('click', async () => {
                showLoading('Carregando fornecedores e transportadoras...');
                
                // Carregar fornecedores/transportadoras se ainda não carregou
                if (fornecedores.length === 0 || transportadoras.length === 0) {
                    await carregarFornecedoresETransportadoras();
                }
                
                recebimentoEmEdicao = null;
                modoRegistroChegada = false;
                limparFormularioRecebimento();
                // Atualizar título para modo Cadastro NF
                const titulo = document.getElementById('receb-cadastro-titulo');
                const subtitulo = document.getElementById('receb-cadastro-subtitulo');
                if (titulo) titulo.innerHTML = '<i data-lucide="file-plus" style="width: 28px; height: 28px; margin-right: 10px;"></i>Cadastrar NF';
                if (subtitulo) subtitulo.textContent = 'Cadastre a NF antes da mercadoria chegar (setor de Compras).';
                showRecebimentoView('cadastro');
                hideLoading();
            });
        }
        
        // Botão Registrar Chegada
        const btnRegistrarChegada = document.getElementById('btn-registrar-chegada');
        if (btnRegistrarChegada) {
            btnRegistrarChegada.addEventListener('click', () => {
                showRecebimentoView('chegada');
                renderizarNFsAguardando();
            });
        }
        
        // Botão Voltar da tela de chegada
        const btnVoltarChegada = document.getElementById('btn-voltar-chegada');
        if (btnVoltarChegada) {
            btnVoltarChegada.addEventListener('click', async () => {
                await carregarRecebimentos();
                showRecebimentoView('lista');
            });
        }
        
        // Botão NF Não Cadastrada (registrar nova na hora)
        const btnNFNaoCadastrada = document.getElementById('btn-nf-nao-cadastrada');
        if (btnNFNaoCadastrada) {
            btnNFNaoCadastrada.addEventListener('click', () => {
                recebimentoEmEdicao = null;
                modoRegistroChegada = true;
                limparFormularioRecebimento();
                // Atualizar título para modo Registro de Chegada
                const titulo = document.getElementById('receb-cadastro-titulo');
                const subtitulo = document.getElementById('receb-cadastro-subtitulo');
                if (titulo) titulo.innerHTML = '<i data-lucide="package-check" style="width: 28px; height: 28px; margin-right: 10px;"></i>Registrar Chegada (NF não cadastrada)';
                if (subtitulo) subtitulo.textContent = 'A NF não estava cadastrada. Preencha os dados e registre a chegada.';
                showRecebimentoView('cadastro');
            });
        }
        
        // Botão Buscar NF
        const btnBuscarNF = document.getElementById('btn-buscar-nf');
        if (btnBuscarNF) {
            btnBuscarNF.addEventListener('click', buscarNFPorNumero);
        }
        
        // Enter no campo de busca
        const inputBuscaNF = document.getElementById('busca-nf-numero');
        if (inputBuscaNF) {
            inputBuscaNF.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    buscarNFPorNumero();
                }
            });
        }
        
        // Botão Cancelar do cadastro
        const btnCancelarRecebimento = document.getElementById('btn-cancelar-recebimento');
        if (btnCancelarRecebimento) {
            btnCancelarRecebimento.addEventListener('click', async () => {
                await carregarRecebimentos();
                showRecebimentoView('lista');
            });
        }
        
        // Botão Voltar do detalhe
        const btnVoltarRecebimentos = document.getElementById('btn-voltar-recebimentos');
        if (btnVoltarRecebimentos) {
            btnVoltarRecebimentos.addEventListener('click', async () => {
                await carregarRecebimentos();
                showRecebimentoView('lista');
            });
        }
        
        // Botão Atualizar
        const btnAtualizarRecebimentos = document.getElementById('btn-atualizar-recebimentos');
        if (btnAtualizarRecebimentos) {
            btnAtualizarRecebimentos.addEventListener('click', async () => {
                await carregarRecebimentos();
                renderizarListaRecebimentos();
            });
        }
        
        // Filtros automáticos - aplicar ao mudar qualquer filtro
        const filtrosReceb = [
            'receb-filtro-status',
            'receb-filtro-reserva', 
            'receb-filtro-urgencia',
            'receb-filtro-destino',
            'receb-filtro-fornecedor'
        ];
        filtrosReceb.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => renderizarListaRecebimentos());
            }
        });
        
        // Filtro de NF - aplicar ao digitar (com debounce)
        const filtroNF = document.getElementById('receb-filtro-nf');
        if (filtroNF) {
            let timeoutNF;
            filtroNF.addEventListener('input', () => {
                clearTimeout(timeoutNF);
                timeoutNF = setTimeout(() => renderizarListaRecebimentos(), 300);
            });
        }
        
        // Botão Limpar Filtros
        const btnLimparFiltros = document.getElementById('btn-limpar-filtros-receb');
        if (btnLimparFiltros) {
            btnLimparFiltros.addEventListener('click', () => {
                document.getElementById('receb-filtro-status').value = '';
                document.getElementById('receb-filtro-reserva').value = '';
                document.getElementById('receb-filtro-urgencia').value = '';
                document.getElementById('receb-filtro-destino').value = '';
                document.getElementById('receb-filtro-nf').value = '';
                document.getElementById('receb-filtro-fornecedor').value = '';
                renderizarListaRecebimentos();
            });
        }
        
        // Formulário de Recebimento
        const formRecebimento = document.getElementById('recebimento-form');
        if (formRecebimento) {
            formRecebimento.addEventListener('submit', async (e) => {
                e.preventDefault();
                await salvarRecebimento();
            });
        }
        
        // Carregar fornecedores e transportadoras ao iniciar
        carregarFornecedoresETransportadoras();
    }
    
    // Função para mostrar views do recebimento
    function showRecebimentoView(tipo) {
        // Esconder todas as views principais
        Object.values(views).forEach(view => { if (view) view.style.display = 'none'; });
        Object.values(navButtons).forEach(btn => btn.classList.remove('active'));
        
        // Esconder views de recebimento
        if (viewRecebimentoFabrica) viewRecebimentoFabrica.style.display = 'none';
        if (viewRecebimentoCadastro) viewRecebimentoCadastro.style.display = 'none';
        if (viewRecebimentoDetalhe) viewRecebimentoDetalhe.style.display = 'none';
        if (viewRegistrarChegada) viewRegistrarChegada.style.display = 'none';
        
        // Mostrar view específica
        if (tipo === 'lista' && viewRecebimentoFabrica) {
            viewRecebimentoFabrica.style.display = 'block';
            currentView = 'recebimentoFabrica';
            renderizarListaRecebimentos();
        } else if (tipo === 'cadastro' && viewRecebimentoCadastro) {
            viewRecebimentoCadastro.style.display = 'block';
            currentView = 'recebimentoCadastro';
            popularSelectsRecebimento();
        } else if (tipo === 'detalhe' && viewRecebimentoDetalhe) {
            viewRecebimentoDetalhe.style.display = 'block';
            currentView = 'recebimentoDetalhe';
        } else if (tipo === 'chegada' && viewRegistrarChegada) {
            viewRegistrarChegada.style.display = 'block';
            currentView = 'registrarChegada';
            document.getElementById('busca-nf-numero').value = '';
            document.getElementById('resultado-busca-nf').style.display = 'none';
        }
        
        // Marcar botão como ativo
        if (btnShowRecebimento) btnShowRecebimento.classList.add('active');
        
        lucideCreateIconsDebounced();
    }
    
    // Carregar fornecedores e transportadoras
    async function carregarFornecedoresETransportadoras() {
        try {
            const [resFornecedores, resTransportadoras] = await Promise.all([
                apiFetch('/api/fornecedores'),
                apiFetch('/api/transportadoras')
            ]);
            
            if (resFornecedores.ok) {
                fornecedores = await resFornecedores.json();
            }
            if (resTransportadoras.ok) {
                transportadoras = await resTransportadoras.json();
            }
            
            // Fornecedores e transportadoras carregados
        } catch (error) {
            console.error('Erro ao carregar fornecedores/transportadoras:', error);
        }
    }
    
    // Popular selects do formulário
    function popularSelectsRecebimento() {
        const datalistFornecedor = document.getElementById('lista-fornecedores');
        const datalistTransportadora = document.getElementById('lista-transportadoras');
        const selectFilialChegada = document.getElementById('receb-filial-chegada');
        const selectFilialDestino = document.getElementById('receb-filial-destino');
        
        // Fornecedores (datalist com busca)
        if (datalistFornecedor) {
            datalistFornecedor.innerHTML = '';
            fornecedores.filter(f => f.ativo !== false).forEach(f => {
                datalistFornecedor.innerHTML += `<option value="${f.nome}" data-id="${f.id}">`;
            });
        }
        
        // Transportadoras (datalist com busca)
        if (datalistTransportadora) {
            datalistTransportadora.innerHTML = '';
            transportadoras.filter(t => t.ativo !== false).forEach(t => {
                datalistTransportadora.innerHTML += `<option value="${t.nome}" data-id="${t.id}">`;
            });
        }
        
        // Filiais (usar as mesmas do sistema de transferências)
        const selectOrigem = document.getElementById('origem');
        if (selectOrigem && selectFilialChegada) {
            selectFilialChegada.innerHTML = '<option value="">Onde a mercadoria vai chegar?</option>';
            Array.from(selectOrigem.options).forEach(opt => {
                if (opt.value) {
                    selectFilialChegada.innerHTML += `<option value="${opt.value}">${opt.text}</option>`;
                }
            });
        }
        
        if (selectOrigem && selectFilialDestino) {
            selectFilialDestino.innerHTML = '<option value="">Para qual filial é essa mercadoria?</option>';
            Array.from(selectOrigem.options).forEach(opt => {
                if (opt.value) {
                    selectFilialDestino.innerHTML += `<option value="${opt.value}">${opt.text}</option>`;
                }
            });
        }
        
        // Se estiver editando, preencher valores
        if (recebimentoEmEdicao) {
            preencherFormularioRecebimento(recebimentoEmEdicao);
        }
    }
    
    // Função auxiliar para obter ID do fornecedor pelo nome
    function getFornecedorIdByNome(nome) {
        const f = fornecedores.find(f => f.nome === nome);
        return f ? f.id : null;
    }
    
    // Função auxiliar para obter ID da transportadora pelo nome
    function getTransportadoraIdByNome(nome) {
        const t = transportadoras.find(t => t.nome === nome);
        return t ? t.id : null;
    }
    
    // Buscar NF por número
    function buscarNFPorNumero() {
        const numero = document.getElementById('busca-nf-numero').value.trim();
        const container = document.getElementById('resultado-busca-nf');
        
        if (!numero) {
            container.style.display = 'none';
            return;
        }
        
        // Buscar nas NFs cadastradas
        const nfEncontrada = recebimentos.find(r => 
            r.numero_nota_fiscal && r.numero_nota_fiscal.toLowerCase().includes(numero.toLowerCase())
        );
        
        if (nfEncontrada) {
            const fornecedor = fornecedores.find(f => f.id === nfEncontrada.fornecedor_id);
            const statusLabel = {
                'aguardando': '🟡 Aguardando Chegada',
                'recebido': '🔵 Recebido',
                'conferido': '🟢 Conferido'
            };
            
            container.innerHTML = `
                <div style="background: #d4edda; padding: 15px; border-radius: 8px; border: 1px solid #c3e6cb;">
                    <h4 style="margin: 0 0 10px 0; color: #155724;"><i data-lucide="check-circle"></i> NF Encontrada!</h4>
                    <p><strong>NF:</strong> ${nfEncontrada.numero_nota_fiscal}</p>
                    <p><strong>Fornecedor:</strong> ${fornecedor ? fornecedor.nome : 'Não informado'}</p>
                    <p><strong>Status:</strong> ${statusLabel[nfEncontrada.status] || nfEncontrada.status}</p>
                    <p><strong>Volumes:</strong> ${nfEncontrada.volumes || '-'}</p>
                    <div style="margin-top: 15px;">
                        ${nfEncontrada.status === 'aguardando' ? `
                            <button class="btn btn-primary" onclick="registrarChegadaNF(${nfEncontrada.id})">
                                <i data-lucide="package-check"></i> Registrar Chegada
                            </button>
                        ` : `
                            <button class="btn btn-secondary" onclick="verDetalheRecebimento(${nfEncontrada.id})">
                                <i data-lucide="eye"></i> Ver Detalhes
                            </button>
                        `}
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border: 1px solid #ffc107;">
                    <h4 style="margin: 0 0 10px 0; color: #856404;"><i data-lucide="alert-circle"></i> NF Não Encontrada</h4>
                    <p>Nenhuma NF com o número "<strong>${numero}</strong>" foi encontrada no sistema.</p>
                    <p style="margin-top: 10px;">Você pode registrar a chegada mesmo assim clicando no botão abaixo.</p>
                </div>
            `;
        }
        
        container.style.display = 'block';
        lucideCreateIconsDebounced();
    }
    
    // Renderizar lista de NFs aguardando chegada
    function renderizarNFsAguardando() {
        const container = document.getElementById('lista-nfs-aguardando');
        if (!container) return;
        
        const nfsAguardando = recebimentos.filter(r => r.status === 'aguardando');
        
        if (nfsAguardando.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #666;">
                    <i data-lucide="inbox" style="width: 48px; height: 48px; opacity: 0.3;"></i>
                    <p style="margin-top: 15px;">Nenhuma NF aguardando chegada</p>
                </div>
            `;
            lucideCreateIconsDebounced();
            return;
        }
        
        let html = '';
        nfsAguardando.forEach(nf => {
            const fornecedor = fornecedores.find(f => f.id === nf.fornecedor_id);
            const dataPrevista = nf.data_prevista ? new Date(nf.data_prevista).toLocaleDateString('pt-BR') : 'Não informada';
            
            html += `
                <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #eee;">
                    <div>
                        <strong style="font-size: 16px;">NF: ${nf.numero_nota_fiscal || nf.codigo}</strong>
                        <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
                            ${fornecedor ? fornecedor.nome : 'Fornecedor não informado'} | 
                            ${nf.volumes || 0} volume(s) | 
                            Previsão: ${dataPrevista}
                            ${nf.urgente ? ' | <span style="color: #e74c3c; font-weight: bold;">🔥 URGENTE</span>' : ''}
                        </p>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="registrarChegadaNF(${nf.id})">
                        <i data-lucide="package-check"></i> Registrar Chegada
                    </button>
                </div>
            `;
        });
        
        container.innerHTML = html;
        lucideCreateIconsDebounced();
    }
    
    // Registrar chegada de uma NF específica - abre o modal
    window.registrarChegadaNF = async function(id) {
        abrirModalRecebimento(id);
    };
    
    // Carregar recebimentos da API
    async function carregarRecebimentos() {
        try {
            showLoading('Carregando recebimentos...');
            
            // Carregar filiais se ainda não carregou
            if (filiaisRecebimento.length === 0) {
                const respFiliais = await apiFetch('/api/filiais');
                if (respFiliais.ok) {
                    filiaisRecebimento = await respFiliais.json();
                    // Filiais carregadas
                }
            }
            
            const response = await apiFetch('/api/recebimentos');
            if (response.ok) {
                recebimentos = await response.json();
                // Recebimentos carregados
                atualizarDashboardRecebimento();
            }
        } catch (error) {
            console.error('Erro ao carregar recebimentos:', error);
        } finally {
            hideLoading();
        }
    }
    
    // Atualizar cards do dashboard de recebimento
    function atualizarDashboardRecebimento() {
        const aguardando = recebimentos.filter(r => r.status === 'aguardando').length;
        const recebido = recebimentos.filter(r => r.status === 'recebido').length;
        const conferido = recebimentos.filter(r => r.status === 'conferido').length;
        const bloqueados = recebimentos.filter(r => r.reserva === 'pendente').length;
        
        const elAguardando = document.getElementById('receb-summary-aguardando');
        const elRecebido = document.getElementById('receb-summary-recebido');
        const elConferido = document.getElementById('receb-summary-conferido');
        const elBloqueado = document.getElementById('receb-summary-bloqueado');
        
        if (elAguardando) elAguardando.textContent = aguardando;
        if (elRecebido) elRecebido.textContent = recebido;
        if (elConferido) elConferido.textContent = conferido;
        if (elBloqueado) elBloqueado.textContent = bloqueados;
    }
    
    // Aplicar filtros nos recebimentos
    function aplicarFiltrosRecebimentos() {
        const status = document.getElementById('receb-filtro-status')?.value || '';
        const reserva = document.getElementById('receb-filtro-reserva')?.value || '';
        const urgencia = document.getElementById('receb-filtro-urgencia')?.value || '';
        const destino = document.getElementById('receb-filtro-destino')?.value || '';
        const nf = document.getElementById('receb-filtro-nf')?.value?.toLowerCase() || '';
        const fornecedor = document.getElementById('receb-filtro-fornecedor')?.value || '';
        
        return recebimentos.filter(rec => {
            if (status && rec.status !== status) return false;
            if (reserva && rec.reserva !== reserva) return false;
            if (urgencia === 'distribuicao_imediata' && !rec.urgente) return false;
            if (urgencia === 'estocagem' && rec.urgente) return false;
            if (destino && rec.filial_destino_id != destino) return false;
            if (nf && !rec.numero_nota_fiscal?.toLowerCase().includes(nf)) return false;
            if (fornecedor && rec.fornecedor_id != fornecedor) return false;
            return true;
        });
    }
    
    // Renderizar lista de recebimentos
    function renderizarListaRecebimentos() {
        const container = document.getElementById('recebimentos-lista');
        if (!container) return;
        
        const recebimentosFiltrados = aplicarFiltrosRecebimentos();
        const nfBusca = document.getElementById('receb-filtro-nf')?.value?.toLowerCase().trim() || '';
        
        if (recebimentosFiltrados.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="package-x"></i>
                    <p>Nenhum recebimento cadastrado</p>
                    <button class="btn btn-primary" onclick="document.getElementById('btn-cadastrar-nf').click()">
                        <i data-lucide="plus"></i> Cadastrar NF
                    </button>
                </div>
            `;
            lucideCreateIconsDebounced();
            return;
        }
        
        let html = `
            <table class="transfer-table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>NF</th>
                        <th>Fornecedor</th>
                        <th>Filial Destino</th>
                        <th>Onde Chegou</th>
                        <th>Urgência</th>
                        <th>Status</th>
                        <th>Situação</th>
                        <th>Reserva</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        recebimentosFiltrados.forEach(rec => {
            // Verificar se precisa ir para outra filial
            const precisaTransferir = rec.filial_destino_id && rec.filial_recebimento_id && 
                                      rec.filial_destino_id !== rec.filial_recebimento_id;
            
            // Status com lógica de transferência
            let statusClass, statusText;
            if (rec.status === 'aguardando') {
                statusClass = 'status-pending';
                statusText = 'Aguardando';
            } else if (rec.status === 'recebido') {
                statusClass = 'status-transit';
                statusText = 'Recebido';
            } else if (rec.status === 'conferido' && precisaTransferir && !rec.data_chegada_destino) {
                statusClass = 'status-transit';
                statusText = 'Em Trânsito';
            } else if (rec.status === 'conferido' && rec.data_chegada_destino) {
                statusClass = 'status-completed';
                statusText = 'Entregue';
            } else {
                statusClass = 'status-completed';
                statusText = 'Conferido';
            }
            
            // Situação do recebimento
            const situacaoMap = {
                'ok': { class: 'status-completed', text: '✅ OK' },
                'divergencia': { class: 'status-pending', text: '⚠️ Divergência' },
                'faltando': { class: 'status-pending', text: '⚠️ Faltando' },
                'sobrando': { class: 'status-transit', text: '📦 Sobrando' },
                'avariada': { class: 'status-danger', text: '❌ Avariada' }
            };
            const situacao = situacaoMap[rec.situacao_recebimento] || { class: '', text: '-' };
            
            // Volumes: esperados vs recebidos
            let volumesDisplay = rec.volumes || '-';
            if (rec.volumes_recebidos && rec.volumes) {
                if (rec.volumes_recebidos !== rec.volumes) {
                    volumesDisplay = `<span style="color: #e74c3c;">${rec.volumes_recebidos}/${rec.volumes}</span>`;
                } else {
                    volumesDisplay = `${rec.volumes_recebidos}/${rec.volumes}`;
                }
            } else if (rec.volumes_recebidos) {
                volumesDisplay = rec.volumes_recebidos;
            }
            
            // Onde chegou (filial real de recebimento)
            const filialRecebimento = rec.filial_recebimento_id ? 
                filiaisRecebimento.find(f => f.id === rec.filial_recebimento_id)?.nome || '-' : '-';
            
            // Verificar se a NF corresponde à busca para destacar
            const nfMatch = nfBusca && rec.numero_nota_fiscal && rec.numero_nota_fiscal.toLowerCase().includes(nfBusca);
            const highlightStyle = nfMatch ? 'background: linear-gradient(90deg, #fff3cd, #ffeeba); box-shadow: 0 0 10px rgba(255, 193, 7, 0.5);' : '';
            
            html += `
                <tr class="${rec.urgente ? 'urgente-row' : ''}" style="${highlightStyle}">
                    <td><strong>${rec.codigo}</strong></td>
                    <td>${nfMatch ? `<span style="background: #ffc107; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${rec.numero_nota_fiscal}</span>` : (rec.numero_nota_fiscal || '-')}</td>
                    <td>${rec.fornecedor_nome || 'Não informado'}</td>
                    <td>${rec.filial_destino_nome || rec.filial_chegada_nome || '-'}</td>
                    <td>${filialRecebimento}</td>
                    <td>${rec.urgente ? '<span class="status-badge status-danger">🔥 Urgente</span>' : '<span class="status-badge status-completed">Normal</span>'}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>${rec.status !== 'aguardando' ? `<span class="status-badge ${situacao.class}">${situacao.text}</span>` : '-'}</td>
                    <td>${rec.reserva === 'pendente' ? '<span class="status-badge status-pending">🔴 Bloqueada</span>' : '<span class="status-badge status-completed">🟢 Liberada</span>'}</td>
                    <td>
                        <div style="display: flex; gap: 5px;">
                            <button class="btn btn-sm btn-info" onclick="verDetalheRecebimento(${rec.id})" title="Ver detalhes">
                                <i data-lucide="eye"></i>
                            </button>
                            ${rec.status === 'aguardando' ? `
                                <button class="btn btn-sm btn-success" onclick="registrarChegadaNF(${rec.id})" title="Registrar chegada">
                                    <i data-lucide="package-check"></i>
                                </button>
                                <button class="btn btn-sm btn-secondary" onclick="editarRecebimento(${rec.id})" title="Editar">
                                    <i data-lucide="edit"></i>
                                </button>
                            ` : ''}
                            ${rec.status === 'recebido' ? `
                                <button class="btn btn-sm btn-primary" onclick="registrarConferencia(${rec.id})" title="Conferir">
                                    <i data-lucide="clipboard-check"></i>
                                </button>
                            ` : ''}
                            ${rec.status === 'conferido' && precisaTransferir && !rec.data_chegada_destino ? `
                                <button class="btn btn-sm btn-success" onclick="confirmarChegadaDestino(${rec.id})" title="Confirmar chegada no destino">
                                    <i data-lucide="map-pin-check"></i>
                                </button>
                            ` : ''}
                            ${rec.reserva === 'pendente' && rec.status === 'conferido' && (!precisaTransferir || rec.data_chegada_destino) ? `
                                <button class="btn btn-sm btn-warning" onclick="liberarRecebimento(${rec.id})" title="Liberar reserva">
                                    <i data-lucide="unlock"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        container.innerHTML = html;
        lucideCreateIconsDebounced();
    }
    
    // Limpar formulário
    function limparFormularioRecebimento() {
        const form = document.getElementById('recebimento-form');
        if (form) form.reset();
        
        const titulo = document.getElementById('receb-cadastro-titulo');
        if (titulo) titulo.innerHTML = '<i data-lucide="plus-circle" style="width: 28px; height: 28px; margin-right: 10px;"></i>Novo Recebimento';
        
        lucideCreateIconsDebounced();
    }
    
    // Preencher formulário para edição
    function preencherFormularioRecebimento(rec) {
        const titulo = document.getElementById('receb-cadastro-titulo');
        if (titulo) titulo.innerHTML = `<i data-lucide="edit" style="width: 28px; height: 28px; margin-right: 10px;"></i>Editar Recebimento ${rec.codigo}`;
        
        // Obter nomes pelo ID para preencher os inputs de busca
        const fornecedor = fornecedores.find(f => f.id === rec.fornecedor_id);
        const transportadora = transportadoras.find(t => t.id === rec.transportadora_id);
        
        const campos = {
            'receb-fornecedor': fornecedor ? fornecedor.nome : '',
            'receb-transportadora': transportadora ? transportadora.nome : '',
            'receb-numero-nf': rec.numero_nota_fiscal,
            'receb-filial-chegada': rec.filial_chegada_id,
            'receb-filial-destino': rec.filial_destino_id,
            'receb-qtd-volumes': rec.volumes,
            'receb-data-prevista': rec.data_prevista ? rec.data_prevista.split('T')[0] : '',
            'receb-observacoes': rec.observacoes,
            'receb-urgencia': rec.urgente ? 'distribuicao_imediata' : 'estocagem',
            'receb-reserva': rec.reserva
        };
        
        Object.entries(campos).forEach(([id, valor]) => {
            const el = document.getElementById(id);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = valor;
                } else {
                    el.value = valor || '';
                }
            }
        });
        
        lucideCreateIconsDebounced();
    }
    
    // Salvar recebimento
    async function salvarRecebimento() {
        const urgenciaValue = document.getElementById('receb-urgencia')?.value;
        const fornecedorNome = document.getElementById('receb-fornecedor')?.value;
        const transportadoraNome = document.getElementById('receb-transportadora')?.value;
        
        const dados = {
            fornecedor_id: getFornecedorIdByNome(fornecedorNome),
            transportadora_id: getTransportadoraIdByNome(transportadoraNome),
            numero_nota_fiscal: document.getElementById('receb-numero-nf')?.value || null,
            filial_chegada_id: document.getElementById('receb-filial-chegada')?.value,
            filial_destino_id: document.getElementById('receb-filial-destino')?.value || null,
            volumes: parseInt(document.getElementById('receb-qtd-volumes')?.value) || 1,
            peso_total: null, // Não tem campo de peso no formulário atual
            data_prevista: document.getElementById('receb-data-prevista')?.value || null,
            observacoes: document.getElementById('receb-observacoes')?.value || null,
            urgente: urgenciaValue === 'distribuicao_imediata'
        };
        
        // Validação
        if (!dados.fornecedor_id) {
            await showAlert('Selecione o fornecedor', 'Atenção', 'warning');
            return;
        }
        
        if (!dados.filial_chegada_id) {
            await showAlert('Selecione a filial de chegada', 'Erro', 'danger');
            return;
        }
        
        try {
            showLoading('Salvando...');
            
            let response;
            if (recebimentoEmEdicao) {
                response = await apiFetch(`/api/recebimentos/${recebimentoEmEdicao.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(dados)
                });
            } else {
                response = await apiFetch('/api/recebimentos', {
                    method: 'POST',
                    body: JSON.stringify(dados)
                });
            }
            
            if (response.ok) {
                const result = await response.json();
                await showAlert(
                    recebimentoEmEdicao ? 'Recebimento atualizado!' : `Recebimento ${result.codigo} cadastrado!`,
                    'Sucesso',
                    'success'
                );
                await carregarRecebimentos();
                showRecebimentoView('lista');
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao salvar', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro ao salvar recebimento:', error);
            await showAlert('Erro ao salvar recebimento', 'Erro', 'danger');
        } finally {
            hideLoading();
        }
    }
    
    // Funções globais para os botões
    window.verDetalheRecebimento = async function(id) {
        const rec = recebimentos.find(r => r.id === id);
        if (!rec) return;
        
        // Preencher campos de detalhes usando os IDs do HTML
        const setEl = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value || '-';
        };
        
        // Título
        const titulo = document.getElementById('receb-detalhe-id');
        if (titulo) {
            titulo.innerHTML = `<i data-lucide="package" style="width: 28px; height: 28px; margin-right: 10px;"></i>${rec.codigo}${rec.urgente ? ' <span style="color: #e74c3c;">⚡ URGENTE</span>' : ''}`;
        }
        
        // Status tag
        const statusTag = document.getElementById('receb-detalhe-status-tag');
        if (statusTag) {
            const statusClass = rec.status === 'aguardando' ? 'status-pending' : 
                               rec.status === 'recebido' ? 'status-transit' : 'status-completed';
            const statusText = rec.status === 'aguardando' ? 'Aguardando' : 
                              rec.status === 'recebido' ? 'Recebido' : 'Conferido';
            statusTag.className = `status-badge ${statusClass}`;
            statusTag.textContent = statusText;
        }
        
        // Reserva tag
        const reservaTag = document.getElementById('receb-detalhe-reserva-tag');
        if (reservaTag) {
            const reservaClass = rec.reserva === 'pendente' ? 'status-pending' : 'status-completed';
            const reservaText = rec.reserva === 'pendente' ? '🔒 Bloqueado' : '✓ Liberado';
            reservaTag.className = `status-badge ${reservaClass}`;
            reservaTag.textContent = reservaText;
        }
        
        // Dados da NF
        setEl('receb-detalhe-nf', rec.numero_nota_fiscal);
        setEl('receb-detalhe-emissao', rec.data_emissao ? new Date(rec.data_emissao).toLocaleDateString('pt-BR') : '-');
        setEl('receb-detalhe-volumes', rec.volumes);
        setEl('receb-detalhe-usuario', rec.usuario_cadastro_nome || 'Sistema');
        
        // Fornecedor e Transporte
        setEl('receb-detalhe-fornecedor', rec.fornecedor_nome);
        setEl('receb-detalhe-transportadora', rec.transportadora_nome);
        
        // Filiais
        setEl('receb-detalhe-chegada', rec.filial_chegada_nome);
        setEl('receb-detalhe-destino', rec.filial_destino_nome || 'Mesma de chegada');
        
        // Alerta de transferência
        const alertaTransf = document.getElementById('receb-detalhe-alerta-transferencia');
        if (alertaTransf) {
            alertaTransf.style.display = (rec.filial_chegada_id !== rec.filial_destino_id && rec.filial_destino_id) ? 'flex' : 'none';
        }
        
        // Datas
        setEl('receb-detalhe-prevista', rec.data_prevista ? new Date(rec.data_prevista).toLocaleDateString('pt-BR') : '-');
        setEl('receb-detalhe-chegada-data', rec.data_chegada ? new Date(rec.data_chegada).toLocaleString('pt-BR') : '-');
        setEl('receb-detalhe-conferencia', rec.data_conferencia ? new Date(rec.data_conferencia).toLocaleString('pt-BR') : '-');
        setEl('receb-detalhe-urgencia', rec.urgente ? 'Sim - Distribuição Imediata' : 'Não');
        setEl('receb-detalhe-reserva', rec.reserva === 'pendente' ? 'Bloqueado para venda' : 'Liberado para venda');
        
        // Responsável
        const respWrapper = document.getElementById('receb-detalhe-responsavel-wrapper');
        if (respWrapper) {
            if (rec.usuario_recebimento_nome) {
                respWrapper.style.display = 'block';
                setEl('receb-detalhe-responsavel', rec.usuario_recebimento_nome);
            } else {
                respWrapper.style.display = 'none';
            }
        }
        
        // Divergências
        const divergenciasCard = document.getElementById('receb-detalhe-divergencias-card');
        const divergenciasEl = document.getElementById('receb-detalhe-divergencias');
        if (divergenciasCard && divergenciasEl) {
            if (rec.divergencias && rec.divergencias.length > 0) {
                divergenciasCard.style.display = 'block';
                
                const faltando = rec.divergencias.filter(d => d.tipo === 'faltando');
                const sobrando = rec.divergencias.filter(d => d.tipo === 'sobrando');
                
                let html = '';
                
                // Botões de ação
                html += `<div style="display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 10px;">
                    <button class="btn btn-sm btn-primary" onclick="marcarDivergenciaResolvida(${rec.id})">
                        <i data-lucide="check-circle" style="width: 14px; height: 14px;"></i> Marcar como Resolvida
                    </button>
                    <button class="btn btn-sm btn-success" onclick="exportarDivergenciasExcel(${rec.id})">
                        <i data-lucide="file-spreadsheet" style="width: 14px; height: 14px;"></i> Exportar Excel
                    </button>
                </div>`;
                
                if (faltando.length > 0) {
                    html += `<div style="background: #fff3cd; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                        <strong style="color: #856404;">⚠️ Itens Faltando:</strong>
                        <ul style="margin: 10px 0 0 20px; padding: 0;">
                            ${faltando.map(f => `<li><strong>${f.codigo_referencia}</strong> - Qtd: ${f.quantidade}</li>`).join('')}
                        </ul>
                    </div>`;
                }
                
                if (sobrando.length > 0) {
                    html += `<div style="background: #d1ecf1; padding: 10px; border-radius: 8px;">
                        <strong style="color: #0c5460;">📦 Itens Sobrando:</strong>
                        <ul style="margin: 10px 0 0 20px; padding: 0;">
                            ${sobrando.map(s => `<li><strong>${s.codigo_referencia}</strong> - Qtd: ${s.quantidade}</li>`).join('')}
                        </ul>
                    </div>`;
                }
                
                divergenciasEl.innerHTML = html;
                lucideCreateIconsDebounced();
            } else {
                divergenciasCard.style.display = 'none';
            }
        }
        
        // Observações gerais (do cadastro)
        const obsCard = document.getElementById('receb-detalhe-obs-card');
        const obsEl = document.getElementById('receb-detalhe-observacoes');
        if (obsCard && obsEl) {
            if (rec.observacoes || rec.observacao_recebimento) {
                obsCard.style.display = 'block';
                let obsTexto = '';
                if (rec.observacoes) {
                    obsTexto += `<strong>Obs. Cadastro:</strong> ${rec.observacoes}`;
                }
                if (rec.observacao_recebimento) {
                    if (obsTexto) obsTexto += '<br><br>';
                    obsTexto += `<strong>Obs. Recebimento:</strong> ${rec.observacao_recebimento}`;
                }
                obsEl.innerHTML = obsTexto;
            } else {
                obsCard.style.display = 'none';
            }
        }
        
        showRecebimentoView('detalhe');
        lucideCreateIconsDebounced();
    };
    
    window.editarRecebimento = async function(id) {
        recebimentoEmEdicao = recebimentos.find(r => r.id === id);
        if (recebimentoEmEdicao) {
            showRecebimentoView('cadastro');
        }
    };
    
    // Variável para armazenar o ID do recebimento sendo processado
    let recebimentoIdAtual = null;
    
    window.registrarChegada = async function(id) {
        abrirModalRecebimento(id);
    };
    
    // Abrir modal de recebimento
    window.abrirModalRecebimento = function(id) {
        const rec = recebimentos.find(r => r.id === id);
        if (!rec) {
            return;
        }
        
        recebimentoIdAtual = id;
        
        // Preencher informações do modal
        const info = document.getElementById('recebimento-modal-info');
        if (info) {
            info.innerHTML = `<strong>NF:</strong> ${rec.numero_nota_fiscal || rec.codigo} | <strong>Fornecedor:</strong> ${rec.fornecedor_nome || 'Não informado'}`;
        }
        
        // Popular select de filiais
        const selectFilial = document.getElementById('recebimento-filial-real');
        if (selectFilial) {
            selectFilial.innerHTML = '<option value="">Selecione a filial...</option>';
            filiaisRecebimento.forEach(f => {
                selectFilial.innerHTML += `<option value="${f.id}" ${f.id === rec.filial_chegada_id ? 'selected' : ''}>${f.nome}</option>`;
            });
        }
        
        // Mostrar filial prevista
        const filialPrevista = document.getElementById('recebimento-filial-prevista');
        if (filialPrevista) {
            filialPrevista.textContent = rec.filial_chegada_nome ? `Filial prevista: ${rec.filial_chegada_nome}` : '';
        }
        
        const volumesEsperados = document.getElementById('recebimento-volumes-esperados');
        if (volumesEsperados) {
            volumesEsperados.textContent = rec.volumes ? `Volumes esperados: ${rec.volumes}` : 'Volumes esperados: Não informado';
        }
        
        // Limpar campos
        document.getElementById('recebimento-volumes-recebidos').value = rec.volumes || '';
        document.getElementById('recebimento-situacao').value = 'ok';
        document.getElementById('recebimento-observacao').value = '';
        
        // Limpar e ocultar campos de divergência
        document.getElementById('divergencia-fields').style.display = 'none';
        document.getElementById('itens-faltando-container').innerHTML = '';
        document.getElementById('itens-sobrando-container').innerHTML = '';
        document.getElementById('tabela-faltando-wrapper').style.display = 'none';
        document.getElementById('tabela-sobrando-wrapper').style.display = 'none';
        document.getElementById('input-faltando-codigo').value = '';
        document.getElementById('input-faltando-qtd').value = '1';
        document.getElementById('input-sobrando-codigo').value = '';
        document.getElementById('input-sobrando-qtd').value = '1';
        
        // Mostrar modal
        document.getElementById('recebimento-modal').classList.add('show');
        lucideCreateIconsDebounced();
    }
    
    // Toggle campos de divergência
    window.toggleDivergenciaFields = function() {
        const situacao = document.getElementById('recebimento-situacao').value;
        const divergenciaFields = document.getElementById('divergencia-fields');
        if (divergenciaFields) {
            divergenciaFields.style.display = situacao === 'divergencia' ? 'block' : 'none';
            if (situacao === 'divergencia') {
                lucideCreateIconsDebounced();
            }
        }
    }
    
    // Handler para Enter nos campos de divergência
    window.handleEnterDivergencia = function(event, tipo) {
        if (event.key === 'Enter') {
            event.preventDefault();
            adicionarItemDivergencia(tipo);
        }
    }
    
    // Adicionar item de divergência (faltando ou sobrando)
    window.adicionarItemDivergencia = function(tipo) {
        const inputCodigo = document.getElementById(`input-${tipo}-codigo`);
        const inputQtd = document.getElementById(`input-${tipo}-qtd`);
        const container = document.getElementById(`itens-${tipo}-container`);
        const wrapper = document.getElementById(`tabela-${tipo}-wrapper`);
        
        if (!inputCodigo || !container) return;
        
        const codigo = inputCodigo.value.trim();
        const qtd = parseInt(inputQtd.value) || 1;
        
        if (!codigo) {
            inputCodigo.focus();
            return;
        }
        
        const itemId = Date.now();
        const rowHtml = `
            <tr id="divergencia-${itemId}" style="border-bottom: 1px solid #ddd; background: #fff;">
                <td style="padding: 8px;" data-codigo="${codigo}">${codigo}</td>
                <td style="padding: 8px; text-align: center;" data-qtd="${qtd}">${qtd}</td>
                <td style="padding: 8px; text-align: center;">
                    <button type="button" class="btn btn-sm btn-danger" onclick="removerItemDivergencia(${itemId}, '${tipo}')" style="padding: 4px 8px;">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    </button>
                </td>
            </tr>
        `;
        container.insertAdjacentHTML('beforeend', rowHtml);
        
        // Mostrar wrapper da tabela
        if (wrapper) wrapper.style.display = 'block';
        
        // Limpar inputs e focar no código
        inputCodigo.value = '';
        inputQtd.value = '1';
        inputCodigo.focus();
        
        lucideCreateIconsDebounced();
    }
    
    // Remover item de divergência
    window.removerItemDivergencia = function(itemId, tipo) {
        const item = document.getElementById(`divergencia-${itemId}`);
        if (item) item.remove();
        
        // Ocultar wrapper se vazio
        const container = document.getElementById(`itens-${tipo}-container`);
        const wrapper = document.getElementById(`tabela-${tipo}-wrapper`);
        if (container && wrapper && container.children.length === 0) {
            wrapper.style.display = 'none';
        }
    }
    
    // Coletar itens de divergência
    function coletarItensDivergencia(tipo) {
        const container = document.getElementById(`itens-${tipo}-container`);
        if (!container) return [];
        
        const itens = [];
        container.querySelectorAll('tr').forEach(row => {
            const codigoCell = row.querySelector('td[data-codigo]');
            const qtdCell = row.querySelector('td[data-qtd]');
            if (codigoCell && qtdCell) {
                const codigo = codigoCell.getAttribute('data-codigo');
                const qtd = parseInt(qtdCell.getAttribute('data-qtd')) || 0;
                if (codigo && qtd > 0) {
                    itens.push({ codigo, quantidade: qtd });
                }
            }
        });
        return itens;
    }
    
    // Marcar divergência como resolvida
    window.marcarDivergenciaResolvida = async function(recebimentoId) {
        const confirmado = await showConfirm('Deseja marcar esta divergência como resolvida?', 'Confirmar Resolução');
        if (!confirmado) return;
        
        try {
            showLoading('Atualizando situação...');
            const response = await apiFetch(`/api/recebimentos/${recebimentoId}/resolver-divergencia`, {
                method: 'POST'
            });
            
            if (response.ok) {
                await showAlert('Divergência marcada como resolvida!', 'Sucesso', 'success');
                await carregarRecebimentos();
                showRecebimentoView('lista');
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao atualizar', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro:', error);
            await showAlert('Erro ao atualizar situação', 'Erro', 'danger');
        } finally {
            hideLoading();
        }
    }
    
    // Exportar divergências para Excel
    window.exportarDivergenciasExcel = function(recebimentoId) {
        const rec = recebimentos.find(r => r.id === recebimentoId);
        if (!rec || !rec.divergencias || rec.divergencias.length === 0) {
            showAlert('Nenhuma divergência para exportar', 'Aviso', 'warning');
            return;
        }
        
        // Preparar dados para Excel
        const dados = rec.divergencias.map(d => ({
            'Tipo': d.tipo === 'faltando' ? 'Faltando' : 'Sobrando',
            'Código Referência': d.codigo_referencia,
            'Quantidade': d.quantidade
        }));
        
        // Criar workbook
        const ws = XLSX.utils.json_to_sheet(dados);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Divergências');
        
        // Ajustar largura das colunas
        ws['!cols'] = [
            { wch: 12 },
            { wch: 25 },
            { wch: 12 }
        ];
        
        // Download
        const nomeArquivo = `Divergencias_${rec.codigo || 'REC-' + rec.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, nomeArquivo);
    }
    
    // Event listeners do modal de recebimento
    document.getElementById('recebimento-btn-cancelar')?.addEventListener('click', () => {
        document.getElementById('recebimento-modal').classList.remove('show');
        recebimentoIdAtual = null;
    });
    
    document.getElementById('recebimento-btn-confirmar')?.addEventListener('click', async () => {
        if (!recebimentoIdAtual) return;
        
        const filialReal = document.getElementById('recebimento-filial-real').value;
        const volumesRecebidos = document.getElementById('recebimento-volumes-recebidos').value;
        const situacao = document.getElementById('recebimento-situacao').value;
        const observacao = document.getElementById('recebimento-observacao').value;
        
        // Coletar itens de divergência
        const itensFaltando = coletarItensDivergencia('faltando');
        const itensSobrando = coletarItensDivergencia('sobrando');
        
        if (!filialReal) {
            await showAlert('Informe onde a mercadoria chegou', 'Atenção', 'warning');
            return;
        }
        
        if (!volumesRecebidos || volumesRecebidos < 0) {
            await showAlert('Informe a quantidade de volumes recebidos', 'Atenção', 'warning');
            return;
        }
        
        // Se marcou divergência, deve ter pelo menos um item
        if (situacao === 'divergencia' && itensFaltando.length === 0 && itensSobrando.length === 0) {
            await showAlert('Adicione pelo menos um item faltando ou sobrando', 'Atenção', 'warning');
            return;
        }
        
        try {
            showLoading('Registrando recebimento...');
            document.getElementById('recebimento-modal').classList.remove('show');
            
            const response = await apiFetch(`/api/recebimentos/${recebimentoIdAtual}/receber`, { 
                method: 'POST',
                body: JSON.stringify({
                    filial_recebimento_id: parseInt(filialReal),
                    volumes_recebidos: parseInt(volumesRecebidos),
                    situacao: situacao,
                    observacao_recebimento: observacao,
                    itens_faltando: itensFaltando,
                    itens_sobrando: itensSobrando
                })
            });
            
            if (response.ok) {
                await showAlert('Recebimento registrado com sucesso!', 'Sucesso', 'success');
                await carregarRecebimentos();
                showRecebimentoView('lista');
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao registrar', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro:', error);
            await showAlert('Erro ao registrar recebimento', 'Erro', 'danger');
        } finally {
            hideLoading();
            recebimentoIdAtual = null;
        }
    });
    
    window.registrarConferencia = async function(id) {
        if (!await showConfirm('Confirma a conferência do recebimento?', 'Conferir Recebimento', 'info')) {
            return;
        }
        
        try {
            showLoading('Conferindo...');
            const response = await apiFetch(`/api/recebimentos/${id}/conferir`, { method: 'POST' });
            
            if (response.ok) {
                await showAlert('Conferência registrada com sucesso!', 'Sucesso', 'success');
                await carregarRecebimentos();
                showRecebimentoView('lista');
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao conferir', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro:', error);
            await showAlert('Erro ao conferir recebimento', 'Erro', 'danger');
        } finally {
            hideLoading();
        }
    };
    
    window.confirmarChegadaDestino = async function(id) {
        const rec = recebimentos.find(r => r.id === id);
        if (!rec) return;
        
        const filialDestino = rec.filial_destino_nome || 'destino';
        
        if (!await showConfirm(`Confirma que a mercadoria chegou em ${filialDestino}?`, 'Confirmar Chegada no Destino', 'success')) {
            return;
        }
        
        try {
            showLoading('Confirmando chegada...');
            const response = await apiFetch(`/api/recebimentos/${id}/chegada-destino`, { method: 'POST' });
            
            if (response.ok) {
                await showAlert(`Chegada em ${filialDestino} confirmada!`, 'Sucesso', 'success');
                await carregarRecebimentos();
                showRecebimentoView('lista');
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao confirmar', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro:', error);
            await showAlert('Erro ao confirmar chegada no destino', 'Erro', 'danger');
        } finally {
            hideLoading();
        }
    };
    
    window.liberarRecebimento = async function(id) {
        if (!await showConfirm('Confirma a liberação da mercadoria para venda?', 'Liberar Mercadoria', 'warning')) {
            return;
        }
        
        try {
            showLoading('Liberando...');
            const response = await apiFetch(`/api/recebimentos/${id}/liberar`, { method: 'POST' });
            
            if (response.ok) {
                await showAlert('Mercadoria liberada para venda!', 'Sucesso', 'success');
                await carregarRecebimentos();
                showRecebimentoView('lista');
            } else {
                const error = await response.json();
                await showAlert(error.error || 'Erro ao liberar', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro:', error);
            await showAlert('Erro ao liberar mercadoria', 'Erro', 'danger');
        } finally {
            hideLoading();
        }
    };

});
    



