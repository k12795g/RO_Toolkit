const ENCHANT_DATA = {
    tenacity: {
        name: '堅毅的星團',
        levels: {
            '2': { rate: 0.80, zeny: 500000, materials: { power: 5, focus: 4, wisdom: 5, unknown: 4 } },
            '3': { rate: 0.65, zeny: 1000000, materials: { power: 10, focus: 8, wisdom: 10, unknown: 8 } },
            '4': { rate: 0.45, zeny: 2000000, materials: { power: 20, focus: 16, wisdom: 20, unknown: 16 } },
            '5': { rate: 0.25, zeny: 3500000, materials: { power: 35, focus: 28, wisdom: 35, unknown: 28 } },
        }
    },
    fortune: {
        name: '天運的星團',
        levels: {
            '2': { rate: 0.80, zeny: 500000, materials: { power: 4, creation: 5, sorcery: 5, unknown: 4 } },
            '3': { rate: 0.65, zeny: 1000000, materials: { power: 8, creation: 10, sorcery: 10, unknown: 8 } },
            '4': { rate: 0.45, zeny: 2000000, materials: { power: 16, creation: 20, sorcery: 20, unknown: 16 } },
            '5': { rate: 0.25, zeny: 3500000, materials: { power: 28, creation: 35, sorcery: 35, unknown: 28 } },
        }
    },
    wisdom: {
        name: '賢明的星團',
        levels: {
            '2': { rate: 0.80, zeny: 500000, materials: { stamina: 5, focus: 4, sorcery: 5, unknown: 4 } },
            '3': { rate: 0.65, zeny: 1000000, materials: { stamina: 10, focus: 8, sorcery: 10, unknown: 8 } },
            '4': { rate: 0.45, zeny: 2000000, materials: { stamina: 20, focus: 16, sorcery: 20, unknown: 16 } },
            '5': { rate: 0.25, zeny: 3500000, materials: { stamina: 35, focus: 28, sorcery: 35, unknown: 28 } },
        }
    },
    defense: {
        name: '抵禦的星團',
        levels: {
            '2': { rate: 0.80, zeny: 500000, materials: { stamina: 5, creation: 5, wisdom: 4, unknown: 4 } },
            '3': { rate: 0.65, zeny: 1000000, materials: { stamina: 10, creation: 10, wisdom: 8, unknown: 8 } },
            '4': { rate: 0.45, zeny: 2000000, materials: { stamina: 20, creation: 20, wisdom: 16, unknown: 16 } },
            '5': { rate: 0.25, zeny: 3500000, materials: { stamina: 35, creation: 35, wisdom: 28, unknown: 28 } },
        }
    }
};

const MATERIAL_NAMES = {
    power: '威力隕石碎片',
    focus: '專注隕石碎片',
    wisdom: '智慧隕石碎片',
    creation: '創造隕石碎片',
    sorcery: '咒術隕石碎片',
    stamina: '耐力隕石碎片',
    unknown: '未知的隕石碎片'
};

document.addEventListener('DOMContentLoaded', () => {
    const MIN_LEVEL = 1;
    const MAX_LEVEL = 5;

    const priceInputs = {
        power: document.getElementById('price-power'),
        focus: document.getElementById('price-focus'),
        wisdom: document.getElementById('price-wisdom'),
        creation: document.getElementById('price-creation'),
        sorcery: document.getElementById('price-sorcery'),
        stamina: document.getElementById('price-stamina'),
        unknown: document.getElementById('price-unknown'),
    };

    const outputs = {
        levelDisplay: document.getElementById('level-display'),
        totalCost: document.getElementById('total-cost'),
        materialCost: document.getElementById('material-cost'),
        zenyCost: document.getElementById('zeny-cost'),
        detailsTableBody: document.getElementById('details-table-body'),
        materialsTableBody: document.getElementById('materials-table-body'),
    };

    const clusterSelector = document.getElementById('cluster-selector');

    let chart;
    let selectedCluster = 'tenacity';
    let startLevel = 1;
    let endLevel = 5;

    function formatNumber(num) {
        return Math.round(num).toLocaleString('en-US');
    }

    function updateHighlights(clusterKey) {
        document.querySelectorAll('.material-input-group').forEach(div => {
            div.classList.remove('highlighted');
        });
        const clusterData = ENCHANT_DATA[clusterKey];
        if (!clusterData) return;
        const requiredMaterials = new Set();
        for (const level in clusterData.levels) {
            for (const material in clusterData.levels[level].materials) {
                requiredMaterials.add(material);
            }
        }
        requiredMaterials.forEach(material => {
            const inputElement = document.getElementById(`price-${material}`);
            if (inputElement) {
                inputElement.closest('.material-input-group')?.classList.add('highlighted');
            }
        });
    }

    function calculate() {
        const prices = Object.fromEntries(Object.entries(priceInputs).map(([key, input]) => [key, parseInt(input.value) || 0]));

        const clusterData = ENCHANT_DATA[selectedCluster];
        if (!clusterData) return;

        outputs.levelDisplay.textContent = `Lv. ${startLevel} → Lv. ${endLevel}`;

        let totalExpectedZeny = 0;
        let totalExpectedMaterialCost = 0;
        const totalMaterialCostsByType = {};
        const oneTimeTotalMaterials = {};
        const expectedTotalMaterials = {};

        outputs.detailsTableBody.innerHTML = '';
        if (startLevel >= endLevel) {
            outputs.totalCost.textContent = `0 Zeny`;
            outputs.materialCost.textContent = `0 Zeny`;
            outputs.zenyCost.textContent = `0 Zeny`;
            outputs.materialsTableBody.innerHTML = '';
            updateChart(0, {});
            return;
        }

        for (let level = startLevel + 1; level <= endLevel; level++) {
            const levelData = clusterData.levels[level];
            if (!levelData) continue;

            const expectedAttempts = 1 / levelData.rate;
            let materialCostPerAttempt = 0;
            for (const mat in levelData.materials) {
                const amount = levelData.materials[mat];
                materialCostPerAttempt += amount * prices[mat];
                oneTimeTotalMaterials[mat] = (oneTimeTotalMaterials[mat] || 0) + amount;
                expectedTotalMaterials[mat] = (expectedTotalMaterials[mat] || 0) + (amount * expectedAttempts);
            }

            const zenyCostPerAttempt = levelData.zeny;
            const expectedCostForLevel = (materialCostPerAttempt + zenyCostPerAttempt) * expectedAttempts;

            totalExpectedZeny += zenyCostPerAttempt * expectedAttempts;
            totalExpectedMaterialCost += materialCostPerAttempt * expectedAttempts;

            for (const mat in levelData.materials) {
                totalMaterialCostsByType[mat] = (totalMaterialCostsByType[mat] || 0) + (levelData.materials[mat] * prices[mat] * expectedAttempts);
            }

            const row = `
                <tr class="border-b border-gray-200">
                    <td class="p-2">Lv.${level-1} → Lv.${level}</td>
                    <td class="p-2 text-right">${(levelData.rate * 100).toFixed(0)}%</td>
                    <td class="p-2 text-right">${expectedAttempts.toFixed(2)}</td>
                    <td class="p-2 text-right text-[#655a4c] font-medium">${formatNumber(expectedCostForLevel)}</td>
                </tr>`;
            outputs.detailsTableBody.insertAdjacentHTML('beforeend', row);
        }

        const totalCost = totalExpectedZeny + totalExpectedMaterialCost;
        outputs.totalCost.textContent = `${formatNumber(totalCost)} Zeny`;
        outputs.materialCost.textContent = `${formatNumber(totalExpectedMaterialCost)} Zeny`;
        outputs.zenyCost.textContent = `${formatNumber(totalExpectedZeny)} Zeny`;

        updateChart(totalExpectedZeny, totalMaterialCostsByType);

        outputs.materialsTableBody.innerHTML = '';
        const allMaterialsInCluster = new Set(Object.keys(oneTimeTotalMaterials));
        const sortedMaterials = Array.from(allMaterialsInCluster).sort();

        for (const mat of sortedMaterials) {
            const oneTimeAmount = oneTimeTotalMaterials[mat] || 0;
            const expectedAmount = expectedTotalMaterials[mat] || 0;

            const row = `
                <tr class="border-b border-gray-200 last:border-b-0">
                    <td class="p-2 font-medium text-gray-800">
                        <div class="flex items-center">
                            <span>${MATERIAL_NAMES[mat]}</span>
                        </div>
                    </td>
                    <td class="p-2 text-right">${formatNumber(oneTimeAmount)}</td>
                    <td class="p-2 text-right text-[#655a4c] font-medium">${formatNumber(expectedAmount)}</td>
                </tr>`;
            outputs.materialsTableBody.insertAdjacentHTML('beforeend', row);
        }
    }

    function updateChart(zenyCost, materialCosts) {
        const labels = ['Zeny', ...Object.keys(materialCosts).map(key => MATERIAL_NAMES[key])];
        const data = [zenyCost, ...Object.values(materialCosts)];
        const backgroundColors = ['#6b7280', '#ef4444', '#3b82f6', '#eab308', '#8b5cf6', '#22c55e', '#10b981', '#f97316'];

        if (chart) {
            chart.data.labels = labels;
            chart.data.datasets[0].data = data;
            chart.data.datasets[0].backgroundColor = backgroundColors.slice(0, data.length);
            chart.update();
        } else {
            const ctx = document.getElementById('cost-chart').getContext('2d');
            chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '成本分佈',
                        data: data,
                        backgroundColor: backgroundColors.slice(0, data.length),
                        borderColor: '#ffffff',
                        borderWidth: 2,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { font: { family: "'Noto Sans TC', sans-serif" }}},
                        tooltip: { callbacks: { label: ctx => `${ctx.label || ''}: ${formatNumber(ctx.parsed)} Zeny` }}
                    }
                }
            });
        }
    }

    function setupDualSlider() {
        const container = document.getElementById('level-slider-container');
        const thumbStart = document.getElementById('slider-thumb-start');
        const thumbEnd = document.getElementById('slider-thumb-end');
        const progress = document.getElementById('slider-progress');

        function updateSliderUI() {
            const range = MAX_LEVEL - MIN_LEVEL;
            const startPercent = ((startLevel - MIN_LEVEL) / range) * 100;
            const endPercent = ((endLevel - MIN_LEVEL) / range) * 100;

            thumbStart.style.left = `${startPercent}%`;
            thumbEnd.style.left = `${endPercent}%`;
            progress.style.left = `${startPercent}%`;
            progress.style.width = `${endPercent - startPercent}%`;
            outputs.levelDisplay.textContent = `Lv. ${startLevel} → Lv. ${endLevel}`;
        }

        function handleMove(e, thumb) {
            const rect = container.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
            const level = Math.round((percent / 100) * (MAX_LEVEL - MIN_LEVEL)) + MIN_LEVEL;

            if (thumb === thumbStart) {
                startLevel = Math.min(level, endLevel);
            } else {
                endLevel = Math.max(level, startLevel);
            }
            updateSliderUI();
            calculate();
        }

        function startDrag(e, thumb) {
            e.preventDefault();
            const onMove = (moveEvent) => handleMove(moveEvent, thumb);
            const onEnd = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onEnd);
                document.removeEventListener('touchmove', onMove);
                document.removeEventListener('touchend', onEnd);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchmove', onMove);
            document.addEventListener('touchend', onEnd);
        }

        thumbStart.addEventListener('mousedown', (e) => startDrag(e, thumbStart));
        thumbEnd.addEventListener('mousedown', (e) => startDrag(e, thumbEnd));
        thumbStart.addEventListener('touchstart', (e) => startDrag(e, thumbStart));
        thumbEnd.addEventListener('touchstart', (e) => startDrag(e, thumbEnd));

        updateSliderUI();
    }

    Object.values(priceInputs).forEach(input => input.addEventListener('input', calculate));
    clusterSelector.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#cluster-selector button').forEach(btn => btn.classList.remove('btn-active'));
            e.target.classList.add('btn-active');
            selectedCluster = e.target.dataset.cluster;
            updateHighlights(selectedCluster);
            calculate();
        }
    });

    setupDualSlider();
    updateHighlights(selectedCluster);
    calculate();
});