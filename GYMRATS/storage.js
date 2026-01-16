const Storage = {
    // Chaves usadas no LocalStorage
    KEYS: {
        PLAN: 'gym_current_plan',    // O plano de treino criado (nomes, séries)
        SESSION: 'gym_active_session', // Dados do treino EM ANDAMENTO (pesos, reps)
        HISTORY: 'gym_history'       // Histórico de treinos finalizados
    },

    // Salva o planejamento (Tela Inserir)
    savePlan: (plan) => {
        localStorage.setItem(Storage.KEYS.PLAN, JSON.stringify(plan));
    },

    getPlan: () => {
        return JSON.parse(localStorage.getItem(Storage.KEYS.PLAN) || '[]');
    },

    // Salva automaticamente enquanto o usuário treina (Persistência)
    saveSession: (data) => {
        localStorage.setItem(Storage.KEYS.SESSION, JSON.stringify(data));
    },

    getSession: () => {
        return JSON.parse(localStorage.getItem(Storage.KEYS.SESSION) || 'null');
    },

    clearSession: () => {
        localStorage.removeItem(Storage.KEYS.SESSION);
    },

    // Histórico para exportação e JSON
    saveToHistory: (workoutRecord) => {
        const history = JSON.parse(localStorage.getItem(Storage.KEYS.HISTORY) || '[]');
        history.push(workoutRecord);
        localStorage.setItem(Storage.KEYS.HISTORY, JSON.stringify(history));
    },

    getHistory: () => {
        return JSON.parse(localStorage.getItem(Storage.KEYS.HISTORY) || '[]');
    },

    // Importação de arquivo JSON (Lógica de Arquivos)
    importJSON: (inputElement) => {
        const file = inputElement.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                // Validação simples: verifica se tem campos obrigatórios
                if (data.name && data.exercises) {
                    // Salva como um plano atual e recarrega
                    Storage.savePlan(data.exercises); // Assume estrutura simplificada
                    alert('Treino importado! Clique em Iniciar.');
                    window.location.reload();
                } else {
                    alert('Formato de JSON inválido.');
                }
            } catch (err) {
                alert('Erro ao ler arquivo.');
            }
        };
        reader.readAsText(file);
    }
};