// ============ CONFIGURAÇÃO ============
// 🔴 SUBSTITUA esta URL pela URL do SEU BACK-END na Vercel!
const API_URL = 'https://backend-desafio-leitura.vercel.app/';  // <--- MUDE AQUI!

// Se for testar local, descomente a linha abaixo e comente a de cima
// const API_URL = 'http://localhost:3000';

console.log('🔗 API conectando em:', API_URL);

let currentUser = null;
let currentUserData = null;
let weeklyChart = null;

// Alunos cadastrados
let alunosCadastrados = JSON.parse(localStorage.getItem('alunos')) || {
    '12345': { nome: 'Ana Silva', turma: '3A', rm: '12345', criadoEm: new Date().toISOString() },
    '67890': { nome: 'Bruno Souza', turma: '3B', rm: '67890', criadoEm: new Date().toISOString() },
    '11121': { nome: 'Carla Dias', turma: '3A', rm: '11121', criadoEm: new Date().toISOString() }
};

function salvarAlunos() {
    localStorage.setItem('alunos', JSON.stringify(alunosCadastrados));
}

// ============ ELEMENTOS DOM ============
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

// ============ AUTENTICAÇÃO ============
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

doRegisterBtn.addEventListener('click', async () => {
    const nome = regNome.value.trim();
    const rm = regRm.value.trim();
    const turma = regTurma.value;
    
    if (!nome || !rm || !turma) {
        mostrarAuthError('Preencha todos os campos');
        return;
    }
    
    if (alunosCadastrados[rm]) {
        mostrarAuthError('RM já cadastrado');
        return;
    }
    
    alunosCadastrados[rm] = {
        nome, turma, rm,
        criadoEm: new Date().toISOString()
    };
    salvarAlunos();
    
    currentUser = rm;
    currentUserData = alunosCadastrados[rm];
    localStorage.setItem('currentUser', rm);
    await entrarNoDashboard();
});

doLoginBtn.addEventListener('click', async () => {
    const rm = loginRm.value.trim();
    
    if (!rm) {
        mostrarAuthError('Digite seu RM');
        return;
    }
    
    if (!alunosCadastrados[rm]) {
        mostrarAuthError('RM não encontrado');
        return;
    }
    
    currentUser = rm;
    currentUserData = alunosCadastrados[rm];
    localStorage.setItem('currentUser', rm);
    await entrarNoDashboard();
});

function mostrarAuthError(msg) {
    authError.classList.remove('hidden');
    authError.textContent = msg;
    setTimeout(() => authError.classList.add('hidden'), 3000);
}

async function entrarNoDashboard() {
    authScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
    
    dashboardUserName.textContent = currentUserData.nome;
    dashboardUserClass.textContent = `Turma ${currentUserData.turma}`;
    
    perfilNome.textContent = currentUserData.nome;
    perfilRm.textContent = currentUserData.rm;
    perfilTurma.textContent = currentUserData.turma;
    perfilSince.textContent = new Date(currentUserData.criadoEm).toLocaleDateString();
    
    await carregarTodosDados();
    iniciarAbas();
}

dashboardLogoutBtn.addEventListener('click', () => {
    currentUser = null;
    currentUserData = null;
    localStorage.removeItem('currentUser');
    dashboardScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
    if (weeklyChart) weeklyChart.destroy();
});

function iniciarAbas() {
    const tabs = document.querySelectorAll('.tab-item');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            contents.forEach(c => c.classList.add('hidden'));
            document.getElementById(`tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`).classList.remove('hidden');
        });
    });
}

// ============ REGISTRO DE LEITURA ============
submitReadingBtn.addEventListener('click', async () => {
    const minutos = parseInt(registerMinutes.value);
    
    if (!minutos || minutos <= 0) {
        mostrarAlerta('Digite um valor válido', 'error');
        return;
    }
    
    if (minutos > 16) {
        mostrarAlerta('Máximo 16 minutos por vez', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/leitura/registrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'rm': currentUser },
            body: JSON.stringify({ minutos })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarAlerta(data.message, 'success');
            registerMinutes.value = '';
            await carregarTodosDados();
        } else {
            mostrarAlerta(data.error, 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarAlerta('Erro ao conectar com o servidor', 'error');
    }
});

// ============ CARREGAR DADOS ============
async function carregarTodosDados() {
    await Promise.all([
        carregarProgressoUsuario(),
        carregarTermometro(),
        carregarRanking(),
        carregarLimiteDiario()
    ]);
}

async function carregarProgressoUsuario() {
    try {
        const response = await fetch(`${API_URL}/api/leitura/progresso`, {
            headers: { 'rm': currentUser }
        });
        
        const data = await response.json();
        
        if (response.ok && data.progresso) {
            const registros = data.progresso;
            const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
            const minutosPorDia = new Array(7).fill(0);
            let totalSemana = 0;
            
            registros.forEach(registro => {
                const dia = new Date(registro.data_registro).getDay();
                minutosPorDia[dia] += registro.minutos;
                totalSemana += registro.minutos;
            });
            
            totalWeek.textContent = totalSemana;
            bestDay.textContent = Math.max(...minutosPorDia, 0);
            
            const diasCom16 = Object.values(registros.reduce((acc, r) => {
                acc[r.data_registro] = (acc[r.data_registro] || 0) + r.minutos;
                return acc;
            }, {})).filter(v => v === 16).length;
            daysHit.textContent = diasCom16;
            
            perfilTotal.textContent = registros.reduce((s, r) => s + r.minutos, 0);
            
            const ctx = document.getElementById('weeklyProgressChart').getContext('2d');
            if (weeklyChart) weeklyChart.destroy();
            
            weeklyChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: diasSemana,
                    datasets: [{
                        data: minutosPorDia,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.05)',
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#dc2626',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } },
                        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Erro carregar progresso:', error);
    }
}

async function carregarTermometro() {
    try {
        const response = await fetch(`${API_URL}/api/leitura/termometro`, {
            headers: { 'rm': currentUser }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const total = data.total_escola;
            const percent = (total / 1000000) * 100;
            schoolTotal.textContent = total.toLocaleString();
            schoolBar.style.width = `${Math.min(percent, 100)}%`;
            schoolPercent.textContent = percent.toFixed(2);
        }
    } catch (error) {
        console.error('Erro carregar termômetro:', error);
    }
}

async function carregarRanking() {
    try {
        const response = await fetch(`${API_URL}/api/leitura/ranking`, {
            headers: { 'rm': currentUser }
        });
        
        const data = await response.json();
        
        if (response.ok && Array.isArray(data)) {
            if (data.length === 0) {
                rankingContainer.innerHTML = '<div class="text-center py-8 text-gray-400">Nenhum registro ainda</div>';
                return;
            }
            
            rankingContainer.innerHTML = data.map((item, index) => `
                <div class="ranking-item flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="w-8 text-lg font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-gray-400'}">
                            ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`}
                        </span>
                        <span class="font-semibold text-white">Turma ${item.turma}</span>
                    </div>
                    <div class="text-right">
                        <span class="text-xl font-bold text-red-500">${item.total}</span>
                        <span class="text-xs text-gray-400 ml-1">min</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Erro carregar ranking:', error);
    }
}

async function carregarLimiteDiario() {
    try {
        const response = await fetch(`${API_URL}/api/leitura/progresso`, {
            headers: { 'rm': currentUser }
        });
        
        const data = await response.json();
        
        if (response.ok && data.progresso) {
            const hoje = new Date().toISOString().split('T')[0];
            const minutosHoje = data.progresso.filter(r => r.data_registro === hoje).reduce((s, r) => s + r.minutos, 0);
            const restante = Math.max(0, 16 - minutosHoje);
            
            todayMin.textContent = minutosHoje;
            remainingToday.textContent = restante;
            dailyBar.style.width = `${(minutosHoje / 16) * 100}%`;
            
            registerMinutes.max = restante;
            registerMinutes.placeholder = restante > 0 ? `Máximo ${restante} min` : 'Limite atingido';
            
            const disabled = restante === 0;
            registerMinutes.disabled = disabled;
            submitReadingBtn.disabled = disabled;
            submitReadingBtn.style.opacity = disabled ? '0.5' : '1';
        }
    } catch (error) {
        console.error('Erro carregar limite:', error);
    }
}

function mostrarAlerta(msg, tipo) {
    readingAlert.classList.remove('hidden');
    readingAlert.className = `mt-4 p-3 rounded-xl text-sm ${tipo === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`;
    readingAlert.innerHTML = `<i class="fas fa-${tipo === 'success' ? 'check-circle' : 'exclamation-circle'} mr-2"></i> ${msg}`;
    setTimeout(() => readingAlert.classList.add('hidden'), 4000);
}

// Verificar login salvo
window.addEventListener('load', () => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser && alunosCadastrados[savedUser]) {
        currentUser = savedUser;
        currentUserData = alunosCadastrados[savedUser];
        entrarNoDashboard();
    }
});