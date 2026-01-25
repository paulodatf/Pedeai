import { db, GetRegrasLojista } from './config.js';
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const lojistaId = params.get('lojista') || params.get('seller');
const modo = params.get('modo') || 'produto';
const activeProductId = params.get('product');

let itemAtualConfig = null;
let lojistaInfoCache = null;
window.tamanhoSelecionadoAtual = null;

function otimizarURL(url, width = 400) {
    if (!url || typeof url !== 'string') return url || "https://via.placeholder.com/300";
    if (!url.includes('cloudinary.com')) return url;
    return url.replace(/\/upload\/(.*?)(\/v\d+\/)/, `/upload/f_auto,q_auto:eco,w_${width},c_limit$2`);
}

async function init() {
    if (!lojistaId) return;
    if (modo === 'gourmet') document.body.classList.add('gourmet-mode');
    await carregarDadosEProdutos();
}

async function carregarDadosEProdutos() {
    const mainContainer = document.getElementById('productDetail');
    try {
        const userDoc = await getDoc(doc(db, "usuarios", lojistaId));
        if (!userDoc.exists()) return;

        lojistaInfoCache = userDoc.data();
        lojistaInfoCache.id = lojistaId;

        const regras = GetRegrasLojista(lojistaInfoCache);
        if (!regras.podeExibirProdutos || regras.isBloqueado) {
            document.getElementById('nomeLojista').innerText = "";
            document.getElementById('fotoLojista').style.display = 'none';
            mainContainer.innerHTML = "";
            return;
        }

        const nome = (modo === 'gourmet' ? lojistaInfoCache.nomeLojaComida : lojistaInfoCache.nomeLojaGeral) || lojistaInfoCache.nomeLoja || "Loja";
        const foto = (modo === 'gourmet' ? lojistaInfoCache.fotoPerfilComida : lojistaInfoCache.fotoPerfilGeral) || lojistaInfoCache.fotoPerfil;
        
        document.getElementById('nomeLojista').innerText = nome;
        document.getElementById('fotoLojista').src = otimizarURL(foto, 150);
        
        if(modo === 'gourmet' && lojistaInfoCache.montarAtivo) {
            document.getElementById('barMontar').style.display = 'flex';
            document.getElementById('txtBarMontar').innerText = lojistaInfoCache.montarTitulo || 'MONTAR MEU PEDIDO';
        }

        const snap = await getDocs(collection(db, "produtos"));
        let htmlDestaque = "";
        let htmlGridLojista = "";

        snap.forEach(d => {
            const p = d.data();
            
            if (p.owner !== lojistaId) return;
            if (p.status === "pausado" || p.visivel === false) return; 
            
            if (modo === 'gourmet' && p.categoria !== 'Comida') return;
            if (modo !== 'gourmet' && p.categoria === 'Comida') return;

            const fotos = Array.isArray(p.foto) ? p.foto : [p.foto];
            const imgCapa = otimizarURL(fotos[0], 1000);

            if (d.id === activeProductId) {
                if (modo === 'gourmet') {
                    htmlDestaque = `
                        <div class="container-gourmet-destaque">
                            <img src="${imgCapa}" class="img-gourmet-destaque">
                            <h2 class="titulo-gourmet-destaque">${p.nome}</h2>
                            <div class="preco-gourmet-destaque">R$ ${p.preco}</div>
                            <div class="card-desc-gourmet">
                                <i class="fas fa-quote-left"></i>
                                <p class="texto-desc-gourmet">${p.descricao || 'Sem descrição disponível.'}</p>
                            </div>
                            <button onclick="window.abrirConfigComida('${d.id}', false)" class="btn-action-main" style="background:var(--ifood-red);">ADICIONAR AO PEDIDO</button>
                        </div><hr style="border:0; border-top:8px solid #f8f8f8; margin:0;">`;
                } else {
                    htmlDestaque = `
                        <div class="destaque-produto-modo-prod">
                            <div class="container-img-padrao">
                                <img src="${imgCapa}" class="img-padrao-display">
                            </div>
                            <div class="info-area-prod">
                                <h2>${p.nome}</h2>
                                <div class="preco-destaque">R$ ${p.preco}</div>
                                <div class="desc-produto-simples">${p.descricao || 'Nenhuma descrição informada.'}</div>
                                ${p.tipoProduto === 'roupa' ? `
                                    <div class="tamanho-container">
                                        <div style="font-size:13px; color:#666; margin-bottom:5px;">Tamanho</div>
                                        <div class="tamanho-grid">${['P','M','G','GG'].map(t => `<div class="btn-tamanho" onclick="selecionarTamanho(this, '${t}')">${t}</div>`).join('')}</div>
                                    </div>` : ''}
                                <button onclick="window.adicionarAoCarrinho('${d.id}', '${p.nome}', '${p.preco}', '${p.owner}', '${p.whatsapp}', '${imgCapa}')" class="btn-action-main" style="background:var(--orange);">Compre agora</button>
                            </div>
                        </div><hr style="border:0; border-top:8px solid #eee; margin:0;">`;
                }
            } else {
                htmlGridLojista += `
                    <div class="card-p" onclick="window.location.href='?lojista=${lojistaId}&product=${d.id}&modo=${modo}'">
                        <img src="${otimizarURL(fotos[0], 400)}" loading="lazy">
                        <div class="card-p-info">
                            <div class="card-p-name">${p.nome}</div>
                            <div class="card-p-price">R$ ${p.preco}</div>
                        </div>
                    </div>`;
            }
        });

        mainContainer.innerHTML = htmlDestaque + (htmlGridLojista ? `<div style="padding:15px 15px 5px; font-weight:800; color:#555; font-size:13px;">MAIS PRODUTOS:</div><div class="grid-produtos">${htmlGridLojista}</div>` : "");
    } catch (e) { console.error(e); }
}

window.abrirConfigComida = async (id, isGlobal = false) => {
    if (isGlobal) {
        itemAtualConfig = { id: 'montar_global', nome: lojistaInfoCache.montarTitulo || "Personalizado", preco: "0,00", variacoes: lojistaInfoCache.montarVariacoes || [], adicionais: lojistaInfoCache.montarAdicionais || [], isMontarGlobal: true, owner: lojistaInfoCache.id, whatsapp: lojistaInfoCache.whatsapp, foto: lojistaInfoCache.fotoPerfilComida, descricao: "" };
    } else {
        const d = await getDoc(doc(db, "produtos", id));
        itemAtualConfig = { ...d.data(), id: d.id };
    }
    renderizarModalConfig();
};

function renderizarModalConfig() {
    const content = document.getElementById('modalContent');
    document.getElementById('modalNome').innerText = itemAtualConfig.nome;
    
    const descModal = document.getElementById('texto-descricao-gourmet');
    const containerDesc = document.getElementById('container-desc-modal');
    if (itemAtualConfig.descricao) {
        descModal.innerText = itemAtualConfig.descricao;
        containerDesc.style.display = 'block';
    } else {
        containerDesc.style.display = 'none';
    }

    let html = '';
    if (itemAtualConfig.variacoes?.length > 0) {
        html += `<div style="padding:12px; background:#f9f9f9; font-size:12px; font-weight:700;">ESCOLHA UMA OPÇÃO:</div>`;
        itemAtualConfig.variacoes.forEach((v, i) => {
            html += `<label style="display:flex; align-items:center; padding:15px; border-bottom:1px solid #eee;"><input type="radio" name="variacao" value="${i}" ${i===0?'checked':''}> <div style="margin-left:10px; flex:1;">${v.nome}</div> <div style="color:var(--ifood-red);">+ R$ ${v.preco}</div></label>`;
        });
    }
    if (itemAtualConfig.adicionais?.length > 0) {
        html += `<div style="padding:12px; background:#f9f9f9; font-size:12px; font-weight:700;">ADICIONAIS:</div>`;
        itemAtualConfig.adicionais.forEach((a, i) => {
            html += `<label style="display:flex; align-items:center; padding:15px; border-bottom:1px solid #eee;"><input type="checkbox" name="adicional" value="${i}"> <div style="margin-left:10px; flex:1;">${a.nome}</div> <div style="color:var(--ifood-red);">+ R$ ${a.preco}</div></label>`;
        });
    }
    content.innerHTML = html;
    document.getElementById('modalComida').style.bottom = '0';
    document.getElementById('overlayComida').style.display = 'block';
    
    document.getElementById('btnConfirmarConfig').onclick = () => {
        let total = parseFloat(itemAtualConfig.preco.toString().replace(',','.'));
        let detalhesPedido = [];

        // 1. ADICIONA A DESCRIÇÃO DETALHADA (INGREDIENTES) DO PRODUTO SE EXISTIR
        if (itemAtualConfig.descricao && itemAtualConfig.id !== 'montar_global') {
            detalhesPedido.push(`Detalhes: ${itemAtualConfig.descricao}`);
        }

        // 2. Captura variação
        const varSel = document.querySelector('input[name="variacao"]:checked');
        if(varSel) {
            const v = itemAtualConfig.variacoes[varSel.value];
            total += parseFloat(v.preco.toString().replace(',','.'));
            detalhesPedido.push(`Opção: ${v.nome}`);
        }

        // 3. Captura adicionais
        const adds = [];
        document.querySelectorAll('input[name="adicional"]:checked').forEach(cb => {
            const a = itemAtualConfig.adicionais[cb.value];
            total += parseFloat(a.preco.toString().replace(',','.'));
            adds.push(a.nome);
        });
        if(adds.length > 0) detalhesPedido.push(`Adicionais: ${adds.join(', ')}`);

        // 4. Observação
        const obs = document.getElementById('gourmet-obs').value;
        if(obs) detalhesPedido.push(`Obs: ${obs}`);

        // Montagem do Nome Final para o WhatsApp
        let nomeFinalWhatsApp = itemAtualConfig.nome;
        if(detalhesPedido.length > 0) {
            nomeFinalWhatsApp += ` (${detalhesPedido.join(' | ')})`;
        }

        const precoFormatado = total.toFixed(2).replace('.', ',');
        const fotoFinal = itemAtualConfig.foto ? (Array.isArray(itemAtualConfig.foto) ? itemAtualConfig.foto[0] : itemAtualConfig.foto) : lojistaInfoCache.fotoPerfilComida;

        window.adicionarAoCarrinho(
            itemAtualConfig.id, 
            nomeFinalWhatsApp, 
            precoFormatado, 
            itemAtualConfig.owner, 
            itemAtualConfig.whatsapp, 
            otimizarURL(fotoFinal, 200)
        );
        
        // Limpar observação para o próximo item
        document.getElementById('gourmet-obs').value = '';
        window.fecharModalComida();
    };
}

init();