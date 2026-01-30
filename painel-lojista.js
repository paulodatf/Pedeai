// js/painel-lojista.js
import { db, GetRegrasLojista } from './config.js'; 
import { collection, addDoc, getDocs, getDoc, query, where, deleteDoc, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const userId = localStorage.getItem('userId');
if (!userId) window.location.href = 'login.html';

let userData = null;
let categoriaFixaPlanoBasico = null;
let contextoAtual = 'Geral'; // Contexto padrão

window.switchTab = (tab) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.secao-painel').forEach(s => s.classList.remove('active'));
    
    if(tab === 'config') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('aba-config').classList.add('active');
    } else {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('aba-vitrine').classList.add('active');
        carregarProdutos();
    }
};

window.trocarContexto = (contexto) => {
    contextoAtual = contexto;
    
    // AJUSTE: Atualiza o texto visual do botão de gatilho (o card que abre o form)
    const txtBtnGatilho = document.getElementById('txtBtnPublicarContexto');
    if(txtBtnGatilho) txtBtnGatilho.innerText = contexto.toUpperCase();

    // AJUSTE: Atualiza o título dentro do formulário que abre
    const txtTituloForm = document.getElementById('txtContextoForm');
    if(txtTituloForm) txtTituloForm.innerText = contexto;

    // UI Visual
    document.querySelectorAll('.radio-contexto').forEach(el => el.classList.remove('active'));
    if(contexto === 'Geral') document.getElementById('labelCtxGeral').classList.add('active');
    else document.getElementById('labelCtxComida').classList.add('active');

    document.getElementById('txtContextoPerfil').innerText = contexto;

    // =========================================================
    // BLOCO ADICIONADO: CONTROLE DE EXIBIÇÃO DOS LINKS
    // =========================================================
    const btnVitrine = document.getElementById('btn-link-vitrine');
    const btnCardapio = document.getElementById('btn-link-cardapio');
    const areaLink = document.getElementById('area-link-gerado');

    // Esconde a área de link aberto para não mostrar o link antigo ao trocar
    if(areaLink) areaLink.style.display = 'none';

    if (btnVitrine && btnCardapio) {
        if (contexto === 'Comida') {
            btnVitrine.style.setProperty('display', 'none', 'important');
            btnCardapio.style.setProperty('display', 'flex', 'important');
        } else {
            btnVitrine.style.setProperty('display', 'flex', 'important');
            btnCardapio.style.setProperty('display', 'none', 'important');
        }
    }
    // =========================================================

    // Atualiza o select de categoria no formulário de produtos automaticamente
    const selectCat = document.getElementById('pCategoria');
    if(selectCat) {
        selectCat.value = contexto;
        if (window.toggleFormFields) window.toggleFormFields();
    }

    // Mostra/Esconde card de montar
    const cardMontar = document.getElementById('card-config-montar');
    if(cardMontar) cardMontar.style.display = contexto === 'Comida' ? 'block' : 'none';

    // AJUSTE SOLICITADO: Mostra/Esconde o campo "Tipo de Produto" baseado no contexto
    const groupTipo = document.getElementById('groupTipoProduto');
    if(groupTipo) {
        groupTipo.style.display = contexto === 'Comida' ? 'none' : 'block';
    }

    // Carrega dados específicos do contexto (Nome e Foto)
    atualizarUIPerfil();
    carregarProdutos();
};

function atualizarUIPerfil() {
    if (!userData) return;

    // Lógica de Identidade Visual por Contexto
    const nomeCtx = (contextoAtual === 'Comida' ? userData.nomeLojaComida : userData.nomeLojaGeral) || userData.nomeLoja || "Minha Loja";
    const fotoCtx = (contextoAtual === 'Comida' ? userData.fotoPerfilComida : userData.fotoPerfilGeral) || userData.fotoPerfil;

    // Header
    document.getElementById('nomeLojaHead').innerText = nomeCtx;
    const imgHeader = document.getElementById('fotoLoja');
    if(imgHeader) imgHeader.src = fotoCtx || "https://via.placeholder.com/50";

    // Inputs
    document.getElementById('inputNomeLoja').value = nomeCtx;
    const preview = document.getElementById('previewPerfil');
    if(preview && fotoCtx) {
        preview.style.backgroundImage = `url(${fotoCtx})`;
        preview.style.display = 'block';
    } else if(preview) {
        preview.style.display = 'none';
    }
}
async function verificarStatus() {
    try {
        const docRef = doc(db, "usuarios", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            userData = docSnap.data();
            userData.id = userId;
            
            // VERIFICAÇÃO DE BLOQUEIO POR PAGAMENTO
            if (userData.status === 'bloqueado' || userData.status === 'inadimplente' || userData.bloqueado === true || userData.bloqueado === "true") {
                document.body.innerHTML = `
                    <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-family: sans-serif; padding: 20px; background: #f8f9fa;">
                        <i class="fa-solid fa-hand-holding-dollar" style="font-size: 50px; color: #dc3545; margin-bottom: 20px;"></i>
                        <h2 style="color: #333;">Acesso Suspenso</h2>
                        <p style="color: #666; max-width: 400px; line-height: 1.5;">
                            Seu acesso foi temporariamente suspenso por falta de pagamento.<br>
                            <b>Regularize para voltar a usar o painel e reativar sua vitrine.</b>
                        </p>
                        <a href="https://wa.me/556692387529" style="margin-top: 20px; padding: 12px 25px; background: #28a745; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                            Falar com Suporte
                        </a>
                    </div>
                `;
                return; // Interrompe qualquer outra lógica do painel
            }
            
            const regras = GetRegrasLojista(userData);
            const estaAutorizado = userData.status === 'ativo' || userData.status === 'aprovado';
            
            
            document.getElementById('labelPlano').innerText = "Plano: " + (userData.planoAtivo || "Básico").toUpperCase();
            document.getElementById('labelPlano').style.color = regras.corPlano;
            
            const btnPublicar = document.getElementById('btn-salvar');
            const msgBloqueio = document.getElementById('msgAvisoAdmin');

            if (!estaAutorizado) {
                if(btnPublicar) btnPublicar.disabled = true;
                if(msgBloqueio) {
                    msgBloqueio.style.display = 'block';
                    msgBloqueio.innerText = "⚠️ Aguardando aprovação do administrador para publicar.";
                }
            } else {
                if(msgBloqueio) msgBloqueio.style.display = 'none';
                aplicarRegrasDePlanoNaInterface();
            }

   // Se for Plano Básico, verificamos se ele já tem um tema definido
if (userData.planoAtivo === 'basico' || !userData.planoAtivo) {
    if (!userData.temaEscolhido) {
        // Se não escolheu, forçamos a escolha antes de mostrar qualquer coisa
        escolherTemaInicial(); 
        return; 
    }
    // Esconde o seletor (ele não pode trocar)
    document.getElementById('seletorContexto').style.display = 'none';
    
    // AJUSTE AQUI: Forçamos o contexto e atualizamos o texto do botão de publicação imediatamente
    contextoAtual = userData.temaEscolhido;
    window.trocarContexto(contextoAtual);
    
    // Garante que o texto do botão "Publicar Novo em..." reflita o tema salvo
    const txtBtn = document.getElementById('txtBtnPublicarContexto');
    if(txtBtn) txtBtn.innerText = contextoAtual.toUpperCase();

} else {
    // Premium/VIP continuam vendo o seletor normal
    document.getElementById('seletorContexto').style.display = 'block';
    window.trocarContexto('Geral');
}

            if(userData.montarAtivo) {
                document.getElementById('checkMontarGlobal').checked = true;
                document.getElementById('resumo-montar-global').style.display = 'flex';
                document.getElementById('form-montar-global').style.display = 'none';
                document.getElementById('mTitulo').value = userData.montarTitulo || "";
                
                if(userData.montarVariacoes) {
                    document.getElementById('lista-variacoes-global').innerHTML = "";
                    userData.montarVariacoes.forEach(v => window.addConfigRow('lista-variacoes-global', v.nome, v.preco));
                }
                if(userData.montarAdicionais) {
                    document.getElementById('lista-adicionais-global').innerHTML = "";
                    userData.montarAdicionais.forEach(a => window.addConfigRow('lista-adicionais-global', a.nome, a.preco));
                }
            }
        }
    } catch (e) { console.error("Erro ao verificar status:", e); }
}

async function aplicarRegrasDePlanoNaInterface() {
    const infoCategoria = document.getElementById('restricaoCategoria');
    const selectCat = document.getElementById('pCategoria');

    if (userData.planoAtivo === 'basico' || !userData.planoAtivo) {
        const q = query(collection(db, "produtos"), where("owner", "==", userId));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            categoriaFixaPlanoBasico = snap.docs[0].data().categoria;
            selectCat.value = categoriaFixaPlanoBasico;
            selectCat.disabled = true;
            infoCategoria.innerText = `📌 Plano Básico: Você está usando a categoria ${categoriaFixaPlanoBasico.toUpperCase()}.`;
            if(window.toggleFormFields) window.toggleFormFields();
        } else {
            infoCategoria.innerText = "💡 Plano Básico: O primeiro produto definirá sua categoria única (Comida ou Geral).";
        }
    } else {
        infoCategoria.innerText = `✨ Plano Profissional: Editando contexto ${contextoAtual.toUpperCase()}.`;
        infoCategoria.style.background = "#d4edda";
        infoCategoria.style.color = "#155724";
        selectCat.disabled = true; // Força usar o seletor de contexto do topo
    }
}

document.getElementById('btnSalvarNome').onclick = async () => {
    const novoNome = document.getElementById('inputNomeLoja').value;
    if(!novoNome) return alert("Digite um nome!");
    try {
        const updateData = {};
        if(userData.planoAtivo === 'premium' || userData.planoAtivo === 'vip') {
            const campo = contextoAtual === 'Comida' ? 'nomeLojaComida' : 'nomeLojaGeral';
            updateData[campo] = novoNome;
        } else {
            updateData.nomeLoja = novoNome;
        }

        await updateDoc(doc(db, "usuarios", userId), updateData);
        
        // Atualiza localmente para não precisar de reload pesado
        if(userData.planoAtivo === 'premium' || userData.planoAtivo === 'vip') {
            if(contextoAtual === 'Comida') userData.nomeLojaComida = novoNome;
            else userData.nomeLojaGeral = novoNome;
        } else {
            userData.nomeLoja = novoNome;
        }
        
        atualizarUIPerfil();
        alert("Nome atualizado para este contexto!");
    } catch (e) { alert("Erro ao atualizar nome."); }
};

document.getElementById('btn-salvar-montar').onclick = async () => {
    const btn = document.getElementById('btn-salvar-montar');
    const titulo = document.getElementById('mTitulo').value;
    const ativo = document.getElementById('checkMontarGlobal').checked;

    const variacoes = [];
    document.querySelectorAll('#lista-variacoes-global .item-config').forEach(row => {
        const n = row.querySelector('.conf-nome').value;
        const p = row.querySelector('.conf-preco').value;
        if(n) variacoes.push({nome: n, preco: p});
    });

    const adicionais = [];
    document.querySelectorAll('#lista-adicionais-global .item-config').forEach(row => {
        const n = row.querySelector('.conf-nome').value;
        const p = row.querySelector('.conf-preco').value;
        if(n) adicionais.push({nome: n, preco: p});
    });

    btn.innerText = "Salvando...";
    try {
        await updateDoc(doc(db, "usuarios", userId), { 
            montarAtivo: ativo,
            montarTitulo: titulo,
            montarVariacoes: variacoes,
            montarAdicionais: adicionais
        });
        
        if(ativo) {
            document.getElementById('form-montar-global').style.display = 'none';
            document.getElementById('resumo-montar-global').style.display = 'flex';
        }
        
        alert("Configuração de montagem salva!");
        btn.innerText = "SALVAR CONFIGURAÇÃO MONTAR";
    } catch (e) { alert("Erro ao salvar."); btn.innerText = "SALVAR CONFIGURAÇÃO MONTAR"; }
};

document.getElementById('inputFotoPerfil').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const statusText = document.getElementById('uploadStatus');
    if (!file) return;
    statusText.innerText = "Enviando...";
    try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "pedeairapido");
        const response = await fetch("https://api.cloudinary.com/v1_1/de0cvvii9/image/upload", { method: "POST", body: formData });
        const data = await response.json();
        
        const updateData = {};
        if(userData.planoAtivo === 'premium' || userData.planoAtivo === 'vip') {
            const campo = contextoAtual === 'Comida' ? 'fotoPerfilComida' : 'fotoPerfilGeral';
            updateData[campo] = data.secure_url;
            if(contextoAtual === 'Comida') userData.fotoPerfilComida = data.secure_url;
            else userData.fotoPerfilGeral = data.secure_url;
        } else {
            updateData.fotoPerfil = data.secure_url;
            userData.fotoPerfil = data.secure_url;
        }

        await updateDoc(doc(db, "usuarios", userId), updateData);
        atualizarUIPerfil();
        statusText.innerText = "Foto atualizada!";
    } catch (error) { statusText.innerText = "Erro ao enviar."; }
});

async function carregarProdutos() {
    const container = document.getElementById('lista-produtos');
    if (!container) return;
    try {
        const q = query(
            collection(db, "produtos"), 
            where("owner", "==", userId),
            where("categoria", "==", contextoAtual)
        );
        
        const snap = await getDocs(q);
        container.innerHTML = "";
        const contador = document.getElementById('contadorProd');
        if(contador) contador.innerText = `${snap.size} itens (${contextoAtual})`;
        
        snap.forEach(d => {
            const p = d.id;
            const data = d.data();
            const img = data.foto || (data.fotos && data.fotos[0]) || "https://via.placeholder.com/150";
            
            const isTurbo = data.turbo === 'sim';
            const isPromo = data.promocao === 'sim';

            container.innerHTML += `
                <div class="prod-card" id="card-${p}">
                    <button class="btn-del" onclick="excluirProd('${p}')">&times;</button>
                    ${isTurbo ? '<span class="badge-turbo">TURBO</span>' : ''}
                    ${isPromo ? '<span class="badge-promo">OFERTA</span>' : ''}
                    <img src="${img}" class="prod-img">
                    <div class="prod-details">
                        <div class="prod-name" id="name-txt-${p}">${data.nome}</div>
                        <div class="prod-price" id="price-txt-${p}">R$ ${data.preco}</div>
                    </div>

                    <div id="form-edit-${p}" class="form-edit-card">
                        <input type="text" id="edit-nome-${p}" value="${data.nome}">
                        <input type="text" id="edit-preco-${p}" value="${data.preco}">
                        ${data.tipoProduto === 'roupa' ? `<input type="text" id="edit-tam-${p}" value="${data.numeracoes || ''}" placeholder="Numeração">` : ''}
                        <button class="btn-post btn-mini" onclick="salvarEdicao('${p}')">Salvar</button>
                    </div>

                    <div class="prod-controls">
                        <button class="btn-ctrl" onclick="toggleEditCard('${p}')"><i class="fa-solid fa-pen"></i>Editar</button>
                        <button class="btn-ctrl ${isPromo ? 'active-promo' : ''}" onclick="togglePromo('${p}', ${isPromo})"><i class="fa-solid fa-tag"></i>Promo</button>
                        <button class="btn-ctrl ${isTurbo ? 'active-turbo' : ''}" onclick="toggleTurbo('${p}', ${isTurbo})"><i class="fa-solid fa-bolt"></i>Turbo</button>
                    </div>
                </div>`;
        });
    } catch (e) { console.error(e); }
}

// FUNCIONALIDADES DOS CARDS
window.toggleEditCard = (id) => {
    const form = document.getElementById(`form-edit-${id}`);
    form.style.display = form.style.display === 'block' ? 'none' : 'block';
};

window.salvarEdicao = async (id) => {
    const novoNome = document.getElementById(`edit-nome-${id}`).value;
    const novoPreco = document.getElementById(`edit-preco-${id}`).value;
    const updateData = { nome: novoNome, preco: novoPreco };
    
    const inputTam = document.getElementById(`edit-tam-${id}`);
    if(inputTam) updateData.numeracoes = inputTam.value;

    try {
        await updateDoc(doc(db, "produtos", id), updateData);
        document.getElementById(`name-txt-${id}`).innerText = novoNome;
        document.getElementById(`price-txt-${id}`).innerText = "R$ " + novoPreco;
        window.toggleEditCard(id);
        alert("Atualizado!");
    } catch (e) { alert("Erro ao editar."); }
};

window.togglePromo = async (id, statusAtual) => {
    if(!statusAtual) {
        const q = query(collection(db, "produtos"), where("owner", "==", userId), where("promocao", "==", "sim"));
        const snap = await getDocs(q);
    if(snap.size >= 6) return window.abrirModalLimite();
    }
    try {
        await updateDoc(doc(db, "produtos", id), { 
            promocao: statusAtual ? "nao" : "sim",
            promoExpira: statusAtual ? null : Date.now() + (24 * 60 * 60 * 1000)
        });
        carregarProdutos();
    } catch (e) { console.error(e); }
};

window.toggleTurbo = async (id, statusAtual) => {
    if(!statusAtual) {
        const plano = userData.planoAtivo || 'basico';
        const limites = { 'basico': 1, 'premium': 3, 'vip': 5 };
        const q = query(collection(db, "produtos"), where("owner", "==", userId), where("turbo", "==", "sim"));
        const snap = await getDocs(q);
if(snap.size >= limites[plano]) return window.abrirModalLimite();
    }
    try {
        await updateDoc(doc(db, "produtos", id), { turbo: statusAtual ? "nao" : "sim" });
        carregarProdutos();
    } catch (e) { console.error(e); }
};

document.getElementById('btn-salvar').onclick = async () => {
    const btn = document.getElementById('btn-salvar');
    const fInput = document.getElementById('pFoto');
    const nome = document.getElementById('pNome').value;
    const preco = document.getElementById('pPreco').value;
    const categoria = document.getElementById('pCategoria').value;
    const tipo = document.getElementById('pTipo').value;

    if (!nome || !preco) return alert("Preencha nome e preço.");
    if (!categoria) return alert("Selecione um setor!");
    if (document.getElementById('groupTipoProduto').style.display !== 'none' && !tipo) {
        return alert("Selecione o tipo de produto!");
    }
    if (fInput.files.length === 0) return alert("Selecione ao menos uma foto.");

    btn.innerText = "Publicando...";
    btn.disabled = true;

    try {
        const urls = [];
        for (let i = 0; i < fInput.files.length; i++) {
            const fd = new FormData();
            fd.append("file", fInput.files[i]);
            fd.append("upload_preset", "pedeairapido");
            const res = await fetch("https://api.cloudinary.com/v1_1/de0cvvii9/image/upload", { method: "POST", body: fd });
            const data = await res.json();
            if (data.secure_url) urls.push(data.secure_url);
        }

        let tamanhos = [];
        let numeracao = "";
        if(categoria === 'Geral' && tipo === 'roupa') {
            document.querySelectorAll('input[name="tam"]:checked').forEach(el => tamanhos.push(el.value));
            numeracao = document.getElementById('pNumeracao').value;
        }

        await addDoc(collection(db, "produtos"), {
            nome, 
            preco, 
            owner: userId, 
            turbo: "nao", 
            promocao: "nao",
            fotos: urls, 
            foto: urls[0],
            descricao: document.getElementById('pDesc').value,
            categoria: categoria,
            tipoProduto: tipo,
            tamanhosDisponiveis: tamanhos,
            numeracoes: numeracao,
            variacoes: [],
            adicionais: [],
            whatsapp: userData.whatsapp || "",
            createdAt: serverTimestamp()
        });

        alert("Produto cadastrado!");
        document.getElementById('pNome').value = "";
        document.getElementById('pPreco').value = "";
        carregarProdutos(); 
        btn.disabled = false;
        btn.innerText = "PUBLICAR NA VITRINE";
    } catch (error) { 
        alert("Erro ao publicar."); 
        btn.disabled = false; 
        btn.innerText = "PUBLICAR NA VITRINE"; 
    } 
};

window.excluirProd = async (id) => { if(confirm("Excluir item?")) { await deleteDoc(doc(db, "produtos", id)); carregarProdutos(); } };
document.getElementById('btnSair').onclick = () => { localStorage.clear(); window.location.href = 'login.html'; };

verificarStatus();

// Função para gerar o link do Cartão de Visita Digital
window.gerarLinkCartaoVisita = function(modo) {
    const userId = localStorage.getItem('userId'); // Recupera o ID do lojista logado
    if (!userId) return alert("Erro: Usuário não identificado.");

    const urlBase = window.location.origin + window.location.pathname.replace('painel-lojista.html', 'vitrine-cartao.html');
    const linkFinal = `${urlBase}?lojista=${userId}&modo=${modo}`;
    
    console.log("Link Gerado:", linkFinal);
    return linkFinal;
};
// Função para gerar e exibir o link na interface
window.prepararLink = function(modo) {
    // AJUSTE: Se for plano básico, força o modo correto independente do clique
    let modoReal = modo;
    if (userData && (userData.planoAtivo === 'basico' || !userData.planoAtivo)) {
        modoReal = (userData.temaEscolhido === 'Comida') ? 'gourmet' : 'vitrine';
    }

    const link = window.gerarLinkCartaoVisita(modoReal);
    const area = document.getElementById('area-link-gerado');
    const input = document.getElementById('inputLinkCopia');
    const label = document.getElementById('labelTipoLink');
    const icone = document.getElementById('iconeLink');

    if (modoReal === 'gourmet') {
        label.innerText = "🍔 Este é o link do seu cardápio online:";
        icone.innerHTML = "🍕";
    } else {
        label.innerText = "📢 Este é o link da sua vitrine digital:";
        icone.innerHTML = "🛍️";
    }
    
    input.value = link;
    area.style.display = 'block';
    
    window.scrollTo({ top: area.offsetTop - 150, behavior: 'smooth' });
};

// Função de cópia com Pop-up Quadrado
window.copiarLinkBotao = function() {
    const input = document.getElementById('inputLinkCopia');
    const linkOriginal = input.value;
    
    const isCardapio = linkOriginal.includes('modo=gourmet');
    
    // Criação do texto de divulgação com emojis e quebra de linha
    let textoDivulgacao = "";
    if (isCardapio) {
        textoDivulgacao = `🍔 Confira nosso cardápio online no PedeAí 👇\n${linkOriginal}`;
    } else {
        textoDivulgacao = `🛍️ Confira nossa vitrine digital no PedeAí 👇\n${linkOriginal}`;
    }

    // Mensagem que aparece no balão verde na tela
    const mensagemFeedback = isCardapio 
        ? "🍔🍕 Sucesso!<br><br>O link do seu cardápio foi copiado com o texto de divulgação! ☺️"
        : "🛍️🛒 Sucesso!<br><br>O link da sua vitrine foi copiado com o texto de divulgação! ☺️";

    try {
        // Copia o texto de divulgação (Texto + Link) para o celular/computador
        navigator.clipboard.writeText(textoDivulgacao).then(() => {
            abrirPopUpSucesso(mensagemFeedback);
        });
    } catch (err) {
        // Fallback para navegadores antigos: aqui ele copiará o que estiver no input
        input.value = textoDivulgacao; 
        input.select();
        document.execCommand('copy');
        input.value = linkOriginal; // Volta o valor do input ao normal
        abrirPopUpSucesso(mensagemFeedback);
    }
};

// Função para criar o Pop-up com X vermelho
function abrirPopUpSucesso(texto) {
    // Remove se já houver um aberto
    const overlayExistente = document.querySelector('.popup-copiado-overlay');
    if (overlayExistente) overlayExistente.remove();

    const overlay = document.createElement('div');
    overlay.className = 'popup-copiado-overlay';
    
    overlay.innerHTML = `
        <div class="popup-copiado-box">
            <button class="btn-fechar-popup" onclick="this.parentElement.parentElement.remove()">X</button>
            <div style="font-size: 16px; line-height: 1.4;">${texto}</div>
        </div>
    `;

    // Fecha ao clicar fora do quadrado verde
    overlay.onclick = function(e) {
        if (e.target === overlay) overlay.remove();
    };

    document.body.appendChild(overlay);
}

// A função base que você já possui (garanta que esteja presente)
window.gerarLinkCartaoVisita = function(modo) {
    const userId = localStorage.getItem('userId');
    const urlBase = window.location.origin + window.location.pathname.replace('painel-lojista.html', 'vitrine-cartao.html');
    return `${urlBase}?lojista=${userId}&modo=${modo}`;
};
// AJUSTE CIRÚRGICO: Função de Suporte Global via Firebase
window.abrirSuporteDinamico = async function() {
    let numeroSuporte = "5511999999999"; // Número padrão caso o banco falhe
    
    try {
        // Busca o número que o Admin salvou no Firebase
        const docRef = doc(db, "configuracoes", "suporte");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().numero) {
            numeroSuporte = docSnap.data().numero;
        }
    } catch (e) {
        console.error("Erro ao carregar suporte global:", e);
    }
    
    const numLimpo = numeroSuporte.replace(/\D/g, '');
    const mensagem = encodeURIComponent("Olá! Preciso de ajuda com meu painel.");
    window.open(`https://wa.me/${numLimpo}?text=${mensagem}`, '_blank');
};
async function escolherTemaInicial() {
    // Cria um fundo branco por cima de tudo para a escolha
    const overlay = document.createElement('div');
    overlay.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:white;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center;";
    overlay.innerHTML = `
        <h2>Seu plano é Básico</h2>
        <p>Escolha em qual setor deseja atuar.<br><b>Esta escolha não poderá ser alterada depois.</b></p>
        <div style="display:flex; gap:20px; margin-top:20px;">
            <button onclick="definirTema('Geral')" style="padding:20px; border:2px solid #ee4d2d; border-radius:10px; background:none; cursor:pointer; font-weight:bold;">🛒 Produtos Gerais<br>(Vitrine)</button>
            <button onclick="definirTema('Comida')" style="padding:20px; border:2px solid #ffc107; border-radius:10px; background:none; cursor:pointer; font-weight:bold;">🍔 Comida / Delivery<br>(Cardápio)</button>
        </div>
    `;
    document.body.appendChild(overlay);

    window.definirTema = async (tema) => {
        if(confirm(`Confirmar setor ${tema.toUpperCase()}?`)) {
            await updateDoc(doc(db, "usuarios", userId), { temaEscolhido: tema });
            window.location.reload(); // Recarrega já com a trava aplicada
        }
    };
}