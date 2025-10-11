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
                    <th>Nº Interno</th>
                    <th>Status</th>
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
            const dataFormatada = t.data ? new Date(t.data).toLocaleDateString('pt-BR') : '-';
            
            row.innerHTML = `
                <td><strong>${t.id}</strong></td>
                <td>${dataFormatada}</td>
                <td>${t.origem}</td>
                <td>${t.destino}</td>
                <td>${t.solicitante}</td>
                <td>${numeroInterno}</td>
                <td><span class="status-tag ${statusInfo.className}">${statusInfo.text}</span></td>
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
        renderTransferList(dashboardTransferList, t => t.status !== 'recebido' && t.status !== 'concluido');
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
                await atualizarEtapa(t.id, 'separado');
                await showAlert('Produtos separados com sucesso!', 'Sucesso', 'success');
            };
            acoesContainer.appendChild(btn);
        } else if (t.status === 'separado') {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary'; 
            btn.innerHTML = '<i data-lucide="clipboard-check"></i> Enviar para Lançamento';
            btn.onclick = async () => {
                await atualizarEtapa(t.id, 'aguardando_lancamento');
                await showAlert('Transferência enviada para lançamento no sistema!', 'Sucesso', 'success');
            };
            acoesContainer.appendChild(btn);
        } else if (t.status === 'aguardando_lancamento') {
            const btnReceber = document.createElement('button');
            btnReceber.className = 'btn btn-success';
            btnReceber.innerHTML = '<i data-lucide="check-circle"></i> Confirmar Recebimento';
            btnReceber.onclick = async () => {
                const confirmado = await showConfirm(
                    'Confirma o recebimento dos produtos no destino? Isso finalizará a transferência.',
                    'Confirmar Recebimento',
                    'info'
                );
                if (confirmado) {
                    await atualizarEtapa(t.id, 'recebido');
                    await showAlert('Transferência finalizada com sucesso!', 'Sucesso', 'success');
                }
            };
            acoesContainer.appendChild(btnReceber);
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
                    const confirmado = await showConfirm(
                        'Deseja registrar o recebimento desta transferência?',
                        'Confirmar Recebimento',
                        'info'
                    );
                    if (confirmado) {
                        await atualizarEtapa(t.id, 'recebido');
                        await showAlert('Recebimento registrado com sucesso!', 'Sucesso', 'success');
                    }
                };
                acoesContainer.appendChild(btnReceber);
            } else {
                acoesContainer.innerHTML = '<p style="color: #28a745; font-weight: 600;">✅ Transferência concluída com sucesso!</p>';
            } 
        } else if (t.status === 'cancelado') {
            acoesContainer.innerHTML = '<p style="color: #dc3545; font-weight: 600;">❌ Transferência cancelada.</p>'; 
        } else if (t.status === 'pendente') {
            // Compatibilidade com status antigo
            const btn = document.createElement('button');
            btn.className = 'btn btn-info'; 
            btn.innerHTML = '<i data-lucide="play"></i> Iniciar Separação';
            btn.onclick = () => mudarStatus(t.id, 'em_separacao');
            acoesContainer.appendChild(btn);
        } else if (t.status === 'aguardando_lancamento') {
            // Compatibilidade com status antigo
            acoesContainer.innerHTML = `<div class="form-group"><label for="input-transf-interna">Nº da Transferência (Sistema Principal) *</label><input type="text" id="input-transf-interna" placeholder="Digite o número da transferência"></div><button class="btn btn-primary" id="btn-lancar-transferencia"><i data-lucide="send"></i> Lançamento Concluído</button>`;
            acoesContainer.querySelector('#btn-lancar-transferencia').onclick = () => lancarTransferencia(t.id);
        } else { 
            acoesContainer.innerHTML = '<p>Status desconhecido.</p>'; 
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
    
    const getStatusInfo = (status) => {
        switch(status) {
            case 'rascunho': return { text: 'Rascunho', className: 'status-rascunho' };
            case 'aguardando_separacao': return { text: '⏳ Aguardando Separação', className: 'status-aguardando-separacao' };
            case 'em_separacao': return { text: '📦 Em Separação', className: 'status-em-separacao' };
            case 'separado': return { text: '✅ Separado', className: 'status-separado' };
            case 'aguardando_lancamento': return { text: '📋 Aguardando Lançamento', className: 'status-aguardando-lancamento' };
            case 'recebido': return { text: '🎉 Finalizado', className: 'status-recebido' };
            case 'concluido': return { text: '🎉 Concluído', className: 'status-concluido' };
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
    async function atualizarEtapa(transferId, novoStatus) {
        try {
            const response = await apiFetch(`/api/transferencias/${transferId}/etapa`, {
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
    function adicionarItem() {
        const itemRow = document.createElement('div');
        itemRow.className = 'item-row';
        itemRow.innerHTML = `<div class="form-group"><label>Código do Produto *</label><input type="text" class="item-codigo" required placeholder="Código do produto"></div><div class="form-group"><label>Qtd. Solicitada *</label><input type="number" class="item-quantidade" required min="1" placeholder="Ex: 10"></div><button type="button" class="btn-remover-item"><i data-lucide="trash-2"></i></button>`;
        
        // Adicionar validação de produto duplicado
        const codigoInput = itemRow.querySelector('.item-codigo');
        codigoInput.addEventListener('blur', async () => {
            const codigo = codigoInput.value.trim();
            const destino = document.getElementById('destino').value;
            
            if (!codigo || !destino) return;
            
            try {
                const response = await apiFetch(`/api/verificar-produto/${encodeURIComponent(codigo)}/${encodeURIComponent(destino)}`);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.duplicado) {
                        const confirmado = await showConfirm(
                            data.mensagem + '\n\nDeseja adicionar mesmo assim?',
                            'Produto em Transferência Ativa',
                            'warning'
                        );
                        
                        if (!confirmado) {
                            codigoInput.value = '';
                            codigoInput.focus();
                        }
                    }
                }
            } catch (error) {
                console.error('Erro ao verificar produto:', error);
            }
        });
        
        itemRow.querySelector('.btn-remover-item').addEventListener('click', () => itemRow.remove());
        itensContainer.appendChild(itemRow);
        lucide.createIcons();
    }
    
    // Editar Rascunho
    function editarRascunho(transferId) {
        const t = transferencias.find(tr => tr.id === transferId);
        if (!t) {
            showAlert('Rascunho não encontrado', 'Erro', 'danger');
            return;
        }
        
        // Marcar que está editando
        editandoRascunhoId = transferId;
        
        // Preencher formulário
        document.getElementById('origem').value = t.origem;
        document.getElementById('destino').value = t.destino;
        document.getElementById('solicitante').value = t.solicitante;
        
        // Carregar tags
        currentTransferTags = [...(t.tags || [])];
        renderFormTags();
        
        // Limpar itens existentes
        itensContainer.innerHTML = '';
        
        // Adicionar itens do rascunho
        t.itens.forEach(item => {
            const itemRow = document.createElement('div');
            itemRow.className = 'item-row';
            itemRow.innerHTML = `
                <div class="form-group">
                    <label>Código do Produto *</label>
                    <input type="text" class="item-codigo" required placeholder="Código do produto" value="${item.codigo}">
                </div>
                <div class="form-group">
                    <label>Qtd. Solicitada *</label>
                    <input type="number" class="item-quantidade" required min="1" placeholder="Ex: 10" value="${item.solicitada}">
                </div>
                <button type="button" class="btn-remover-item">
                    <i data-lucide="trash-2"></i>
                </button>
            `;
            itemRow.querySelector('.btn-remover-item').addEventListener('click', () => itemRow.remove());
            itensContainer.appendChild(itemRow);
        });
        
        lucide.createIcons();
        
        // Mudar para view de cadastro
        showView('cadastro');
        
        // Mostrar mensagem
        showAlert('Rascunho carregado! Faça as alterações e clique em "Salvar Rascunho".', 'Editando Rascunho', 'info');
    }
    
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
            let response;
            
            if (editandoRascunhoId) {
                // Atualizando rascunho existente
                const transferencia = {
                    origem: document.getElementById('origem').value,
                    destino: document.getElementById('destino').value,
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
                
                response = await apiFetch('/api/transferencias', {
                    method: 'POST',
                    body: JSON.stringify(novaTransferencia)
                });
            }
            
            if (response.ok) {
                form.reset(); 
                itensContainer.innerHTML = ''; 
                currentTransferTags = []; 
                renderFormTags(); 
                adicionarItem();
                
                const mensagem = editandoRascunhoId ? 'Rascunho atualizado com sucesso!' : 'Transferência salva com sucesso!';
                await showAlert(mensagem, 'Sucesso', 'success');
                
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

    // --- Filtros ---
    const filtroTag = document.getElementById('filtro-tag');
    const filtroOrigem = document.getElementById('filtro-origem');
    const filtroDestino = document.getElementById('filtro-destino');
    const filtroProduto = document.getElementById('filtro-produto');
    const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
    const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
    
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
                const optionOrigem = document.createElement('option');
                optionOrigem.value = opt.value;
                optionOrigem.textContent = opt.textContent;
                filtroOrigem.appendChild(optionOrigem);
                
                const optionDestino = document.createElement('option');
                optionDestino.value = opt.value;
                optionDestino.textContent = opt.textContent;
                filtroDestino.appendChild(optionDestino);
            }
        });
    }
    
    // Aplicar filtros
    function aplicarFiltros() {
        const tagSelecionada = filtroTag.value.toLowerCase();
        const origemSelecionada = filtroOrigem.value.toLowerCase();
        const destinoSelecionado = filtroDestino.value.toLowerCase();
        const produtoDigitado = filtroProduto.value.toLowerCase().trim();
        
        const filtrados = transferencias.filter(t => {
            // Filtro por tag
            if (tagSelecionada && (!t.tags || !t.tags.some(tag => tag.toLowerCase() === tagSelecionada))) {
                return false;
            }
            
            // Filtro por origem
            if (origemSelecionada && t.origem.toLowerCase() !== origemSelecionada) {
                return false;
            }
            
            // Filtro por destino
            if (destinoSelecionado && t.destino.toLowerCase() !== destinoSelecionado) {
                return false;
            }
            
            // Filtro por código de produto
            if (produtoDigitado && (!t.itens || !t.itens.some(item => 
                item.codigo.toLowerCase().includes(produtoDigitado)))) {
                return false;
            }
            
            return true;
        });
        
        // Renderizar resultados filtrados
        renderTransferListFiltrada(filtrados);
    }
    
    // Renderizar lista filtrada
    function renderTransferListFiltrada(data) {
        transferListContainer.innerHTML = '';
        
        if (data.length === 0) {
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
                    <th>Nº Interno</th>
                    <th>Status</th>
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
            const dataFormatada = t.data ? new Date(t.data).toLocaleDateString('pt-BR') : '-';
            
            row.innerHTML = `
                <td><strong>${t.id}</strong></td>
                <td>${dataFormatada}</td>
                <td>${t.origem}</td>
                <td>${t.destino}</td>
                <td>${t.solicitante}</td>
                <td>${numeroInterno}</td>
                <td><span class="status-tag ${statusInfo.className}">${statusInfo.text}</span></td>
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
        renderTransferList(transferListContainer);
    }
    
    // Event listeners dos filtros
    btnAplicarFiltros.addEventListener('click', aplicarFiltros);
    btnLimparFiltros.addEventListener('click', limparFiltros);
    filtroProduto.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') aplicarFiltros();
    });
    
    // Popular filtros quando tags e filiais carregarem
    const popularFiltrosTimeout = setInterval(() => {
        if (globalTags.length > 0 && document.getElementById('origem').options.length > 1) {
            popularFiltros();
            clearInterval(popularFiltrosTimeout);
        }
    }, 500);
    
    // ========================================
    // CHAT ENTRE FILIAIS
    // ========================================
    
    const chatToggle = document.getElementById('chat-toggle');
    const chatModal = document.getElementById('chat-modal');
    const chatClose = document.getElementById('chat-close');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const chatBadge = document.getElementById('chat-badge');
    const chatFilialSelect = document.getElementById('chat-filial-select');
    
    let mensagens = [];
    let chatAberto = false;
    let ultimoIdMensagem = 0;
    let pollingInterval = null;
    let filialSelecionada = '';
    let minhaFilial = '';
    let replyToMessage = null; // Mensagem sendo respondida
    
    // Carregar filiais no select do chat
    async function carregarFiliaisChat() {
        try {
            // Pegar filial do usuário logado (USAR O NOME CORRETO!)
            let usuario = JSON.parse(localStorage.getItem('stoklink_user'));
            
            console.log('═══════════════════════════════════════════');
            console.log('🔍 DEBUG CHAT - INFORMAÇÕES DO USUÁRIO');
            console.log('═══════════════════════════════════════════');
            console.log('📦 Usuário completo do localStorage:', usuario);
            console.log('📍 Filial no localStorage:', usuario?.filial);
            console.log('🔑 Token existe:', !!localStorage.getItem('stoklink_token'));
            console.log('═══════════════════════════════════════════');
            
            // Se não tem filial no localStorage, buscar do backend
            if (usuario && !usuario.filial) {
                console.log('⚠️ Usuário sem filial no localStorage, buscando do servidor...');
                try {
                    const response = await apiFetch('/api/auth/me');
                    console.log('🔙 Resposta do servidor (status):', response.status);
                    
                    if (response.ok) {
                        const userData = await response.json();
                        console.log('🔙 Dados retornados do servidor:', userData);
                        console.log('📍 Filial do servidor:', userData.filial);
                        
                        if (userData.filial) {
                            usuario.filial = userData.filial;
                            localStorage.setItem('stoklink_user', JSON.stringify(usuario));
                            console.log('✅ Filial atualizada no localStorage:', userData.filial);
                        } else {
                            console.error('⚠️ Servidor retornou dados mas sem filial!');
                        }
                    } else {
                        const errorData = await response.json();
                        console.error('❌ Erro do servidor:', errorData);
                    }
                } catch (error) {
                    console.error('❌ Erro ao buscar dados do usuário:', error);
                }
            }
            
            if (usuario && usuario.filial) {
                minhaFilial = usuario.filial;
                console.log('✅ Minha filial definida:', minhaFilial);
            } else {
                console.error('❌ Usuário não tem filial definida!');
                console.error('💡 Solução: Verifique se a coluna "filial" no banco tem valor para seu usuário');
                chatMessages.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 20px;">Erro: Seu usuário não tem filial definida. Entre em contato com o administrador.</p>';
                return;
            }
            
            const response = await apiFetch('/api/filiais');
            if (response.ok) {
                const filiais = await response.json();
                
                chatFilialSelect.innerHTML = '<option value="">Selecione uma filial...</option>';
                filiais.forEach(f => {
                    // Não mostrar a própria filial na lista
                    if (f.nome !== minhaFilial) {
                        const option = document.createElement('option');
                        option.value = f.nome;
                        option.textContent = f.nome;
                        chatFilialSelect.appendChild(option);
                    }
                });
            }
        } catch (error) {
            console.error('Erro ao carregar filiais:', error);
        }
    }
    
    // Quando selecionar uma filial
    chatFilialSelect.addEventListener('change', () => {
        filialSelecionada = chatFilialSelect.value;
        
        // Parar polling anterior
        pararPolling();
        
        if (filialSelecionada) {
            chatInput.disabled = false;
            chatSend.disabled = false;
            document.getElementById('chat-emoji-btn').disabled = false;
            chatInput.placeholder = 'Digite sua mensagem...';
            chatInput.focus();
            
            // Limpar mensagens e recarregar
            mensagens = [];
            ultimoIdMensagem = 0;
            carregarMensagens();
            
            // Iniciar polling para buscar mensagens novas
            if (chatAberto) {
                iniciarPolling();
                console.log('🔄 Polling iniciado para', filialSelecionada);
            }
        } else {
            chatInput.disabled = true;
            chatSend.disabled = true;
            document.getElementById('chat-emoji-btn').disabled = true;
            chatInput.placeholder = 'Selecione uma filial primeiro...';
            chatMessages.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">Selecione uma filial para conversar</p>';
        }
    });
    
    // Abrir/fechar chat
    chatToggle.addEventListener('click', () => {
        chatAberto = !chatAberto;
        chatModal.classList.toggle('active');
        
        if (chatAberto) {
            carregarFiliaisChat();
            if (filialSelecionada) {
                carregarMensagens();
                iniciarPolling();
            }
            chatBadge.style.display = 'none';
            chatBadge.textContent = '0';
        } else {
            pararPolling();
        }
        
        lucide.createIcons();
    });
    
    chatClose.addEventListener('click', () => {
        chatAberto = false;
        chatModal.classList.remove('active');
        pararPolling();
    });
    
    // Carregar mensagens
    async function carregarMensagens(apenasNovas = false) {
        if (!filialSelecionada || !minhaFilial) {
            console.log('Filial não selecionada');
            return;
        }
        
        try {
            let url = `/api/mensagens?minhaFilial=${encodeURIComponent(minhaFilial)}&outraFilial=${encodeURIComponent(filialSelecionada)}`;
            
            if (apenasNovas && ultimoIdMensagem > 0) {
                url += `&ultimoId=${ultimoIdMensagem}`;
            }
            
            console.log('📥 Carregando mensagens:', url);
                
            const response = await apiFetch(url);
            
            if (response.ok) {
                const novasMensagens = await response.json();
                
                console.log(`✅ ${novasMensagens.length} mensagens recebidas`);
                
                if (novasMensagens.length > 0) {
                    if (apenasNovas) {
                        mensagens = [...mensagens, ...novasMensagens];
                        
                        // Atualizar badge se chat está fechado
                        if (!chatAberto) {
                            const badgeCount = parseInt(chatBadge.textContent) || 0;
                            chatBadge.textContent = badgeCount + novasMensagens.length;
                            chatBadge.style.display = 'flex';
                        }
                    } else {
                        mensagens = novasMensagens;
                    }
                    
                    if (mensagens.length > 0) {
                        ultimoIdMensagem = Math.max(...mensagens.map(m => m.id));
                    }
                }
                
                // SEMPRE renderizar, mesmo se não tiver mensagens novas
                renderizarMensagens();
            } else {
                const errorData = await response.json();
                console.error('❌ Erro ao buscar mensagens:', errorData);
                chatMessages.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 20px;">Erro ao carregar mensagens</p>';
            }
        } catch (error) {
            console.error('❌ Erro ao carregar mensagens:', error);
            chatMessages.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 20px;">Erro de conexão</p>';
        }
    }
    
    // Renderizar mensagens
    function renderizarMensagens(termoBusca = '', forcarScroll = false) {
        if (mensagens.length === 0) {
            chatMessages.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">Nenhuma mensagem ainda. Seja o primeiro a conversar!</p>';
            return;
        }
        
        const usuario = JSON.parse(localStorage.getItem('stoklink_user'));
        if (!usuario || !usuario.id) {
            console.error('Usuário não encontrado no localStorage');
            return;
        }
        const usuarioId = usuario.id;
        
        // Verificar se o usuário está perto do final (tolerância de 100px)
        const estaNoFinal = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 100;
        
        // Filtrar mensagens pela busca
        let mensagensFiltradas = mensagens;
        if (termoBusca) {
            mensagensFiltradas = mensagens.filter(msg => 
                msg.mensagem.toLowerCase().includes(termoBusca.toLowerCase())
            );
            
            if (mensagensFiltradas.length === 0) {
                chatMessages.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">Nenhuma mensagem encontrada para "' + termoBusca + '"</p>';
                return;
            }
        }
        
        chatMessages.innerHTML = mensagensFiltradas.map((msg, index) => {
            const isOwn = msg.usuario_id === usuarioId;
            const data = new Date(msg.created_at);
            const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            // Highlight do termo de busca
            let mensagemTexto = msg.mensagem;
            if (termoBusca) {
                const regex = new RegExp(`(${termoBusca})`, 'gi');
                mensagemTexto = mensagemTexto.replace(regex, '<mark>$1</mark>');
            }
            
            // Renderizar mensagem respondida
            let repliedHTML = '';
            if (msg.reply_to_id && msg.reply_mensagem) {
                repliedHTML = `
                    <div class="chat-message-replied" data-scroll-to="${msg.reply_to_id}">
                        <div class="chat-message-replied-header">${msg.reply_usuario_nome}</div>
                        <div class="chat-message-replied-text">${msg.reply_mensagem}</div>
                    </div>
                `;
            }
            
            // Renderizar reações
            let reacoesHTML = '';
            if (msg.reacoes) {
                const reacoes = typeof msg.reacoes === 'string' ? JSON.parse(msg.reacoes) : msg.reacoes;
                const reacoesArray = Object.entries(reacoes);
                
                if (reacoesArray.length > 0) {
                    reacoesHTML = '<div class="chat-message-reactions">';
                    reacoesArray.forEach(([emoji, usuarios]) => {
                        const reagiu = usuarios.includes(usuarioId);
                        reacoesHTML += `
                            <div class="chat-reaction ${reagiu ? 'reacted' : ''}" data-msg-id="${msg.id}" data-emoji="${emoji}">
                                <span class="chat-reaction-emoji">${emoji}</span>
                                <span class="chat-reaction-count">${usuarios.length}</span>
                            </div>
                        `;
                    });
                    reacoesHTML += '</div>';
                }
            }
            
            return `
                <div class="chat-message ${isOwn ? 'own' : 'other'}" data-msg-id="${msg.id}">
                    ${!isOwn ? `<div class="chat-message-header">${msg.usuario_nome}</div>` : ''}
                    ${repliedHTML}
                    <div class="chat-message-content">${mensagemTexto}</div>
                    <div class="chat-message-time">${hora}</div>
                    ${reacoesHTML}
                    <button class="chat-message-reply-btn" data-msg-id="${msg.id}">
                        <i data-lucide="corner-up-left"></i>
                    </button>
                    <button class="chat-message-react-btn" data-msg-id="${msg.id}">😊</button>
                    <div class="chat-reaction-picker" id="picker-${msg.id}">
                        ${['✔️', '❌', '👍', '🚨', '❤️', '😂', '😮', '🙏'].map(emoji => 
                            `<div class="chat-reaction-picker-emoji" data-msg-id="${msg.id}" data-emoji="${emoji}">${emoji}</div>`
                        ).join('')}
                    </div>
                </div>
            `;
        }).join('');
        
        // Adicionar event listeners para reply
        document.querySelectorAll('.chat-message-reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const msgId = parseInt(btn.dataset.msgId);
                const msg = mensagens.find(m => m.id === msgId);
                
                if (msg) {
                    mostrarReplyPreview(msg);
                }
            });
        });
        
        // Adicionar event listeners para clicar em mensagem respondida (scroll)
        document.querySelectorAll('.chat-message-replied').forEach(replied => {
            replied.addEventListener('click', () => {
                const targetId = replied.dataset.scrollTo;
                const targetElement = document.querySelector(`[data-msg-id="${targetId}"]`);
                
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetElement.style.background = '#fff3cd';
                    setTimeout(() => {
                        targetElement.style.background = '';
                    }, 1500);
                }
            });
        });
        
        // Adicionar event listeners para reações
        document.querySelectorAll('.chat-message-react-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const msgId = btn.dataset.msgId;
                const picker = document.getElementById(`picker-${msgId}`);
                
                // Fechar outros pickers
                document.querySelectorAll('.chat-reaction-picker').forEach(p => {
                    if (p.id !== `picker-${msgId}`) p.classList.remove('active');
                });
                
                picker.classList.toggle('active');
            });
        });
        
        document.querySelectorAll('.chat-reaction-picker-emoji').forEach(emoji => {
            emoji.addEventListener('click', (e) => {
                e.stopPropagation();
                reagirMensagem(emoji.dataset.msgId, emoji.dataset.emoji);
                document.getElementById(`picker-${emoji.dataset.msgId}`).classList.remove('active');
            });
        });
        
        document.querySelectorAll('.chat-reaction').forEach(reaction => {
            reaction.addEventListener('click', (e) => {
                e.stopPropagation();
                reagirMensagem(reaction.dataset.msgId, reaction.dataset.emoji);
            });
        });
        
        // Fechar picker ao clicar fora
        document.addEventListener('click', () => {
            document.querySelectorAll('.chat-reaction-picker').forEach(p => p.classList.remove('active'));
        });
        
        // Scroll para o final APENAS se:
        // 1. Forçado (enviou mensagem nova)
        // 2. Usuário estava no final E não está buscando
        if (forcarScroll || (estaNoFinal && !termoBusca)) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // Renderizar ícones Lucide
        lucide.createIcons();
    }
    
    // Reagir a uma mensagem
    async function reagirMensagem(mensagemId, emoji) {
        try {
            const response = await apiFetch(`/api/mensagens/${mensagemId}/reacao`, {
                method: 'POST',
                body: JSON.stringify({ emoji })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Atualizar mensagem local
                const msgIndex = mensagens.findIndex(m => m.id == mensagemId);
                if (msgIndex > -1) {
                    mensagens[msgIndex].reacoes = data.reacoes;
                    renderizarMensagens(document.getElementById('chat-search').value);
                }
            }
        } catch (error) {
            console.error('Erro ao reagir:', error);
        }
    }
    
    // Mostrar preview da mensagem sendo respondida
    function mostrarReplyPreview(msg) {
        replyToMessage = msg;
        
        const replyPreview = document.getElementById('chat-reply-preview');
        const replyPreviewUser = document.getElementById('chat-reply-preview-user');
        const replyPreviewText = document.getElementById('chat-reply-preview-text');
        
        replyPreviewUser.textContent = msg.usuario_nome;
        replyPreviewText.textContent = msg.mensagem;
        replyPreview.style.display = 'flex';
        
        chatInput.focus();
    }
    
    // Esconder preview de resposta
    function esconderReplyPreview() {
        replyToMessage = null;
        document.getElementById('chat-reply-preview').style.display = 'none';
    }
    
    // Enviar mensagem
    async function enviarMensagem() {
        const mensagem = chatInput.value.trim();
        
        if (!mensagem || !filialSelecionada || !minhaFilial) return;
        
        try {
            const payload = { 
                mensagem,
                filialOrigem: minhaFilial,
                filialDestino: filialSelecionada
            };
            
            // Adicionar reply_to_id se estiver respondendo
            if (replyToMessage) {
                payload.replyToId = replyToMessage.id;
            }
            
            const response = await apiFetch('/api/mensagens', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                const novaMensagem = await response.json();
                mensagens.push(novaMensagem);
                ultimoIdMensagem = novaMensagem.id;
                renderizarMensagens('', true); // Forçar scroll ao enviar mensagem
                chatInput.value = '';
                esconderReplyPreview(); // Esconder preview após enviar
            } else {
                const errorData = await response.json();
                console.error('Erro do servidor:', errorData);
                await showAlert(errorData.error || 'Erro ao enviar mensagem', 'Erro', 'danger');
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            await showAlert('Erro de conexão com o servidor', 'Erro', 'danger');
        }
    }
    
    chatSend.addEventListener('click', enviarMensagem);
    
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            enviarMensagem();
        }
    });
    
    // Polling (buscar novas mensagens a cada 3 segundos)
    function iniciarPolling() {
        pollingInterval = setInterval(() => {
            carregarMensagens(true);
        }, 3000);
    }
    
    function pararPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }
    
    // Buscar mensagens novas mesmo com chat fechado (a cada 10 segundos)
    setInterval(() => {
        if (!chatAberto) {
            carregarMensagens(true);
        }
    }, 10000);
    
    // ========================================
    // BUSCA DE MENSAGENS
    // ========================================
    
    const chatSearch = document.getElementById('chat-search');
    const chatSearchClear = document.getElementById('chat-search-clear');
    
    chatSearch.addEventListener('input', (e) => {
        const termo = e.target.value;
        
        if (termo) {
            chatSearchClear.style.display = 'flex';
        } else {
            chatSearchClear.style.display = 'none';
        }
        
        renderizarMensagens(termo);
    });
    
    chatSearchClear.addEventListener('click', () => {
        chatSearch.value = '';
        chatSearchClear.style.display = 'none';
        renderizarMensagens('');
    });
    
    // ========================================
    // REPLY PREVIEW
    // ========================================
    
    const chatReplyPreviewClose = document.getElementById('chat-reply-preview-close');
    
    chatReplyPreviewClose.addEventListener('click', () => {
        esconderReplyPreview();
    });
    
    // ========================================
    // EMOJI PICKER NO INPUT
    // ========================================
    
    const chatEmojiBtn = document.getElementById('chat-emoji-btn');
    const chatEmojiPicker = document.getElementById('chat-emoji-picker');
    const chatEmojiGrid = document.getElementById('chat-emoji-grid');
    
    // Lista de emojis
    const emojis = ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾','🙈','🙉','🙊','💋','💌','💘','💝','💖','💗','💓','💞','💕','💟','❣️','💔','❤️','🧡','💛','💚','💙','💜','🤎','🖤','🤍','💯','💢','💥','💫','💦','💨','🕳️','💣','💬','🗨️','🗯️','💭','💤','👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','✔️','❌','🚨','⚠️','🔥','⭐','✨','🎉','🎊','🎁','🏆','🎯','📌','📍','🔔','🔕','📢','📣','💼','📁','📂','📄','📃','📋','📊','📈','📉','🗂️','📅','📆','📇','🗃️','🗄️','📦','📪','📫','📬','📭','📮','✉️','📧','📨','📩','💌','📤','📥'];
    
    // Popular emoji picker
    chatEmojiGrid.innerHTML = emojis.map(emoji => 
        `<span class="chat-emoji-picker-item">${emoji}</span>`
    ).join('');
    
    // Abrir/fechar emoji picker
    chatEmojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = chatEmojiPicker.style.display === 'block';
        chatEmojiPicker.style.display = isVisible ? 'none' : 'block';
    });
    
    // Inserir emoji no input ao clicar
    chatEmojiGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('chat-emoji-picker-item')) {
            const emoji = e.target.textContent;
            const cursorPos = chatInput.selectionStart;
            const textBefore = chatInput.value.substring(0, cursorPos);
            const textAfter = chatInput.value.substring(cursorPos);
            
            chatInput.value = textBefore + emoji + textAfter;
            chatInput.focus();
            
            // Posicionar cursor após o emoji
            const newPos = cursorPos + emoji.length;
            chatInput.setSelectionRange(newPos, newPos);
            
            // Fechar picker
            chatEmojiPicker.style.display = 'none';
        }
    });
    
    // Fechar picker ao clicar fora
    document.addEventListener('click', (e) => {
        if (!chatEmojiBtn.contains(e.target) && !chatEmojiPicker.contains(e.target)) {
            chatEmojiPicker.style.display = 'none';
        }
    });

    // --- Sistema de Atualização Automática ---
    let quantidadeAnterior = 0;
    
    async function verificarNovasTransferencias() {
        try {
            const response = await apiFetch('/api/transferencias');
            if (response.ok) {
                const novasTransferencias = await response.json();
                
                // Verificar se há novas transferências
                if (quantidadeAnterior > 0 && novasTransferencias.length > quantidadeAnterior) {
                    const diferenca = novasTransferencias.length - quantidadeAnterior;
                    mostrarNotificacao(`${diferenca} nova(s) transferência(s)!`, 'Nova transferência criada', 'info');
                    
                    // Atualizar dados
                    transferencias = novasTransferencias;
                    updateDashboard();
                }
                
                quantidadeAnterior = novasTransferencias.length;
            }
        } catch (error) {
            console.error('Erro ao verificar novas transferências:', error);
        }
    }
    
    function mostrarNotificacao(mensagem, titulo = 'Notificação', tipo = 'info') {
        // Criar elemento de notificação
        const notificacao = document.createElement('div');
        notificacao.className = `notificacao notificacao-${tipo}`;
        notificacao.innerHTML = `
            <div class="notificacao-content">
                <strong>${titulo}</strong>
                <p>${mensagem}</p>
            </div>
        `;
        
        document.body.appendChild(notificacao);
        
        // Mostrar notificação com animação
        setTimeout(() => notificacao.classList.add('show'), 100);
        
        // Remover após 5 segundos
        setTimeout(() => {
            notificacao.classList.remove('show');
            setTimeout(() => notificacao.remove(), 300);
        }, 5000);
    }
    
    // Iniciar polling a cada 30 segundos
    setInterval(verificarNovasTransferencias, 30000);

    // --- Inicialização ---
    adicionarItem();
    carregarTags();
    carregarFiliais();
    carregarTransferencias().then(() => {
        quantidadeAnterior = transferencias.length;
    });
    showView('dashboard');
    lucide.createIcons(); // Renderiza todos os ícones iniciais
});
