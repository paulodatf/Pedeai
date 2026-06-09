// ============================================================
// PAINEL ADMIN - GERENCIAR ANÚNCIOS (FIRESTORE)
// ============================================================

import { db } from './config.js';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ========== TOAST ==========
function mostrarToast(mensagem, tipo = 'info') {
    const toastExistente = document.querySelector('.toast-message');
    if (toastExistente) toastExistente.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: ${tipo === 'erro' ? '#ea1d2c' : '#28a745'};
        color: white;
        padding: 12px 24px;
        border-radius: 30px;
        font-weight: 600;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 80%;
        text-align: center;
        font-family: 'Inter', sans-serif;
        backdrop-filter: blur(8px);
        transition: opacity 0.3s ease;
    `;
    toast.innerText = mensagem;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== CARREGAR ANÚNCIOS DO FIRESTORE ==========
let numeroGlobalAnuncios = "";

async function carregarAdmin() {
    const container = document.getElementById('listaAdmin');

    try {
        // Carregar número global do Firestore
        const configSnap = await getDoc(doc(db, "configuracoes", "anuncios"));
        if (configSnap.exists() && configSnap.data().whatsappGlobal) {
            numeroGlobalAnuncios = configSnap.data().whatsappGlobal;
            document.getElementById('inputNumeroGlobal').value = numeroGlobalAnuncios;
        }

        const q = query(collection(db, "anuncios"), where("status", "!=", "vendido_historico"));
        const querySnapshot = await getDocs(q);

        const anuncios = [];
        querySnapshot.forEach((docSnap) => {
            const dados = docSnap.data();
            const id = docSnap.id;
            anuncios.push({ id, ...dados });
        });

        if (anuncios.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">Nenhum anúncio cadastrado.</p>';
            return;
        }

        container.innerHTML = anuncios.map(a => {
            if (!a.status) a.status = 'pendente';
            if (a.denuncias === undefined) a.denuncias = 0;

            const badgeClass = `badge-${a.status}`;
            const telefoneExibicao = numeroGlobalAnuncios || a.whatsapp || 'Não informado';
            const foneLimpo = numeroGlobalAnuncios ? numeroGlobalAnuncios.replace(/\D/g, '') : (a.whatsapp ? a.whatsapp.replace(/\D/g, '') : "");
            const labelContato = numeroGlobalAnuncios ? '(Oficial)' : '(Vendedor)';
            const precoExibicao = typeof a.preco === 'number'
                ? a.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                : (a.preco ? `R$ ${a.preco}` : 'Não informado');
            const precoRaw = (a.preco !== undefined && a.preco !== null && !isNaN(a.preco)) ? Number(a.preco) : 0;

            return `
                <div class="card-admin">
                    ${a.foto ? `<img src="${cloudThumb(a.foto)}" class="foto-admin">` : `<div class="foto-admin" style="background:#eee; display:flex; align-items:center; justify-content:center;"><i class="fas fa-image"></i></div>`}
                    <div class="info-admin">
                        <div class="titulo-admin">${escapeHtml(a.titulo)}</div>
                        <div>ID: <strong>${a.id}</strong> | Cat: ${a.categoria}</div>
                        <div style="background: #eef6ff; padding: 5px; border-radius: 4px; margin: 5px 0; border: 1px solid #cce5ff;">
                            <i class="fab fa-whatsapp"></i> <strong>Contato ${labelContato}:</strong> ${telefoneExibicao}
                        </div>
                        <div>Status: <span class="badge ${badgeClass}">${a.status}</span></div>
                        <div style="color: ${a.denuncias > 0 ? 'red' : '#666'}">Denúncias: ${a.denuncias}</div>
                        <div>Valor: <strong id="preco-${a.id}">${precoExibicao}</strong></div>
                        
                        <div class="acoes">
                            <button onclick="window.alterarStatus('${a.id}', 'aprovado')" class="btn btn-aprovar">Aprovar</button>
                            <button onclick="window.alterarStatus('${a.id}', 'rejeitado')" class="btn btn-rejeitar">Rejeitar</button>
                            <button onclick="window.abrirModalEditarValor('${a.id}', ${precoRaw})" class="btn" style="background:#0077ff; color:white; grid-column:1/-1;">💰 Editar Valor</button>
                            <button onclick="window.excluirAnuncio('${a.id}')" class="btn btn-excluir">Excluir Permanente</button>
                            <a href="https://wa.me/55${foneLimpo}" target="_blank" class="btn btn-whats">Falar no WhatsApp</a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao carregar anúncios:', error);
        mostrarToast('Erro ao carregar anúncios', 'erro');
        container.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">Falha no carregamento.</p>';
    }
}

// ========== ESCAPAR HTML ==========
function cloudThumb(url) {
    if (!url || !url.includes('res.cloudinary.com')) return url;
    return url.replace('/upload/', '/upload/w_140,h_140,c_fill,q_auto,f_auto/');
}
function escapeHtml(texto) {
    if (!texto) return '';
    return texto.replace(/[&<>]/g, (m) => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== ALTERAR STATUS ==========
async function alterarStatus(id, novoStatus) {
    try {
        const docRef = doc(db, "anuncios", id);
        await updateDoc(docRef, { status: novoStatus });
        mostrarToast(`Status alterado para ${novoStatus}`, 'info');
        const cards = document.querySelectorAll('.card-admin');
        cards.forEach(card => {
            if (card.innerHTML.includes(`'${id}'`)) {
                const badge = card.querySelector('.badge');
                if (badge) {
                    badge.className = `badge badge-${novoStatus}`;
                    badge.textContent = novoStatus;
                }
            }
        });
    } catch (error) {
        console.error('Erro ao alterar status:', error);
        mostrarToast('Erro ao alterar status', 'erro');
    }
}

// ========== EXCLUIR ANÚNCIO ==========
async function excluirAnuncio(id) {
    if (confirm('Tem certeza que deseja excluir permanentemente este anúncio?')) {
        try {
            await deleteDoc(doc(db, "anuncios", id));
            mostrarToast('Anúncio excluído com sucesso', 'info');
            const cards = document.querySelectorAll('.card-admin');
            cards.forEach(card => {
                if (card.innerHTML.includes(`'${id}'`)) card.remove();
            });
        } catch (error) {
            console.error('Erro ao excluir:', error);
            mostrarToast('Erro ao excluir anúncio', 'erro');
        }
    }
}

// ========== EDITAR VALOR DO ANÚNCIO ==========
let _editarId = null;

function abrirModalEditarValor(id, precoAtual) {
    _editarId = id;
    const input = document.getElementById('inputNovoValor');
    if (input) input.value = (precoAtual !== null && precoAtual !== undefined && !isNaN(precoAtual)) ? precoAtual : '';
    document.getElementById('modalEditarValor').classList.add('ativo');
}

function fecharModalEditarValor() {
    _editarId = null;
    const input = document.getElementById('inputNovoValor');
    if (input) input.value = '';
    document.getElementById('modalEditarValor').classList.remove('ativo');
}

async function confirmarEdicaoValor() {
    const input = document.getElementById('inputNovoValor');
    const novoValor = parseFloat(input.value);

    if (isNaN(novoValor) || novoValor < 0) {
        mostrarToast('Informe um valor válido.', 'erro');
        return;
    }

    try {
        await updateDoc(doc(db, "anuncios", _editarId), { preco: novoValor });

        // Invalida o cache do classifieds para refletir o novo valor
        sessionStorage.removeItem('todosAnunciosCache');

        // Atualiza o span do preço no card sem recarregar a página
        const spanPreco = document.getElementById(`preco-${_editarId}`);
        if (spanPreco) {
            spanPreco.textContent = novoValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        mostrarToast('Valor atualizado com sucesso!', 'info');
        fecharModalEditarValor();
    } catch (error) {
        console.error('Erro ao atualizar valor:', error);
        mostrarToast('Erro ao atualizar valor.', 'erro');
    }
}

// ========== SALVAR NÚMERO GLOBAL ==========
async function salvarNumeroGlobal() {
    const inputNumero = document.getElementById('inputNumeroGlobal').value.trim();
    try {
        await setDoc(doc(db, "configuracoes", "anuncios"), { whatsappGlobal: inputNumero }, { merge: true });
        mostrarToast('Número global salvo com sucesso!', 'info');
    } catch (error) {
        console.error('Erro ao salvar número global:', error);
        mostrarToast('Erro ao salvar número', 'erro');
    }
}

// ========== EXPOR FUNÇÕES GLOBAIS ==========
window.alterarStatus = alterarStatus;
window.excluirAnuncio = excluirAnuncio;
window.carregarAdmin = carregarAdmin;
window.salvarNumeroGlobal = salvarNumeroGlobal;
window.abrirModalEditarValor = abrirModalEditarValor;
window.fecharModalEditarValor = fecharModalEditarValor;
window.confirmarEdicaoValor = confirmarEdicaoValor;

// ========== CARREGAR E GERENCIAR DENÚNCIAS ==========
async function carregarDenuncias() {
    const container = document.getElementById('listaDenuncias');
    if (!container) return;

    try {
        const q = query(collection(db, "denuncias_anuncios"), where("statusDenuncia", "==", "pendente"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            container.innerHTML = '<p style="text-align:center; color:#666; padding: 20px;">Nenhuma denúncia pendente.</p>';
            return;
        }

        let html = '';
        querySnapshot.forEach((docSnap) => {
            const d = docSnap.data();
            const idDenuncia = docSnap.id;
            const dataFormatada = d.dataDenuncia && d.dataDenuncia.toDate ? d.dataDenuncia.toDate().toLocaleString('pt-BR') : 'Data Indisponível';

            html += `
                <div class="card-admin" style="border-left: 4px solid #ea1d2c;">
                    <div class="info-admin">
                        <div class="titulo-admin" style="color: #ea1d2c;"><i class="fas fa-exclamation-triangle"></i> ${escapeHtml(d.nomeAnuncio)}</div>
                        <div style="margin: 5px 0;"><strong>Motivo:</strong> ${escapeHtml(d.motivoDenuncia)}</div>
                        <div style="font-size:11px; color:#666;">Data: ${dataFormatada}</div>
                        
                        <div class="acoes" style="grid-template-columns: 1fr 1fr 1fr;">
                            <a href="detalhe-anuncio.html?id=${d.idAnuncio}" target="_blank" class="btn" style="background:#0077ff; color:white;">Ver Anúncio</a>
                            <button onclick="window.excluirAnuncioDenunciado('${d.idAnuncio}', '${idDenuncia}')" class="btn btn-excluir" style="margin-top:0; background:#dc3545;">Excluir</button>
                            <button onclick="window.ignorarDenuncia('${idDenuncia}')" class="btn" style="background:#6c757d; color:white;">Ignorar</button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar denúncias:', error);
        container.innerHTML = '<p style="text-align:center; color:red;">Erro ao carregar denúncias.</p>';
    }
}

async function excluirAnuncioDenunciado(idAnuncio, idDenuncia) {
    if (confirm('Deseja realmente excluir este anúncio e marcar a denúncia como resolvida?')) {
        try {
            await deleteDoc(doc(db, "anuncios", idAnuncio));
            await updateDoc(doc(db, "denuncias_anuncios", idDenuncia), { statusDenuncia: "resolvida" });
            mostrarToast('Anúncio excluído e denúncia resolvida!', 'info');
            carregarAdmin();
            carregarDenuncias();
        } catch (error) {
            console.error('Erro ao processar exclusão por denúncia:', error);
            mostrarToast('Erro ao processar ação.', 'erro');
        }
    }
}

async function ignorarDenuncia(idDenuncia) {
    try {
        await updateDoc(doc(db, "denuncias_anuncios", idDenuncia), { statusDenuncia: "ignorada" });
        mostrarToast('Denúncia ignorada com sucesso.', 'info');
        carregarDenuncias();
    } catch (error) {
        console.error('Erro ao ignorar denúncia:', error);
        mostrarToast('Erro ao atualizar denúncia.', 'erro');
    }
}

window.excluirAnuncioDenunciado = excluirAnuncioDenunciado;
window.ignorarDenuncia = ignorarDenuncia;

// ========== CENTRAL DE INTERMEDIAÇÃO ==========
async function carregarIntermediacao() {
    const container = document.getElementById('listaIntermediacao');
    if (!container) return;

    try {
        const q = query(collection(db, "interessadosAnuncios"), orderBy("dataInteresse", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            container.innerHTML = '<p style="text-align:center; color:#666; padding: 20px;">Nenhum interesse registrado.</p>';
            return;
        }

        let html = '';
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const idInteresse = docSnap.id;
            const dataFormatada = data.dataInteresse && data.dataInteresse.toDate ? data.dataInteresse.toDate().toLocaleString('pt-BR') : 'Data Indisponível';

            html += `
                <div class="card-admin" style="border-left: 4px solid #0077ff; flex-direction: column;">
                    <div class="info-admin" style="width: 100%;">
                        <div class="titulo-admin" style="color: #0077ff;"><i class="fas fa-handshake"></i> ${escapeHtml(data.nomeAnuncio)}</div>
                        <div style="margin: 3px 0;"><strong>Anunciante:</strong> ${escapeHtml(data.nomeAnunciante)}</div>
                        <div style="margin: 3px 0;">
    <strong>Telefone:</strong> ${escapeHtml(data.telefoneAnunciante)}
    ${data.telefoneAnunciante && data.telefoneAnunciante !== 'Não informado' ? 
        `<a href="https://wa.me/55${data.telefoneAnunciante.replace(/\D/g, '')}" target="_blank" class="btn" style="background:#25d366; color:white; margin-left:8px; padding:4px 8px; font-size:11px; text-decoration:none; border-radius:5px;">
            <i class="fab fa-whatsapp"></i> Falar
        </a>` : ''}
</div>
                        <div style="margin: 3px 0;"><strong>Data:</strong> ${dataFormatada}</div>
                        <div style="margin: 5px 0;"><strong>Status Atual:</strong> <span class="badge" style="background:#e0e0e0; color:#333;">${data.status}</span></div>
                        
                        <div class="acoes" style="grid-template-columns: 1fr 1fr 1fr 1fr; gap: 4px; margin-top: 10px;">
                            <button onclick="window.atualizarStatusIntermediacao('${idInteresse}', '${data.idAnuncio}', 'novo')" class="btn" style="background:#007bff; color:white; font-size:10px; padding:5px;">Novo</button>
                            <button onclick="window.atualizarStatusIntermediacao('${idInteresse}', '${data.idAnuncio}', 'Em negociação')" class="btn" style="background:#ffc107; color:black; font-size:10px; padding:5px;">Negociar</button>
                            <button onclick="window.atualizarStatusIntermediacao('${idInteresse}', '${data.idAnuncio}', 'Vendido')" class="btn" style="background:#28a745; color:white; font-size:10px; padding:5px;">Vendido</button>
                            <button onclick="window.atualizarStatusIntermediacao('${idInteresse}', '${data.idAnuncio}', 'Cancelado')" class="btn" style="background:#dc3545; color:white; font-size:10px; padding:5px;">Cancelado</button>
                        </div>
                        ${(data.status === 'Vendido' || data.status === 'Cancelado') ? `
                        <div style="margin-top: 8px;">
                            <button onclick="window.excluirIntermediacao('${idInteresse}', '${escapeHtml(data.nomeAnuncio)}')" class="btn" style="background:#6c757d; color:white; font-size:10px; padding:5px; width:100%;">🗑️ Excluir Registro</button>
                        </div>` : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar intermediação:', error);
        container.innerHTML = '<p style="text-align:center; color:red;">Erro ao carregar central de intermediação.</p>';
    }
}

async function atualizarStatusIntermediacao(idInteresse, idAnuncio, novoStatus) {
    try {
        await updateDoc(doc(db, "interessadosAnuncios", idInteresse), { status: novoStatus });
        
        if (novoStatus === 'Vendido') {
            await updateDoc(doc(db, "anuncios", idAnuncio), { status: 'vendido_historico' });
            mostrarToast('Intermediação concluída! Anúncio removido da vitrine.', 'info');
        } else {
            mostrarToast(`Status alterado para ${novoStatus}`, 'info');
        }
        
        carregarIntermediacao();
    } catch (error) {
        console.error('Erro ao atualizar intermediação:', error);
        mostrarToast('Erro ao atualizar status.', 'erro');
    }
}

async function excluirIntermediacao(idInteresse, nomeAnuncio) {
    if (confirm(`Excluir o registro "${nomeAnuncio}"?\n\nEsta ação não pode ser desfeita.`)) {
        try {
            await deleteDoc(doc(db, "interessadosAnuncios", idInteresse));
            mostrarToast('Registro excluído com sucesso.', 'info');
            carregarIntermediacao();
        } catch (error) {
            console.error('Erro ao excluir registro:', error);
            mostrarToast('Erro ao excluir registro.', 'erro');
        }
    }
}

window.excluirIntermediacao = excluirIntermediacao;
window.atualizarStatusIntermediacao = atualizarStatusIntermediacao;
window.carregarIntermediacao = carregarIntermediacao;

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
    carregarAdmin();
    carregarDenuncias();
    carregarIntermediacao();
});