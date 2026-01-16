const ExportPDF = {
    generate: (record) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Cabeçalho
        doc.setFontSize(18);
        doc.text("Relatório de Treino - GYM RATS", 14, 20);
        
        doc.setFontSize(12);
        doc.text(`Data: ${record.date}`, 14, 30);
        doc.text(`Tempo Total: ${record.totalTime}`, 14, 36);

        // Prepara dados para a tabela
        const tableBody = [];
        
        record.plan.forEach(ex => {
            // Calcula métricas
            let totalVolume = 0;
            let bestSet = "-";
            
            for(let i=1; i<=ex.sets; i++) {
                const key = `${ex.id}_${i}`;
                const set = record.details[key];
                
                if(set && set.weight && set.reps) {
                    const weight = parseFloat(set.weight.replace(',', '.'));
                    const reps = parseInt(set.reps);
                    const vol = weight * reps;
                    totalVolume += vol;
                    
                    // Adiciona linha detalhada na tabela
                    let rpeText = set.rpe === 'green' ? 'Leve' : set.rpe === 'yellow' ? 'Mod.' : set.rpe === 'red' ? 'Máx' : '-';
                    
                    tableBody.push([
                        ex.name, 
                        `Série ${i}`, 
                        `${weight}kg`, 
                        reps, 
                        `${vol}kg`,
                        rpeText
                    ]);
                }
            }
            // Linha de Resumo do Exercício
            tableBody.push([{content: `Volume Total ${ex.name}: ${totalVolume}kg`, colSpan: 6, styles: {fillColor: [200, 200, 200]}}]);
        });

        // Gera Tabela
        doc.autoTable({
            head: [['Exercício', 'Série', 'Carga', 'Reps', 'Volume (Carga*Reps)', 'Esforço']],
            body: tableBody,
            startY: 45,
            theme: 'grid'
        });

        // Salva arquivo
        doc.save(`Treino_${record.date.replace(/\//g, '-')}.pdf`);
    },

    downloadJSON: (historyIndex) => {
        const history = Storage.getHistory();
        const item = history[historyIndex]; // Pega o item do array invertido na UI
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(item));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "treino_backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
};