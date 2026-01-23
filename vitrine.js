import { db, GetRegrasLojista } from './config.js';
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let itemAtualConfig = null;
let lojistaInfoCache = null;
window.tamanhoSelecionadoAtual = null;

function otimizarURL(url, width = 400) {
    if (!url || typeof url !== 'string') return url;
    if (!url.includes('cloudinary.com')) return url;

    return url.replace(
        /\/upload\/(.*?)(\/v\d+\/)/,
        `/upload/f_auto,q_auto:eco,w_${width},c_limit$2`
    );
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
        let regrasLojista = { podeExibirProdutos: true }; // Default permitindo até checar config

        // 1. CARREGAR E VALIDAR LOJISTA PRIMEIRO
        if (sellerId) {
            const s = await getDoc(doc(db, "usuarios", sellerId));
            if (s.exists()) {
                lojistaInfo = s.data();
                lojistaInfoCache = lojistaInfo;
                lojistaInfoCache.id = sellerId;
                
                // Aplica regras do config.js
                regrasLojista = GetRegrasLojista(lojistaInfo);

                // Se não pode exibir, encerramos aqui silenciosamente
                if (!regrasLojista.podeExibirProdutos || regrasLojista.isBloqueado) {
                    mainContainer.innerHTML = "";
                    return;
                }

                const header = document.getElementById('main-header');
                if (header) {
                    header.innerHTML = `
                        <div style="display: flex; align-items: center; width: 100%; justify-content: space-between; padding: 0 5px;">
                            <div style="display: flex; align-items: center;">
                                <a href="index.html" class="back-btn" style="text-decoration:none; color:#333;"><i class="fas fa-arrow-left"></i></a>
                                <div style="display: flex; flex-direction: column;">
                                    <span style="font-weight: 700; font-size: 14px; color:#111;">${lojistaInfo.nomeLoja || 'Vitrine'}</span>
                                    <span style="font-size: 11px; color:#888;">${modo === 'gourmet' ? 'Cardápio Digital' : 'Loja Oficial'}</span>
                                </div>
                            </div>
                            <img src="${otimizarURL(lojistaInfo.fotoPerfil || 'https://via.placeholder.com/100', 100)}" 
                                 style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                        </div>`;
                }

                if(modo === 'gourmet' && lojistaInfo.montarAtivo) {
                    const barM = document.getElementById('barMontar');
                    if(barM) {
                        barM.style.display = 'flex';
                        const txtBtn = document.getElementById('txtBarMontar');
                        if(txtBtn) txtBtn.innerText = lojistaInfo.montarTitulo || 'MONTAR MEU PEDIDO';
                    }
                }
            } else {
                return; // Lojista não existe
            }
        }

        // 2. BUSCAR PRODUTOS
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
            
            // FILTRAGEM DO PRODUTO (Status e Visibilidade)
            if (p.status === "desativado" || p.visivel === false) return;

            const fotos = Array.isArray(p.foto) ? p.foto : [p.foto];
            const imgCapa = otimizarURL(fotos[0] || "https://via.placeholder.com/300", 600);
            const temConfig = p.categoria === 'Comida' && ((p.variacoes && p.variacoes.length > 0) || (p.adicionais && p.adicionais.length > 0));
            
            const funcAddDiretoGeral = `
                (() => {
                    const id = '${d.id}';
                    const nome = '${p.nome.replace(/'/g, "\\'")}';
                    const preco = '${p.preco}';
                    const owner = '${p.owner}';
                    const whatsapp = '${p.whatsapp}';
                    const img = '${imgCapa}';
                    const tipo = '${p.tipoProduto || ""}';
                    
                    if(tipo === 'roupa') {
                        if(!window.tamanhoSelecionadoAtual) {
                            alert('Por favor, selecione um tamanho antes de adicionar.');
                            return;
                        }
                        window.adicionarAoCarrinho(id, nome + ' (Tam: ' + window.tamanhoSelecionadoAtual + ')', preco, owner, whatsapp, img);
                    } else {
                        window.adicionarAoCarrinho(id, nome, preco, owner, whatsapp, img);
                    }
                })()
            `;

            const funcAddDiretoSimples = `window.adicionarAoCarrinho('${d.id}', '${p.nome.replace(/'/g, "\\'")}', '${p.preco}', '${p.owner}', '${p.whatsapp}', '${imgCapa}')`;
            const funcAddConfig = `window.abrirConfigComida('${d.id}', false)`;

            if (p.categoria !== categoriaAtiva) return;

            if (d.id === activeProductId) {
                if (modo === 'gourmet') {
                    let btnHtml = `<button onclick="${temConfig ? funcAddConfig : funcAddDiretoSimples}" class="btn-gourmet-action"><i class="fas fa-shopping-basket"></i> ADICIONAR AO CARRINHO</button>`;
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
                            <p class="gourmet-description">${p.descricao || 'Produto selecionado do nosso cardápio.'}</p>
                            <div class="gourmet-only" style="display: block;">
                                <label class="obs-label">Alguma observação?</label>
                                <textarea id="gourmet-obs" class="obs-box" placeholder="Ex: Sem cebola, bem passado..."></textarea>
                            </div>
                            ${btnHtml}
                        </div>
                        <div class="gourmet-section-title">Veja também</div>`;
                } else {
                    let htmlRoupa = "";
                    if(p.tipoProduto === 'roupa') {
                        let opcoes = [];
                        if(p.tamanhosDisponiveis && p.tamanhosDisponiveis.length > 0) opcoes = p.tamanhosDisponiveis;
                        else if(p.numeracoes) opcoes = p.numeracoes.split(',').map(s => s.trim());

                        if(opcoes.length > 0) {
                            htmlRoupa = `
                                <div class="tamanho-container">
                                    <span class="tamanho-label">Selecione o Tamanho:</span>
                                    <div class="tamanho-grid">
                                        ${opcoes.map(t => `<button class="btn-tamanho" onclick="window.selecionarTamanho(this, '${t}')">${t}</button>`).join('')}
                                    </div>
                                </div>
                            `;
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
                        <img src="${otimizarURL(imgCapa, 300)}" style="width: 100%; aspect-ratio: 1/1; object-fit: cover;">
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

    } catch (error) {
        console.error("Erro ao carregar vitrine:", error);
    }
}

window.abrirConfigComida = async (id, isGlobal = false) => {
    const modal = document.getElementById('modalComida');
    const overlay = document.getElementById('overlayComida');
    const content = document.getElementById('modalContent');
    const btnConfirmar = document.getElementById('btnConfirmarConfig');
    
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
            whatsapp: lojistaInfoCache.whatsapp
        };
    } else {
        const d = await getDoc(doc(db, "produtos", id));
        if (d.exists()) {
            configData = d.data();
            configData.id = d.id;
        }
    }

    if (!configData) return;
    itemAtualConfig = configData;

    let html = "";
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

    if (configData.adicionais && configData.adicionais.length > 0) {
        html += `<div class="config-section-title">Adicionais</div>`;
        configData.adicionais.forEach((a, idx) => {
            html += `
                <label class="config-item">
                    <div class="config-info">
                        <span class="config-name">${a.nome}</span>
                        <span class="config-price">+ R$ ${a.preco}</span>
                    </div>
                    <input type="checkbox" name="adicional" value="${idx}" onchange="window.atualizarPrecoModal()">
                </label>`;
        });
    }

    content.innerHTML = html;
    document.getElementById('modalNome').innerText = configData.nome;
    window.atualizarPrecoModal();
};

window.atualizarPrecoModal = () => {
    let total = itemAtualConfig.isMontarGlobal ? 0 : parseFloat(itemAtualConfig.preco.replace(',', '.'));
    const varSelected = document.querySelector('input[name="variacao"]:checked');
    if(varSelected) total += parseFloat(itemAtualConfig.variacoes[varSelected.value].preco.replace(',', '.'));
    document.querySelectorAll('input[name="adicional"]:checked').forEach(cb => {
        total += parseFloat(itemAtualConfig.adicionais[cb.value].preco.replace(',', '.'));
    });
    document.getElementById('btnConfirmarConfig').innerText = `ADICIONAR R$ ${total.toFixed(2).replace('.', ',')}`;
    document.getElementById('btnConfirmarConfig').onclick = () => {
        let nomeFinal = itemAtualConfig.nome;
        if(varSelected) nomeFinal += ` (${itemAtualConfig.variacoes[varSelected.value].nome})`;
        let extras = [];
        document.querySelectorAll('input[name="adicional"]:checked').forEach(cb => { extras.push(itemAtualConfig.adicionais[cb.value].nome); });
        if(extras.length > 0) nomeFinal += itemAtualConfig.isMontarGlobal ? ` [Montagem: ${extras.join(', ')}]` : ` + ${extras.join(', ')}`;
        const obs = document.getElementById('gourmet-obs') ? document.getElementById('gourmet-obs').value : "";
        if(obs) nomeFinal += ` [Obs: ${obs}]`;
        const img = otimizarURL(itemAtualConfig.foto || (itemAtualConfig.fotos && itemAtualConfig.fotos[0]) || "", 300);
        window.adicionarAoCarrinho(itemAtualConfig.id || 'montar_global', nomeFinal, total.toFixed(2).replace('.', ','), itemAtualConfig.owner, itemAtualConfig.whatsapp, img);
        document.getElementById('modalComida').classList.remove('active');
        document.getElementById('overlayComida').style.display = 'none';
    };
};