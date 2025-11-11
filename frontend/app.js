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

document.addEventListener('DOMContentLoaded', async function() {
    // --- Verificar Autenticação ---
    const token = localStorage.getItem('stoklink_token');
    let usuario = JSON.parse(localStorage.getItem('stoklink_user') || '{}');
    
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
                localStorage.setItem('stoklink_user', JSON.stringify(usuario));
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
    let transferenciasCarregadas = false;
    let nextId = 1;
    let previousView = 'dashboard';
    let globalTags = ['Urgente', 'Retirar no local', 'Frágil', 'Cliente VIP'];
    let currentTransferTags = [];
    let editandoRascunhoId = null; // ID do rascunho sendo editado
    let transferenciaEmDetalhe = null;
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
            const dataFormatada = formatarData(t.data_criacao);
            
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
        document.getElementById('detalhe-id').textContent = t.id;
        document.getElementById('detalhe-status-tag').innerHTML = `<span class="status-tag ${statusInfo.className}">${statusInfo.text}</span>`;
        document.getElementById('detalhe-origem').textContent = t.origem;
        document.getElementById('detalhe-destino').textContent = t.destino;
        document.getElementById('detalhe-solicitante').textContent = t.solicitante;
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
        itemRow.innerHTML = `
            <div class="form-group">
                <input type="text" class="item-codigo" required placeholder="Código do produto">
            </div>
            <div class="form-group">
                <input type="number" class="item-quantidade" required min="1" placeholder="Ex: 10">
            </div>
            <button type="button" class="btn-remover-item" aria-label="Remover item">
                <i data-lucide="trash-2"></i>
            </button>
        `;
        
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
        const selectOrigem = document.getElementById('origem');
        const selectDestino = document.getElementById('destino');
        
        // Se tem ID de filial, usar ID, senão buscar pelo nome
        if (t.filial_origem_id) {
            selectOrigem.value = t.filial_origem_id;
        } else {
            // Buscar ID pelo nome (compatibilidade com dados antigos)
            const optionOrigem = Array.from(selectOrigem.options).find(opt => opt.text === t.origem);
            if (optionOrigem) selectOrigem.value = optionOrigem.value;
        }
        
        if (t.filial_destino_id) {
            selectDestino.value = t.filial_destino_id;
        } else {
            // Buscar ID pelo nome (compatibilidade com dados antigos)
            const optionDestino = Array.from(selectDestino.options).find(opt => opt.text === t.destino);
            if (optionDestino) selectDestino.value = optionDestino.value;
        }
        
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
                    <input type="text" class="item-codigo" required placeholder="Código do produto" value="${item.codigo}">
                </div>
                <div class="form-group">
                    <input type="number" class="item-quantidade" required min="1" placeholder="Ex: 10" value="${item.solicitada}">
                </div>
                <button type="button" class="btn-remover-item" aria-label="Remover item">
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
                form.reset(); 
                itensContainer.innerHTML = ''; 
                currentTransferTags = []; 
                renderFormTags(); 
                adicionarItem();
                
                const mensagem = editandoRascunhoId ? 'Rascunho atualizado com sucesso!' : 'Transferência salva com sucesso!';
                hideLoading();
                await showAlert(mensagem, 'Sucesso', 'success');
                
                editandoRascunhoId = null;
                
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
    navButtons.dashboard.addEventListener('click', () => showView('dashboard'));
    navButtons.cadastro.addEventListener('click', () => showView('cadastro'));
    navButtons.visualizacao.addEventListener('click', () => { 
        showView('visualizacao'); 
        aplicarFiltros();
    });
    btnVoltarLista.addEventListener('click', () => { 
        showView(previousView); 
    });
    btnAddItem.addEventListener('click', adicionarItem);
    
    // Importar XLSX
    const btnImportarXlsx = document.getElementById('btn-importar-xlsx');
    const fileInputXlsx = document.getElementById('file-input-xlsx');
    
    btnImportarXlsx.addEventListener('click', () => {
        fileInputXlsx.click();
    });
    
    fileInputXlsx.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Ler todos os dados como array (sem usar primeira linha como cabeçalho)
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Encontrar a linha do cabeçalho (que contém "Produto" e "Quantidade_Sugerida")
            let headerRowIndex = -1;
            let produtoColIndex = -1;
            let quantidadeSugeridaColIndex = -1;
            
            for (let i = 0; i < rawData.length; i++) {
                const row = rawData[i];
                for (let j = 0; j < row.length; j++) {
                    const cell = String(row[j] || '').trim().toLowerCase();
                    const normalized = cell.replace(/\s+/g, '').replace(/_/g, '');
                    
                    if (normalized === 'produto') {
                        headerRowIndex = i;
                        produtoColIndex = j;
                    }
                    if (normalized === 'quantidadesugerida') {
                        quantidadeSugeridaColIndex = j;
                    }
                }
                if (headerRowIndex >= 0 && produtoColIndex >= 0 && quantidadeSugeridaColIndex >= 0) {
                    break;
                }
            }
            
            console.log('=== DEBUG IMPORTAÇÃO XLSX ===');
            console.log('Linha do cabeçalho:', headerRowIndex);
            console.log('Coluna Produto:', produtoColIndex);
            console.log('Coluna Quantidade_Sugerida:', quantidadeSugeridaColIndex);
            
            if (headerRowIndex < 0 || produtoColIndex < 0 || quantidadeSugeridaColIndex < 0) {
                await showAlert('Não foi possível encontrar as colunas "Produto" e "Quantidade_Sugerida" na planilha.', 'Erro', 'danger');
                fileInputXlsx.value = '';
                return;
            }
            
            // Converter para JSON usando o cabeçalho correto
            const jsonData = [];
            for (let i = headerRowIndex + 1; i < rawData.length; i++) {
                const row = rawData[i];
                if (row && row.length > 0) {
                    jsonData.push({
                        produto: row[produtoColIndex],
                        quantidadeSugerida: row[quantidadeSugeridaColIndex]
                    });
                }
            }
            
            // Limpar itens existentes
            itensContainer.innerHTML = '';
            
            // Processar cada linha da planilha
            let itensImportados = 0;
            
            console.log('Total de linhas a processar:', jsonData.length);
            
            for (const row of jsonData) {
                const produto = row.produto ? String(row.produto).trim() : null;
                const quantidadeSugerida = row.quantidadeSugerida ? Number(row.quantidadeSugerida) : 0;
                
                console.log('Processando linha:', { produto, quantidadeSugerida });
                
                if (produto && quantidadeSugerida > 0) {
                    const itemRow = document.createElement('div');
                    itemRow.className = 'item-row';
                    itemRow.innerHTML = `
                        <div class="form-group">
                            <input type="text" class="item-codigo" required placeholder="Código do produto" value="${produto}">
                        </div>
                        <div class="form-group">
                            <input type="number" class="item-quantidade" required min="1" placeholder="Ex: 10" value="${quantidadeSugerida}">
                        </div>
                        <button type="button" class="btn-remover-item" aria-label="Remover item">
                            <i data-lucide="trash-2"></i>
                        </button>
                    `;
                    itensContainer.appendChild(itemRow);
                    
                    itemRow.querySelector('.btn-remover-item').addEventListener('click', () => {
                        itemRow.remove();
                    });
                    
                    itensImportados++;
                }
            }
            
            console.log('Total de itens importados:', itensImportados);
            console.log('=== FIM DEBUG ===');
            
            lucide.createIcons();
            
            if (itensImportados > 0) {
                await showAlert(`${itensImportados} itens importados com sucesso!`, 'Sucesso', 'success');
            } else {
                await showAlert('Nenhum item válido encontrado na planilha. Verifique as colunas "Produto" e "Quantidade_Sugerida".', 'Aviso', 'warning');
            }
            
        } catch (error) {
            console.error('Erro ao ler arquivo:', error);
            await showAlert('Erro ao processar arquivo XLSX. Verifique o formato.', 'Erro', 'danger');
        }
        
        // Limpar input
        fileInputXlsx.value = '';
    });
    
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
    async function carregarTransferencias(mostrarLoading = false) {
        try {
            if (mostrarLoading) {
                showLoading('Atualizando transferências...');
            }
            const response = await apiFetch('/api/transferencias');
            
            if (response.ok) {
                transferencias = await response.json();
                transferenciasCarregadas = true;
                
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
        const produtoDigitado = filtroProduto.value.toLowerCase().trim();
        const apenasMinhaFilial = filtroMinhaFilial && filtroMinhaFilial.checked && minhaFilialNome;

        const filtrados = transferencias.filter(t => {
            const origemLower = (t.origem || '').toLowerCase();
            const destinoLower = (t.destino || '').toLowerCase();

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
            
            // Filtro por código de produto
            if (produtoDigitado && (!t.itens || !t.itens.some(item => 
                item.codigo.toLowerCase().includes(produtoDigitado)))) {
                return false;
            }
            
            return true;
        });
        
        // Renderizar resultados filtrados
        renderTransferListFiltrada(filtrados.length > 0 ? filtrados : []);
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
            const dataFormatada = formatarData(t.data_criacao);
            
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
    if (filtroMinhaFilial) {
        filtroMinhaFilial.addEventListener('change', aplicarFiltros);
    }
    filtroProduto.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') aplicarFiltros();
    });
    if (btnAtualizarTransferencias) {
        btnAtualizarTransferencias.addEventListener('click', () => carregarTransferencias(true));
    }
    
    // Popular filtros quando tags e filiais carregarem
    const popularFiltrosTimeout = setInterval(() => {
        if (globalTags.length > 0 && document.getElementById('origem').options.length > 1) {
            popularFiltros();
            clearInterval(popularFiltrosTimeout);
        }
    }, 500);
});
    
