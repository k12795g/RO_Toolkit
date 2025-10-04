document.addEventListener('DOMContentLoaded', async () => {
    // --- GLOBAL STATE AND DOM ELEMENTS ---
    const dom = {
        finalGoalContainer: document.getElementById('final-goal-inputs-container'),
        materialInputsContainer: document.getElementById('material-inputs-container'),
        tabContainer: document.getElementById('tab-container'),
        tabContentContainer: document.getElementById('tab-content-container'),
    };

    let appData = {};
    let prices = {};
    let finalGoal = {
        badge: null,
        gacha4_enchant: null, gacha4_level: null,
        gacha3_enchant: null, gacha3_level: null,
        upgrade_cluster: null,
        upgrade_start_level: 0,
        upgrade_end_level: 5,
    };

    // --- UTILITY FUNCTIONS ---
    const formatNumber = (num) => Math.round(num).toLocaleString('en-US');

    // --- DATA LOADING ---
    async function loadData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            appData = await response.json();
        } catch (error) {
            console.error("Could not load data.json:", error);
            dom.tabContentContainer.innerHTML = '<p class="text-red-500">無法載入計算機資料，請檢查 data.json 檔案是否存在且格式正確。</p>';
        }
    }

    // --- INITIALIZATION ---
    async function initialize() {
        await loadData();
        if (!appData.materials || !appData.calculators) return;

        renderGlobalPriceSettings();
        renderFinalGoalSettings();
        renderTabs();
        
        updateVisibleMaterials();
        showTab(appData.calculators.find(c => c.id === 'craft_badge').id);
    }

    // --- FINAL GOAL & MATERIAL VISIBILITY ---
    function renderFinalGoalSettings() {
        const craftCalc = appData.calculators.find(c => c.type === 'craft');
        const gachaCalc = appData.calculators.find(c => c.type === 'enchant-gacha');
        const upgradeCalc = appData.calculators.find(c => c.type === 'enchant-upgrade');

        const gachaGroups = {
            "group_fighting_spirit": { name: "鬥志/尖銳/名弓", representative: "fighting_spirit" },
            "magic_power": { name: "魔力", representative: "magic_power" },
            "group_starlight": { name: "指定星光", representative: "starlight_domineering" }
        };
        const gachaOptions = Object.entries(gachaGroups).map(([key, group]) => `<option value="${group.representative}">${group.name}</option>`).join('');

        dom.finalGoalContainer.innerHTML = `
            <div><label class="text-sm font-medium">徽章種類</label><select id="goal-badge" class="w-full p-2 border rounded-md mt-1">${Object.entries(craftCalc.steps[1].variants).map(([key, variant]) => `<option value="${key}">${variant.name}</option>`).join('')}</select></div>
            <div><label class="text-sm font-medium">第四洞附魔</label><select id="goal-gacha4-enchant" class="w-full p-2 border rounded-md mt-1">${gachaOptions}</select></div>
            <div><label class="text-sm font-medium">第四洞等級</label><select id="goal-gacha4-level" class="w-full p-2 border rounded-md mt-1"></select></div>
            <div><label class="text-sm font-medium">第三洞附魔</label><select id="goal-gacha3-enchant" class="w-full p-2 border rounded-md mt-1">${gachaOptions}</select></div>
            <div><label class="text-sm font-medium">第三洞等級</label><select id="goal-gacha3-level" class="w-full p-2 border rounded-md mt-1"></select></div>
            <div><label class="text-sm font-medium">第二洞附魔</label><select id="goal-upgrade" class="w-full p-2 border rounded-md mt-1">${Object.entries(upgradeCalc.clusters).map(([key, cluster]) => `<option value="${key}">${cluster.name}</option>`).join('')}</select></div>
        `;

        const updateGachaLevelSelector = (slot) => {
            const enchantKey = document.getElementById(`goal-gacha${slot}-enchant`).value;
            const levelSelector = document.getElementById(`goal-gacha${slot}-level`);
            const enchant = gachaCalc.enchants[enchantKey];
            levelSelector.innerHTML = Object.keys(enchant.levels).map(level => `<option value="${level}">Lv. ${level}</option>`).join('');
            finalGoal[`gacha${slot}_level`] = levelSelector.value;
        };

        updateGachaLevelSelector(4);
        updateGachaLevelSelector(3);

        finalGoal.badge = document.getElementById('goal-badge').value;
        finalGoal.gacha4_enchant = document.getElementById('goal-gacha4-enchant').value;
        finalGoal.gacha4_level = document.getElementById('goal-gacha4-level').value;
        finalGoal.gacha3_enchant = document.getElementById('goal-gacha3-enchant').value;
        finalGoal.gacha3_level = document.getElementById('goal-gacha3-level').value;
        finalGoal.upgrade_cluster = document.getElementById('goal-upgrade').value;

        document.getElementById('goal-badge').addEventListener('change', (e) => { finalGoal.badge = e.target.value; updateVisibleMaterials(); });
        document.getElementById('goal-upgrade').addEventListener('change', (e) => { finalGoal.upgrade_cluster = e.target.value; updateVisibleMaterials(); });
        document.getElementById('goal-gacha4-enchant').addEventListener('change', (e) => { finalGoal.gacha4_enchant = e.target.value; updateGachaLevelSelector(4); updateVisibleMaterials(); });
        document.getElementById('goal-gacha3-enchant').addEventListener('change', (e) => { finalGoal.gacha3_enchant = e.target.value; updateGachaLevelSelector(3); updateVisibleMaterials(); });
        document.getElementById('goal-gacha4-level').addEventListener('change', (e) => { finalGoal.gacha4_level = e.target.value; updateVisibleMaterials(); });
        document.getElementById('goal-gacha3-level').addEventListener('change', (e) => { finalGoal.gacha3_level = e.target.value; updateVisibleMaterials(); });
    }

    function updateVisibleMaterials() {
        const requiredMaterials = new Set();
        const craftCalc = appData.calculators.find(c => c.type === 'craft');
        const gachaCalc = appData.calculators.find(c => c.type === 'enchant-gacha');
        const upgradeCalc = appData.calculators.find(c => c.type === 'enchant-upgrade');

        craftCalc.steps.forEach(step => {
            if(step.materials) Object.keys(step.materials).forEach(m => requiredMaterials.add(m));
            if(step.common_materials) Object.keys(step.common_materials).forEach(m => requiredMaterials.add(m));
        });
        if (finalGoal.badge) {
            const selectedBadgeVariant = craftCalc.steps[1].variants[finalGoal.badge];
            if(selectedBadgeVariant.materials) Object.keys(selectedBadgeVariant.materials).forEach(m => requiredMaterials.add(m));
        }

        Object.values(gachaCalc.costs).forEach(cost => Object.keys(cost.materials).forEach(m => requiredMaterials.add(m)));
        requiredMaterials.add('generic_dust');

        if (finalGoal.upgrade_cluster) {
            const selectedCluster = upgradeCalc.clusters[finalGoal.upgrade_cluster];
            Object.values(selectedCluster.levels).forEach(level => {
                if(level.materials) Object.keys(level.materials).forEach(m => requiredMaterials.add(m));
            });
        }

        document.querySelectorAll('.material-input-group').forEach(div => {
            div.classList.toggle('hidden', !requiredMaterials.has(div.dataset.materialKey));
        });
        
        const activeTab = document.querySelector('.tab-btn.btn-active');
        if (activeTab) showTab(activeTab.dataset.tabId, true);
    }

    function renderGlobalPriceSettings() {
        Object.entries(appData.materials).forEach(([key, name]) => {
            const div = document.createElement('div');
            div.className = 'material-input-group hidden';
            div.dataset.materialKey = key;
            div.innerHTML = `<label for="price-${key}" class="flex items-center text-sm font-medium text-gray-700">${name}</label><input type="number" id="price-${key}" value="100000" class="mt-1 price-input">`;
            dom.materialInputsContainer.appendChild(div);
        });

        document.querySelectorAll('.price-input').forEach(input => {
            input.addEventListener('input', () => {
                updateAllPrices();
                const activeTab = document.querySelector('.tab-btn.btn-active');
                if (activeTab) {
                    const calculator = appData.calculators.find(c => c.id === activeTab.dataset.tabId) || { id: activeTab.dataset.tabId };
                    switch (calculator.id) {
                        case 'craft_badge': calculateCraftCost(calculator); break;
                        case 'enchant_3_4': calculateGachaCost(calculator); break;
                        case 'enchant_2': calculateUpgradeCost(calculator); break;
                        case 'summary': renderSummaryPage(); break;
                    }
                }
            });
        });
    }

    function renderTabs() {
        const calcOrder = ['craft_badge', 'enchant_3_4', 'enchant_2'];
        const orderedCalculators = calcOrder.map(id => appData.calculators.find(c => c.id === id));

        orderedCalculators.forEach((calculator, index) => {
            const button = document.createElement('button');
            button.className = 'tab-btn btn btn-primary';
            button.dataset.tabId = calculator.id;
            button.textContent = `${index + 1}. ${calculator.name}`;
            button.addEventListener('click', () => showTab(calculator.id));
            dom.tabContainer.appendChild(button);
        });

        const summaryButton = document.createElement('button');
        summaryButton.className = 'tab-btn btn btn-primary';
        summaryButton.dataset.tabId = 'summary';
        summaryButton.textContent = `${orderedCalculators.length + 1}. 總結頁面`;
        summaryButton.addEventListener('click', () => showTab('summary'));
        dom.tabContainer.appendChild(summaryButton);
    }

    function showTab(tabId, forceRecalc = false) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('btn-active', btn.dataset.tabId === tabId));
        updateAllPrices();

        if (tabId === 'summary') {
            renderSummaryPage();
            return;
        }

        const calculator = appData.calculators.find(c => c.id === tabId);
        if (!calculator) return;

        switch (calculator.type) {
            case 'craft': renderCraftCalculator(calculator); break;
            case 'enchant-gacha': renderGachaCalculator(calculator); break;
            case 'enchant-upgrade': renderUpgradeCalculator(calculator); break;
        }
        
        if(forceRecalc) {
             switch (calculator.type) {
                case 'craft': calculateCraftCost(calculator); break;
                case 'enchant-gacha': calculateGachaCost(calculator); break;
                case 'enchant-upgrade': calculateUpgradeCost(calculator); break;
            }
        }
    }

    function updateAllPrices() {
        prices = {};
        Object.keys(appData.materials).forEach(key => {
            const input = document.getElementById(`price-${key}`);
            if(input) prices[key] = parseInt(input.value) || 0;
        });

        if (prices.hasOwnProperty('generic_dust') && prices.hasOwnProperty('meteorite_fragment')) {
            const craftedPrice = prices['meteorite_fragment'] / 40;
            prices['generic_dust_effective'] = Math.min(prices['generic_dust'], craftedPrice);
        }
    }

    function renderCraftCalculator(calculator) {
        dom.tabContentContainer.innerHTML = `
            <section class="card text-center"><h2 class="text-xl font-bold mb-2 text-[#8d7b68]">預期成本</h2><p id="craft-total-cost" class="text-4xl font-bold text-gray-800">0 Zeny</p></section>
            <section class="card mt-6"><h2 class="text-xl font-bold mb-4 border-b pb-2 text-[#8d7b68]">材料需求</h2><div id="craft-total-materials" class="grid grid-cols-2 gap-2"></div></section>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <section class="card"><h2 class="text-xl font-bold mb-4 border-b pb-2 text-[#8d7b68]">${calculator.steps[0].name}</h2><div id="craft-step1-materials"></div><div class="text-right mt-4 border-t pt-2"><p class="font-semibold">小計: <span id="craft-step1-cost" class="text-lg text-[#a4907c]">0 Zeny</span></p></div></section>
                <section class="card"><h2 class="text-xl font-bold mb-4 border-b pb-2 text-[#8d7b68]">${calculator.steps[1].name} (${appData.calculators.find(c=>c.type === 'craft').steps[1].variants[finalGoal.badge].name})</h2><div id="craft-step2-materials"></div><div class="text-right mt-4 border-t pt-2"><p class="font-semibold">小計: <span id="craft-step2-cost" class="text-lg text-[#a4907c]">0 Zeny</span></p></div></section>
            </div>
        `;
        calculateCraftCost(calculator);
    }

    function calculateCraftCost(calculator, returnResult = false) {
        const totalMaterials = {};
        const step1 = calculator.steps[0];
        let step1Cost = step1.zeny;
        let step1Html = '';
        Object.entries(step1.materials).forEach(([key, qty]) => {
            step1Cost += (prices[key] || 0) * qty;
            if(!returnResult) step1Html += `<p>${appData.materials[key]}: ${qty}</p>`;
            totalMaterials[key] = (totalMaterials[key] || 0) + qty;
        });

        const step2 = calculator.steps[1];
        const selectedVariant = step2.variants[finalGoal.badge];
        let step2Cost = step2.zeny;
        let step2Html = '';
        Object.entries(step2.common_materials).forEach(([key, qty]) => {
            if (key === 'base_badge') {
                step2Cost += step1Cost * qty;
                if(!returnResult) step2Html += `<p>${step1.name}: ${qty}</p>`;
            } else {
                step2Cost += (prices[key] || 0) * qty;
                if(!returnResult) step2Html += `<p>${appData.materials[key]}: ${qty}</p>`;
                totalMaterials[key] = (totalMaterials[key] || 0) + qty;
            }
        });
        Object.entries(selectedVariant.materials).forEach(([key, qty]) => {
            step2Cost += (prices[key] || 0) * qty;
            if(!returnResult) step2Html += `<p>${appData.materials[key]}: ${qty}</p>`;
            totalMaterials[key] = (totalMaterials[key] || 0) + qty;
        });
        const totalZeny = step2Cost;

        if (returnResult) return { totalZeny, totalMaterials };

        document.getElementById('craft-step1-materials').innerHTML = step1Html;
        document.getElementById('craft-step1-cost').textContent = `${formatNumber(step1Cost)} Zeny`;
        document.getElementById('craft-step2-materials').innerHTML = step2Html;
        document.getElementById('craft-step2-cost').textContent = `${formatNumber(step2Cost)} Zeny`;
        document.getElementById('craft-total-cost').textContent = `${formatNumber(totalZeny)} Zeny`;
        
        const totalMaterialsEl = document.getElementById('craft-total-materials');
        totalMaterialsEl.innerHTML = '';
        Object.entries(totalMaterials).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)).forEach(([key, qty]) => {
            totalMaterialsEl.innerHTML += `<p><span class="font-semibold">${appData.materials[key]}:</span> ${formatNumber(qty)}</p>`;
        });
    }

    function renderGachaCalculator(calculator) {
        dom.tabContentContainer.innerHTML = `
            <section class="card text-center"><h2 class="text-xl font-bold mb-2 text-[#8d7b68]">預期成本</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center"><div><h3 class="font-semibold">第四洞</h3><p id="gacha-cost-slot4" class="text-2xl font-bold text-gray-800">0 Zeny</p><p id="gacha-resets-slot4" class="text-xs text-gray-500"></p></div><div><h3 class="font-semibold">第三洞</h3><p id="gacha-cost-slot3" class="text-2xl font-bold text-gray-800">0 Zeny</p><p id="gacha-resets-slot3" class="text-xs text-gray-500"></p></div><div><h3 class="font-semibold text-[#655a4c]">總計</h3><p id="gacha-total-cost" class="text-3xl font-bold text-[#655a4c]">0 Zeny</p></div></div></section>
            <section class="card mt-6"><h2 class="text-xl font-bold mb-4 border-b pb-2 text-[#8d7b68]">材料需求</h2><div class="overflow-x-auto"><table class="w-full text-sm text-left"><thead class="bg-gray-50 text-gray-600"><tr><th class="p-2">材料</th><th class="p-2 text-right">期望總量</th></tr></thead><tbody id="gacha-materials-table-body"></tbody></table></div></section>
        `;
        calculateGachaCost(calculator);
    }

    function calculateGachaCost(calculator, returnResult = false) {
        const target4 = { key: finalGoal.gacha4_enchant, level: finalGoal.gacha4_level };
        const target3 = { key: finalGoal.gacha3_enchant, level: finalGoal.gacha3_level };
        const prob4 = calculator.enchants[target4.key]?.levels[target4.level];
        const prob3 = calculator.enchants[target3.key]?.levels[target3.level];

        if (!prob4 || !prob3) {
            if(!returnResult) { /* ... UI error handling ... */ }
            return null;
        }

        const resetCostDef = { zeny: 500000, materials: { generic_dust: 30 } };
        const getZenyValue = (materials) => {
            let zeny = 0;
            for (const [mat, qty] of Object.entries(materials)) {
                const priceKey = mat === 'generic_dust' ? 'generic_dust_effective' : mat;
                zeny += (prices[priceKey] || 0) * qty;
            }
            return zeny;
        };

        const pullCost4Zeny = calculator.costs.slot4.zeny + getZenyValue(calculator.costs.slot4.materials);
        const resetCostZeny = resetCostDef.zeny + getZenyValue(resetCostDef.materials);
        const actionCost4Zeny = pullCost4Zeny + (1 - prob4) * resetCostZeny;
        const totalExpectedZeny4 = actionCost4Zeny / prob4;

        const totalExpectedMaterials4 = {};
        const expectedPulls4 = 1 / prob4;
        for (const [mat, qty] of Object.entries(calculator.costs.slot4.materials)) totalExpectedMaterials4[mat] = (totalExpectedMaterials4[mat] || 0) + expectedPulls4 * qty;
        const failedPulls4 = expectedPulls4 * (1 - prob4);
        for (const [mat, qty] of Object.entries(resetCostDef.materials)) totalExpectedMaterials4[mat] = (totalExpectedMaterials4[mat] || 0) + failedPulls4 * qty;

        const pullCost3Zeny = calculator.costs.slot3.zeny + getZenyValue(calculator.costs.slot3.materials);
        const failureCost3Zeny = resetCostZeny + totalExpectedZeny4;
        const actionCost3Zeny = pullCost3Zeny + (1 - prob3) * failureCost3Zeny;
        const totalExpectedZeny3 = actionCost3Zeny / prob3;

        const grandTotalZeny = totalExpectedZeny4 + totalExpectedZeny3;

        const totalMaterials = {};
        for(const [mat, qty] of Object.entries(totalExpectedMaterials4)) totalMaterials[mat] = (totalMaterials[mat] || 0) + qty;
        const expectedPulls3 = 1 / prob3;
        for (const [mat, qty] of Object.entries(calculator.costs.slot3.materials)) totalMaterials[mat] = (totalMaterials[mat] || 0) + expectedPulls3 * qty;
        const failedPulls3 = expectedPulls3 * (1 - prob3);
        for (const [mat, qty] of Object.entries(resetCostDef.materials)) totalMaterials[mat] = (totalMaterials[mat] || 0) + failedPulls3 * qty;
        for (const [mat, qty] of Object.entries(totalExpectedMaterials4)) totalMaterials[mat] = (totalMaterials[mat] || 0) + failedPulls3 * qty;

        if (returnResult) return { totalZeny: grandTotalZeny, totalMaterials };

        document.getElementById('gacha-cost-slot4').textContent = `${formatNumber(totalExpectedZeny4)} Zeny`;
        document.getElementById('gacha-resets-slot4').textContent = `(預期重置 ${((1 / prob3) * failedPulls4).toFixed(2)} 次)`;
        document.getElementById('gacha-cost-slot3').textContent = `${formatNumber(totalExpectedZeny3)} Zeny`;
        document.getElementById('gacha-resets-slot3').textContent = `(預期重置 ${failedPulls3.toFixed(2)} 次)`;
        document.getElementById('gacha-total-cost').textContent = `${formatNumber(grandTotalZeny)} Zeny`;

        const materialsTableBody = document.getElementById('gacha-materials-table-body');
        materialsTableBody.innerHTML = '';
        Object.entries(totalMaterials).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)).forEach(([key, qty]) => {
            materialsTableBody.innerHTML += `<tr class="border-b border-gray-200 last:border-b-0"><td class="p-2 font-medium text-gray-800">${appData.materials[key]}</td><td class="p-2 text-right text-[#655a4c] font-medium">${formatNumber(qty)}</td></tr>`;
        });
    }

    function renderUpgradeCalculator(calculator) {
        dom.tabContentContainer.innerHTML = `<div class="flex flex-col gap-6">
                 <section class="card">
                    <h2 class="text-xl font-bold mb-4 border-b pb-2 text-[#8d7b68]">計算目標設定</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 class="text-md font-semibold text-gray-800 mb-2">選擇星團</h3>
                            <p class="p-2 border rounded-md bg-gray-100">${calculator.clusters[finalGoal.upgrade_cluster].name}</p>
                        </div>
                        <div>
                            <h3 class="text-md font-semibold text-gray-800 mb-2">目標等級範圍: <span id="upgrade-level-display"></span></h3>
                            <div class="pt-4"><div id="level-slider-container" class="relative w-full h-5">
                                <div class="absolute w-full h-1.5 bg-gray-200 rounded-full top-1/2 -translate-y-1/2"></div>
                                <div id="slider-progress" class="absolute h-1.5 bg-[#a4907c] rounded-full top-1/2 -translate-y-1/2"></div>
                                <div id="slider-thumb-start" class="slider-thumb" tabindex="0"></div><div id="slider-thumb-end" class="slider-thumb" tabindex="0"></div>
                                <div class="absolute w-full flex justify-between -bottom-5 text-xs text-gray-500"><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
                            </div></div>
                        </div>
                    </div>
                </section>
                <section class="card text-center"><h2 class="text-xl font-bold mb-2 text-[#8d7b68]">預期成本</h2><p id="upgrade-total-cost" class="text-4xl font-bold text-gray-800">0 Zeny</p><div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-left"><div><h3 class="font-semibold">材料成本</h3><p id="upgrade-material-cost" class="text-lg text-[#a4907c]">0 Zeny</p></div><div><h3 class="font-semibold">Zeny 成本</h3><p id="upgrade-zeny-cost" class="text-lg text-[#a4907c]">0 Zeny</p></div></div></section>
                <section class="card"><h2 class="text-xl font-bold mb-4 border-b pb-2 text-[#8d7b68]">材料需求</h2><div class="overflow-x-auto"><table class="w-full text-sm text-left"><thead class="bg-gray-50 text-gray-600"><tr><th class="p-2">材料</th><th class="p-2 text-right">單次總量</th><th class="p-2 text-right">期望總量</th></tr></thead><tbody id="upgrade-materials-table-body"></tbody></table></div></section>
                <section class="card"><h2 class="text-xl font-bold mb-4 border-b pb-2 text-[#8d7b68]">成本明細</h2><div class="overflow-x-auto"><table class="w-full min-w-max text-sm text-left"><thead class="bg-gray-50 text-gray-600"><tr><th class="p-2">升級階段</th><th class="p-2 text-right">成功率</th><th class="p-2 text-right">預期次數</th><th class="p-2 text-right">期望成本</th></tr></thead><tbody id="upgrade-details-table-body"></tbody></table></div></section>
            </div>
        `;
        
        setupDualSlider(calculator);
        calculateUpgradeCost(calculator);
    }

    function calculateUpgradeCost(calculator, returnResult = false) {
        const selectedCluster = finalGoal.upgrade_cluster;
        const startLevel = finalGoal.upgrade_start_level;
        const endLevel = finalGoal.upgrade_end_level;
        const clusterData = calculator.clusters[selectedCluster];
        if (!clusterData) return null;

        let totalExpectedZeny = 0;
        const totalMaterials = {};
        const oneTimeTotalMaterials = {};

        if (startLevel < endLevel) {
            for (let level = startLevel + 1; level <= endLevel; level++) {
                const levelData = clusterData.levels[level];
                if (!levelData) continue;
                const expectedAttempts = 1 / levelData.rate;
                Object.entries(levelData.materials).forEach(([mat, qty]) => {
                    oneTimeTotalMaterials[mat] = (oneTimeTotalMaterials[mat] || 0) + qty;
                    totalMaterials[mat] = (totalMaterials[mat] || 0) + (qty * expectedAttempts);
                });
                totalExpectedZeny += levelData.zeny * expectedAttempts;
            }
        }
        
        let totalMaterialZeny = 0;
        for(const [mat, qty] of Object.entries(totalMaterials)) {
            totalMaterialZeny += (prices[mat] || 0) * qty;
        }
        const totalZeny = totalExpectedZeny + totalMaterialZeny;

        if (returnResult) return { totalZeny, totalMaterials };

        document.getElementById('upgrade-level-display').textContent = `Lv. ${startLevel} → Lv. ${endLevel}`;
        document.getElementById('upgrade-total-cost').textContent = `${formatNumber(totalZeny)} Zeny`;
        document.getElementById('upgrade-material-cost').textContent = `${formatNumber(totalMaterialZeny)} Zeny`;
        document.getElementById('upgrade-zeny-cost').textContent = `${formatNumber(totalExpectedZeny)} Zeny`;

        const detailsTableBody = document.getElementById('upgrade-details-table-body');
        detailsTableBody.innerHTML = '';
        if (startLevel < endLevel) {
            for (let level = startLevel + 1; level <= endLevel; level++) {
                const levelData = clusterData.levels[level];
                if (!levelData) continue;
                const expectedAttempts = 1 / levelData.rate;
                let materialCostPerAttempt = 0;
                Object.entries(levelData.materials).forEach(([mat, qty]) => materialCostPerAttempt += (prices[mat] || 0) * qty);
                const expectedCostForLevel = (materialCostPerAttempt + levelData.zeny) * expectedAttempts;
                detailsTableBody.innerHTML += `<tr class="border-b border-gray-200"><td class="p-2">Lv.${level - 1} → Lv.${level}</td><td class="p-2 text-right">${(levelData.rate * 100).toFixed(0)}%</td><td class="p-2 text-right">${expectedAttempts.toFixed(2)}</td><td class="p-2 text-right text-[#655a4c] font-medium">${formatNumber(expectedCostForLevel)}</td></tr>`;
            }
        }

        const materialsTableBody = document.getElementById('upgrade-materials-table-body');
        materialsTableBody.innerHTML = '';
        const sortedMaterials = Object.keys(oneTimeTotalMaterials).sort();
        for (const mat of sortedMaterials) {
            materialsTableBody.innerHTML += `<tr class="border-b border-gray-200 last:border-b-0"><td class="p-2 font-medium text-gray-800">${appData.materials[mat]}</td><td class="p-2 text-right">${formatNumber(oneTimeTotalMaterials[mat] || 0)}</td><td class="p-2 text-right text-[#655a4c] font-medium">${formatNumber(totalMaterials[mat] || 0)}</td></tr>`;
        }
    }
    
    function setupDualSlider(calculator) {
        const MIN_LEVEL = 0, MAX_LEVEL = 5;
        const container = document.getElementById('level-slider-container');
        const thumbStart = document.getElementById('slider-thumb-start');
        const thumbEnd = document.getElementById('slider-thumb-end');
        const levelDisplay = document.getElementById('upgrade-level-display');

        function updateSliderUI() {
            const range = MAX_LEVEL - MIN_LEVEL;
            const startPercent = ((finalGoal.upgrade_start_level - MIN_LEVEL) / range) * 100;
            const endPercent = ((finalGoal.upgrade_end_level - MIN_LEVEL) / range) * 100;
            document.getElementById('slider-progress').style.left = `${startPercent}%`;
            document.getElementById('slider-progress').style.width = `${endPercent - startPercent}%`;
            thumbStart.style.left = `${startPercent}%`;
            thumbEnd.style.left = `${endPercent}%`;
            if(levelDisplay) levelDisplay.textContent = `Lv. ${finalGoal.upgrade_start_level} → Lv. ${finalGoal.upgrade_end_level}`;
        }

        function handleMove(e, thumb) {
            const rect = container.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
            const level = Math.round((percent / 100) * (MAX_LEVEL - MIN_LEVEL)) + MIN_LEVEL;

            if (thumb === thumbStart) {
                finalGoal.upgrade_start_level = Math.min(level, finalGoal.upgrade_end_level);
            } else {
                finalGoal.upgrade_end_level = Math.max(level, finalGoal.upgrade_start_level);
            }
            updateSliderUI();
            calculateUpgradeCost(calculator);
        }

        function startDrag(e, thumb) {
            e.preventDefault();
            const onMove = (moveEvent) => handleMove(moveEvent, thumb);
            const onEnd = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onEnd); document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onEnd); };
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
    
    function renderSummaryPage() {
        dom.tabContentContainer.innerHTML = `
            <section class="card">
                <h2 class="text-xl font-bold mb-4 border-b pb-2 text-[#8d7b68]">最終目標總覽</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label for="summary-start-stage" class="text-sm font-medium">起始階段</label>
                        <select id="summary-start-stage" class="w-full p-2 border rounded-md mt-1"></select>
                    </div>
                    <div>
                        <label for="summary-end-stage" class="text-sm font-medium">結束階段</label>
                        <select id="summary-end-stage" class="w-full p-2 border rounded-md mt-1"></select>
                    </div>
                </div>
                <div id="summary-materials-list" class="grid grid-cols-2 md:grid-cols-3 gap-4"></div>
                <div class="text-right mt-6 border-t pt-4">
                    <p class="text-xl font-bold">預期成本: <span id="summary-total-zeny" class="text-2xl text-[#655a4c]">0 Zeny</span></p>
                </div>
            </section>
        `;
        
        const stages = {
            1: '從零開始',
            2: '已有基礎徽章',
            3: '已完成第三、四洞附魔',
            4: '已完成第二洞附魔'
        };
        const startSelector = document.getElementById('summary-start-stage');
        const endSelector = document.getElementById('summary-end-stage');
        
        Object.entries(stages).forEach(([key, name]) => {
            startSelector.innerHTML += `<option value="${key}">${name}</option>`;
            endSelector.innerHTML += `<option value="${key}">${name}</option>`;
        });

        startSelector.value = 1;
        endSelector.value = 4;

        startSelector.addEventListener('change', calculateAndRenderSummary);
        endSelector.addEventListener('change', calculateAndRenderSummary);

        calculateAndRenderSummary();
    }

    function calculateAndRenderSummary() {
        const startStage = parseInt(document.getElementById('summary-start-stage').value);
        const endStage = parseInt(document.getElementById('summary-end-stage').value);

        let totalZeny = 0;
        const totalMaterials = {};

        const craftCalc = appData.calculators.find(c => c.type === 'craft');
        const gachaCalc = appData.calculators.find(c => c.type === 'enchant-gacha');
        const upgradeCalc = appData.calculators.find(c => c.type === 'enchant-upgrade');

        const stageOrder = {craft: 1, gacha: 3, upgrade: 4};

        if (startStage <= stageOrder.craft && endStage >= stageOrder.craft) {
            const craftResult = calculateCraftCost(craftCalc, true);
            if(craftResult) {
                totalZeny += craftResult.totalZeny;
                Object.entries(craftResult.totalMaterials).forEach(([key, qty]) => totalMaterials[key] = (totalMaterials[key] || 0) + qty);
            }
        }
        if (startStage <= stageOrder.gacha && endStage >= stageOrder.gacha) {
            const gachaResult = calculateGachaCost(gachaCalc, true);
            if(gachaResult) {
                totalZeny += gachaResult.totalZeny;
                Object.entries(gachaResult.totalMaterials).forEach(([key, qty]) => totalMaterials[key] = (totalMaterials[key] || 0) + qty);
            }
        }
        if (startStage <= stageOrder.upgrade && endStage >= stageOrder.upgrade) {
            const upgradeResult = calculateUpgradeCost(upgradeCalc, true);
            if(upgradeResult) {
                totalZeny += upgradeResult.totalZeny;
                Object.entries(upgradeResult.totalMaterials).forEach(([key, qty]) => totalMaterials[key] = (totalMaterials[key] || 0) + qty);
            }
        }

        const summaryListEl = document.getElementById('summary-materials-list');
        summaryListEl.innerHTML = '';
        const materialOrder = ['yeshengmo_bead', 'betelgeuse_bead'];
        const sortedMaterials = Object.keys(totalMaterials).sort((a, b) => {
            const indexA = materialOrder.indexOf(a);
            const indexB = materialOrder.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });

        sortedMaterials.forEach(key => {
            const qty = totalMaterials[key];
            summaryListEl.innerHTML += `<p><span class="font-semibold">${appData.materials[key]}:</span> ${formatNumber(qty)}</p>`;
        });

        document.getElementById('summary-total-zeny').textContent = `${formatNumber(totalZeny)} Zeny`;
    }

    initialize();
});