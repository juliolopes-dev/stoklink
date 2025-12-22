// =============================================
// ESPELHO DA NOTA FISCAL
// Visualização completa dos dados da NF
// =============================================

let recebimentoEspelho = null;

// Abrir modal do espelho da NF
window.abrirEspelhoNF = function(recebimentoId) {
    // Buscar recebimento no array global do app.js
    let rec = null;
    
    // Tentar pegar da variável global se não foi passado ID
    if (!recebimentoId) {
        if (typeof window.recebimentoDetalheAtual !== 'undefined' && window.recebimentoDetalheAtual) {
            recebimentoId = window.recebimentoDetalheAtual;
        } else if (typeof recebimentoIdAtual !== 'undefined') {
            recebimentoId = recebimentoIdAtual;
        }
    }
    
    // Buscar no array de recebimentos (usar window.recebimentos)
    if (typeof window.recebimentos !== 'undefined' && window.recebimentos && recebimentoId) {
        rec = window.recebimentos.find(r => r.id === recebimentoId);
    }
    
    if (!rec) {
        console.error('Recebimento não encontrado. ID:', recebimentoId);
        alert('Erro: Recebimento não encontrado. Tente voltar para a lista e abrir novamente.');
        return;
    }
    
    recebimentoEspelho = rec;
    gerarEspelhoNF(rec);
    document.getElementById('espelho-nf-modal').classList.add('show');
    
    // Atualizar ícones Lucide
    if (typeof lucideCreateIconsDebounced !== 'undefined') {
        lucideCreateIconsDebounced();
    } else if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
};

// Fechar modal
window.fecharEspelhoNF = function() {
    document.getElementById('espelho-nf-modal').classList.remove('show');
    recebimentoEspelho = null;
};

// Gerar HTML do espelho
function gerarEspelhoNF(rec) {
    const content = document.getElementById('espelho-nf-content');
    
    const formatData = (data) => {
        if (!data) return '-';
        return new Date(data).toLocaleString('pt-BR');
    };
    
    const formatDataSimples = (data) => {
        if (!data) return '-';
        return new Date(data).toLocaleDateString('pt-BR');
    };
    
    let html = `
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 24px;">ESPELHO DA NOTA FISCAL</h2>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Recebimento: ${rec.codigo}</p>
        </div>
        
        <!-- EMITENTE -->
        <div style="border: 1px solid #000; padding: 10px; margin-bottom: 15px;">
            <div style="background: #000; color: #fff; padding: 5px; margin: -10px -10px 10px -10px; font-weight: bold;">
                EMITENTE (FORNECEDOR)
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div><strong>Nome:</strong> ${rec.fornecedor_nome || 'Não informado'}</div>
            </div>
        </div>
        
        <!-- DESTINATÁRIO -->
        <div style="border: 1px solid #000; padding: 10px; margin-bottom: 15px;">
            <div style="background: #000; color: #fff; padding: 5px; margin: -10px -10px 10px -10px; font-weight: bold;">
                DESTINATÁRIO
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div><strong>Filial de Chegada:</strong> ${rec.filial_chegada_nome || '-'}</div>
                <div><strong>Filial de Destino:</strong> ${rec.filial_destino_nome || 'Mesma de chegada'}</div>
            </div>
        </div>
        
        <!-- DADOS DA NOTA FISCAL -->
        <div style="border: 1px solid #000; padding: 10px; margin-bottom: 15px;">
            <div style="background: #000; color: #fff; padding: 5px; margin: -10px -10px 10px -10px; font-weight: bold;">
                DADOS DA NOTA FISCAL
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div><strong>Número NF:</strong> ${rec.numero_nota_fiscal || '-'}</div>
                <div><strong>Data Emissão:</strong> ${formatDataSimples(rec.data_emissao)}</div>
                <div><strong>Volumes:</strong> ${rec.volumes || '-'}</div>
                <div><strong>Peso Total:</strong> ${rec.peso_total ? rec.peso_total + ' kg' : '-'}</div>
                <div><strong>Urgente:</strong> ${rec.urgente ? 'SIM - Distribuição Imediata' : 'Não'}</div>
                <div><strong>Lançado por:</strong> ${rec.usuario_cadastro_nome || 'Sistema'}</div>
            </div>
        </div>
        
        <!-- TRANSPORTE -->
        <div style="border: 1px solid #000; padding: 10px; margin-bottom: 15px;">
            <div style="background: #000; color: #fff; padding: 5px; margin: -10px -10px 10px -10px; font-weight: bold;">
                DADOS DO TRANSPORTE
            </div>
            <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                <div><strong>Transportadora:</strong> ${rec.transportadora_nome || 'Não informado'}</div>
            </div>
        </div>
    `;
    
    // RECEBIMENTO (se já foi recebido)
    if (rec.status !== 'aguardando') {
        const volumesDivergencia = rec.divergencia_volumes && rec.volumes_divergencia ? 
            `<div style="color: #e74c3c;"><strong>Divergência:</strong> ${rec.volumes_divergencia > 0 ? '+' : ''}${rec.volumes_divergencia} volumes (${rec.volumes_divergencia < 0 ? 'Faltando' : 'Sobrando'})</div>` : '';
        
        html += `
        <div style="border: 1px solid #000; padding: 10px; margin-bottom: 15px;">
            <div style="background: #000; color: #fff; padding: 5px; margin: -10px -10px 10px -10px; font-weight: bold;">
                DADOS DO RECEBIMENTO
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div><strong>Chegou em:</strong> ${rec.filial_recebimento_nome || rec.filial_chegada_nome || '-'}</div>
                <div><strong>Data/Hora:</strong> ${formatData(rec.data_chegada)}</div>
                <div><strong>Volumes Recebidos:</strong> ${rec.volumes_recebidos || '-'}</div>
                <div><strong>Recebido por:</strong> ${rec.usuario_recebimento_nome || '-'}</div>
                ${volumesDivergencia}
            </div>
            ${rec.observacao_recebimento ? `<div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-left: 3px solid #007bff;"><strong>Observações:</strong> ${rec.observacao_recebimento}</div>` : ''}
        </div>
        `;
    }
    
    // CONFERÊNCIA (se já foi conferido)
    if (rec.status === 'conferido' || rec.status === 'finalizado') {
        let divergenciasProdutos = '';
        if (rec.divergencia_produtos && rec.divergencias && rec.divergencias.length > 0) {
            const faltando = rec.divergencias.filter(d => d.tipo === 'faltando');
            const sobrando = rec.divergencias.filter(d => d.tipo === 'sobrando');
            
            divergenciasProdutos = '<div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-left: 3px solid #856404;">';
            if (faltando.length > 0) {
                divergenciasProdutos += '<div><strong>Produtos Faltando:</strong><ul style="margin: 5px 0 0 20px;">';
                faltando.forEach(f => {
                    divergenciasProdutos += `<li>${f.codigo_referencia} - Qtd: ${f.quantidade}</li>`;
                });
                divergenciasProdutos += '</ul></div>';
            }
            if (sobrando.length > 0) {
                divergenciasProdutos += '<div style="margin-top: 10px;"><strong>Produtos Sobrando:</strong><ul style="margin: 5px 0 0 20px;">';
                sobrando.forEach(s => {
                    divergenciasProdutos += `<li>${s.codigo_referencia} - Qtd: ${s.quantidade}</li>`;
                });
                divergenciasProdutos += '</ul></div>';
            }
            divergenciasProdutos += '</div>';
        }
        
        html += `
        <div style="border: 1px solid #000; padding: 10px; margin-bottom: 15px;">
            <div style="background: #000; color: #fff; padding: 5px; margin: -10px -10px 10px -10px; font-weight: bold;">
                CONFERÊNCIA DE PRODUTOS
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div><strong>Data/Hora:</strong> ${formatData(rec.data_conferencia)}</div>
                <div><strong>Conferido por:</strong> ${rec.usuario_conferencia_nome || '-'}</div>
                <div><strong>Divergência de Produtos:</strong> ${rec.divergencia_produtos ? 'SIM' : 'NÃO'}</div>
            </div>
            ${divergenciasProdutos}
            ${rec.observacao_conferencia ? `<div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-left: 3px solid #007bff;"><strong>Observações:</strong> ${rec.observacao_conferencia}</div>` : ''}
        </div>
        `;
    }
    
    // CONFIRMAÇÃO ORIGEM (se finalizado)
    if (rec.status === 'finalizado') {
        html += `
        <div style="border: 1px solid #000; padding: 10px; margin-bottom: 15px;">
            <div style="background: #28a745; color: #fff; padding: 5px; margin: -10px -10px 10px -10px; font-weight: bold;">
                CONFIRMAÇÃO FINAL
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div><strong>Data/Hora:</strong> ${formatData(rec.data_confirmacao_origem)}</div>
                <div><strong>Confirmado por:</strong> ${rec.usuario_confirmacao_origem_nome || '-'}</div>
                <div><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">FINALIZADO</span></div>
                <div><strong>Reserva:</strong> ${rec.reserva === 'pendente' ? '🔴 Bloqueada' : '🟢 Liberada'}</div>
            </div>
            ${rec.observacao_confirmacao_origem ? `<div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-left: 3px solid #28a745;"><strong>Observações:</strong> ${rec.observacao_confirmacao_origem}</div>` : ''}
        </div>
        `;
    }
    
    // OBSERVAÇÕES GERAIS
    if (rec.observacoes) {
        html += `
        <div style="border: 1px solid #000; padding: 10px; margin-bottom: 15px;">
            <div style="background: #6c757d; color: #fff; padding: 5px; margin: -10px -10px 10px -10px; font-weight: bold;">
                OBSERVAÇÕES GERAIS
            </div>
            <div>${rec.observacoes}</div>
        </div>
        `;
    }
    
    // RODAPÉ
    html += `
        <div style="text-align: center; border-top: 2px solid #000; padding-top: 10px; margin-top: 20px; font-size: 12px;">
            <p style="margin: 0;">Documento gerado em ${new Date().toLocaleString('pt-BR')}</p>
            <p style="margin: 5px 0 0 0;">StokLink - Sistema de Gestão de Transferências</p>
        </div>
    `;
    
    content.innerHTML = html;
}

// Imprimir espelho
window.imprimirEspelhoNF = function() {
    const conteudo = document.getElementById('espelho-nf-content').innerHTML;
    const janelaImpressao = window.open('', '', 'width=800,height=600');
    
    janelaImpressao.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Espelho da NF - ${recebimentoEspelho?.codigo || ''}</title>
            <style>
                body { 
                    font-family: 'Courier New', monospace; 
                    padding: 20px;
                    font-size: 12px;
                }
                @media print {
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            ${conteudo}
        </body>
        </html>
    `);
    
    janelaImpressao.document.close();
    janelaImpressao.focus();
    
    setTimeout(() => {
        janelaImpressao.print();
        janelaImpressao.close();
    }, 250);
};

// Copiar dados da NF
window.copiarDadosNF = async function() {
    if (!recebimentoEspelho) return;
    
    const rec = recebimentoEspelho;
    
    const texto = `
ESPELHO DA NOTA FISCAL
Recebimento: ${rec.codigo}

EMITENTE (FORNECEDOR)
Nome: ${rec.fornecedor_nome || 'Não informado'}

DESTINATÁRIO
Filial de Chegada: ${rec.filial_chegada_nome || '-'}
Filial de Destino: ${rec.filial_destino_nome || 'Mesma de chegada'}

DADOS DA NOTA FISCAL
Número NF: ${rec.numero_nota_fiscal || '-'}
Data Emissão: ${rec.data_emissao ? new Date(rec.data_emissao).toLocaleDateString('pt-BR') : '-'}
Volumes: ${rec.volumes || '-'}
Urgente: ${rec.urgente ? 'SIM' : 'Não'}

TRANSPORTE
Transportadora: ${rec.transportadora_nome || 'Não informado'}

${rec.status !== 'aguardando' ? `
RECEBIMENTO
Chegou em: ${rec.filial_recebimento_nome || rec.filial_chegada_nome || '-'}
Data/Hora: ${rec.data_chegada ? new Date(rec.data_chegada).toLocaleString('pt-BR') : '-'}
Volumes Recebidos: ${rec.volumes_recebidos || '-'}
Recebido por: ${rec.usuario_recebimento_nome || '-'}
${rec.divergencia_volumes ? `Divergência: ${rec.volumes_divergencia} volumes` : ''}
` : ''}

Gerado em: ${new Date().toLocaleString('pt-BR')}
    `.trim();
    
    try {
        await navigator.clipboard.writeText(texto);
        if (typeof showAlert !== 'undefined') {
            await showAlert('Dados copiados para a área de transferência!', 'Sucesso', 'success');
        } else {
            alert('Dados copiados para a área de transferência!');
        }
    } catch (error) {
        console.error('Erro ao copiar:', error);
        if (typeof showAlert !== 'undefined') {
            await showAlert('Erro ao copiar dados', 'Erro', 'danger');
        } else {
            alert('Erro ao copiar dados');
        }
    }
};
