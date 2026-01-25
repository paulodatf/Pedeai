const STORAGE_KEY = 'carrinho_pedeai';

// 1. ADICIONAR AO CARRINHO (Ajustado para integridade total da descrição real)
window.adicionarAoCarrinho = (id, nome, preco, owner, whatsapp, imagem, linkProduto, descricao = "") => {
    let carrinho = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    
    // Reconstrói o link da vitrine caso venha vazio
    let linkFinal = linkProduto;
    if (!linkFinal || linkFinal === 'undefined' || linkFinal === '') {
        const base = window.location.origin + window.location.pathname.replace('index.html', 'vitrine-lojista.html');
        linkFinal = `${base}?seller=${owner}&product=${id}&modo=produto`;
    }

    // REGRA: Captura a descrição real. Se vier "undefined" ou nulo, fica vazio (string limpa).
    let descricaoFinal = (descricao && descricao !== "undefined") ? descricao : "";

    const item = { 
        id, 
        nome, 
        preco, 
        owner, 
        whatsapp, 
        imagem, 
        linkProduto: linkFinal, 
        descricao: descricaoFinal, 
        qtd: 1 
    };

    // Busca item idêntico no carrinho (incluindo descrição na comparação para itens personalizados)
    const index = carrinho.findIndex(i => i.id === id && i.nome === nome && i.descricao === descricaoFinal);
    
    if (index > -1) { 
        carrinho[index].qtd += 1; 
    } else { 
        carrinho.push(item); 
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(carrinho));
    window.atualizarIconeCarrinho();
    
    const btn = document.getElementById('carrinho-flutuante');
    if(btn) { 
        btn.style.transform = 'scale(1.2)'; 
        setTimeout(() => btn.style.transform = 'scale(1)', 200); 
    }
};

// 2. ALTERAR QUANTIDADE
window.alterarQuantidadeCarrinho = (id, delta) => {
    let carrinho = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const index = carrinho.findIndex(i => i.id === id);
    if (index > -1) {
        carrinho[index].qtd += delta;
        if (carrinho[index].qtd <= 0) { carrinho.splice(index, 1); }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(carrinho));
        window.atualizarIconeCarrinho();
        window.abrirModalCarrinho();
    }
};

// 3. REMOVER ITEM
window.removerDoCarrinho = (id) => {
    let carrinho = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    carrinho = carrinho.filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(carrinho));
    window.atualizarIconeCarrinho();
    window.abrirModalCarrinho();
};

// 4. FINALIZAR PEDIDO (ENVIO PARA WHATSAPP - FORMATO ATUALIZADO)
window.finalizarGrupoLojista = (ownerId) => {
    let carrinho = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const itensLoja = carrinho.filter(i => i.owner === ownerId);
    if (itensLoja.length === 0) return;

    let texto = `*📌 NOVO PEDIDO RECEBIDO*\n`;
    texto += `────────────────────\n\n`;
    
    let total = 0;
    itensLoja.forEach((item) => {
        const precoLimpo = parseFloat(item.preco.replace('R$', '').replace(/\./g, '').replace(',', '.'));
        const subtotal = precoLimpo * item.qtd;
        total += subtotal;

        texto += `*🛍️ Produto:* ${item.qtd}x ${item.nome.toUpperCase()}\n`;
        
        if (item.descricao && item.descricao.trim() !== "") {
            texto += `*📄 Descrição:* _${item.descricao}_\n`;
        }
        
        texto += `*💰 Valor:* R$ ${item.preco}\n\n`;
        
        if (item.linkProduto) {
            texto += `*🔗 Ver produto:*\n`;
            texto += `👉 Toque para visualizar o item\n`;
            texto += `${item.linkProduto}\n`;
        }
        texto += `────────────────────\n`;
    });

    texto += `\n*💵 Total: R$ ${total.toFixed(2).replace('.', ',')}*\n\n`;
    texto += `_Pedido gerado via catálogo online_\n`;
    texto += `*Pede Aí*`;

    const novoCarrinho = carrinho.filter(i => i.owner !== ownerId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novoCarrinho));
    
    window.atualizarIconeCarrinho();
    window.abrirModalCarrinho();
    
    const fone = itensLoja[0].whatsapp.replace(/\D/g, '');
    const urlFinal = `https://wa.me/55${fone}?text=${encodeURIComponent(texto)}`;
    window.open(urlFinal, '_blank');
};

// 5. INTERFACE E UI
window.atualizarIconeCarrinho = () => {
    const flutuante = document.getElementById('carrinho-flutuante');
    const contador = document.getElementById('cart-count') || document.getElementById('carrinho-count');
    const carrinho = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const totalItens = carrinho.reduce((acc, i) => acc + i.qtd, 0);
    
    if (flutuante) {
        const modalComida = document.getElementById('modalComida');
        const modoMontarAtivo = modalComida && modalComida.classList.contains('active');

        if (modoMontarAtivo || totalItens <= 0) {
            flutuante.style.display = 'none';
        } else {
            flutuante.style.display = 'flex';
        }

        if (contador) contador.innerText = totalItens;

        const barMontar = document.getElementById('barMontar');
        const barraVisivel = barMontar && (barMontar.offsetWidth > 0 || barMontar.offsetHeight > 0);

        flutuante.style.bottom = barraVisivel ? '90px' : '30px';
    }
};

window.abrirModalCarrinho = () => {
    const modal = document.getElementById('modal-carrinho');
    const corpo = document.getElementById('lista-carrinho-lojas');
    const carrinho = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    
    if (carrinho.length === 0) { 
        if(modal) modal.style.display = 'none'; 
        return; 
    }

    const grupos = carrinho.reduce((acc, item) => { 
        if (!acc[item.owner]) acc[item.owner] = []; 
        acc[item.owner].push(item); 
        return acc; 
    }, {});

    if (corpo) {
        corpo.innerHTML = "";
        for (const owner in grupos) {
            const itens = grupos[owner];
            corpo.innerHTML += `
                <div class="cart-store-group">
                    <div class="cart-store-header">PEDIDO PARA LOJA</div>
                    ${itens.map(i => `
                        <div class="cart-item">
                            <img src="${i.imagem}" style="width:40px; height:40px; border-radius:5px; object-fit:cover;">
                            <div class="cart-item-info">
                                <div class="cart-item-name">${i.nome}</div>
                                <div class="cart-item-price">R$ ${i.preco}</div>
                                <div class="qty-control-cart" style="display:flex; align-items:center; margin-top:5px; gap:10px;">
                                    <button onclick="alterarQuantidadeCarrinho('${i.id}', -1)" class="qty-btn-cart">-</button>
                                    <span style="font-size:13px; font-weight:bold;">${i.qtd}</span>
                                    <button onclick="alterarQuantidadeCarrinho('${i.id}', 1)" class="qty-btn-cart">+</button>
                                </div>
                            </div>
                            <i class="fas fa-trash-alt cart-remove" onclick="removerDoCarrinho('${i.id}')"></i>
                        </div>
                    `).join('')}
                    <button class="btn-finish-store" onclick="finalizarGrupoLojista('${owner}')">
                        <i class="fab fa-whatsapp"></i> Enviar Pedido
                    </button>
                </div>`;
        }
    }
    if(modal) modal.style.display = 'flex';
};

function inicializarCarrinho() {
    if (document.getElementById('carrinho-flutuante')) {
        window.atualizarIconeCarrinho();
        return;
    }
    const css = `<style>
        #carrinho-flutuante { position: fixed; right: 25px; width: 60px; height: 60px; background: #ee4d2d; border-radius: 50%; color: white; display: none; justify-content: center; align-items: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 9999; cursor: pointer; transition: bottom 0.3s ease, transform 0.2s, opacity 0.3s; }
        #cart-count { position: absolute; top: -2px; right: -2px; background: #fff; color: #ee4d2d; border-radius: 50%; width: 22px; height: 22px; display: flex; justify-content: center; align-items: center; font-size: 11px; font-weight: 800; border: 2px solid #ee4d2d; }
        #modal-carrinho { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; display: none; justify-content: center; align-items: flex-end; }
        .conteudo-modal { background: #f4f4f4; width: 100%; max-width: 500px; max-height: 80vh; border-radius: 20px 20px 0 0; padding: 20px; overflow-y: auto; }
        .cart-store-group { background: white; border-radius: 10px; padding: 15px; margin-bottom: 15px; }
        .cart-store-header { font-size: 10px; color: #999; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #eee; }
        .cart-item { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .cart-item-info { flex: 1; }
        .cart-item-name { font-size: 13px; font-weight: bold; color: #333; }
        .cart-item-price { font-size: 12px; color: #ee4d2d; }
        .cart-remove { color: #ccc; cursor: pointer; padding: 5px; }
        .qty-btn-cart { border: 1px solid #ddd; background: #f9f9f9; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; }
        .btn-finish-store { width: 100%; background: #25d366; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; margin-top: 5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
    </style>`;
    const html = `
        <div id="carrinho-flutuante" onclick="abrirModalCarrinho()">
            <i class="fas fa-shopping-cart" style="font-size: 24px;"></i>
            <span id="cart-count">0</span>
        </div>
        <div id="modal-carrinho" onclick="if(event.target == this) this.style.display='none'">
            <div class="conteudo-modal">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <b style="font-size:18px;">🛒 Meu Carrinho</b>
                    <i class="fas fa-times" onclick="document.getElementById('modal-carrinho').style.display='none'" style="cursor:pointer;"></i>
                </div>
                <div id="lista-carrinho-lojas"></div>
            </div>
        </div>`;
    document.head.insertAdjacentHTML('beforeend', css);
    document.body.insertAdjacentHTML('beforeend', html);
    
    setInterval(window.atualizarIconeCarrinho, 400);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarCarrinho);
} else {
    inicializarCarrinho();
}