const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbziOKaJyBo-nri3XuAzDzOXh07rOj7c-aVg3puOVhM5V9wW5W980QLE1MVlnHg4pFGhLQ/exec";

function tocarSomMoeda() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const notas = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notas.forEach((freq, index) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            const inicio = audioCtx.currentTime + (index * 0.08);
            osc.frequency.setValueAtTime(freq, inicio);
            gain.gain.setValueAtTime(0, inicio);
            gain.gain.linearRampToValueAtTime(0.1, inicio + 0.01);
            const duracao = (index === notas.length - 1) ? 0.4 : 0.08;
            gain.gain.exponentialRampToValueAtTime(0.001, inicio + duracao);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(inicio);
            osc.stop(inicio + duracao + 0.05);
        });
    } catch (e) { }
}

function abrirLoading(titulo, desc) {
    const loading = document.getElementById('loadingOverlay');
    if (!loading) return;
    document.getElementById('loadingIcon').style.display = 'block';
    document.getElementById('statusIcon').style.display = 'none';
    document.getElementById('btnFecharOverlay').style.display = 'none';
    document.getElementById('loadingTexto').innerText = titulo || "Processando...";
    document.getElementById('loadingDesc').innerText = desc || "Aguarde um momento";
    document.getElementById('loadingTexto').className = '';
    loading.style.display = 'flex';
}

function showStatus(sucesso, titulo, desc) {
    const loading = document.getElementById('loadingOverlay');
    if (!loading) return;
    loading.style.display = 'flex';
    document.getElementById('loadingIcon').style.display = 'none';
    const sIcon = document.getElementById('statusIcon');
    sIcon.style.display = 'block';
    sIcon.innerText = sucesso ? '✅' : '❌';
    const lTexto = document.getElementById('loadingTexto');
    lTexto.innerText = titulo;
    lTexto.className = sucesso ? 'text-sucesso' : 'text-erro';
    document.getElementById('loadingDesc').innerText = desc;
    document.getElementById('btnFecharOverlay').style.display = sucesso ? 'none' : 'block';
}

function fecharOverlay() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) loading.style.display = 'none';
}

function fazerLogout() {
    sessionStorage.removeItem("dora_auth");
    sessionStorage.removeItem("dora_admin_id");
    sessionStorage.removeItem("dora_admin_pass");
    window.location.href = "index.html";
}

async function salvarCliente() {
    const idUser = document.getElementById('regIdUser').value.replace(/\D/g, '');
    const nome = document.getElementById('regNome').value.toUpperCase();
    if (idUser.length !== 8 && idUser.length !== 11) {
        showStatus(false, "Formato Inválido", "RA deve ter 8 números ou CPF deve ter 11 números.");
        return;
    }
    if (!nome) {
        showStatus(false, "Nome Vazio", "Por favor, digite o nome completo.");
        return;
    }
    abrirLoading("Salvando...", "Registrando usuário");
    try {
        await fetch(URL_PLANILHA, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ idUser: idUser, nome: nome, pontos: 0 })
        });
        showStatus(true, "Sucesso!", "Usuário cadastrado com sucesso.");
        setTimeout(() => window.location.href = "index.html", 1500);
    } catch (e) {
        showStatus(false, "Erro", "Não foi possível conectar.");
    }
}

async function buscarPorIdUser() {
    const field = document.getElementById('nomeCliente');
    if (!field) return;
    const idUserInput = field.value.replace(/\D/g, '');
    const displaySaldo = document.getElementById('saldoPontos');
    const displayNome = document.getElementById('nomeExibicao');

    if (idUserInput.length !== 8 && idUserInput.length !== 11) {
        showStatus(false, "ID Inválido", "Informe RA ou CPF corretos.");
        return;
    }

    abrirLoading("Buscando...", "Acessando banco de dados");
    try {
        const response = await fetch(`${URL_PLANILHA}?idUser=${idUserInput}`);
        const texto = await response.text();
        if (texto === "Não encontrado") {
            showStatus(false, "Não Encontrado", "RA ou CPF não cadastrado.");
            window.idUserAtual = null;
        } else {
            fecharOverlay();
            const dados = JSON.parse(texto);
            displayNome.innerText = dados.nome;
            displaySaldo.innerText = dados.pontos;

            // --- Lógica do QR Code para Admin ---
            const containerQr = document.getElementById('containerQrAdmin');
            const imgQr = document.getElementById('qrAdmin');
            if (containerQr && imgQr) {
                // Remove qualquer barra final da URL atual e aponta para controle.html
                const urlBase = window.location.href.split('consulta.html')[0];
                const urlControle = `${urlBase}controle.html?idUser=${idUserInput}`;
                imgQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(urlControle)}`;
                containerQr.style.display = 'block';
            }

            window.idUserAtual = idUserInput;
            window.pontosOriginais = parseInt(dados.pontos) || 0;
            window.pontosPendentes = 0;
            if (document.getElementById('previewPontos')) document.getElementById('previewPontos').innerText = "0";
            const label = document.getElementById('labelStatusPontos');
            if (label) {
                label.innerText = "Aguardando Seleção";
                label.style.color = "#888";
            }
            if (document.getElementById('btnSalvarPontos')) document.getElementById('btnSalvarPontos').disabled = true;

            const pExtrato = document.getElementById('historicoTransacoes');
            const lExtrato = document.getElementById('listaExtrato');
            if (pExtrato) {
                if (dados.historico && dados.historico.length > 0) {
                    pExtrato.style.display = 'block';
                    lExtrato.innerHTML = '';
                    dados.historico.forEach(item => {
                        const strVal = item.pontos.toString();
                        const v = parseInt(strVal.replace(/[^\d]/g, '')) || 0;
                        const classeCor = strVal.includes('-') ? 'valor-negativo' : 'valor-positivo';
                        const sinal = strVal.includes('-') ? '-' : '+';

                        let dataAmigavel = item.data;
                        try {
                            const objData = new Date(item.data);
                            if (!isNaN(objData.getTime())) {
                                const dia = String(objData.getDate()).padStart(2, '0');
                                const mes = String(objData.getMonth() + 1).padStart(2, '0');
                                const hora = String(objData.getHours()).padStart(2, '0');
                                const min = String(objData.getMinutes()).padStart(2, '0');
                                dataAmigavel = `${dia}/${mes} às ${hora}:${min}`;
                            }
                        } catch (e) { }

                        lExtrato.innerHTML += `
                            <div class="extrato-item">
                                <span class="extrato-data" style="font-size: 0.8rem;">🕒 ${dataAmigavel}</span>
                                <span class="extrato-valor ${classeCor}">${sinal}${v}</span>
                            </div>
                        `;
                    });
                } else {
                    pExtrato.style.display = 'none';
                }
            }
        }
    } catch (e) {
        showStatus(false, "Erro", "Falha na conexão.");
    }
}

function adicionarAosPontosParaEnviar(quantidade) {
    if (!window.idUserAtual) {
        showStatus(false, "Busque o Usuário", "Pesquise o RA ou CPF primeiro.");
        return;
    }
    let novaSoma = (window.pontosPendentes || 0) + quantidade;
    if (window.pontosOriginais + novaSoma < 0) {
        showStatus(false, "Saldo Insuficiente", "O saldo não pode ficar negativo.");
        return;
    }
    window.pontosPendentes = novaSoma;
    // Atualiza o texto e a cor do status
    const label = document.getElementById('labelStatusPontos');
    const preview = document.getElementById('previewPontos');
    if (preview) preview.innerText = (window.pontosPendentes > 0 ? "+" : "") + window.pontosPendentes;

    if (label) {
        if (window.pontosPendentes > 0) {
            label.innerText = "Pontos a acrescentar";
            label.style.color = "var(--success)";
        } else if (window.pontosPendentes < 0) {
            label.innerText = "Pontos a remover";
            label.style.color = "var(--danger)";
        } else {
            label.innerText = "Aguardando Seleção";
            label.style.color = "#888";
        }
    }

    const btnSalvar = document.getElementById('btnSalvarPontos');
    if (btnSalvar) btnSalvar.disabled = (window.pontosPendentes === 0);
}

async function enviarPontos() {
    if (!window.idUserAtual || window.pontosPendentes === 0) return;
    tocarSomMoeda();

    const idDestino = window.idUserAtual;
    const valorMudar = window.pontosPendentes;
    window.pontosPendentes = 0;

    const adminId = sessionStorage.getItem("dora_admin_id") || "";
    const adminPass = sessionStorage.getItem("dora_admin_pass") || "";

    abrirLoading("Enviando...", "Validando permissões e salvando");
    try {
        await fetch(URL_PLANILHA, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({
                action: "update",
                idUser: idDestino,
                pontos: valorMudar,
                adminId: adminId,
                adminPass: adminPass
            })
        });
        showStatus(true, "Sucesso!", "Saldo atualizado!");
        setTimeout(() => { fecharOverlay(); buscarPorIdUser(); }, 1500);
    } catch (e) {
        showStatus(false, "Erro", "Não foi possível salvar.");
    }
}