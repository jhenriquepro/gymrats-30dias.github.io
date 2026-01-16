/* ================= NAVEGAÇÃO ================= */
const Navigation = {
    to: (screenId) => {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }
};

/* ================= LÓGICA DE INSERIR TREINO ================= */
const InsertLogic = {
    tempExercises: [],

    addExercise: () => {
        const nameInput = document.getElementById('new-exercise-name');
        const setsInput = document.getElementById('new-exercise-sets');
        
        const name = nameInput.value.trim();
        const sets = parseInt(setsInput.value);

        if (!name || !sets) return alert('Preencha nome e séries!');

        // Adiciona ao array temporário
        InsertLogic.tempExercises.push({ id: Date.now(), name, sets });
        
        // Limpa inputs e atualiza lista visual
        nameInput.value = '';
        setsInput.value = '';
        InsertLogic.renderPreview();
    },

    renderPreview: () => {
        const list = document.getElementById('exercises-list-preview');
        list.innerHTML = InsertLogic.tempExercises.map(ex => 
            `<li>${ex.name} - ${ex.sets} séries</li>`
        ).join('');
    },

    saveWorkoutPlan: () => {
        if (InsertLogic.tempExercises.length === 0) return alert('Adicione pelo menos um exercício.');
        
        Storage.savePlan(InsertLogic.tempExercises);
        alert('Treino salvo com sucesso!');
        InsertLogic.tempExercises = []; // Limpa memória
        Navigation.to('screen-home');
        App.loadHistoryUI(); // Atualiza tela inicial
    }
};

/* ================= LÓGICA DO TREINO ATIVO ================= */
const ActiveLogic = {
    timerInterval: null,
    seconds: 0,
    sessionData: {}, // Onde guardamos os inputs do usuário { exercicioId: { serie1: {peso, reps, rpe} } }

    init: () => {
        const plan = Storage.getPlan();
        if (plan.length === 0) return alert('Nenhum treino salvo! Vá em Inserir Treino.');

        // Recupera sessão antiga se existir (crash recovery)
        const savedSession = Storage.getSession();
        if (savedSession) {
            ActiveLogic.sessionData = savedSession.data;
            ActiveLogic.seconds = savedSession.time || 0;
        } else {
            ActiveLogic.sessionData = {};
            ActiveLogic.seconds = 0;
        }

        ActiveLogic.renderWorkout(plan);
        ActiveLogic.startGlobalTimer();
        Navigation.to('screen-active');
    },

    // Renderização Dinâmica (DOM Manipulation)
    renderWorkout: (plan) => {
        const container = document.getElementById('active-workout-container');
        container.innerHTML = '';

        plan.forEach((ex, exIndex) => {
            const card = document.createElement('div');
            card.className = 'exercise-card';
            
            let html = `<h4>${ex.name}</h4>`;
            
            // Loop para criar as séries
            for (let i = 1; i <= ex.sets; i++) {
                // Tenta recuperar dados salvos dessa série
                const savedSet = ActiveLogic.sessionData[`${ex.id}_${i}`] || { weight: '', reps: '', rpe: '' };

                html += `
                <div class="set-row">
                    <span>S${i}</span>
                    <input type="number" placeholder="Kg" value="${savedSet.weight}" 
                           oninput="ActiveLogic.updateData('${ex.id}', ${i}, 'weight', this.value)">
                    
                    <input type="number" placeholder="Reps" value="${savedSet.reps}" 
                           oninput="ActiveLogic.updateData('${ex.id}', ${i}, 'reps', this.value)">
                    
                    <div class="rpe-selector">
                        <div class="rpe-opt rpe-green ${savedSet.rpe === 'green' ? 'selected' : ''}" 
                             onclick="ActiveLogic.setRPE(this, '${ex.id}', ${i}, 'green')"></div>
                        <div class="rpe-opt rpe-yellow ${savedSet.rpe === 'yellow' ? 'selected' : ''}" 
                             onclick="ActiveLogic.setRPE(this, '${ex.id}', ${i}, 'yellow')"></div>
                        <div class="rpe-opt rpe-red ${savedSet.rpe === 'red' ? 'selected' : ''}" 
                             onclick="ActiveLogic.setRPE(this, '${ex.id}', ${i}, 'red')"></div>
                    </div>

                    <button class="btn-small" onclick="RestTimer.openModal()">
                        <i class="fas fa-stopwatch"></i>
                    </button>
                </div>`;
            }
            card.innerHTML = html;
            container.appendChild(card);
        });
    },

    // "Auto-Save" e Lógica de Estado
    updateData: (exId, setNum, field, value) => {
        const key = `${exId}_${setNum}`;
        if (!ActiveLogic.sessionData[key]) ActiveLogic.sessionData[key] = {};
        
        ActiveLogic.sessionData[key][field] = value;
        
        // Persistir no Storage
        Storage.saveSession({
            time: ActiveLogic.seconds,
            data: ActiveLogic.sessionData
        });
    },

    setRPE: (el, exId, setNum, rpeValue) => {
        // UI Update
        const parent = el.parentElement;
        parent.querySelectorAll('.rpe-opt').forEach(d => d.classList.remove('selected'));
        el.classList.add('selected');

        // Logic Update
        ActiveLogic.updateData(exId, setNum, 'rpe', rpeValue);
    },

    startGlobalTimer: () => {
        if (ActiveLogic.timerInterval) clearInterval(ActiveLogic.timerInterval);
        ActiveLogic.timerInterval = setInterval(() => {
            ActiveLogic.seconds++;
            const h = Math.floor(ActiveLogic.seconds / 3600).toString().padStart(2, '0');
            const m = Math.floor((ActiveLogic.seconds % 3600) / 60).toString().padStart(2, '0');
            const s = (ActiveLogic.seconds % 60).toString().padStart(2, '0');
            document.getElementById('global-timer').innerText = `${h}:${m}:${s}`;
        }, 1000);
    },

    finishWorkout: () => {
        if(!confirm("Finalizar treino e gerar relatório?")) return;
        
        clearInterval(ActiveLogic.timerInterval);
        
        // Preparar dados para o Relatório
        const workoutRecord = {
            date: new Date().toLocaleDateString(),
            totalTime: document.getElementById('global-timer').innerText,
            details: ActiveLogic.sessionData,
            plan: Storage.getPlan()
        };

        Storage.saveToHistory(workoutRecord);
        Storage.clearSession(); // Limpa o treino em andamento
        
        // Chama o Gerador de PDF
        ExportPDF.generate(workoutRecord);
        
        Navigation.to('screen-home');
        App.loadHistoryUI();
    }
};

/* ================= CRONÔMETRO DE DESCANSO ================= */
const RestTimer = {
    interval: null,
    
    openModal: () => {
        document.getElementById('rest-modal').classList.remove('hidden');
    },

    start: (seconds) => {
        if (RestTimer.interval) clearInterval(RestTimer.interval);
        
        let remaining = seconds;
        const display = document.getElementById('rest-timer-display');
        
        display.innerText = remaining + "s";
        
        RestTimer.interval = setInterval(() => {
            remaining--;
            display.innerText = remaining + "s";
            
            if (remaining <= 0) {
                RestTimer.stop();
                // Opcional: Tocar som aqui
                // new Audio('beep.mp3').play(); 
            }
        }, 1000);
    },

    stop: () => {
        clearInterval(RestTimer.interval);
        document.getElementById('rest-modal').classList.add('hidden');
    }
};

/* ================= APP INIT ================= */
const App = {
    startWorkout: () => {
        ActiveLogic.init();
    },
    
    loadHistoryUI: () => {
        const history = Storage.getHistory();
        const list = document.getElementById('saved-workouts-list');
        list.innerHTML = '';
        
        history.slice(-5).reverse().forEach((h, index) => {
            const li = document.createElement('li');
            li.innerHTML = `Treino ${h.date} - ${h.totalTime} 
                            <button class="btn-small" onclick="ExportPDF.downloadJSON(${index})">JSON</button>`;
            list.appendChild(li);
        });
    }
};

// Inicialização
window.onload = () => {
    App.loadHistoryUI();
};