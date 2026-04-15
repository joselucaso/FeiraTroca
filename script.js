const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbzIZP5IguEzbnHGrr8nlmDqzmsCX5ykirWmehdyN24HHBwh6ca2lZFh76SqBYW6aeZRhw/exec";

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
        showStatus(false, "Erro no Nome", "Por favor, preencha o nome do usuário.");
        return;
    }

    abrirLoading("Salvando Usuário...", "Registrando no banco de dados");

    try {
        const checar = await fetch(`${URL_PLANILHA}?idUser=${idUser}`);
        const resultado = await checar.text();

        if (resultado !== "Não encontrado") {
            showStatus(false, "Usuário já existe!", "Este RA ou CPF já está cadastrado.");
            return;
        }

        await fetch(URL_PLANILHA, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ idUser: idUser, nome: nome, pontos: 0 })
        });

        showStatus(true, "Sucesso!", "Usuário cadastrado com sucesso.");
        setTimeout(() => window.location.href = "index.html", 2000);
    } catch (error) {
        showStatus(false, "Erro de Conexão", "Não foi possível salvar os dados.");
    }
}

async function buscarPorIdUser() {
    const idUserInput = document.getElementById('nomeCliente').value.replace(/\D/g, '');
    const displaySaldo = document.getElementById('saldoPontos');
    const displayNome = document.getElementById('nomeExibicao');

    if (idUserInput.length !== 8 && idUserInput.length !== 11) {
        showStatus(false, "Formato Inválido", "RA deve ter 8 números ou CPF deve ter 11 números.");
        return;
    }

    abrirLoading("Buscando Dados...", "Acessando banco de dados");
    displaySaldo.innerText = "...";
    displayNome.innerText = "Buscando...";

    try {
        const response = await fetch(`${URL_PLANILHA}?idUser=${idUserInput}`);
        const texto = await response.text();

        if (texto === "Não encontrado") {
            showStatus(false, "Não Encontrado", "Este RA ou CPF não consta no sistema.");
            displaySaldo.innerText = "0";
            displayNome.innerText = "---";
            if (document.getElementById('historicoTransacoes')) document.getElementById('historicoTransacoes').style.display = 'none';
        } else {
            fecharOverlay();
            const dados = JSON.parse(texto);
            displayNome.innerText = dados.nome;
            displaySaldo.innerText = dados.pontos;

            const painelExtrato = document.getElementById('historicoTransacoes');
            const listaExtrato = document.getElementById('listaExtrato');

            if (painelExtrato && dados.historico && dados.historico.length > 0) {
                painelExtrato.style.display = 'block';
                listaExtrato.innerHTML = '';
                dados.historico.forEach(item => {
                    const strVal = item.valor.toString();
                    const v = parseInt(strVal.replace(/\D/g, '')) || 0;
                    let classeCor = 'valor-positivo';
                    let sinalFormatado = strVal.includes('+') ? '+' : (strVal.includes('-') ? '-' : '');
                    if (strVal.includes('-')) classeCor = 'valor-negativo';

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

                    listaExtrato.innerHTML += `
                        <div class="extrato-item">
                            <span class="extrato-data" style="font-size: 0.85rem;">🕒 ${dataAmigavel}</span>
                            <span class="extrato-valor ${classeCor}">${sinalFormatado}${v}</span>
                        </div>
                    `;
                });
            } else if (painelExtrato) {
                painelExtrato.style.display = 'none';
            }

            window.pontosOriginais = parseInt(dados.pontos) || 0;
            window.pontosPendentes = 0;
            window.idUserAtual = idUserInput;

            const btnSalvar = document.getElementById('btnSalvarPontos');
            if (btnSalvar) btnSalvar.disabled = true;
            const feedbackCesta = document.getElementById('feedbackCesta');
            if (feedbackCesta) feedbackCesta.style.display = 'none';
        }
    } catch (error) {
        showStatus(false, "Erro de Conexão", "Não foi possível conectar à planilha.");
    }
}

function acumularPontos(quantidade) {
    if (!window.idUserAtual) {
        showStatus(false, "Usuário Ausente", "Busque o RA ou CPF antes de alterar pontos.");
        return;
    }
    let novaSoma = (window.pontosPendentes || 0) + quantidade;
    if (window.pontosOriginais + novaSoma < 0) {
        showStatus(false, "Saldo Insuficiente", "O saldo não pode ficar negativo.");
        return;
    }
    window.pontosPendentes = novaSoma;
    document.getElementById('saldoPontos').innerText = window.pontosOriginais;
    const feedback = document.getElementById('feedbackCesta');
    if (feedback) {
        feedback.style.display = window.pontosPendentes !== 0 ? 'block' : 'none';
        feedback.style.color = window.pontosPendentes > 0 ? '#28a745' : '#dc3545';
        feedback.innerText = (window.pontosPendentes > 0 ? 'Acrescentando: +' : 'Removendo: ') + window.pontosPendentes;
    }
    const btnSalvar = document.getElementById('btnSalvarPontos');
    if (btnSalvar) btnSalvar.disabled = (window.pontosPendentes === 0);
}

async function enviarPontos() {
    if (!window.idUserAtual || window.pontosPendentes === 0) return;
    tocarSomMoeda();
    const idUserInput = window.idUserAtual;
    const quantidadeTotalAEnviar = window.pontosPendentes;
    window.pontosPendentes = 0;

    const btn = document.getElementById('btnSalvarPontos');
    btn.disabled = true;

    try {
        abrirLoading("Enviando...", "Validando permissões e atualizando saldo");

        const adminId = sessionStorage.getItem("dora_admin_id") || "";
        const adminPass = sessionStorage.getItem("dora_admin_pass") || "";

        await fetch(URL_PLANILHA, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({
                action: "update",
                idUser: idUserInput,
                valor: quantidadeTotalAEnviar,
                adminId: adminId,
                adminPass: adminPass
            })
        });
        showStatus(true, "Sucesso!", "Saldo atualizado com sucesso.");
        setTimeout(() => {
            fecharOverlay();
            btn.disabled = false;
            buscarPorIdUser();
        }, 1500);
    } catch (error) {
        showStatus(false, "Erro ao Salvar", "Não foi possível atualizar o saldo.");
    }
}

let tempoInatividade;
function resetarCronometro() {
    clearTimeout(tempoInatividade);
    if (sessionStorage.getItem("dora_auth") === "autorizado") {
        tempoInatividade = setTimeout(() => {
            sessionStorage.removeItem("dora_auth");
            showStatus(false, "Sessão Expirada", "Sua sessão expirou por inatividade.");
            const btn = document.getElementById('btnFecharOverlay');
            if (btn) btn.onclick = () => window.location.href = "index.html";
        }, 10 * 60 * 1000);
    }
}

['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'].forEach(evento => {
    document.addEventListener(evento, resetarCronometro);
});
resetarCronometro();