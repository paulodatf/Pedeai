import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// SUAS CREDENCIAIS ORIGINAIS (MANTIDAS)
const firebaseConfig = {
    apiKey: "AIzaSyDQ8rwkKUpbiZ6zII2Pd62q-8sAK_CDLs0",
    authDomain: "ofcpedeai.firebaseapp.com",
    projectId: "ofcpedeai",
    storageBucket: "ofcpedeai.firebasestorage.app",
    messagingSenderId: "1013404177752",
    appId: "1:1013404177752:web:a3b175b55939e3ad47812d"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

/**
 * CONFIGURAÇÕES CENTRALIZADAS DE PLANOS ATUALIZADAS
 */
export const CONFIG_SISTEMA = {
    pix: "SUA-CHAVE-PIX-AQUI", 
    planos: {
        basico: { 
            nome: "Básico", 
            limiteProdutos: 40, 
            limiteFotosPorProduto: 1, 
            limiteTurbos: 1,
            temDireitoTurbo: true,
            cor: "#6c757d" 
        },
        premium: { 
            nome: "Premium", 
            limiteProdutos: 70, 
            limiteFotosPorProduto: 3, 
            limiteTurbos: 3,
            temDireitoTurbo: true,
            cor: "#ee4d2d" 
        },
        vip: { 
            nome: "VIP", 
            limiteProdutos: 9999, 
            limiteFotosPorProduto: 6, 
            limiteTurbos: 5,
            temDireitoTurbo: true,
            cor: "#ffc107" 
        }
    }
};

/**
 * LÓGICA DE VALIDAÇÃO DE PERMISSÕES (HELPERS)
 */
export const GetRegrasLojista = (dadosLojista) => {
    const planoChave = dadosLojista?.planoAtivo || "basico";
    const status = dadosLojista?.status || "pendente";
    
    const configuracaoPlano = CONFIG_SISTEMA.planos[planoChave] || CONFIG_SISTEMA.planos.basico;

    return {
        isAprovado: status === "ativo" || status === "aprovado",
        planoNome: configuracaoPlano.nome,
        limiteProdutos: configuracaoPlano.limiteProdutos,
        limiteTurbos: configuracaoPlano.limiteTurbos,
        podeAdicionarFoto: (qtdAtual) => qtdAtual < configuracaoPlano.limiteFotosPorProduto,
        temAcessoTurbo: configuracaoPlano.temDireitoTurbo,
        corPlano: configuracaoPlano.cor
    };
};