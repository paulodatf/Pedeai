import { db, GetRegrasLojista } from './config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let todosProdutos = [];
let modoAtual = sessionStorage.getItem('pedeai_mode') || 'products';
let filtroChip = '';
let filtroTexto = '';
let animationId = null;
let isReturning = false;

function otimizarURL(url, width = 400) {
    if (!url || typeof url !== 'string') return url;
    if (!url.includes('cloudinary.com')) return url;
    return url.replace(/\/upload\/(.*?)(\/v\d+\/)/, `/upload/f_auto,q_auto:eco,w_${width},c_limit$2`);
}

const MAPAS_FILTROS = {
    'products': {
        'eletrônicos': ['ventilador', 'tv', 'televisao', 'eletronico', 'fone', 'liquidificador', 'eletro', 'aparelho', 'som', 'computador', 'notebook', 'pc', 'bivolt', 'voltagem', 'microondas', 'geladeira'],
        'celulares': ['celular', 'smartphone', 'iphone', 'samsung', 'xiaomi', 'motorola', 'redmi', 'android', 'ios', 'capinha', 'carregador'],
        'ferramentas': ['ferramenta', 'furadeira', 'makita', 'serra', 'pa', 'martelo', 'chave', 'parafusadeira', 'trena', 'alicate'],
        'cosméticos': ['batom', 'perfume', 'desodorante', 'creme', 'hidratante', 'maquiagem', 'shampoo', 'condicionador', 'esmalte', 'beleza', 'cosmetico'],
        'promoção': ['promoção', 'promocao', 'oferta', 'queima', 'desconto', 'liquidando', 'barato', 'off']
    },
    'restaurants': {
        'lanches': ['lanche', 'hamburguer', 'hambúrguer', 'pastel', 'pizza', 'sanduiche', 'artesanal', 'hot dog'],
        'bebidas': ['bebida', 'refrigerante', 'suco', 'água', 'coca', 'guaraná', 'cerveja', 'vinho', 'refri'],
        'sorvetes': ['sorvete', 'picolé', 'açaí', 'gelato', 'casquinha'],
        'doces': ['doce', 'bolo', 'chocolate', 'brownie', 'pudim', 'torta', 'confeitaria'],
        'salgados': ['salgado', 'coxinha', 'empada', 'quibe', 'kibe', 'enroladinho', 'esfiha'],
        'fitness': ['fitness', 'fit', 'saudavel', 'salada', 'legumes', 'marmita fitness', 'marmita fit', 'leve', 'diet', 'natural'],
        'promoção': ['promoção', 'promocao', 'oferta', 'combo', 'desconto', 'barato', 'off']
    },
    'classifieds': {
        'veículos': ['carro', 'moto', 'caminhão', 'veiculo', 'automóvel', 'pick-up', 'carreta'],
        'imóveis': ['casa', 'lote', 'terreno', 'imóvel', 'apartamento', 'sitio', 'fazenda', 'aluguel'],
        'animais': ['gado', 'boi', 'vaca', 'cavalo', 'porco', 'ovino', 'bezerro', 'nelore'],
        'máquinas': ['trator', 'máquina', 'equipamento', 'agricola', 'ferramenta usada', 'industrial'],
        'outros': []
    }
};

const CHIPS_POR_MODO = {
    'products': ['Todos', 'Eletrônicos', 'Celulares', 'Ferramentas', 'Cosméticos', 'Promoção'],
    'restaurants': ['Todos', 'Lanches', 'Bebidas', 'Sorvetes', 'Doces', 'Salgados', 'Fitness', 'Promoção'],
    'classifieds': ['Todos', 'Veículos', 'Imóveis', 'Animais', 'Máquinas', 'Outros']
};

function normalizar(texto) {
    return texto ? texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
}

function aplicarAlgoritmoVisibilidade(lista) {
    const pesos = { 'vip': 5, 'premium': 3, 'basico': 1 };
    const grupos = {
        vip: lista.filter(p => p.planoLojista === 'vip').sort(() => Math.random() - 0.5),
        premium: lista.filter(p => p.planoLojista === 'premium').sort(() => Math.random() - 0.5),
        basico: lista.filter(p => p.planoLojista === 'basico' || !p.planoLojista).sort(() => Math.random() - 0.5)
    };

    const resultado = [];
    const totalVip = grupos.vip.length;
    const totalPremium = grupos.premium.length;
    const totalBasico = grupos.basico.length;
    let iV = 0, iP = 0, iB = 0;

    while (iV < totalVip || iP < totalPremium || iB < totalBasico) {
        for (let j = 0; j < pesos.vip && iV < totalVip; j++) resultado.push(grupos.vip[iV++]);
        for (let j = 0; j < pesos.premium && iP < totalPremium; j++) resultado.push(grupos.premium[iP++]);
        for (let j = 0; j < pesos.basico && iB < totalBasico; j++) resultado.push(grupos.basico[iB++]);
    }
    return resultado;
}

async function inicializar() {
    try {
        const snapProdutos = await getDocs(collection(db, "produtos"));
        const snapUsuarios = await getDocs(collection(db, "usuarios"));
        
        const dadosLojistas = {};
        snapUsuarios.forEach(u => {
            dadosLojistas[u.id] = u.data();
        });

        todosProdutos = [];
        snapProdutos.forEach(d => {
            const data = d.data();
            if(data.promocao === 'sim' && data.promoExpira && Date.now() > data.promoExpira) data.promocao = 'nao';
            
            // Injeta dados de permissão baseados no config.js
            const lojista = dadosLojistas[data.owner];
            const regras = GetRegrasLojista(lojista);

            todosProdutos.push({ 
                id: d.id, 
                ...data, 
                planoLojista: lojista?.planoAtivo || 'basico',
                isLojistaAprovado: regras.podeExibirProdutos,
                isProdutoAtivo: data.status !== 'inativo' && data.visivel !== false
            });
        });

        const domCache = sessionStorage.getItem('pedeai_dom_cache');
        isReturning = (domCache !== null);

        const navAtivo = document.getElementById(`nav-${modoAtual}`);
        if(navAtivo) {
            document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
            navAtivo.classList.add('active');
        }
        
        const logo = document.getElementById('main-logo');
        if(logo) {
            let iconHtml = modoAtual === 'restaurants' ? '<i class="fas fa-utensils"></i>' : (modoAtual === 'classifieds' ? '<i class="fas fa-bullhorn"></i>' : '<i class="fas fa-bag-shopping"></i>');
            logo.innerHTML = `${iconHtml} Pede Aí`;
        }

        renderizarCarrosselAutomatico();
        renderizarFiltros();

        if (!isReturning) {
            renderizarProdutos();
        } else {
            const grid = document.getElementById('grid-produtos');
            if (grid) grid.innerHTML = domCache;
            const scrollPos = sessionStorage.getItem('pedeai_scroll');
            if (scrollPos) window.scrollTo(0, parseInt(scrollPos));
            isReturning = false; 
        }

    } catch (e) { console.error("Erro:", e); }
}

function renderizarCarrosselAutomatico() {
    const track = document.getElementById('carouselTrack');
    if (!track) return;
    const categoriaFirebase = modoAtual === 'restaurants' ? 'Comida' : (modoAtual === 'classifieds' ? 'Classificados' : 'Geral');
    
    // Aplica as mesmas regras de visibilidade no carrossel Turbo
    const poolTurbo = todosProdutos.filter(p => 
        p.turbo === 'sim' && 
        p.categoria === categoriaFirebase &&
        p.isLojistaAprovado && 
        p.isProdutoAtivo
    );
    
    const data = aplicarAlgoritmoVisibilidade(poolTurbo).slice(0, 20);
    
    if (data.length === 0) {
        document.getElementById('featuredStrip').style.display = 'none';
        return;
    }
    document.getElementById('featuredStrip').style.display = 'block';

    const paramModo = modoAtual === 'restaurants' ? 'gourmet' : 'produto';
    track.innerHTML = data.map(p => {
        const img = otimizarURL(p.foto || (p.fotos && p.fotos[0]) || "https://via.placeholder.com/150", 300);
        return `<div class="banner-box" onclick="navegarParaProduto('${p.owner}', '${p.id}', '${paramModo}')"><img src="${img}" loading="lazy"><div class="banner-overlay"><span class="banner-price">R$ ${p.preco}</span></div></div>`;
    }).join('');
    
    if (animationId) cancelAnimationFrame(animationId);
    let scrollPos = track.scrollLeft;
    let isTouching = false;
    let lastTime = 0;

    track.addEventListener('touchstart', () => { isTouching = true; }, { passive: true });
    track.addEventListener('touchend', () => { isTouching = false; scrollPos = track.scrollLeft; }, { passive: true });

    function step(timestamp) {
        if (!isTouching) {
            if (!lastTime) lastTime = timestamp;
            const elapsed = timestamp - lastTime;
            if (elapsed > 16) {
                scrollPos += 0.8; 
                if (scrollPos >= (track.scrollWidth / 2)) scrollPos = 0;
                track.scrollLeft = scrollPos;
                lastTime = timestamp;
            }
        }
        animationId = requestAnimationFrame(step);
    }
    animationId = requestAnimationFrame(step);
}

function renderizarFiltros() {
    const container = document.getElementById('chipContainer');
    if (!container) return;
    container.innerHTML = CHIPS_POR_MODO[modoAtual].map((nome, index) => `
        <div class="filter-chip ${normalizar(nome) === filtroChip || (filtroChip === '' && index === 0) ? 'active' : ''}" 
             onclick="filtrarPorPalavra('${nome === 'Todos' ? '' : nome}', this)">
            ${nome}
        </div>`).join('');
}

function renderizarProdutos() {
    const grid = document.getElementById('grid-produtos');
    if (!grid) return;
    
    let filtrados = todosProdutos.filter(p => {
        // REGRAS DE BLOQUEIO DO CONFIG.JS (FILTRAGEM CIRÚRGICA)
        if (!p.isLojistaAprovado) return false;
        if (!p.isProdutoAtivo) return false;

        if (modoAtual === 'restaurants' && p.categoria !== 'Comida') return false;
        if (modoAtual === 'products' && p.categoria !== 'Geral') return false;
        if (modoAtual === 'classifieds' && p.categoria !== 'Classificados') return false;
        const textoCard = normalizar(`${p.nome} ${p.descricao || ''}`);
        if (filtroTexto && !textoCard.includes(normalizar(filtroTexto))) return false;
        if (filtroChip === 'promocao') return p.promocao === 'sim';
        if (filtroChip && filtroChip !== '') {
            const keywords = MAPAS_FILTROS[modoAtual][filtroChip] || [];
            if (!keywords.some(k => textoCard.includes(normalizar(k))) && !textoCard.includes(normalizar(filtroChip))) return false;
        }
        return true;
    });

    filtrados = aplicarAlgoritmoVisibilidade(filtrados);

    const paramModo = modoAtual === 'restaurants' ? 'gourmet' : 'produto';
    grid.innerHTML = filtrados.map(p => {
        const img = otimizarURL(p.foto || (p.fotos && p.fotos[0]) || "https://via.placeholder.com/300", 400);
        if (modoAtual === 'restaurants') {
            return `<div class="gourmet-card" onclick="navegarParaProduto('${p.owner}', '${p.id}', '${paramModo}')">
                    <div class="gourmet-img-box"><img src="${img}" loading="lazy"></div>
                    <div class="gourmet-body"><div class="gourmet-name">${p.nome}</div><div class="gourmet-price">R$ ${p.preco}</div></div>
                </div>`;
        } else {
            const isRoupa = p.tipoProduto === 'roupa';
            const temTamanhos = (p.tamanhosDisponiveis && p.tamanhosDisponiveis.length > 0) || (p.numeracoes && p.numeracoes.trim() !== "");
            let btnHTML = (isRoupa && temTamanhos) ? `<button class="btn-add-main">Escolher opções</button>` : 
                `<button class="btn-add-main" onclick="event.stopPropagation(); window.adicionarAoCarrinho('${p.id}', '${p.nome}', '${p.preco}', '${p.owner}', '${p.whatsapp}', '${img}')">Adicionar</button>`;
            return `<div class="product-card" onclick="navegarParaProduto('${p.owner}', '${p.id}', '${paramModo}')">
                    <div class="img-box"><img src="${img}" loading="lazy"></div>
                    <div class="card-body"><div class="p-name">${p.nome}</div><div class="p-price">R$ ${p.preco}</div>${btnHTML}</div>
                </div>`;
        }
    }).join('');
}

window.navegarParaProduto = (owner, id, modo) => {
    const grid = document.getElementById('grid-produtos');
    if (grid) sessionStorage.setItem('pedeai_dom_cache', grid.innerHTML);
    sessionStorage.setItem('pedeai_scroll', window.scrollY);
    window.location.href = `vitrine-lojista.html?seller=${owner}&product=${id}&modo=${modo}`;
};

window.filtrarPorPalavra = (termo, elemento) => {
    filtroChip = normalizar(termo);
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    elemento.classList.add('active');
    sessionStorage.removeItem('pedeai_dom_cache'); 
    renderizarProdutos();
};

window.addEventListener('changeMode', (e) => {
    if (modoAtual === e.detail && !isReturning) return;
    modoAtual = e.detail;
    filtroChip = ''; 
    const logo = document.getElementById('main-logo');
    if(logo) {
        let iconHtml = modoAtual === 'restaurants' ? '<i class="fas fa-utensils"></i>' : (modoAtual === 'classifieds' ? '<i class="fas fa-bullhorn"></i>' : '<i class="fas fa-bag-shopping"></i>');
        logo.innerHTML = `${iconHtml} Pede Aí`;
    }
    sessionStorage.removeItem('pedeai_dom_cache');
    renderizarCarrosselAutomatico();
    renderizarFiltros();
    renderizarProdutos();
});

document.getElementById('inputBusca')?.addEventListener('input', (e) => {
    filtroTexto = e.target.value;
    sessionStorage.removeItem('pedeai_dom_cache');
    renderizarProdutos();
});

inicializar();