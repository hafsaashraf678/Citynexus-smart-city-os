// Smooth scrolling
function scrollToDemo() {
    document.getElementById('demo').scrollIntoView({ behavior: 'smooth' });
}

// System State
let processes = [];
let processIdCounter = 1;
let memoryUsed = 0;
let contextSwitches = 0;
let isRunning = true;
let currentRunningProcess = null;

// Process States
const ProcessState = {
    NEW: 'New',
    READY: 'Ready',
    RUNNING: 'Running',
    WAITING: 'Waiting',
    TERMINATED: 'Terminated'
};

// Service configurations
const serviceConfigs = {
    traffic: {
        name: '🚦 Traffic System',
        color: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        memory: 128,
        threads: ['Signal Control', 'Vehicle Detection', 'Route Optimization'],
        burstTime: 5
    },
    emergency: {
        name: '🚨 Emergency Service',
        color: 'linear-gradient(135deg, #ef4444, #dc2626)',
        memory: 256,
        threads: ['911 Dispatcher', 'Ambulance Routing', 'Hospital Coordination'],
        burstTime: 3
    },
    utility: {
        name: '💡 Utility Management',
        color: 'linear-gradient(135deg, #f59e0b, #d97706)',
        memory: 96,
        threads: ['Power Grid Monitor', 'Water System', 'Waste Management'],
        burstTime: 6
    },
    transport: {
        name: '🚍 Public Transport',
        color: 'linear-gradient(135deg, #10b981, #059669)',
        memory: 150,
        threads: ['Bus Tracking', 'Schedule Manager', 'Passenger Info'],
        burstTime: 4
    },
    security: {
        name: '🔒 Security System',
        color: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        memory: 200,
        threads: ['Camera Monitor', 'Threat Detection', 'Alert System'],
        burstTime: 5
    }
};

// Process Class
class Process {
    constructor(serviceType, priority) {
        this.id = processIdCounter++;
        this.serviceType = serviceType;
        this.config = serviceConfigs[serviceType];
        this.priority = priority;
        this.state = ProcessState.NEW;
        this.burstTime = this.config.burstTime;
        this.remainingTime = this.burstTime;
        this.arrivalTime = Date.now();
        this.threads = [];
        this.memory = this.config.memory;
    }

    createThreads() {
        this.threads = this.config.threads.map((threadName, index) => ({
            id: `${this.id}-T${index + 1}`,
            name: threadName,
            progress: 0,
            state: 'Running'
        }));
    }
}

// Start a new process
function startProcess(serviceType, priority) {
    if (memoryUsed + serviceConfigs[serviceType].memory > 1024) {
        addLog(`❌ Cannot start ${serviceConfigs[serviceType].name} - Insufficient memory`);
        return;
    }

    const process = new Process(serviceType, priority);
    process.state = ProcessState.READY;
    process.createThreads();
    
    processes.push(process);
    memoryUsed += process.memory;
    
    addLog(`✅ Process P${process.id} (${process.config.name}) created with priority ${priority}`);
    addLog(`💾 Memory allocated: ${process.memory} MB (Total: ${memoryUsed}/1024 MB)`);
    
    updateUI();
    renderProcess(process);
    renderThreads(process);
}

// Render process in CPU queue
function renderProcess(process) {
    const cpuQueue = document.getElementById('cpuQueue');
    
    // Remove placeholder
    const placeholder = cpuQueue.querySelector('.queue-placeholder');
    if (placeholder) placeholder.remove();
    
    const processDiv = document.createElement('div');
    processDiv.className = 'process-item';
    processDiv.id = `process-${process.id}`;
    processDiv.style.background = process.config.color;
    
    processDiv.innerHTML = `
        <div>${process.config.name}</div>
        <div class="process-state">State: ${process.state} | Priority: ${process.priority}</div>
        <div class="process-state">Remaining: ${process.remainingTime}s</div>
    `;
    
    cpuQueue.appendChild(processDiv);
}

// Render threads
function renderThreads(process) {
    const threadContainer = document.getElementById('threadContainer');
    
    // Remove placeholder
    const placeholder = threadContainer.querySelector('.thread-placeholder');
    if (placeholder) placeholder.remove();
    
    process.threads.forEach(thread => {
        const threadDiv = document.createElement('div');
        threadDiv.className = 'thread-item';
        threadDiv.id = `thread-${thread.id}`;
        
        threadDiv.innerHTML = `
            <h4>${thread.name}</h4>
            <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 0.5rem;">
                Process P${process.id} | ${thread.id}
            </p>
            <div class="thread-progress">
                <div class="thread-progress-bar"></div>
            </div>
        `;
        
        threadContainer.appendChild(threadDiv);
    });
}

// Update process display
function updateProcessDisplay(process) {
    const processDiv = document.getElementById(`process-${process.id}`);
    if (!processDiv) return;
    
    processDiv.className = 'process-item';
    if (process.state === ProcessState.RUNNING) {
        processDiv.classList.add('running');
    } else if (process.state === ProcessState.WAITING) {
        processDiv.classList.add('waiting');
    }
    
    processDiv.innerHTML = `
        <div>${process.config.name}</div>
        <div class="process-state">State: ${process.state} | Priority: ${process.priority}</div>
        <div class="process-state">Remaining: ${process.remainingTime}s</div>
    `;
}

// CPU Scheduler (Priority + Round Robin)
function scheduleProcesses() {
    if (!isRunning || processes.length === 0) return;
    
    // Sort by priority (lower number = higher priority), then by arrival time
    const readyProcesses = processes
        .filter(p => p.state === ProcessState.READY || p.state === ProcessState.RUNNING)
        .sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.arrivalTime - b.arrivalTime;
        });
    
    if (readyProcesses.length === 0) return;
    
    // Context switch if needed
    const nextProcess = readyProcesses[0];
    if (currentRunningProcess && currentRunningProcess.id !== nextProcess.id) {
        currentRunningProcess.state = ProcessState.READY;
        updateProcessDisplay(currentRunningProcess);
        contextSwitches++;
        addLog(`🔄 Context switch: P${currentRunningProcess.id} → P${nextProcess.id}`);
    }
    
    // Run the process
    currentRunningProcess = nextProcess;
    nextProcess.state = ProcessState.RUNNING;
    updateProcessDisplay(nextProcess);
    
    // Execute for 1 second
    setTimeout(() => {
        if (nextProcess.remainingTime > 0) {
            nextProcess.remainingTime--;
            updateProcessDisplay(nextProcess);
            
            if (nextProcess.remainingTime === 0) {
                terminateProcess(nextProcess);
            }
        }
    }, 1000);
}

// Terminate process
function terminateProcess(process) {
    process.state = ProcessState.TERMINATED;
    addLog(`✅ Process P${process.id} (${process.config.name}) completed`);
    
    // Remove from array
    processes = processes.filter(p => p.id !== process.id);
    
    // Free memory
    memoryUsed -= process.memory;
    addLog(`💾 Memory freed: ${process.memory} MB (Available: ${1024 - memoryUsed} MB)`);
    
    // Remove from UI
    const processDiv = document.getElementById(`process-${process.id}`);
    if (processDiv) {
        processDiv.style.opacity = '0';
        setTimeout(() => processDiv.remove(), 500);
    }
    
    // Remove threads
    process.threads.forEach(thread => {
        const threadDiv = document.getElementById(`thread-${thread.id}`);
        if (threadDiv) {
            threadDiv.style.opacity = '0';
            setTimeout(() => threadDiv.remove(), 500);
        }
    });
    
    if (currentRunningProcess && currentRunningProcess.id === process.id) {
        currentRunningProcess = null;
    }
    
    updateUI();
    
    // Add placeholders if empty
    if (processes.length === 0) {
        setTimeout(() => {
            const cpuQueue = document.getElementById('cpuQueue');
            const threadContainer = document.getElementById('threadContainer');
            
            if (cpuQueue.children.length === 0) {
                cpuQueue.innerHTML = '<div class="queue-placeholder">No processes running...</div>';
            }
            if (threadContainer.children.length === 0) {
                threadContainer.innerHTML = '<div class="thread-placeholder">No threads active...</div>';
            }
        }, 600);
    }
}

// Update UI stats
function updateUI() {
    const activeProcesses = processes.filter(p => p.state === ProcessState.RUNNING).length;
    const waitingProcesses = processes.filter(p => p.state === ProcessState.READY || p.state === ProcessState.WAITING).length;
    
    document.getElementById('activeCount').textContent = activeProcesses;
    document.getElementById('waitingCount').textContent = waitingProcesses;
    document.getElementById('switchCount').textContent = contextSwitches;
    document.getElementById('memoryUsed').textContent = memoryUsed;
    document.getElementById('memoryAvailable').textContent = 1024 - memoryUsed;
    
    // Update memory bar
    const memoryPercentage = (memoryUsed / 1024) * 100;
    const memoryBar = document.querySelector('.memory-used');
    memoryBar.style.width = memoryPercentage + '%';
    
    // Change color based on usage
    if (memoryPercentage > 80) {
        memoryBar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
    } else if (memoryPercentage > 50) {
        memoryBar.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
    } else {
        memoryBar.style.background = 'linear-gradient(90deg, #10b981, #059669)';
    }
}

// Add log entry
function addLog(message) {
    const logContainer = document.getElementById('logContainer');
    const timestamp = new Date().toLocaleTimeString();
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // Keep only last 50 logs
    while (logContainer.children.length > 50) {
        logContainer.removeChild(logContainer.firstChild);
    }
}

// Control functions
function pauseScheduler() {
    isRunning = false;
    addLog('⏸️ Scheduler paused');
}

function resumeScheduler() {
    isRunning = true;
    addLog('▶️ Scheduler resumed');
}

function clearAll() {
    processes.forEach(process => {
        const processDiv = document.getElementById(`process-${process.id}`);
        if (processDiv) processDiv.remove();
        
        process.threads.forEach(thread => {
            const threadDiv = document.getElementById(`thread-${thread.id}`);
            if (threadDiv) threadDiv.remove();
        });
    });
    
    processes = [];
    memoryUsed = 0;
    contextSwitches = 0;
    currentRunningProcess = null;
    
    document.getElementById('cpuQueue').innerHTML = '<div class="queue-placeholder">No processes running...</div>';
    document.getElementById('threadContainer').innerHTML = '<div class="thread-placeholder">No threads active...</div>';
    
    updateUI();
    addLog('🗑️ All processes cleared');
}

// Main scheduler loop
setInterval(() => {
    if (isRunning && processes.length > 0) {
        scheduleProcesses();
    }
}, 1000);

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    addLog('🚀 CityNexus OS initialized');
    addLog('📊 System ready for process scheduling');
    updateUI();
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    }
});
