const API_URL = 'https://backend-desafio-leitura.vercel.app';
console.log('🚀 API configurada para:', API_URL);

let currentUser = null;
let currentUserData = null;
let weeklyChart = null;
let alunosCadastrados = JSON.parse(localStorage.getItem('alunos')) || {};

function salvarAlunos() {
    localStorage.setItem('alunos', JSON.stringify(alunosCadastrados));
}

// Mapeamento DOM
const authScreen = document.getElementById('authScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const tabLoginBtn = document.getElementById('tabLoginBtn');
const tabRegisterBtn = document.getElementById('tabRegisterBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginRm = document.getElementById('loginRm');
const doLoginBtn = document.getElementById('doLoginBtn');
const doRegisterBtn = document.getElementById('doRegisterBtn');
const regNome = document.getElementById('regNome');
const regRm = document.getElementById('regRm');
const regTurma = document.getElementById('regTurma');
const authError = document.getElementById('authError');
const dashboardUserName = document.getElementById('dashboardUserName');
const dashboardUserClass = document.getElementById('dashboardUserClass');
const dashboardLogoutBtn = document.getElementById('dashboardLogoutBtn');
const registerMinutes = document.getElementById('registerMinutes');
const submitReadingBtn = document.getElementById('submitReadingBtn');
const todayMin = document.getElementById('todayMin');
const remainingToday = document.getElementById('remainingToday');
const dailyBar = document.getElementById('dailyBar');
const readingAlert = document.getElementById('readingAlert');
const schoolTotal = document.getElementById('schoolTotal');
const schoolBar = document.getElementById('schoolBar');
const schoolPercent = document.getElementById('schoolPercent');
const totalWeek = document.getElementById('totalWeek');
const bestDay = document.getElementById('bestDay');
const daysHit = document.getElementById('daysHit');
const perfilNome = document.getElementById('perfilNome');
const perfilRm = document.getElementById('perfilRm');
const perfilTurma = document.getElementById('perfilTurma');
const perfilTotal = document.getElementById('perfilTotal');
const perfilSince = document.getElementById('perfilSince');
const rankingContainer = document.getElementById('rankingContainer');

// Requisições protegidas contra respostas HTML falsas
async function apiRequest(endpoint, options = {}) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_URL}/api${cleanEndpoint}?rm=${currentUser || ''}`;
    
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'rm': currentUser || '',
            ...(options.headers || {})
        }
    });
    
    const contentType = response.headers.get("content-type");
    if (!contentType || contentType.indexOf("application/json") === -1) {
        throw new Error("Resposta inválida (HTML) retornada pelo servidor.");
    }
    
    const data = await response.json();
    return { response, data };
}

// Alternador de Abas
if(tabLoginBtn && tabRegisterBtn) {
    tabLoginBtn.addEventListener('click', () => {
        tabLoginBtn.classList.add('active');
        tabRegisterBtn.classList.remove('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        authError.classList.add('hidden');
    });

    tabRegisterBtn.addEventListener('click', () => {
        tabRegisterBtn.classList.add('active');
        tabLoginBtn.classList.remove('active');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        authError.classList.add('hidden');
    });
}

// Eventos de Autenticação
doLoginBtn.addEventListener('click', async () => {
    const rm = loginRm.value.trim();
    if (!rm) return mostrarAuthError('Por favor, introduza o seu RM.');
    mostrarAuthError('A autenticar...');
    await processarAutenticacao({ rm });
});

doRegisterBtn.addEventListener('click', async () => {
    const nome = regNome.value.trim();
    const rm = regRm.value.trim();
    const turma = regTurma.value;
    
    if (!nome || !rm || !turma) return mostrarAuthError('Por favor, preencha todos os campos.');
    mostrarAuthError('A efetuar registo no sistema...');
    await processarAutenticacao({ rm, nome, turma });
});

async function processarAutenticacao(corpo) {
    try {
        const response = await fetch(`${API_URL}/api/auth/login-ou-cadastro`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corpo)
        });

        const contentType = response.headers.get("content-type");
        if (!contentType || contentType.indexOf("application/json") === -1) {
            return mostrarAuthError('❌ O servidor retornou um erro estrutural. Faça redeploy.');
        }

        const data = await response.json();
        if (!response.ok) return mostrarAuthError('❌ ' + (data.error || 'Erro na autenticação.'));

        const aluno = data.aluno || data;
        currentUser = aluno.rm;
        currentUserData = {
            nome: aluno.nome,
            turma: aluno.turma,
            rm: aluno.rm,
            criadoEm: aluno.created_at || new Date().toISOString()
        };
        
        alunosCadastrados[currentUser] = currentUserData;
        salvarAlunos();
        localStorage.setItem('currentUser', currentUser);
        localStorage.setItem('currentUserData', JSON.stringify(currentUserData));
        
        entrarNoDashboard();
    } catch (error) {
        console.error(error);
        mostrarAuthError('❌ Erro de processamento interno ou de rede.');
    }
}

function mostrarAuthError(msg) {
    authError.classList.remove('hidden');
    authError.textContent = msg;
}

function entrarNoDashboard() {
    authScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
    
    dashboardUserName.textContent = currentUserData.nome;
    dashboardUserClass.textContent = `Turma ${currentUserData.turma}`;
    perfilNome.textContent = currentUserData.nome;
    perfilRm.textContent = currentUserData.rm;
    perfilTurma.textContent = currentUserData.turma;
    perfilSince.textContent = new Date(currentUserData.criadoEm).toLocaleDateString();
    
    carregarTodosDados();
    iniciarAbasNavegacao();
}

dashboardLogoutBtn.addEventListener('click', () => {
    currentUser = null;
    currentUserData = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentUserData');
    dashboardScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
    if (weeklyChart) weeklyChart.destroy();
    carregarTermometro();
    carregarRanking();
});

function iniciarAbasNavegacao() {
    const tabs = document.querySelectorAll('.tab-item');
    const contents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.onclick = () => {
            const tabId = tab.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            contents.forEach(c => c.classList.add('hidden'));
            document.getElementById(`tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`).classList.remove('hidden');
        };
    });
}

submitReadingBtn.onclick = async () => {
    const minutos = parseInt(registerMinutes.value);
    if (!minutos || minutos <= 0 || minutos > 16) return mostrarAlerta('Minutos inválidos (1-16).', 'error');
    
    mostrarAlerta('📡 A registar minutos...', 'info');
    try {
        const { response, data } = await apiRequest('/leitura/registrar', {
            method: 'POST',
            body: JSON.stringify({ minutos })
        });
        if (response.ok) {
            mostrarAlerta('✅ ' + data.message, 'success');
            registerMinutes.value = '';
            carregarTodosDados();
        } else {
            mostrarAlerta('❌ ' + (data.error || 'Erro ao submeter.'), 'error');
        }
    } catch (e) {
        mostrarAlerta('❌ Erro: ' + e.message, 'error');
    }
};

async function carregarTodosDados() {
    carregarTermometro();
    carregarRanking();
    carregarProgressoUsuario();
    carregarLimiteDiario();
}

async function carregarProgressoUsuario() {
    try {
        const { response, data } = await apiRequest('/leitura/progresso');
        if (!response.ok || !data.progresso) return;

        const registros = data.progresso;
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
        const minutosPorDia = new Array(7).fill(0);
        let totalSemana = 0;
        
        registros.forEach(r => {
            const dia = new Date(r.data_registro).getDay();
            minutosPorDia[dia] += r.minutos;
            totalSemana += r.minutos;
        });
        
        totalWeek.textContent = totalSemana;
        bestDay.textContent = Math.max(...minutosPorDia, 0);
        perfilTotal.textContent = registros.reduce((s, r) => s + r.minutos, 0);
        
        const canvas = document.getElementById('weeklyProgressChart');
        if (!canvas) return;

        if (weeklyChart) weeklyChart.destroy();
        weeklyChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: diasSemana,
                datasets: [{
                    data: minutosPorDia,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    } catch (e) { console.error(e); }
}

async function carregarTermometro() {
    try {
        const r = await fetch(`${API_URL}/api/leitura/termometro`);
        if (!r.ok) return;
        const d = await r.json();
        const total = d.total_escola || 0;
        const percent = (total / 1000000) * 100;
        schoolTotal.textContent = total.toLocaleString('pt-BR');
        schoolBar.style.width = `${Math.min(percent, 100)}%`;
        schoolPercent.textContent = percent.toFixed(2);
    } catch (e) { console.error(e); }
}

async function carregarRanking() {
    try {
        const r = await fetch(`${API_URL}/api/leitura/ranking`);
        if (!r.ok) return;
        const d = await r.json();
        
        if (Array.isArray(d) && d.length > 0) {
            rankingContainer.innerHTML = d.map((item, idx) => `
                <div class="flex items-center justify-between p-2 bg-gray-800/30 rounded-xl mb-1">
                    <div class="flex items-center gap-3">
                        <span class="font-bold">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`}</span>
                        <span class="font-semibold text-white">Turma ${item.turma}</span>
                    </div>
                    <div><span class="text-xl font-bold text-red-500">${item.total}</span><span class="text-xs text-gray-400 ml-1">min hoje</span></div>
                </div>
            `).join('');
        } else {
            rankingContainer.innerHTML = '<div class="text-center py-8 text-gray-400">Nenhum registo efetuado hoje</div>';
        }
    } catch (e) { console.error(e); }
}

async function carregarLimiteDiario() {
    try {
        const { response, data } = await apiRequest('/leitura/progresso');
        if (!response.ok || !data.progresso) return;

        const hoje = new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).split(" ")[0];
        const minutosHoje = data.progresso.filter(r => r.data_registro === hoje).reduce((s, r) => s + r.minutos, 0);
        const restante = Math.max(0, 16 - minutosHoje);
        
        todayMin.textContent = minutosHoje;
        remainingToday.textContent = restante;
        dailyBar.style.width = `${(minutosHoje / 16) * 100}%`;
        
        registerMinutes.max = restante;
        registerMinutes.placeholder = restante > 0 ? `Máximo ${restante} min` : 'Limite atingido';
        
        const limiteAtingido = (restante === 0);
        registerMinutes.disabled = limiteAtingido;
        submitReadingBtn.disabled = limiteAtingido;
        submitReadingBtn.style.opacity = limiteAtingido ? '0.5' : '1';
    } catch (e) { console.error(e); }
}

function mostrarAlerta(msg, tipo) {
    readingAlert.classList.remove('hidden');
    readingAlert.className = `mt-4 p-3 rounded-xl text-sm ${tipo === 'success' ? 'bg-green-500/20 text-green-300' : tipo === 'info' ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'}`;
    readingAlert.innerHTML = msg;
    setTimeout(() => readingAlert.classList.add('hidden'), 4000);
}

// Auto-Login permanente ao abrir a página
window.addEventListener('DOMContentLoaded', () => {
    // Coloque isto dentro do window.addEventListener('DOMContentLoaded', () => { ... })

const regTurmaSelect = document.getElementById('regTurma');
if (regTurmaSelect) {
    // 1. Gerar do 1º ao 9º Ano do Ensino Fundamental
    for (let ano = 1; ano <= 9; ano++) {
        ['A', 'B', 'C', 'D', 'E'].forEach(letra => {
            const opcao = document.createElement('option');
            opcao.value = `${ano}ºEF-${letra}`;
            opcao.textContent = `${ano}º Ano EF - ${letra}`;
            regTurmaSelect.appendChild(opcao);
        });
    }

    // 2. Gerar do 1º ao 3º Ano do Ensino Médio
    for (let ano = 1; ano <= 3; ano++) {
        ['A', 'B', 'C', 'D', 'E'].forEach(letra => {
            const opcao = document.createElement('option');
            opcao.value = `${ano}ºEM-${letra}`;
            opcao.textContent = `${ano}º Ano EM - ${letra}`;
            regTurmaSelect.appendChild(opcao);
        });
    }
}
    const savedUser = localStorage.getItem('currentUser');
    const savedData = localStorage.getItem('currentUserData');
    
    if (savedUser && savedData) {
        try {
            currentUser = savedUser;
            currentUserData = JSON.parse(savedData);
            entrarNoDashboard();
            return;
        } catch (e) {
            localStorage.clear();
        }
    }
    carregarTermometro();
    carregarRanking();
});