const inputText = document.getElementById('input-text');
const outputText = document.getElementById('output-text');
const convertBtn = document.getElementById('convert-btn');
const inputLabel = document.getElementById('input-label');
const convertButtonText = document.getElementById('convert-button-text');
const copyOutputBtn = document.getElementById('copy-output-btn');
const clearInputBtn = document.getElementById('clear-input-btn');
const modalOverlay = document.getElementById('modal-overlay');
const closeModalBtn = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
const grammarCheckBtn = document.getElementById('grammar-check-btn');
const plagiarismCheckBtn = document.getElementById('plagiarism-check-btn');
const modeSmsToFullBtn = document.getElementById('mode-sms-to-full');
const modeFullToSmsBtn = document.getElementById('mode-full-to-sms');
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const sidebarCustomAbbreviationsBtn = document.getElementById('sidebar-custom-abbreviations-btn');
const sidebarUsageStatisticsBtn = document.getElementById('sidebar-usage-statistics-btn');
const sidebarHistoryBtn = document.getElementById('sidebar-history-btn');
const sidebarAccountBtn = document.getElementById('sidebar-account-btn');
const sidebarFeedbackBtn = document.getElementById('sidebar-feedback-btn');
const sidebarAboutBtn = document.getElementById('sidebar-about-btn');
const appContainer = document.getElementById('app');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeToggleIcon = document.getElementById('theme-toggle-icon');
const userInfoElement = document.getElementById('user-info');
const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');
const HISTORY_STORAGE_KEY = 'abbrevify_conversion_history';
const CUSTOM_ABBREVIATIONS_KEY = 'abbrevify_custom_abbreviations';
const USAGE_STATS_KEY = 'abbrevify_usage_stats';
const THEME_KEY = 'abbrevify_theme';
const SESSION_STORAGE_KEY = 'abbrevify_current_user';
let conversionHistory = [];
let customAbbreviations = {};
let usageStats = {
    totalConversions: 0,
    smsToFullCount: 0,
    fullToSmsCount: 0,
    grammarCheckCount: 0,
    plagiarismCheckCount: 0,
};
let currentMode = 'sms-to-full';
grammarCheckBtn.disabled = false;
grammarCheckBtn.classList.remove('opacity-50', 'cursor-not-allowed');

plagiarismCheckBtn.disabled = false;
plagiarismCheckBtn.classList.remove('opacity-50', 'cursor-not-allowed');

function openModal(title, contentHtml) {
    modalTitle.textContent = title;
    modalContent.innerHTML = contentHtml;
    const modalPanel = modalOverlay.querySelector('.panel-bg');
    if (document.documentElement.classList.contains('dark')) {
        modalPanel.style.backgroundColor = tailwind.config.theme.extend.colors['dark-panel'];
    } else {
        modalPanel.style.backgroundColor = tailwind.config.theme.extend.colors['light-panel'];
    }
    modalOverlay.classList.remove('hidden');
}

function closeModal() {
    modalOverlay.classList.add('hidden');
    modalContent.innerHTML = '';
}

function alert(message) {
    openModal('Alert', `<p class="text-center text-lg py-4">${message}</p>`);
}

function confirm(message) {
    return new Promise((resolve) => {
        const confirmHtml = `
            <p class="text-center text-lg py-4">${message}</p>
            <div class="flex justify-around mt-6">
                <button id="modal-confirm-no" class="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 ripple dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300">No</button>
                <button id="modal-confirm-yes" class="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg ripple">Yes</button>
            </div>
        `;
        openModal('Confirm', confirmHtml);
        document.getElementById('modal-confirm-yes').onclick = () => { closeModal(); resolve(true); };
        document.getElementById('modal-confirm-no').onclick = () => { closeModal(); resolve(false); };
    });
}

function saveConversionHistory() {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(conversionHistory));
}

function loadConversionHistory() {
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (storedHistory) {
        conversionHistory = JSON.parse(storedHistory);
    } else {
        conversionHistory = [];
    }
}

function addConversionToHistory(input, output, mode) {
    const newHistoryItem = {
        id: Date.now(),
        input: input,
        output: output,
        mode: mode,
        timestamp: new Date().toISOString()
    };
    conversionHistory.unshift(newHistoryItem);
    saveConversionHistory();
}

async function deleteHistoryItem(id) {
    const confirmed = await confirm("Are you sure you want to delete this conversion from history?");
    if (confirmed) {
        conversionHistory = conversionHistory.filter(item => item.id !== id);
        saveConversionHistory();
        showHistoryModal();
        alert("Conversion deleted from history.");
    }
}

async function clearAllHistory() {
    const confirmed = await confirm("Are you sure you want to clear all conversion history?");
    if (confirmed) {
        conversionHistory = [];
        saveConversionHistory();
        if (!modalOverlay.classList.contains('hidden') && modalTitle.textContent === 'Conversion History') {
            showHistoryModal();
        }
        alert("All history cleared!");
    }
}

function saveCustomAbbreviations() {
    localStorage.setItem(CUSTOM_ABBREVIATIONS_KEY, JSON.stringify(customAbbreviations));
}

function loadCustomAbbreviations() {
    const storedCustom = localStorage.getItem(CUSTOM_ABBREVIATIONS_KEY);
    if (storedCustom) {
        customAbbreviations = JSON.parse(storedCustom);
    } else {
        customAbbreviations = {};
    }
}

function saveUsageStats() {
    localStorage.setItem(USAGE_STATS_KEY, JSON.stringify(usageStats));
}

function loadUsageStats() {
    const storedStats = localStorage.getItem(USAGE_STATS_KEY);
    if (storedStats) {
        usageStats = JSON.parse(storedStats);
    } else {
        usageStats = {
            totalConversions: 0,
            smsToFullCount: 0,
            fullToSmsCount: 0,
            grammarCheckCount: 0,
        };
    }
}

function updateUsageStats(action) {
    usageStats.totalConversions++;
    if (action === 'convert') {
        if (currentMode === 'sms-to-full') usageStats.smsToFullCount++;
        else usageStats.fullToSmsCount++;
    } else if (action === 'grammar_check') {
        usageStats.grammarCheckCount++;
    } else if (action === 'plagiarism_check') {
        usageStats.plagiarismCheckCount++;
    }
    saveUsageStats();
}

async function handleConversion() {
    const input = inputText.value.trim();
    if (!input) {
        alert("Please enter text to convert.");
        return;
    }
    convertBtn.disabled = true;
    convertBtn.classList.add('opacity-50', 'cursor-not-allowed');
    convertButtonText.textContent = 'Converting...';
    outputText.value = "Processing...";
    const apiUrl = 'http://127.0.0.1:5000/process_text';
    const postData = {
        text: input,
        action: 'convert',
        mode: currentMode,
        custom_abbreviations: customAbbreviations
    };
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData)
        });
        if (!response.ok) {
            throw new Error('Server error');
        }
        const data = await response.json();
        outputText.value = data.processed_text;
        addConversionToHistory(input, data.processed_text, currentMode === 'sms-to-full' ? 'SMS to Full' : 'Full to SMS');
        updateUsageStats('convert');
    } catch (error) {
        console.error('Conversion failed:', error);
        outputText.value = "Error converting text. Please try again.";
        alert("There was an error connecting to the server.");
    } finally {
        convertBtn.disabled = false;
        convertBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        convertButtonText.textContent = 'Convert';
    }
}

async function handleGrammarCheck() {
    const input = inputText.value.trim();
    if (!input) {
        alert("Please enter text to check grammar.");
        return;
    }
    grammarCheckBtn.disabled = true;
    grammarCheckBtn.classList.add('opacity-50', 'cursor-not-allowed');
    grammarCheckBtn.textContent = 'Checking...';
    outputText.value = "Processing...";
    const apiUrl = 'http://127.0.0.1:5000/process_text';
    const postData = {
        text: input,
        action: 'grammar_check',
        mode: currentMode,
        custom_abbreviations: customAbbreviations
    };
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData)
        });
        if (!response.ok) {
            throw new Error('Server error');
        }
        const data = await response.json();
        outputText.value = data.feedback ? data.feedback.join('\n') : "No grammar or spelling errors found.";
        updateUsageStats('grammar_check');
    } catch (error) {
        console.error('Grammar check failed:', error);
        outputText.value = "Error checking grammar. Please try again.";
        alert("There was an error connecting to the server.");
    } finally {
        grammarCheckBtn.disabled = false;
        grammarCheckBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        grammarCheckBtn.textContent = 'Grammar Check';
    }
}

async function handlePlagiarismCheck() {
    const input = inputText.value.trim();
    if (!input) {
        alert("Please enter text to check for plagiarism.");
        return;
    }
    plagiarismCheckBtn.disabled = true;
    plagiarismCheckBtn.classList.add('opacity-50', 'cursor-not-allowed');
    plagiarismCheckBtn.textContent = 'Checking...';
    outputText.value = "Processing...";
    const apiUrl = 'http://127.0.0.1:5000/process_text';
    const postData = {
        text: input,
        action: 'plagiarism_check',
        mode: currentMode,
        custom_abbreviations: customAbbreviations
    };
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData)
        });
        if (!response.ok) {
            throw new Error('Server error');
        }
        const data = await response.json();
        let displayText = "";
        if (typeof data.percentage === 'number') {
            displayText += `Plagiarism = ${data.percentage}%\n`;
        }
        if (data.explanation) {
            let simpleDetail = data.explanation.split(/[\n\.]/).filter(Boolean).slice(0,2).join('. ') + (data.explanation.includes('.') ? '.' : '');
            displayText += simpleDetail;
        }
        if (!displayText) {
            displayText = "Unable to determine plagiarism status.";
        }
        outputText.value = displayText;
        updateUsageStats('plagiarism_check');
    } catch (error) {
        console.error('Plagiarism check failed:', error);
        outputText.value = "Error checking plagiarism. Please try again.";
        alert("There was an error connecting to the server.");
    } finally {
        plagiarismCheckBtn.disabled = false;
        plagiarismCheckBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        plagiarismCheckBtn.textContent = 'Plagiarism Check';
    }
}

function handleCopyOutput() {
    const textToCopy = outputText.textContent || outputText.value;
    if (textToCopy && textToCopy !== 'Processing...' && !textToCopy.startsWith('Error')) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            alert("Copied to clipboard!");
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert("Failed to copy text. Please try again.");
        });
    } else {
        alert("There is no text to copy.");
    }
}

function handleClearInput() {
    inputText.value = '';
    outputText.value = '';
    outputText.innerHTML = '';
    inputText.focus();
}

function updateModeButtons() {
    modeSmsToFullBtn.classList.remove('active');
    modeFullToSmsBtn.classList.remove('active');
    if (currentMode === 'sms-to-full') {
        modeSmsToFullBtn.classList.add('active');
        inputLabel.textContent = 'Enter SMS abbreviation:';
        inputText.placeholder = 'e.g., wt 2 4 u, l8r, ttyl';
    } else {
        modeFullToSmsBtn.classList.add('active');
        inputLabel.textContent = 'Enter full text:';
        inputText.placeholder = 'e.g., Be right back';
    }
    convertButtonText.textContent = 'Convert';
    handleClearInput();
}

function showCustomAbbreviationsModal() {
    let listHtml = `
        <div class="space-y-4 max-h-96 overflow-y-auto">
    `;
    const sortedAbbreviations = Object.keys(customAbbreviations).sort();
    if (sortedAbbreviations.length === 0) {
        listHtml += `<p class="text-center text-secondary">You haven't added any custom abbreviations yet.</p>`;
    } else {
        for (const abbr of sortedAbbreviations) {
            const fullText = customAbbreviations[abbr];
            listHtml += `
                <div class="flex items-center justify-between p-3 border border-color rounded-lg">
                    <div class="flex-1 min-w-0">
                        <p class="font-bold text-primary truncate">${abbr.toUpperCase()}</p>
                        <p class="text-sm text-secondary truncate">${fullText}</p>
                    </div>
                    <button class="remove-abbr-btn ml-4 text-red-500 hover:text-red-700 transition-colors" data-abbr="${abbr}" title="Remove">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
        }
    }
    listHtml += `</div>
        <form id="add-abbr-form" class="mt-4 p-4 border-t border-color">
            <h3 class="font-bold text-lg mb-2">Add New</h3>
            <div class="flex flex-col sm:flex-row gap-2">
                <input type="text" id="new-abbr-key" placeholder="Abbreviation (e.g., BTW)" class="flex-1 p-2 border border-color rounded-lg input-bg text-primary" required>
                <input type="text" id="new-abbr-value" placeholder="Full Text (e.g., By the way)" class="flex-1 p-2 border border-color rounded-lg input-bg text-primary" required>
                <button type="submit" class="px-4 py-2 bg-light-btn-primary-start text-white rounded-lg hover:bg-light-btn-primary-hover-start dark:bg-dark-btn-primary-start dark:text-black dark:hover:bg-dark-btn-primary-hover-start transition-colors font-semibold">Add</button>
            </div>
        </form>
    `;
    openModal('Custom Abbreviations', listHtml);
    document.getElementById('add-abbr-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const key = document.getElementById('new-abbr-key').value.trim().toLowerCase();
        const value = document.getElementById('new-abbr-value').value.trim();
        if (key && value) {
            customAbbreviations[key] = value;
            saveCustomAbbreviations();
            showCustomAbbreviationsModal();
        } else {
            alert("Both fields must be filled out.");
        }
    });
    document.querySelectorAll('.remove-abbr-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const abbrToRemove = e.currentTarget.getAttribute('data-abbr');
            delete customAbbreviations[abbrToRemove];
            saveCustomAbbreviations();
            showCustomAbbreviationsModal();
        });
    });
}

function showHistoryModal() {
    let historyHtml = `
        <div class="flex justify-between items-center mb-4 border-b pb-2 border-color">
            <h3 class="text-lg font-semibold">Recent Conversions</h3>
            <button id="clear-history-btn" class="text-red-500 hover:text-red-700 transition-colors text-sm">Clear All</button>
        </div>
        <div class="space-y-4 max-h-96 overflow-y-auto">
    `;
    if (conversionHistory.length === 0) {
        historyHtml += `<p class="text-center text-secondary">Your conversion history is empty.</p>`;
    } else {
        conversionHistory.forEach(item => {
            const date = new Date(item.timestamp).toLocaleString();
            historyHtml += `
                <div class="p-3 border border-color rounded-lg relative">
                    <p class="text-xs text-secondary">${date} (${item.mode})</p>
                    <p class="mt-1 font-mono text-primary break-words"><strong>Input:</strong> ${item.input}</p>
                    <p class="mt-1 font-mono text-primary break-words"><strong>Output:</strong> ${item.output}</p>
                    <button class="copy-history-btn absolute top-3 right-3 text-secondary hover:text-primary transition-colors" title="Copy Output" data-output="${item.output.replace(/"/g, '&quot;')}">
                        <i class="bi bi-clipboard"></i>
                    </button>
                    <button class="delete-history-btn absolute top-10 right-3 text-red-500 hover:text-red-700 transition-colors" title="Delete" data-id="${item.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
        });
    }
    historyHtml += `</div>`;
    openModal('Conversion History', historyHtml);
    document.getElementById('clear-history-btn').addEventListener('click', clearAllHistory);
    document.querySelectorAll('.copy-history-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const outputTextToCopy = e.currentTarget.getAttribute('data-output');
            navigator.clipboard.writeText(outputTextToCopy).then(() => {
                alert("Output copied to clipboard!");
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                alert("Failed to copy text. Please try again.");
            });
        });
    });
    document.querySelectorAll('.delete-history-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.getAttribute('data-id'));
            deleteHistoryItem(id);
        });
    });
}

function showUsageStatsModal() {
    const statsHtml = `
        <div class="space-y-4">
            <div class="flex justify-between items-center p-3 border border-color rounded-lg">
                <p class="font-semibold text-primary">Total Conversions:</p>
                <span class="text-lg font-bold">${usageStats.totalConversions}</span>
            </div>
            <div class="flex justify-between items-center p-3 border border-color rounded-lg">
                <p class="font-semibold text-primary">SMS to Full:</p>
                <span class="text-lg font-bold">${usageStats.smsToFullCount}</span>
            </div>
            <div class="flex justify-between items-center p-3 border border-color rounded-lg">
                <p class="font-semibold text-primary">Full to SMS:</p>
                <span class="text-lg font-bold">${usageStats.fullToSmsCount}</span>
            </div>
            <div class="flex justify-between items-center p-3 border border-color rounded-lg">
                <p class="font-semibold text-primary">Grammar Checks:</p>
                <span class="text-lg font-bold">${usageStats.grammarCheckCount}</span>
            </div>
        </div>
    `;
    openModal('Usage Statistics', statsHtml);
}

function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.remove('hidden');
    setTimeout(() => {
        sidebarOverlay.style.opacity = '1';
    }, 10);
}

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.style.opacity = '0';
    setTimeout(() => {
        sidebarOverlay.classList.add('hidden');
    }, 300);
}

document.addEventListener('DOMContentLoaded', () => {
    const isDarkMode = localStorage.getItem(THEME_KEY) === 'dark' || (!localStorage.getItem(THEME_KEY) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        themeToggleIcon.classList.remove('bi-moon-fill');
        themeToggleIcon.classList.add('bi-sun-fill');
    } else {
        document.documentElement.classList.remove('dark');
        themeToggleIcon.classList.remove('bi-sun-fill');
        themeToggleIcon.classList.add('bi-moon-fill');
    }

    themeToggleBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        if (document.documentElement.classList.contains('dark')) {
            localStorage.setItem(THEME_KEY, 'dark');
            themeToggleIcon.classList.remove('bi-moon-fill');
            themeToggleIcon.classList.add('bi-sun-fill');
        } else {
            localStorage.setItem(THEME_KEY, 'light');
            themeToggleIcon.classList.remove('bi-sun-fill');
            themeToggleIcon.classList.add('bi-moon-fill');
        }
    });

    updateModeButtons();
    loadConversionHistory();
    loadCustomAbbreviations();
    loadUsageStats();

    modeSmsToFullBtn.addEventListener('click', () => {
        currentMode = 'sms-to-full';
        updateModeButtons();
    });

    modeFullToSmsBtn.addEventListener('click', () => {
        currentMode = 'full-to-sms';
        updateModeButtons();
    });

    convertBtn.addEventListener('click', handleConversion);
    grammarCheckBtn.addEventListener('click', handleGrammarCheck);
    plagiarismCheckBtn.addEventListener('click', handlePlagiarismCheck);
    copyOutputBtn.addEventListener('click', handleCopyOutput);
    clearInputBtn.addEventListener('click', handleClearInput);
    closeModalBtn.addEventListener('click', closeModal);
    sidebarToggleBtn.addEventListener('click', openSidebar);
    closeSidebarBtn.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    sidebarCustomAbbreviationsBtn.addEventListener('click', () => {
        closeSidebar();
        showCustomAbbreviationsModal();
    });

    sidebarUsageStatisticsBtn.addEventListener('click', () => {
        closeSidebar();
        showUsageStatsModal();
    });

    sidebarHistoryBtn.addEventListener('click', () => {
        closeSidebar();
        showHistoryModal();
    });

    sidebarAccountBtn.addEventListener('click', () => {
        closeSidebar();
        openModal('Account', `<p class="text-center text-lg py-4">This feature is not yet implemented.</p>`);
    });

    sidebarFeedbackBtn.addEventListener('click', () => {
        closeSidebar();
        openModal('Give Feedback', `<p class="text-center text-lg py-4">You can provide feedback via email at shettypavan524@gmail.com.</p>`);
    });

    sidebarAboutBtn.addEventListener('click', () => {
        closeSidebar();
        openModal('About', `<p class="text-center text-lg py-4">Abbrevify is a simple, modern web application for converting SMS abbreviations and checking grammar, powered by a large language model. This project is created by Pavan Shetty.</p>`);
    });


});