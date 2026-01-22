import { db } from './config.js';
import { collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Função de Login com tratamento de status
 */
export async function realizarLogin(email, senha) {
    try {
        const q = query(
            collection(db, "usuarios"), 
            where("email", "==", email.toLowerCase()), 
            where("senha", "==", String(senha))
        );
        
        const snap = await getDocs(q);

        if (snap.empty) {
            alert("E-mail ou senha incorretos.");
            return;
        }

        const docUser = snap.docs[0];
        const dados = docUser.data();

        // Armazenamento de Sessão (Login permitido mesmo se pendente)
        localStorage.setItem('userId', docUser.id);
        localStorage.setItem('nomeLoja', dados.nomeLoja);
        
        // Redirecionamento
        window.location.href = 'painel-lojista.html';

    } catch (error) {
        console.error("Erro no processo de login:", error);
        alert("Falha ao conectar com o servidor.");
    }
}

/**
 * Função de Cadastro com status pendente
 */
export async function cadastrarLojista(nomeLoja, email, senha, whatsapp) {
    try {
        const q = query(collection(db, "usuarios"), where("email", "==", email.toLowerCase()));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            alert("Este e-mail já está cadastrado em nosso sistema.");
            return;
        }

        // WhatsApp com prefixo fixo
        const zapFixo = whatsapp.startsWith('+55') ? whatsapp : '+55' + whatsapp.replace(/\D/g, '');

        await addDoc(collection(db, "usuarios"), {
            nomeLoja: nomeLoja,
            email: email.toLowerCase(),
            senha: String(senha),
            whatsapp: zapFixo,
            status: "pendente",
            createdAt: new Date()
        });

        alert("Cadastro inicial realizado! Agora escolha seu plano.");
        // O fluxo de redirecionamento é controlado pelo HTML de cadastro
    } catch (error) {
        console.error("Erro no cadastro:", error);
        alert("Erro ao enviar solicitação.");
    }
}