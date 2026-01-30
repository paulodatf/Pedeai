import { db, GetRegrasLojista } from './config.js';
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let itemAtualConfig = null;
let lojistaInfoCache = null;
window.tamanhoSelecionadoAtual = null;

function otimizarURL(url, width = 400) {
    if (!url || typeof url !== 'string') return url;
    if (!url.includes('cloudinary.com')) return url;
    return url.replace(/\/upload\/(.*?)(\/v\d+\/)/, `/upload/f_auto,q_auto:eco,w_${width},c_limit$2`);
}

// Função para gerar link do produto
function gerarLinkVitrine(sellerId, prodId, modo) {
    const base = window.location.origin + window.location.pathname;
    return `${base}?seller=${sellerId}&product=${prodId}&modo=${modo}`;
}

export async function carregarVitrineCompleta() {
    const params = new URLSearchParams(window.location.search);
    const sellerId = params.get('seller');
    const activeProductId = params.get('product'); 
    const modo = params.get('modo') || 'produto';
    const mainContainer = document.getElementById('productDetail');

    if (!mainContainer) return;

    try {
        let lojistaInfo = { nomeLoja: "Loja", fotoPerfil: "" };
        let regrasLojista = { podeExibirProdutos: true };

        if (sellerId) {
            const s = await getDoc(doc(db, "usuarios", sellerId));
            if (s.exists()) {
                lojistaInfo = s.data();
                lojistaInfoCache = lojistaInfo;
                lojistaInfoCache.id = sellerId;
                regrasLojista = GetRegrasLojista(lojistaInfo);

                if (!regrasLojista.podeExibirProdutos || regrasLojista.isBloqueado) {
                    mainContainer.innerHTML = "";
                    return;
                }

                // Define qual foto e qual nome usar baseado no modo e no que existe salvo no banco
                const fotoParaExibir = (modo === 'gourmet' ? lojistaInfo.fotoPerfilComida : lojistaInfo.fotoPerfilGeral) || lojistaInfo.fotoPerfil || 'https://via.placeholder.com/100';
                const nomeParaExibir = (modo === 'gourmet' ? lojistaInfo.nomeLojaComida : lojistaInfo.nomeLojaGeral) || lojistaInfo.nomeLoja || 'Vitrine';

                const header = document.getElementById('main-header');
                if (header) {
                    header.innerHTML = `
                        <div style="display: flex; align-items: center; width: 100%; justify-content: space-between; padding: 0 5px;">
                            <div style="display: flex; align-items: center;">
                                <a href="index.html" class="back-btn" style="text-decoration:none; color:#333;"><i class="fas fa-arrow-left"></i></a>
                                <div style="display: flex; flex-direction: column;">
                                    <span style="font-weight: 700; font-size: 14px; color:#111;">${nomeParaExibir}</span>
                                    <span style="font-size: 11px; color:#888;">${modo === 'gourmet' ? 'Cardápio Digital' : 'Loja Oficial'}</span>
                                </div>
                            </div>
                            <img src="${otimizarURL(fotoParaExibir, 100)}" 
                                 style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                        </div>`;
                }
                
            } else { return; }
        }

        const snap = await getDocs(collection(db, "produtos"));
        let htmlDestaque = "";
        let htmlGridLojista = "";
        let categoriaAtiva = "";

        const docPrincipal = await getDoc(doc(db, "produtos", activeProductId));
        if (docPrincipal.exists()) {
            categoriaAtiva = docPrincipal.data().categoria;
        }

        snap.forEach(d => {
            const p = d.data();
            if (p.status === "desativado" || p.visivel === false) return;

            const fotos = Array.isArray(p.foto) ? p.foto : [p.foto];
            const imgCapaRaw = fotos[0] || "https://via.placeholder.com/300";
            const imgCapaOtimizada = otimizarURL(imgCapaRaw, 600);
            const linkProduto = gerarLinkVitrine(sellerId, d.id, modo);
            // Agora sempre considera que tem config se for Comida, para oferecer os adicionais da loja
const temConfig = p.categoria === 'Comida';
            const descSanitizada = (p.descricao || "").replace(/'/g, "\\'").replace(/\n/g, " ");
            const nomeSanitizado = p.nome.replace(/'/g, "\\'");

            // Funções de clique ajustadas para bater com a assinatura do carrinho.js:
            // (id, nome, preco, owner, whatsapp, imagem, linkProduto, descricao)
            
            const funcAddDiretoGeral = `
                (() => {
                    const id = '${d.id}';
                    const nome = '${nomeSanitizado}';
                    const preco = '${p.preco}';
                    const owner = '${p.owner}';
                    const whatsapp = '${p.whatsapp}';
                    const imagem = '${imgCapaRaw}';
                    const link = '${linkProduto}';
                    const tipo = '${p.tipoProduto || ""}';
                    const desc = '${descSanitizada}';
                    
                    if(tipo === 'roupa') {
                        if(!window.tamanhoSelecionadoAtual) {
                            alert('Por favor, selecione um tamanho antes de adicionar.');
                            return;
                        }
                        window.adicionarAoCarrinho(id, nome + ' (Tam: ' + window.tamanhoSelecionadoAtual + ')', preco, owner, whatsapp, imagem, link, desc);
                    } else {
                        window.adicionarAoCarrinho(id, nome, preco, owner, whatsapp, imagem, link, desc);
                    }
                })()
            `;

            const funcAddDiretoSimples = `window.adicionarAoCarrinho('${d.id}', '${nomeSanitizado}', '${p.preco}', '${p.owner}', '${p.whatsapp}', '${imgCapaRaw}', '${linkProduto}', '${descSanitizada}')`;
            const funcAddConfig = `window.abrirConfigComida('${d.id}', false)`;

            if (p.categoria !== categoriaAtiva) return;

            if (d.id === activeProductId) {
                if (modo === 'gourmet') {
                  // JEITO 1 — ADICIONAR (TRADICIONAL) agora abre formulário intermediário
const funcAbrirFormularioIntermediario = `window.abrirConfigComida('${d.id}', false, true)`;

const funcAbrirIntermediario = `window.abrirConfigComida('${d.id}', false, true)`;
                    let btnHtml = `
<div class="container-botoes-gourmet">
    <button onclick="${temConfig ? funcAddConfig : funcAbrirIntermediario}" class="btn-action-main" style="background:var(--ifood-red);">
        <i class="fas fa-shopping-basket"></i> ADICIONAR
    </button>
    ${lojistaInfoCache.montarAtivo ? `
    <button onclick="window.abrirConfigComida(null, true)" class="btn-action-main btn-montar-inline">
        <i class="fas fa-utensils"></i> MONTAR
    </button>` : ''}
</div>`;
                    htmlDestaque = `
                        <div class="gourmet-card-container">
                            <div class="gourmet-image-wrapper">
                                <div id="slider-main" style="display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none;">
                                    ${fotos.map(url => `<img src="${otimizarURL(url, 800)}" style="width: 100%; aspect-ratio: 1.2/1; object-fit: cover; flex-shrink: 0; scroll-snap-align: start;">`).join('')}
                                </div>
                            </div>
                            <div class="gourmet-info-header">
                                <h1 class="gourmet-title">${p.nome}</h1>
                                <span class="gourmet-price">R$ ${p.preco}</span>
                            </div>
                            <div class="desc-gourmet-box">
                                <p class="gourmet-description">${p.descricao || 'Produto selecionado do nosso cardápio.'}</p>
                            </div>
                            ${btnHtml}
                        </div>
                        <div class="gourmet-section-title">Veja também</div>`;
                } else {
                    let htmlRoupa = "";
                    if(p.tipoProduto === 'roupa') {
                        let opcoes = (p.tamanhosDisponiveis && p.tamanhosDisponiveis.length > 0) ? p.tamanhosDisponiveis : (p.numeracoes ? p.numeracoes.split(',').map(s => s.trim()) : []);
                        if(opcoes.length > 0) {
                            htmlRoupa = `<div class="tamanho-container"><span class="tamanho-label">Selecione o Tamanho:</span><div class="tamanho-grid">${opcoes.map(t => `<button class="btn-tamanho" onclick="window.selecionarTamanho(this, '${t}')">${t}</button>`).join('')}</div></div>`;
                        }
                    }

                    htmlDestaque = `
                        <div class="destaque-container" style="background: #fff;">
                            <div class="slider-wrapper" style="width: 100vw; aspect-ratio: 1/1; position: relative; overflow: hidden;">
                                <div class="image-slider" id="slider-main" style="display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none;">
                                    ${fotos.map(url => `<img src="${otimizarURL(url, 800)}" style="width: 100vw; height: 100vw; object-fit: cover; flex-shrink: 0; scroll-snap-align: start;">`).join('')}
                                </div>
                                <div class="photo-counter" style="position: absolute; bottom: 15px; right: 15px; background: rgba(0,0,0,0.6); color: #fff; padding: 4px 12px; border-radius: 15px; font-size: 12px;">
                                    <span id="counter">1</span>/${fotos.length}
                                </div>
                            </div>
                            <div class="product-info-box" style="padding: 20px;">
                                <div class="p-price-main" style="color: #ee4d2d; font-size: 28px; font-weight: bold;">R$ ${p.preco}</div>
                                <div class="p-name-main" style="font-size: 18px; margin-top: 8px; color: #333; font-weight: 500;">${p.nome}</div>
                                <div class="desc-produto-box">
                                    <span class="desc-produto-label">Descrição:</span>
                                    <p class="desc-produto-text">${p.descricao || 'Nenhuma descrição informada.'}</p>
                                </div>
                                ${htmlRoupa}
                                <button onclick="${funcAddDiretoGeral}" class="btn-whatsapp" style="width: 100%; background: #25d366; color: white; padding: 16px; border: none; border-radius: 8px; font-weight: bold; margin-top: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
                                    <i class="fas fa-cart-plus"></i> ADICIONAR AO CARRINHO
                                </button>
                            </div>
                        </div>`;
                }
            } else if (p.owner === sellerId) {
                htmlGridLojista += `
                    <div class="card-menor" onclick="window.location.href='vitrine-lojista.html?seller=${sellerId}&product=${d.id}&modo=${modo}'" style="background: #fff; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; border: 1px solid #eee;">
                        <img src="${otimizarURL(imgCapaOtimizada, 300)}" style="width: 100%; aspect-ratio: 1/1; object-fit: cover;">
                        <div style="padding: 8px;">
                            <div style="font-size: 12px; color: #333; height: 32px; overflow: hidden; line-height: 1.3; margin-bottom: 4px;">${p.nome}</div>
                            <div style="font-weight: bold; color: #ee4d2d; font-size: 14px;">R$ ${p.preco}</div>
                        </div>
                    </div>`;
            }
        });

        mainContainer.innerHTML = htmlDestaque + `
            <div style="padding: 15px;">
                <h3 style="font-size: 15px; color: #333; margin-bottom: 12px;">Mais de ${lojistaInfo.nomeLoja || 'esta loja'}</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    ${htmlGridLojista}
                </div>
            </div>`;

        const slider = document.getElementById('slider-main');
        const counter = document.getElementById('counter');
        if (slider && counter) {
            slider.addEventListener('scroll', () => {
                const index = Math.round(slider.scrollLeft / slider.offsetWidth) + 1;
                counter.innerText = index;
            });
        }

    } catch (error) { console.error("Erro ao carregar vitrine:", error); }
}

window.selecionarTamanho = (btn, tamanho) => {
    document.querySelectorAll('.btn-tamanho').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    window.tamanhoSelecionadoAtual = tamanho;
};

window.abrirConfigComida = async (id, isGlobal = false, isIntermediario = false) => {
    const modal = document.getElementById('modalComida');
    const overlay = document.getElementById('overlayComida');
    const content = document.getElementById('modalContent');
    
    content.innerHTML = "Carregando...";
    modal.classList.add('active');
    overlay.style.display = 'block';

    let configData = null;
    if (isGlobal) {
        configData = { 
            nome: lojistaInfoCache.montarTitulo || "Personalizar", 
            variacoes: lojistaInfoCache.montarVariacoes || [], 
            adicionais: lojistaInfoCache.montarAdicionais || [], 
            isMontarGlobal: true, 
            owner: lojistaInfoCache.id, 
            whatsapp: lojistaInfoCache.whatsapp, 
            foto: lojistaInfoCache.fotoPerfil || "", 
            descricao: "" 
        };
    } else {
        const d = await getDoc(doc(db, "produtos", id));
        if (d.exists()) { 
            const data = d.data();
            configData = { 
                ...data, 
                id: d.id,
                adicionais: [...(data.adicionais || []), ...(lojistaInfoCache.montarAdicionais || [])]
            }; 
        }
    }

    if (!configData) return;
    itemAtualConfig = configData;

    let html = "";
    
    // 1. Renderiza Variações (Sempre visíveis se existirem)
    if (configData.variacoes && configData.variacoes.length > 0) {
        html += `<div class="config-section-title">Escolha uma opção</div>`;
        configData.variacoes.forEach((v, idx) => {
            html += `
                <label class="config-item">
                    <div class="config-info">
                        <span class="config-name">${v.nome}</span>
                        <span class="config-price">+ R$ ${v.preco}</span>
                    </div>
                    <input type="radio" name="variacao" value="${idx}" onchange="window.atualizarPrecoModal()" ${idx === 0 ? 'checked' : ''}>
                </label>`;
        });
    }

    // 2. Renderiza Adicionais (Escondidos por padrão)
    if (configData.adicionais && configData.adicionais.length > 0) {
        html += `
            <div id="btn-toggle-adicionais" 
                 onclick="const lista = document.getElementById('lista-adicionais'); lista.style.display = (lista.style.display === 'none') ? 'block' : 'none';"
                 style="margin: 15px; padding: 15px; border: 1px solid #e2e2e2; background: #fdfdfd; color: #333; text-align: center; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="fas fa-plus" style="color: #ea1d2c;"></i> 
                ADICIONAR EXTRAS
            </div>

            <div id="lista-adicionais" style="display: none;">
                <div class="config-section-title">Adicionais</div>
                ${configData.adicionais.map((a, idx) => `
                    <label class="config-item">
                        <div class="config-info">
                            <span class="config-name">${a.nome}</span>
                            <span class="config-price">+ R$ ${a.preco}</span>
                        </div>
                        <input type="checkbox" name="adicional" value="${idx}" onchange="window.atualizarPrecoModal()">
                    </label>
                `).join('')}
            </div>`;
    }

    content.innerHTML = html;
    document.getElementById('modalNome').innerText = configData.nome;
    
    const campoDescModal = document.getElementById('texto-descricao-modal');
    if(campoDescModal) {
        campoDescModal.innerText = itemAtualConfig.descricao || "Ingredientes tradicionais da casa.";
        const containerDescModal = document.getElementById('container-desc-modal');
        if(containerDescModal) containerDescModal.style.display = itemAtualConfig.descricao ? 'block' : 'none';
    }

    const campoObs = document.getElementById('gourmet-obs');
    if(campoObs) {
        campoObs.value = "";
        campoObs.placeholder = itemAtualConfig.isMontarGlobal ? "Como deseja sua montagem?" : "Alguma observação? (Ex: sem cebola)";
    }
    
    window.atualizarPrecoModal();
};

window.atualizarPrecoModal = () => {
    let total = itemAtualConfig.isMontarGlobal ? 0 : parseFloat(itemAtualConfig.preco.toString().replace(',', '.'));
    const varSelected = document.querySelector('input[name="variacao"]:checked');
    if(varSelected) total += parseFloat(itemAtualConfig.variacoes[varSelected.value].preco.replace(',', '.'));
    document.querySelectorAll('input[name="adicional"]:checked').forEach(cb => {
        total += parseFloat(itemAtualConfig.adicionais[cb.value].preco.replace(',', '.'));
    });
    document.getElementById('btnConfirmarConfig').innerText = `ADICIONAR R$ ${total.toFixed(2).replace('.', ',')}`;
    document.getElementById('btnConfirmarConfig').onclick = () => {
        let resumoConfig = "";
        if(varSelected) resumoConfig += ` (${itemAtualConfig.variacoes[varSelected.value].nome})`;
        let extras = [];
        document.querySelectorAll('input[name="adicional"]:checked').forEach(cb => { extras.push(itemAtualConfig.adicionais[cb.value].nome); });
        if(extras.length > 0) resumoConfig += itemAtualConfig.isMontarGlobal ? ` [Montagem: ${extras.join(', ')}]` : ` + ${extras.join(', ')}`;
        
        const obs = document.getElementById('gourmet-obs')?.value || "";
        if(obs) resumoConfig += ` [Obs: ${obs}]`;
        
        const descricaoFinal = (itemAtualConfig.descricao || "") + (resumoConfig ? " | Escolhas: " + resumoConfig : "");
        const linkProduto = gerarLinkVitrine(lojistaInfoCache.id, itemAtualConfig.id || 'montar_global', (new URLSearchParams(window.location.search)).get('modo') || 'produto');
        
        // Pega a imagem do produto ou da loja para a mini fotinha
        const imgItem = Array.isArray(itemAtualConfig.foto) ? itemAtualConfig.foto[0] : itemAtualConfig.foto;

        window.adicionarAoCarrinho(
            itemAtualConfig.id || 'montar_global', 
            itemAtualConfig.nome, 
            total.toFixed(2).replace('.', ','), 
            itemAtualConfig.owner, 
            itemAtualConfig.whatsapp, 
            imgItem || 'https://via.placeholder.com/100', 
            linkProduto, 
            descricaoFinal
        );
        
        document.getElementById('modalComida').classList.remove('active');
        document.getElementById('overlayComida').style.display = 'none';
    };
}