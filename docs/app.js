// Case Explorer Application
(function() {
    'use strict';
    
    let allCases = [];
    let filteredCases = [];
    let selectedCaseId = null;
    let activeFilter = 'all';
    let searchTerm = '';
    
    // Initialize on DOM load
    document.addEventListener('DOMContentLoaded', init);
    
    async function init() {
        await loadCases();
        setupEventListeners();
        renderCaseList();
        if (filteredCases.length > 0) {
            selectCase(filteredCases[0].id);
        }
    }
    
    async function loadCases() {
        try {
            const response = await fetch('./cases.json');
            if (!response.ok) {
                throw new Error('Failed to load cases');
            }
            const data = await response.json();
            allCases = data.cases || [];
            filteredCases = [...allCases];
        } catch (error) {
            console.error('Error loading cases:', error);
            showError('Failed to load case data. Please refresh the page.');
        }
    }
    
    function setupEventListeners() {
        // Filter chips
        const filterChips = document.querySelectorAll('.filter-chip');
        filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                activeFilter = chip.dataset.filter;
                applyFilters();
            });
        });
        
        // Search box
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchTerm = e.target.value.toLowerCase();
                applyFilters();
            });
        }
        
        // Tab switching
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab')) {
                switchTab(e.target.dataset.tab);
            }
        });
    }
    
    function applyFilters() {
        filteredCases = allCases.filter(caseItem => {
            // Apply risk filter
            let passesFilter = true;
            if (activeFilter !== 'all') {
                const action = caseItem.recommended_action.toLowerCase();
                switch(activeFilter) {
                    case 'high':
                        passesFilter = action.includes('block');
                        break;
                    case 'hold':
                        passesFilter = action.includes('hold') || action.includes('manual');
                        break;
                    case 'review':
                        passesFilter = action.includes('review') || action.includes('priority');
                        break;
                    case 'low':
                        passesFilter = action.includes('monitor') || action.includes('no action');
                        break;
                }
            }
            
            if (!passesFilter) return false;
            
            // Apply search filter
            if (searchTerm) {
                const txnId = String(caseItem.txn_id).toLowerCase();
                const city = (caseItem.evidence?.city || '').toLowerCase();
                const action = caseItem.recommended_action.toLowerCase();
                return txnId.includes(searchTerm) || 
                       city.includes(searchTerm) ||
                       action.includes(searchTerm);
            }
            
            return true;
        });
        
        renderCaseList();
        if (filteredCases.length > 0 && !filteredCases.find(c => c.id === selectedCaseId)) {
            selectCase(filteredCases[0].id);
        } else if (filteredCases.length === 0) {
            document.getElementById('case-detail').innerHTML = '<p class="loading">No cases match your filters.</p>';
        }
    }
    
    function renderCaseList() {
        const listContainer = document.getElementById('case-list');
        if (!listContainer) return;
        
        if (filteredCases.length === 0) {
            listContainer.innerHTML = '<p style="padding: 10px; color: var(--text-light); font-size: 0.9em;">No cases found.</p>';
            return;
        }
        
        listContainer.innerHTML = '';
        filteredCases.forEach(caseItem => {
            const itemDiv = document.createElement('div');
            itemDiv.className = `case-list-item ${caseItem.id === selectedCaseId ? 'selected' : ''}`;
            itemDiv.dataset.caseId = caseItem.id;
            itemDiv.addEventListener('click', () => selectCase(caseItem.id));
            
            const idDiv = document.createElement('div');
            idDiv.className = 'case-id';
            idDiv.textContent = `Transaction ${caseItem.txn_id}`;
            
            const previewDiv = document.createElement('div');
            previewDiv.className = 'case-preview';
            previewDiv.textContent = truncate(caseItem.recommended_action, 40);
            
            itemDiv.appendChild(idDiv);
            itemDiv.appendChild(previewDiv);
            listContainer.appendChild(itemDiv);
        });
    }
    
    function selectCase(caseId) {
        selectedCaseId = caseId;
        const caseData = allCases.find(c => c.id === caseId);
        if (!caseData) return;
        
        renderCaseList(); // Update selection in list
        renderCaseDetail(caseData);
    }
    
    // Helper function to safely escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function renderCaseDetail(caseData) {
        const detailContainer = document.getElementById('case-detail');
        if (!detailContainer) return;
        
        const actionClass = getActionClass(caseData.recommended_action);
        
        // Safely escape all dynamic user content
        const safeTxnId = escapeHtml(String(caseData.txn_id));
        const safeAction = escapeHtml(caseData.recommended_action);
        const safeRiskScore = escapeHtml(caseData.risk_score.toFixed(1));
        const safeAmount = escapeHtml(String(caseData.evidence.amount_usd));
        const safeCity = escapeHtml(caseData.evidence.city);
        const safeCountry = escapeHtml(caseData.evidence.country);
        const safeTxnCnt = escapeHtml(String(caseData.evidence.txn_cnt_last_24h));
        const safeMins = escapeHtml(String(caseData.evidence.mins_since_prev_txn));
        const safeNarrativeGen = escapeHtml(caseData.narrative_generated);
        const safeNarrativeRef = escapeHtml(caseData.narrative_reference);
        const safeShapSummary = escapeHtml(caseData.shap_summary);
        const safePrompt = escapeHtml(caseData.prompt_preview);
        
        detailContainer.innerHTML = `
            <div class="case-header">
                <h3>Transaction ${safeTxnId}</h3>
                <div class="case-meta-row">
                    <span class="action-badge ${actionClass}">${safeAction}</span>
                    <div class="risk-meter">
                        <div class="risk-meter-label">Risk Score</div>
                        <div class="risk-meter-bar">
                            <div class="risk-meter-fill" style="width: ${caseData.risk_score}%"></div>
                            <div class="risk-meter-value">${safeRiskScore}</div>
                        </div>
                    </div>
                </div>
                <div class="quick-evidence">
                    <div class="evidence-item">
                        <span class="evidence-label">Amount</span>
                        <span class="evidence-value">$${safeAmount}</span>
                    </div>
                    <div class="evidence-item">
                        <span class="evidence-label">City</span>
                        <span class="evidence-value">${safeCity}</span>
                    </div>
                    <div class="evidence-item">
                        <span class="evidence-label">Country</span>
                        <span class="evidence-value">${safeCountry}</span>
                    </div>
                    <div class="evidence-item">
                        <span class="evidence-label">Last 24h Txns</span>
                        <span class="evidence-value">${safeTxnCnt}</span>
                    </div>
                    <div class="evidence-item">
                        <span class="evidence-label">Mins Since Prev</span>
                        <span class="evidence-value">${safeMins}</span>
                    </div>
                </div>
            </div>
            
            <div class="tabs">
                <button class="tab active" data-tab="narrative">Narrative</button>
                <button class="tab" data-tab="explainability">Explainability</button>
                <button class="tab" data-tab="evidence">Evidence</button>
                <button class="tab" data-tab="prompt">Prompt Trace</button>
            </div>
            
            <div id="tab-narrative" class="tab-content active">
                <div class="narrative-comparison">
                    <div class="narrative-box">
                        <h4>Generated Narrative</h4>
                        <p>${safeNarrativeGen}</p>
                    </div>
                    <div class="narrative-box">
                        <h4>Reference Narrative</h4>
                        <p>${safeNarrativeRef}</p>
                    </div>
                </div>
            </div>
            
            <div id="tab-explainability" class="tab-content">
                <div class="shap-summary">
                    <strong>SHAP Summary:</strong> ${safeShapSummary}
                </div>
                <h4>Top Contributing Features</h4>
                <div class="shap-bars">
                    ${renderShapBars(caseData.top_shap_pairs)}
                </div>
            </div>
            
            <div id="tab-evidence" class="tab-content">
                <table class="evidence-table">
                    <thead>
                        <tr>
                            <th>Field</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderEvidenceTable(caseData.evidence)}
                    </tbody>
                </table>
            </div>
            
            <div id="tab-prompt" class="tab-content">
                <details>
                    <summary>Show Prompt Trace</summary>
                    <div class="prompt-trace-box">${safePrompt}</div>
                </details>
            </div>
        `;
    }
    
    function renderShapBars(shapPairs) {
        if (!shapPairs || shapPairs.length === 0) {
            return '<p style="color: var(--text-light);">No SHAP data available</p>';
        }
        
        const maxAbsValue = Math.max(...shapPairs.map(p => Math.abs(p.value)));
        
        return shapPairs.map(pair => {
            const isPositive = pair.value >= 0;
            const absValue = Math.abs(pair.value);
            const percentage = maxAbsValue > 0 ? (absValue / maxAbsValue) * 100 : 0;
            const sign = isPositive ? '+' : '';
            const valueClass = isPositive ? 'positive' : 'negative';
            const fillClass = isPositive ? 'positive' : 'negative';
            
            return `
                <div class="shap-bar-item">
                    <div class="shap-bar-label">
                        <span class="shap-feature">${escapeHtml(pair.feature)}</span>
                        <span class="shap-value ${valueClass}">${sign}${pair.value.toFixed(3)}</span>
                    </div>
                    <div class="shap-bar-track">
                        <div class="shap-bar-fill ${fillClass}" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    function renderEvidenceTable(evidence) {
        return Object.entries(evidence).map(([key, value]) => {
            const displayValue = value !== null && value !== '' ? String(value) : 'N/A';
            return `
                <tr>
                    <td>${escapeHtml(formatFieldName(key))}</td>
                    <td>${escapeHtml(displayValue)}</td>
                </tr>
            `;
        }).join('');
    }
    
    function formatFieldName(field) {
        return field
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }
    
    function getActionClass(action) {
        const actionLower = action.toLowerCase();
        if (actionLower.includes('block')) return 'block';
        if (actionLower.includes('hold') || actionLower.includes('manual')) return 'hold';
        if (actionLower.includes('review') || actionLower.includes('priority')) return 'review';
        if (actionLower.includes('monitor') || actionLower.includes('no action')) return 'monitor';
        return '';
    }
    
    function switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });
    }
    
    function truncate(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    function showError(message) {
        const detailContainer = document.getElementById('case-detail');
        if (detailContainer) {
            detailContainer.innerHTML = `<div class="error">${message}</div>`;
        }
    }
    
    // Expose public API
    window.caseExplorer = {
        selectCase
    };
})();
