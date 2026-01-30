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

function gerarLinkDestaque(prodId) {
    const base = window.location.origin + window.location.pathname;
    return `${base}?seller=${lojistaId}&product=${prodId}&modo=${modo}`;
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

        const nomeLoja = (modo === 'gourmet' ? lojistaInfoCache.nomeLojaComida : lojistaInfoCache.nomeLojaGeral) || lojistaInfoCache.nomeLoja || "Loja";
        const fotoLoja = (modo === 'gourmet' ? lojistaInfoCache.fotoPerfilComida : lojistaInfoCache.fotoPerfilGeral) || lojistaInfoCache.fotoPerfil;
        
        document.getElementById('nomeLojista').innerText = nomeLoja;
        document.getElementById('fotoLojista').src = otimizarURL(fotoLoja, 150);
        
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
            const linkDestaque = gerarLinkDestaque(d.id);
            
            // Sanitização para evitar quebra de strings no HTML/JS
            const descReal = (p.descricao || "").replace(/'/g, "\\'").replace(/\n/g, " ");
            const nomeReal = p.nome.replace(/'/g, "\\'");

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
                            <div class="container-botoes-gourmet">
                                <button onclick="window.abrirConfigComida('${d.id}', false, true)" class="btn-action-main" style="background:var(--ifood-red);">ADICIONAR</button>
                                ${lojistaInfoCache.montarAtivo ? `<button onclick="window.abrirConfigComida('montar_global', true)" class="btn-action-main btn-montar-inline"><i class="fas fa-utensils"></i> MONTAR</button>` : ''}
                            </div>
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
                                <button onclick="window.adicionarAoCarrinho('${d.id}', '${nomeReal}', '${p.preco}', '${p.owner}', '${p.whatsapp}', '${otimizarURL(fotos[0], 100)}', '${linkDestaque}', '${descReal}')" class="btn-action-main" style="background:var(--orange);">Compre agora</button>
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

window.selecionarTamanho = (btn, tamanho) => {
    document.querySelectorAll('.btn-tamanho').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    window.tamanhoSelecionadoAtual = tamanho;
};

window.abrirConfigComida = async (id, isGlobal = false, isIntermediario = false) => {
    if (isGlobal) {
        itemAtualConfig = { id: 'montar_global', nome: lojistaInfoCache.montarTitulo || "Personalizado", preco: "0,00", variacoes: lojistaInfoCache.montarVariacoes || [], adicionais: lojistaInfoCache.montarAdicionais || [], isMontarGlobal: true, owner: lojistaInfoCache.id, whatsapp: lojistaInfoCache.whatsapp, foto: lojistaInfoCache.fotoPerfilComida, descricao: "" };
    } else {
        const d = await getDoc(doc(db, "produtos", id));
        const data = d.data();
        // Mescla adicionais do produto com os adicionais gerais da loja (reaproveitando a estrutura do MONTAR)
        const listaAdicionais = [...(data.adicionais || []), ...(lojistaInfoCache.montarAdicionais || [])];
        itemAtualConfig = { ...data, id: d.id, adicionais: listaAdicionais };
    }
    renderizarModalConfig(isIntermediario);
};

function renderizarModalConfig(isIntermediario = false) {
    const content = document.getElementById('modalContent');
    document.getElementById('modalNome').innerText = itemAtualConfig.nome;
    
    // Alimenta a caixinha de detalhes existente no HTML
    const descBox = document.getElementById('texto-descricao-gourmet');
    if (descBox) {
        descBox.innerHTML = `<b style="color:var(--ifood-red);">R$ ${itemAtualConfig.preco}</b><br>${itemAtualConfig.descricao || ''}`;
    }

    let html = '';

    if (isIntermediario) {
        html += `
            <div style="padding:15px; border-bottom:1px solid #eee;">
                <div style="font-weight:bold; font-size:16px;">${itemAtualConfig.nome}</div>
            </div>

            ${itemAtualConfig.adicionais?.length > 0 ? `
                <div id="btn-toggle-adicionais" 
                     onclick="const lista = document.getElementById('secao-adicionais-oculta'); lista.style.display = (lista.style.display === 'none') ? 'block' : 'none';"
                     style="margin: 15px; padding: 15px; border: 1px solid #e2e2e2; background: #fdfdfd; color: #333; text-align: center; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fas fa-plus" style="color: var(--ifood-red);"></i> 
                    ADICIONAR EXTRAS
                </div>
                
                <div id="secao-adicionais-oculta" style="display: none;">
                    <div style="padding:12px; background:#f9f9f9; font-size:12px; font-weight:700;">ADICIONAIS:</div>
                    ${itemAtualConfig.adicionais.map((a, i) => `
                        <label style="display:flex; align-items:center; padding:15px; border-bottom:1px solid #eee;">
                            <input type="checkbox" name="adicional" value="${i}"> 
                            <div style="margin-left:10px; flex:1;">${a.nome}</div> 
                            <div style="color:var(--ifood-red);">+ R$ ${a.preco}</div>
                        </label>`).join('')}
                </div>
            ` : ''}`;
    } else {
        
        // Layout para Montagem do Zero (Botão MONTAR) - Mantém tudo visível como você pediu
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
    }

    content.innerHTML = html;

    // Função interna para atualizar o preço em tempo real
    const atualizarPrecoModalLocal = () => {
        let precoBaseStr = itemAtualConfig.isMontarGlobal ? "0,00" : (itemAtualConfig.preco || "0,00");
        let total = parseFloat(precoBaseStr.toString().replace(',', '.')) || 0;
        
        const varSel = document.querySelector('input[name="variacao"]:checked');
        if (varSel && itemAtualConfig.variacoes) {
            let vPreco = itemAtualConfig.variacoes[varSel.value].preco.toString().replace(',', '.');
            total += parseFloat(vPreco) || 0;
        }

        document.querySelectorAll('input[name="adicional"]:checked').forEach(cb => {
            if (itemAtualConfig.adicionais && itemAtualConfig.adicionais[cb.value]) {
                let aPreco = itemAtualConfig.adicionais[cb.value].preco.toString().replace(',', '.');
                total += parseFloat(aPreco) || 0;
            }
        });

        const btn = document.getElementById('btnConfirmarConfig');
        if (btn) btn.innerText = `Confirmar - R$ ${total.toFixed(2).replace('.', ',')}`;
    };

    // Adiciona o evento de escuta nos inputs para atualizar o preço
    content.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', atualizarPrecoModalLocal);
    });

    atualizarPrecoModalLocal();
    document.getElementById('modalComida').style.bottom = '0';
    document.getElementById('overlayComida').style.display = 'block';

    // Lógica do botão de confirmação (Carrinho)
    document.getElementById('btnConfirmarConfig').onclick = () => {
        let totalFinal = parseFloat((itemAtualConfig.isMontarGlobal ? "0,00" : itemAtualConfig.preco).toString().replace(',','.'));
        let detalhesPedido = [];
        const varSel = document.querySelector('input[name="variacao"]:checked');
        
        if(varSel) {
            const v = itemAtualConfig.variacoes[varSel.value];
            totalFinal += parseFloat(v.preco.toString().replace(',','.'));
            detalhesPedido.push(`Opção: ${v.nome}`);
        }
        
        const adds = [];
        document.querySelectorAll('input[name="adicional"]:checked').forEach(cb => {
            const a = itemAtualConfig.adicionais[cb.value];
            totalFinal += parseFloat(a.preco.toString().replace(',','.'));
            adds.push(a.nome);
        });
        
        if(adds.length > 0) detalhesPedido.push(`Adicionais: ${adds.join(', ')}`);
        
        const obs = document.getElementById('gourmet-obs').value;
        if(obs) detalhesPedido.push(`Obs: ${obs}`);

        const configTexto = detalhesPedido.length > 0 ? ` | Escolhas: ${detalhesPedido.join(' | ')}` : "";
        const descricaoFinal = (itemAtualConfig.descricao || "") + configTexto;

        window.adicionarAoCarrinho(
            itemAtualConfig.id, 
            itemAtualConfig.nome, 
            totalFinal.toFixed(2).replace('.', ','), 
            itemAtualConfig.owner, 
            itemAtualConfig.whatsapp, 
            otimizarURL(itemAtualConfig.foto ? (Array.isArray(itemAtualConfig.foto) ? itemAtualConfig.foto[0] : itemAtualConfig.foto) : lojistaInfoCache.fotoPerfilComida, 100),
            gerarLinkDestaque(itemAtualConfig.id),
            descricaoFinal
        );
        
        document.getElementById('gourmet-obs').value = '';
        window.fecharModalComida();
    };
}

init();