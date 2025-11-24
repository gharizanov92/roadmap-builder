console.log('gantt-functions.js loaded successfully');

// Create a lightweight gantt data manager to replace DHTMLX gantt
var gantt = {
    tasks: [],
    
    loadFromLocalStorage: function() {
        var jiras = JSON.parse(localStorage.getItem('mapped_jiras.json') || '[]');
        this.tasks = [];
        
        // Group by category (resource)
        var categories = {};
        var taskId = 1;
        
        // IMPORTANT: Always iterate jiras in the same order (by originalIndex)
        // This ensures task IDs remain stable regardless of category reordering
        jiras.forEach(function(jira, index) {
            if (!jira.selected || !jira.category) return;
            
            if (!categories[jira.category]) {
                categories[jira.category] = {
                    id: taskId++,
                    text: jira.category,
                    type: 'project',
                    children: []
                };
            }
            
            var duration = 1;
            if (jira.startDate && jira.endDate) {
                var start = new Date(jira.startDate);
                var end = new Date(jira.endDate);
                duration = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
            }
            
            var task = {
                id: taskId++,
                text: jira.summary || jira.issueKey || 'Untitled',
                start_date: jira.startDate || new Date().toISOString().split('T')[0],
                duration: duration,
                progress: (jira.progress || 0) / 100,
                parent: categories[jira.category].id,
                type: 'task',
                dependency: jira.dependency,
                originalIndex: index
            };
            
            categories[jira.category].children.push(task);
            this.tasks.push(task);
        }, this);
        
        // Add category tasks
        for (var cat in categories) {
            this.tasks.unshift(categories[cat]);
        }
    },
    
    eachTask: function(callback) {
        this.tasks.forEach(callback);
    },
    
    getTask: function(id) {
        // Convert id to number if it's a string to handle type mismatches
        var numId = typeof id === 'string' ? parseInt(id, 10) : id;
        return this.tasks.find(function(t) { return t.id === numId; });
    },
    
    updateTask: function(id) {
        // Task is already updated in place, just trigger save
        var task = this.getTask(id);
        if (task && task.originalIndex !== undefined) {
            var jiras = JSON.parse(localStorage.getItem('mapped_jiras.json') || '[]');
            if (jiras[task.originalIndex]) {
                jiras[task.originalIndex].dependency = task.dependency;
                jiras[task.originalIndex].progress = Math.round(task.progress * 100);
                jiras[task.originalIndex].startDate = task.start_date;
                
                var endDate = new Date(task.start_date);
                endDate.setDate(endDate.getDate() + task.duration);
                jiras[task.originalIndex].endDate = endDate.toISOString().split('T')[0];
                
                localStorage.setItem('mapped_jiras.json', JSON.stringify(jiras));
            }
        }
    },
    
    getTaskCount: function() {
        return this.tasks.length;
    }
};

// Test function accessibility
window.testGanttFunctions = function() {
    console.log('openDependencyModal exists:', typeof openDependencyModal);
    console.log('openCustomExport exists:', typeof openCustomExport);
    console.log('All functions accessible from window');
};

// Helper function to calculate working days (excluding weekends)
function getWorkingDays(calendarDays) {
    var weeks = Math.floor(calendarDays / 7);
    var remainingDays = calendarDays % 7;
    var workingDays = weeks * 5;
    
    // Add remaining working days (max 5 per week)
    workingDays += Math.min(remainingDays, 5);
    if (remainingDays > 5) {
        workingDays += Math.max(0, remainingDays - 7);
    }
    
    return workingDays;
}

function openCustomExport() {
    // Load data from localStorage into gantt object
    gantt.loadFromLocalStorage();
    
    // Debug: Show localStorage data
    try {
        var stored = localStorage.getItem('mapped_jiras.json');
        if (stored) {
            var jiras = JSON.parse(stored);
            console.log('=== LocalStorage Data ===');
            console.log('Total jiras:', jiras.length);
            jiras.filter(j => j.selected && j.category).forEach(function(j) {
                console.log(j.issueKey || 'No key', ':', j.startDate, 'to', j.endDate, '| Category:', j.category);
            });
        }
    } catch(e) {
        console.error('Error reading localStorage:', e);
    }
    
    // Check if all jiras have categories
    var hasUncategorized = false;
    gantt.eachTask(function(task) {
        if (task.type !== 'project' && task.parent) {
            var parentTask = gantt.getTask(task.parent);
            if (parentTask && (parentTask.text === 'Unassigned' || !parentTask.text)) {
                hasUncategorized = true;
            }
        }
    });
    
    if (hasUncategorized) {
        alert('Error: Not all issues have categories assigned. Please assign categories to all issues before opening the custom export view.');
        return;
    }
    
    // Get sprint configuration from localStorage or prompt user
    var sprintConfig = JSON.parse(localStorage.getItem('sprint_config') || 'null');
    
    if (!sprintConfig) {
        var currentSprint = prompt('Enter the current sprint number:', '4');
        if (!currentSprint) return;
        
        var startDate = prompt('Enter the start date of Sprint ' + currentSprint + ' (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
        if (!startDate) return;
        
        var duration = prompt('Enter sprint duration in calendar days (e.g., 14 for 2 weeks):', '14');
        if (!duration) return;
        
        sprintConfig = {
            currentSprint: parseInt(currentSprint),
            startDate: startDate,
            calendarDuration: parseInt(duration),
            workingDuration: getWorkingDays(parseInt(duration))
        };
        
        localStorage.setItem('sprint_config', JSON.stringify(sprintConfig));
    }
    
    var view = document.getElementById('customExportView');
    view.classList.add('active');
    renderCustomExport(sprintConfig);
}

function refreshCustomExport() {
    renderCustomExport();
}

function closeCustomExport() {
    var view = document.getElementById('customExportView');
    view.classList.remove('active');
}

// Define 20 distinct color gradients (toned down)
var colorPalette = [
    'linear-gradient(135deg, #7b8cde 0%, #8d6fa8 100%)', // Purple-Blue
    'linear-gradient(135deg, #d88fa8 0%, #d17b8a 100%)', // Pink-Red
    'linear-gradient(135deg, #6ba3d4 0%, #5db8c4 100%)', // Blue-Cyan
    'linear-gradient(135deg, #6db88a 0%, #5db8a8 100%)', // Green-Teal
    'linear-gradient(135deg, #d18a9a 0%, #d4b87a 100%)', // Pink-Yellow
    'linear-gradient(135deg, #5ba8b4 0%, #5a6b8a 100%)', // Cyan-Purple
    'linear-gradient(135deg, #a8c9c4 0%, #d4b8c4 100%)', // Mint-Pink
    'linear-gradient(135deg, #d49a7a 0%, #d48a9a 100%)', // Orange-Pink
    'linear-gradient(135deg, #d4c4b4 0%, #c4a89a 100%)', // Peach
    'linear-gradient(135deg, #d48a94 0%, #a8c4d4 100%)', // Red-Blue
    'linear-gradient(135deg, #c4b4d4 0%, #9ab8d4 100%)', // Lavender-Blue
    'linear-gradient(135deg, #c4a870 0%, #d4c4a8 100%)', // Gold-Yellow
    'linear-gradient(135deg, #b89aaa 0%, #d4c4b8 100%)', // Mauve-Cream
    'linear-gradient(135deg, #8ac4d4 0%, #7a9ac4 100%)', // Sky-Blue
    'linear-gradient(135deg, #d4c49a 0%, #b8d4d4 100%)', // Yellow-Cyan
    'linear-gradient(135deg, #9a8ac4 0%, #a8c4b8 100%)', // Purple-Mint
    'linear-gradient(135deg, #c4b4d4 0%, #b8c4b8 100%)', // Lilac-Gray
    'linear-gradient(135deg, #94c4a8 0%, #c4d49a 100%)', // Green-Yellow
    'linear-gradient(135deg, #d4a89a 0%, #c4b89a 100%)', // Coral-Gold
    'linear-gradient(135deg, #9ab4d4 0%, #b4c4d4 100%)'  // Blue-Sky
];

// Solid colors for progress circles (matching gradients)
var solidColors = [
    '#8d7db8', '#d18a9a', '#6baac4', '#6db89a', '#d4a48a',
    '#5a8a9a', '#b8c4c4', '#d4949a', '#c4b4a8', '#b8a8b4',
    '#b4b4d4', '#c4b88a', '#b8a8b8', '#8ab4c4', '#c4d4b8',
    '#9aa8c4', '#b8b8c4', '#a8c4a8', '#c4b49a', '#a8b8d4'
];

function renderCustomExport(sprintConfig) {
    // Load data from localStorage into gantt object
    gantt.loadFromLocalStorage();
    
    // Migrate old index-based dependencies to ID-based dependencies
    migrateDependenciesToIds();
    
    var leftPanel = document.getElementById('exportLeft');
    var rightPanel = document.getElementById('exportRight');
    
    // Get sprint config from localStorage if not provided
    if (!sprintConfig) {
        sprintConfig = JSON.parse(localStorage.getItem('sprint_config') || 'null');
    }
    
    // Collect data
    var resources = {};
    var resourceIndex = 0;
    var categoryColorMap = JSON.parse(localStorage.getItem('category_color_map') || '{}');
    
    gantt.eachTask(function(task) {
        if (task.type === 'project') {
            // Use custom color if set, otherwise use default rotation
            var colorIndex = categoryColorMap[task.text] !== undefined 
                ? categoryColorMap[task.text] 
                : resourceIndex % colorPalette.length;
            
            resources[task.id] = {
                name: task.text,
                epics: [],
                colorIndex: colorIndex
            };
            resourceIndex++;
        } else if (task.parent) {
            if (resources[task.parent]) {
                console.log('Epic:', task.text, 'Progress:', task.progress, 'as %:', Math.round(task.progress * 100));
                resources[task.parent].epics.push(task);
            }
        }
    });
    
    // Calculate date range
    var minDate = null;
    var maxDate = null;
    gantt.eachTask(function(task) {
        if (task.type !== 'project') {
            var start = new Date(task.start_date);
            start.setHours(0, 0, 0, 0);
            
            var end = new Date(start);
            end.setDate(end.getDate() + task.duration);
            
            if (!minDate || start < minDate) minDate = start;
            if (!maxDate || end > maxDate) maxDate = end;
        }
    });
    
    if (!minDate || !maxDate) {
        leftPanel.innerHTML = '<p>No data to display</p>';
        rightPanel.innerHTML = '';
        return;
    }
    
    // Apply custom epic ordering from localStorage
    var epicOrdering = JSON.parse(localStorage.getItem('epic_ordering') || '{}');
    for (var resId in resources) {
        if (epicOrdering[resId]) {
            var orderedEpics = [];
            epicOrdering[resId].forEach(function(epicId) {
                var epic = resources[resId].epics.find(function(e) { return e.id === epicId; });
                if (epic) orderedEpics.push(epic);
            });
            // Add any new epics not in the ordering
            resources[resId].epics.forEach(function(epic) {
                if (!orderedEpics.find(function(e) { return e.id === epic.id; })) {
                    orderedEpics.push(epic);
                }
            });
            resources[resId].epics = orderedEpics;
        }
    }
    
    // Apply custom category ordering from localStorage
    var categoryOrdering = JSON.parse(localStorage.getItem('category_ordering') || '[]');
    console.log('Applying category ordering:', categoryOrdering);
    console.log('Resources before ordering:', Object.keys(resources));
    
    if (categoryOrdering.length > 0) {
        var orderedResources = {};
        categoryOrdering.forEach(function(resId) {
            if (resources[resId]) {
                orderedResources[resId] = resources[resId];
            }
        });
        // Add any new resources not in the ordering
        for (var resId in resources) {
            if (!orderedResources[resId]) {
                orderedResources[resId] = resources[resId];
            }
        }
        resources = orderedResources;
        console.log('Resources after ordering:', Object.keys(resources));
    }
    
    // Generate sprints for timeline
    var sprints = [];
    var sprintDuration = 14; // default
    var twoSprintDays = 28; // Used for sizing calculations
    
    if (sprintConfig) {
        var sprintStartDate = new Date(sprintConfig.startDate);
        sprintStartDate.setHours(0, 0, 0, 0); // Normalize to midnight
        sprintDuration = sprintConfig.calendarDuration || sprintConfig.duration || 14;
        twoSprintDays = sprintDuration * 2;
        var currentSprintNum = sprintConfig.currentSprint;
        
        console.log('Sprint Config:', {
            configuredSprint: currentSprintNum,
            configuredStartDate: sprintStartDate.toISOString().split('T')[0],
            sprintDuration: sprintDuration,
            minDate: minDate.toISOString().split('T')[0],
            maxDate: maxDate.toISOString().split('T')[0]
        });
        
        // Calculate which sprint minDate falls into
        var daysDiff = Math.floor((minDate - sprintStartDate) / (1000 * 60 * 60 * 24));
        var sprintOffset = Math.floor(daysDiff / sprintDuration);
        
        console.log('Day difference:', daysDiff, 'Sprint offset:', sprintOffset);
        
        var firstSprintNum = currentSprintNum + sprintOffset;
        
        // Calculate the start date of the first sprint to display
        var sprintDate = new Date(sprintStartDate);
        sprintDate.setDate(sprintDate.getDate() + (sprintOffset * sprintDuration));
        var sprintNum = firstSprintNum;
        
        // Ensure we start at or before minDate
        while (sprintDate > minDate) {
            sprintDate.setDate(sprintDate.getDate() - sprintDuration);
            sprintNum--;
        }
        
        console.log('First sprint:', sprintNum, 'starts on:', sprintDate.toISOString().split('T')[0]);
        
        while (sprintDate < maxDate) {
            sprints.push({
                number: sprintNum,
                startDate: new Date(sprintDate),
                label: 'Sprint ' + sprintNum,
                workingDays: sprintConfig.workingDuration || getWorkingDays(sprintDuration)
            });
            console.log('Added Sprint', sprintNum, 'starting:', sprintDate.toISOString().split('T')[0]);
            sprintDate.setDate(sprintDate.getDate() + sprintDuration);
            sprintNum++;
        }
    } else {
        // Fallback to months if no sprint config
        var current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        var endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
        
        while (current <= endMonth) {
            sprints.push({
                startDate: new Date(current),
                label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            });
            current.setMonth(current.getMonth() + 1);
        }
    }
    
    var totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
    
    // Show debug info
    var debugInfo = document.getElementById('debugInfo');
    if (debugInfo) {
        var epicCount = 0;
        for (var resId in resources) {
            epicCount += resources[resId].epics.length;
        }
        debugInfo.textContent = 'Date Range: ' + minDate.toISOString().split('T')[0] + ' to ' + maxDate.toISOString().split('T')[0] + ' (' + totalDays + ' days) | ' + epicCount + ' epics';
    }
    
    // Log epic details for debugging
    console.log('=== Epic Details ===');
    for (var resId in resources) {
        resources[resId].epics.forEach(function(epic) {
            var epicEnd = new Date(epic.start_date);
            epicEnd.setDate(epicEnd.getDate() + epic.duration);
        });
    }
    
    // Calculate scale factor: size everything as if we're showing 2 sprints
    var baseScaleFactor = totalDays / twoSprintDays;
    var zoomLevel = getZoomLevel();
    var scaleFactor = baseScaleFactor * zoomLevel;
    
    // Render left panel
    var leftHTML = '<div class="grid-header">';
    leftHTML += '<div class="grid-col-task">Task</div>';
    leftHTML += '<div class="grid-col-progress">Progress</div>';
    leftHTML += '<div class="grid-col-estimate">Estimate</div>';
    leftHTML += '</div>';
    
    // Use Object.keys to maintain order
    var resourceIds = Object.keys(resources);
    resourceIds.forEach(function(resId, index) {
        var resource = resources[resId];
        leftHTML += '<div class="resource-group" data-resource-id="' + resId + '">';
        leftHTML += '<div class="resource-name-container">';
        leftHTML += '<div class="resource-name">' + resource.name + '</div>';
        leftHTML += '<div class="resource-reorder-buttons">';
        if (index > 0) {
            leftHTML += '<button class="resource-reorder-btn" onclick="moveCategoryUp(\'' + resId + '\')" title="Move up"><i class="fas fa-chevron-up"></i></button>';
        }
        if (index < resourceIds.length - 1) {
            leftHTML += '<button class="resource-reorder-btn" onclick="moveCategoryDown(\'' + resId + '\')" title="Move down"><i class="fas fa-chevron-down"></i></button>';
        }
        leftHTML += '</div>';
        leftHTML += '</div>';
        
        resource.epics.forEach(function(epic) {
            var progress = Math.round(epic.progress * 100);
            var circumference = 2 * Math.PI * 16;
            var offset = circumference - (progress / 100) * circumference;
            var circleColor = solidColors[resource.colorIndex];
            
            // Clean epic name: remove JIRA key, bracketed tags, dashes, and leading ': '
            var epicName = epic.text
                .replace(/^[A-Z]+-\d+\s*/, '')     // Remove JIRA key
                .replace(/^\[.*?\]\s*/, '')        // Remove bracketed tags like [XYZ]
                .replace(/^[-:]\s*/, '')           // Remove leading dash or colon
                .trim();                           // Remove any extra whitespace
            
            // Check for custom name in localStorage
            var customNames = JSON.parse(localStorage.getItem('gantt_custom_names') || '{}');
            var displayName = customNames[epic.id] || epicName;
            
            var hasDependency = epic.dependency !== null && epic.dependency !== undefined;
            var buttonColor = hasDependency ? circleColor : '#999';
            
            leftHTML += '<div class="epic-row" draggable="true" data-epic-id="' + epic.id + '" data-resource-id="' + resId + '">';
            leftHTML += '<button class="epic-link-btn' + (hasDependency ? ' has-dependency' : '') + '" data-epic-id="' + epic.id + '" data-category-color="' + circleColor + '" title="Link prerequisite epic" style="--category-color: ' + circleColor + '; color: ' + buttonColor + ';">';
            leftHTML += '<svg width="24" height="16" viewBox="0 0 24 16" fill="none">';
            leftHTML += '<circle cx="4" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>';
            leftHTML += '<line x1="7" y1="8" x2="17" y2="8" stroke="currentColor" stroke-width="1.5"/>';
            leftHTML += '<path d="M14 5 L17 8 L14 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
            leftHTML += '</svg>';
            leftHTML += '</button>';
            leftHTML += '<div class="epic-name" data-epic-id="' + epic.id + '" onclick="makeEditable(this)">' + displayName + '</div>';
            leftHTML += '<div class="progress-circle-container">';
            leftHTML += '<div class="progress-circle">';
            leftHTML += '<svg width="36" height="36">';
            leftHTML += '<circle class="progress-circle-bg" cx="18" cy="18" r="16"></circle>';
            leftHTML += '<circle class="progress-circle-fill" cx="18" cy="18" r="16" ';
            leftHTML += 'stroke="' + circleColor + '" ';
            leftHTML += 'stroke-dasharray="' + circumference + '" ';
            leftHTML += 'stroke-dashoffset="' + offset + '"></circle>';
            leftHTML += '</svg>';
            leftHTML += '</div>';
            leftHTML += '<span class="progress-text editable-progress" data-epic-id="' + epic.id + '" onclick="makeProgressEditable(this)">' + progress + '%</span>';
            leftHTML += '</div>';
            leftHTML += '<div class="duration-text">' + epic.duration + ' days</div>';
            leftHTML += '</div>';
        });
        
        leftHTML += '</div>';
    });
    
    leftPanel.innerHTML = leftHTML;
    
    // Setup event delegation for link buttons
    leftPanel.addEventListener('click', function(e) {
        if (e.target.classList.contains('epic-link-btn') || e.target.closest('.epic-link-btn')) {
            var button = e.target.classList.contains('epic-link-btn') ? e.target : e.target.closest('.epic-link-btn');
            var epicId = parseInt(button.getAttribute('data-epic-id'));
            console.log('Link button clicked for epic:', epicId);
            console.log('epicId check:', !!epicId);
            console.log('function check:', typeof openDependencyModal);
            console.log('Combined check:', epicId && typeof openDependencyModal === 'function');
            
            if (epicId && typeof openDependencyModal === 'function') {
                console.log('Calling openDependencyModal...');
                openDependencyModal(epicId);
            } else {
                console.error('Cannot open dependency modal - epicId:', epicId, 'function exists:', typeof openDependencyModal);
            }
        }
    });
    
    // Calculate weekend positions first
    var weekendDays = [];
    var currentDate = new Date(minDate);
    while (currentDate < maxDate) {
        var dayOfWeek = currentDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
            var dayOffset = Math.floor((currentDate - minDate) / (1000 * 60 * 60 * 24));
            weekendDays.push(dayOffset);
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Function to calculate adjusted position accounting for collapsed weekends
    function getAdjustedPosition(dayOffset) {
        var weekendsBefore = weekendDays.filter(function(w) { return w < dayOffset; }).length;
        var workingDays = totalDays - weekendDays.length;
        var adjustedOffset = dayOffset - weekendsBefore;
        return (adjustedOffset / (workingDays + weekendDays.length * 0.01)) * 100;
    }
    
    // Render right panel (timeline)
    var timelineWidth = scaleFactor * 100; // Width as percentage
    var rightHTML = '<div class="timeline-wrapper" style="width: ' + timelineWidth + '%;">';
    rightHTML += '<div class="timeline-header-wrapper"><div class="timeline-header">';
    
    // Render sprint headers with proportional widths
    if (sprintConfig && sprints.length > 0) {
        var calendarDuration = sprintConfig.calendarDuration || sprintConfig.duration || 14;
        sprints.forEach(function(sprint, index) {
            var sprintStartOffset = Math.floor((sprint.startDate - minDate) / (1000 * 60 * 60 * 24));
            var sprintEndDate = new Date(sprint.startDate);
            sprintEndDate.setDate(sprintEndDate.getDate() + calendarDuration);
            var sprintEndOffset = Math.floor((sprintEndDate - minDate) / (1000 * 60 * 60 * 24));
            
            // Clamp to visible range
            sprintStartOffset = Math.max(0, sprintStartOffset);
            sprintEndOffset = Math.min(totalDays, sprintEndOffset);
            
            // Skip if sprint is completely outside the visible range
            if (sprintStartOffset >= totalDays || sprintEndOffset <= 0) {
                return;
            }
            
            var leftPercent = getAdjustedPosition(sprintStartOffset);
            var rightPercent = getAdjustedPosition(sprintEndOffset);
            var widthPercent = rightPercent - leftPercent;
            
            rightHTML += '<div class="timeline-month" style="left: ' + leftPercent + '%; width: ' + widthPercent + '%;">' + sprint.label + '</div>';
        });
    } else {
        // Fallback for months
        sprints.forEach(function(sprint) {
            rightHTML += '<div class="timeline-month" style="position: relative; flex: 1;">' + sprint.label + '</div>';
        });
    }
    
    rightHTML += '</div></div>';
    
    rightHTML += '<div class="timeline-body">';
    
    // Add collapsed weekend markers (1px wide)
    weekendDays.forEach(function(dayOffset) {
        var leftPercent = getAdjustedPosition(dayOffset);
        rightHTML += '<div class="weekend-background" style="left: ' + leftPercent + '%; width: 1px;"></div>';
    });
    
    // Add sprint background columns and separator lines
    if (sprintConfig && sprints.length > 0) {
        var calendarDuration = sprintConfig.calendarDuration || sprintConfig.duration || 14;
        sprints.forEach(function(sprint, index) {
            var sprintStartOffset = Math.floor((sprint.startDate - minDate) / (1000 * 60 * 60 * 24));
            var sprintEndDate = new Date(sprint.startDate);
            sprintEndDate.setDate(sprintEndDate.getDate() + calendarDuration);
            var sprintEndOffset = Math.floor((sprintEndDate - minDate) / (1000 * 60 * 60 * 24));
            
            var leftPercent = getAdjustedPosition(sprintStartOffset);
            var rightPercent = getAdjustedPosition(sprintEndOffset);
            var widthPercent = rightPercent - leftPercent;
            
            // Alternating background
            if (index % 2 === 1) {
                rightHTML += '<div class="sprint-background" style="left: ' + leftPercent + '%; width: ' + widthPercent + '%;"></div>';
            }
            
            // Separator line (except for first sprint)
            if (index > 0) {
                rightHTML += '<div class="sprint-separator" style="left: ' + leftPercent + '%;"></div>';
            }
        });
    }
    
    // Use Object.keys to maintain order
    resourceIds.forEach(function(resId) {
        var resource = resources[resId];
        rightHTML += '<div class="timeline-resource-group" data-resource-id="' + resId + '">';
        rightHTML += '<div class="timeline-resource-name">' + resource.name + '</div>';
        
        resource.epics.forEach(function(epic) {
            // Normalize dates to midnight for accurate calculation
            var start = new Date(epic.start_date);
            start.setHours(0, 0, 0, 0);
            
            var end = new Date(start);
            end.setDate(end.getDate() + epic.duration);
            
            // Calculate offset from minDate
            var normalizedMinDate = new Date(minDate);
            normalizedMinDate.setHours(0, 0, 0, 0);
            
            var startOffset = Math.floor((start - normalizedMinDate) / (1000 * 60 * 60 * 24));
            var endOffset = startOffset + epic.duration;
            
            // Use adjusted positioning that accounts for collapsed weekends
            var leftPercent = getAdjustedPosition(startOffset);
            var rightPercent = getAdjustedPosition(endOffset);
            var widthPercent = rightPercent - leftPercent;
            
            // Clean epic name: remove JIRA key, bracketed tags, dashes, and leading ': '
            var epicName = epic.text
                .replace(/^[A-Z]+-\d+\s*/, '')     // Remove JIRA key
                .replace(/^\[.*?\]\s*/, '')        // Remove bracketed tags like [XYZ]
                .replace(/^[-:]\s*/, '')           // Remove leading dash or colon
                .trim();                           // Remove any extra whitespace
            
            // Check for custom name in localStorage
            var customNames = JSON.parse(localStorage.getItem('gantt_custom_names') || '{}');
            var displayName = customNames[epic.id] || epicName;
            
            var progress = Math.round(epic.progress * 100);
            var pillColor = colorPalette[resource.colorIndex];
            
            rightHTML += '<div class="timeline-row">';
            rightHTML += '<div class="epic-pill" data-epic-id="' + epic.id + '" data-start-date="' + epic.start_date + '" data-duration="' + epic.duration + '" style="left: ' + leftPercent + '%; width: ' + widthPercent + '%; background: ' + pillColor + ';">';
            rightHTML += '<div class="resize-handle resize-handle-left"></div>';
            rightHTML += '<div class="epic-pill-progress-bg" style="width: ' + progress + '%;"></div>';
            rightHTML += '<span class="epic-pill-name">' + displayName + '</span>';
            rightHTML += '<div class="resize-handle resize-handle-right"></div>';
            rightHTML += '</div>';
            rightHTML += '</div>';
        });
        
        rightHTML += '</div>';
    });
    
    rightHTML += '</div>';
    rightHTML += '</div>'; // Close timeline-wrapper
    
    rightPanel.innerHTML = rightHTML;
    
    // Setup drag and drop for reordering
    setupDragAndDrop();
    setupCategoryDragAndDrop();
    
    // Setup resize handles for epic pills
    setupResizeHandles(minDate, totalDays, sprintConfig);
    
    // Render dependency arrows
    renderDependencyArrows();
    
    // Setup window resize listener to refresh arrows
    setupResizeListener();
    
    // Apply text wrap state
    getTextWrapState();
    applyTextWrap();
    
    // Update toggle button text
    var toggleText = document.getElementById('wrapToggleText');
    if (toggleText) {
        toggleText.textContent = textWrapEnabled ? 'Unwrap Text' : 'Wrap Text';
    }
}

var resizeTimeout;
function setupResizeListener() {
    // Remove existing listener if any
    window.removeEventListener('resize', handleResize);
    
    // Add new listener
    window.addEventListener('resize', handleResize);
}

function handleResize() {
    // Debounce the resize event
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
        // Only refresh if custom export view is active
        var view = document.getElementById('customExportView');
        if (view && view.classList.contains('active')) {
            renderDependencyArrows();
        }
    }, 250);
}

function renderDependencyArrows() {
    // Remove existing canvas
    var existingCanvas = document.getElementById('arrowCanvas');
    if (existingCanvas) {
        existingCanvas.remove();
    }
    
    var timelineBody = document.querySelector('.timeline-body');
    if (!timelineBody) return;
    
    // Create canvas element
    var canvas = document.createElement('canvas');
    canvas.id = 'arrowCanvas';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1';
    
    // Set canvas size to match timeline body
    var rect = timelineBody.getBoundingClientRect();
    canvas.width = timelineBody.scrollWidth;
    canvas.height = timelineBody.scrollHeight;
    canvas.style.width = timelineBody.scrollWidth + 'px';
    canvas.style.height = timelineBody.scrollHeight + 'px';
    
    timelineBody.appendChild(canvas);
    
    var ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#666';
    ctx.fillStyle = '#666';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Get all epic pills
    var pills = document.querySelectorAll('.epic-pill');
    var pillMap = {};
    
    pills.forEach(function(pill) {
        var epicId = pill.getAttribute('data-epic-id');
        pillMap[epicId] = pill;
    });
    
    // Get dependencies from gantt data
    gantt.eachTask(function(task) {
        if (task.type !== 'project' && task.dependency !== null && task.dependency !== undefined) {
            console.log('Drawing arrow for task:', task.text, 'originalIndex:', task.originalIndex, 'dependency originalIndex:', task.dependency);
            
            // Find the source and target pills
            var targetPill = pillMap[task.id];
            
            // Find source task by originalIndex (stable across reordering)
            var sourceTask = null;
            gantt.eachTask(function(t) {
                if (t.type !== 'project' && t.originalIndex === task.dependency) {
                    sourceTask = t;
                }
            });
            
            if (sourceTask) {
                console.log('  -> Found source task:', sourceTask.text, 'ID:', sourceTask.id, 'originalIndex:', sourceTask.originalIndex);
            } else {
                console.warn('  -> Source task not found for originalIndex:', task.dependency);
            }
            
            if (sourceTask && targetPill) {
                var sourcePill = pillMap[sourceTask.id];
                if (sourcePill) {
                    console.log('  -> Drawing arrow from', sourceTask.text, 'to', task.text);
                    drawArrowOnCanvas(ctx, sourcePill, targetPill, timelineBody);
                } else {
                    console.warn('  -> Source pill not found for task ID:', sourceTask.id);
                }
            } else if (!targetPill) {
                console.warn('  -> Target pill not found for task ID:', task.id);
            }
        }
    });
}

function drawArrowOnCanvas(ctx, sourcePill, targetPill, container) {
    var sourceRect = sourcePill.getBoundingClientRect();
    var targetRect = targetPill.getBoundingClientRect();
    var containerRect = container.getBoundingClientRect();
    
    // Calculate positions relative to container
    var startX = sourceRect.right - containerRect.left;
    var startY = sourceRect.top + sourceRect.height / 2 - containerRect.top;
    var endX = targetRect.left - containerRect.left;
    var endY = targetRect.top + targetRect.height / 2 - containerRect.top;
    
    var radius = 8;
    var gap = endX - startX;
    var minGap = 60;
    var rowHeight = 50; // Height of each timeline row
    
    // Helper function to snap Y coordinate to nearest row boundary (top of row)
    function snapToRowBoundary(y) {
        // Find which row this Y is in
        var rowIndex = Math.floor(y / rowHeight);
        // Return the top of that row (or bottom if closer)
        var topOfRow = rowIndex * rowHeight;
        var bottomOfRow = (rowIndex + 1) * rowHeight;
        var midOfRow = topOfRow + rowHeight / 2;
        
        // If we're in the top half, use top boundary, otherwise use bottom
        if (y < midOfRow) {
            return topOfRow;
        } else {
            return bottomOfRow;
        }
    }
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    
    if (Math.abs(endY - startY) < 2) {
        // Straight horizontal line
        ctx.lineTo(endX - 8, endY);
    } else if (endX > startX) {
        // Target is to the right
        if (gap <= minGap) {
            // Tight gap - go right, down, right with curves
            var rightExtend = 15;
            ctx.lineTo(startX + rightExtend - radius, startY);
            ctx.quadraticCurveTo(startX + rightExtend, startY, startX + rightExtend, startY + (endY > startY ? radius : -radius));
            ctx.lineTo(startX + rightExtend, endY - (endY > startY ? radius : -radius));
            ctx.quadraticCurveTo(startX + rightExtend, endY, startX + rightExtend + radius, endY);
            ctx.lineTo(endX - 8, endY);
        } else if (Math.abs(endY - startY) < radius * 2) {
            // Small vertical difference
            var midX = startX + (endX - startX) / 2;
            ctx.lineTo(midX, startY);
            ctx.lineTo(midX, endY);
            ctx.lineTo(endX - 8, endY);
        } else {
            // Normal routing with curves
            var midX = startX + (endX - startX) / 2;
            ctx.lineTo(midX - radius, startY);
            ctx.quadraticCurveTo(midX, startY, midX, startY + (endY > startY ? radius : -radius));
            ctx.lineTo(midX, endY - (endY > startY ? radius : -radius));
            ctx.quadraticCurveTo(midX, endY, midX + radius, endY);
            ctx.lineTo(endX - 8, endY);
        }
    } else {
        // Target is to the left (backwards dependency)
        // Route: right â†’ down halfway â†’ left â†’ down rest â†’ right to target
        var rightExtend = 20;
        var rawMidY = startY + (endY - startY) / 2;
        var midY = snapToRowBoundary(rawMidY); // Snap to nearest row boundary
        var leftTarget = endX - 30; // Position to the left of target
        
        if (Math.abs(endY - startY) < radius * 2) {
            // Small vertical difference - simplified path
            ctx.lineTo(startX + rightExtend, startY);
            ctx.lineTo(startX + rightExtend, endY);
            ctx.lineTo(endX - 8, endY);
        } else {
            // Normal backwards routing: right â†’ down halfway â†’ left â†’ down rest â†’ right
            // Go right
            ctx.lineTo(startX + rightExtend - radius, startY);
            // Turn down
            ctx.quadraticCurveTo(startX + rightExtend, startY, startX + rightExtend, startY + (endY > startY ? radius : -radius));
            // Go down halfway
            ctx.lineTo(startX + rightExtend, midY - (endY > startY ? radius : -radius));
            // Turn left
            ctx.quadraticCurveTo(startX + rightExtend, midY, startX + rightExtend - radius, midY);
            // Go left
            ctx.lineTo(leftTarget + radius, midY);
            // Turn down
            ctx.quadraticCurveTo(leftTarget, midY, leftTarget, midY + (endY > startY ? radius : -radius));
            // Go down rest of the way
            ctx.lineTo(leftTarget, endY - (endY > startY ? radius : -radius));
            // Turn right
            ctx.quadraticCurveTo(leftTarget, endY, leftTarget + radius, endY);
            // Go right to target
            ctx.lineTo(endX - 8, endY);
        }
    }
    
    ctx.stroke();
    
    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(endX - 8, endY - 4);
    ctx.lineTo(endX, endY);
    ctx.lineTo(endX - 8, endY + 4);
    ctx.closePath();
    ctx.fill();
}

function downloadCustomExport() {
    var container = document.getElementById('exportContainer');
    var rightPanel = document.getElementById('exportRight');
    var exportContent = document.querySelector('.export-content');
    var leftPanel = document.getElementById('exportLeft');
    var timelineWrapper = document.querySelector('.timeline-wrapper');
    
    // Store original styles
    var originalRightOverflow = rightPanel.style.overflow;
    var originalRightWidth = rightPanel.style.width;
    var originalRightMinWidth = rightPanel.style.minWidth;
    var originalContentOverflow = exportContent.style.overflow;
    var originalContainerDisplay = container.style.display;
    
    // Hide epic-link-btn buttons
    var epicLinkButtons = document.querySelectorAll('.epic-link-btn');
    epicLinkButtons.forEach(function(btn) {
        btn.style.display = 'none';
    });
    
    // Temporarily modify styles to show full content
    rightPanel.style.overflow = 'visible';
    rightPanel.style.width = 'auto';
    rightPanel.style.minWidth = 'auto';
    exportContent.style.overflow = 'visible';
    container.style.display = 'flex';
    container.style.flexWrap = 'nowrap';
    
    // Force layout recalculation
    container.offsetHeight;
    
    // Refresh arrows after layout changes
    renderDependencyArrows();
    
    // Calculate full dimensions with extra padding (10% buffer)
    var leftWidth = leftPanel.offsetWidth;
    var timelineWidth = timelineWrapper ? timelineWrapper.offsetWidth : 0;
    var baseWidth = leftWidth + timelineWidth + 72; // Include padding
    var fullWidth = Math.ceil(baseWidth * 1.1); // Add 10% buffer
    var fullHeight = container.offsetHeight;
    
    console.log('Capturing dimensions:', fullWidth, 'x', fullHeight);
    
    html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: fullWidth,
        height: fullHeight,
        scrollX: 0,
        scrollY: -window.scrollY,
        x: 0,
        y: 0
    }).then(function(canvas) {
        // Canvas arrows are already captured by html2canvas!
        // Restore original styles
        rightPanel.style.overflow = originalRightOverflow;
        rightPanel.style.width = originalRightWidth;
        rightPanel.style.minWidth = originalRightMinWidth;
        exportContent.style.overflow = originalContentOverflow;
        container.style.display = originalContainerDisplay;
        
        // Show epic-link-btn buttons again
        epicLinkButtons.forEach(function(btn) {
            btn.style.display = '';
        });
        
        // Refresh arrows after restoring layout
        renderDependencyArrows();
        
        canvas.toBlob(function(blob) {
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'roadmap-export-' + new Date().toISOString().split('T')[0] + '.png';
            a.click();
            URL.revokeObjectURL(url);
        });
    }).catch(function(error) {
        // Restore original styles on error
        rightPanel.style.overflow = originalRightOverflow;
        rightPanel.style.width = originalRightWidth;
        rightPanel.style.minWidth = originalRightMinWidth;
        exportContent.style.overflow = originalContentOverflow;
        container.style.display = originalContainerDisplay;
        
        // Show epic-actions buttons again
        epicActions.forEach(function(action) {
            action.style.display = '';
        });
        
        // Refresh arrows after restoring layout
        renderDependencyArrows();
        
        console.error('Export failed:', error);
        alert('Export failed: ' + error.message);
    });
}

function reconfigureSprints() {
    localStorage.removeItem('sprint_config');
    openCustomExport();
}

function downloadAsSVG() {
    var container = document.getElementById('exportContainer');
    var leftPanel = document.getElementById('exportLeft');
    var rightPanel = document.getElementById('exportRight');
    var timelineWrapper = document.querySelector('.timeline-wrapper');
    
    // Hide epic-link-btn buttons
    var epicLinkButtons = document.querySelectorAll('.epic-link-btn');
    epicLinkButtons.forEach(function(btn) {
        btn.style.display = 'none';
    });
    
    // Calculate dimensions
    var leftWidth = leftPanel.offsetWidth;
    var timelineWidth = timelineWrapper ? timelineWrapper.offsetWidth : 0;
    var fullWidth = leftWidth + timelineWidth + 48; // Include padding
    var fullHeight = container.offsetHeight;
    
    // Create SVG
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', fullWidth);
    svg.setAttribute('height', fullHeight);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    // Add white background
    var background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('width', fullWidth);
    background.setAttribute('height', fullHeight);
    background.setAttribute('fill', '#ffffff');
    svg.appendChild(background);
    
    // Create foreignObject for left panel
    var leftFO = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    leftFO.setAttribute('x', 0);
    leftFO.setAttribute('y', 0);
    leftFO.setAttribute('width', leftWidth);
    leftFO.setAttribute('height', fullHeight);
    
    var leftClone = leftPanel.cloneNode(true);
    leftClone.style.width = leftWidth + 'px';
    leftClone.style.height = fullHeight + 'px';
    leftFO.appendChild(leftClone);
    svg.appendChild(leftFO);
    
    // Create foreignObject for right panel (timeline)
    var rightFO = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    rightFO.setAttribute('x', leftWidth + 24);
    rightFO.setAttribute('y', 0);
    rightFO.setAttribute('width', timelineWidth);
    rightFO.setAttribute('height', fullHeight);
    
    var rightClone = rightPanel.cloneNode(true);
    rightClone.style.width = timelineWidth + 'px';
    rightClone.style.height = fullHeight + 'px';
    rightClone.style.overflow = 'visible';
    rightFO.appendChild(rightClone);
    svg.appendChild(rightFO);
    
    // Convert canvas arrows to SVG
    var arrowCanvas = document.getElementById('arrowCanvas');
    if (arrowCanvas) {
        var timelineBodyRect = document.querySelector('.timeline-body').getBoundingClientRect();
        var exportContentRect = document.querySelector('.export-content').getBoundingClientRect();
        
        // Calculate position of canvas relative to export content
        var scrollLeft = document.querySelector('.export-content').scrollLeft || 0;
        var scrollTop = document.querySelector('.export-content').scrollTop || 0;
        
        var canvasX = timelineBodyRect.left - exportContentRect.left + scrollLeft;
        var canvasY = timelineBodyRect.top - exportContentRect.top + scrollTop;
        
        // Convert canvas to image and embed in SVG
        var canvasImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        canvasImage.setAttribute('x', canvasX);
        canvasImage.setAttribute('y', canvasY);
        canvasImage.setAttribute('width', arrowCanvas.width);
        canvasImage.setAttribute('height', arrowCanvas.height);
        canvasImage.setAttribute('href', arrowCanvas.toDataURL('image/png'));
        
        svg.appendChild(canvasImage);
    }
    
    // Add embedded styles
    var style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
        .resource-group { margin-bottom: 24px; }
        .resource-name { font-size: 15px; font-weight: 700; color: #1a1a1a; padding: 8px 0; margin-bottom: 8px; }
        .epic-row { display: flex; align-items: center; height: 50px; padding-left: 20px; border-bottom: 1px solid #f0f0f0; }
        .epic-name { flex: 1; font-size: 14px; color: #333; padding-right: 20px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 50px; }
        .progress-circle-container { width: 120px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .progress-circle { width: 36px; height: 36px; position: relative; }
        .progress-circle svg { transform: rotate(-90deg); }
        .progress-circle-bg { fill: none; stroke: #e0e0e0; stroke-width: 3; }
        .progress-circle-fill { fill: none; stroke-width: 3; stroke-linecap: round; }
        .progress-text { font-size: 11px; font-weight: 600; color: #666; }
        .duration-text { width: 100px; flex-shrink: 0; text-align: right; font-size: 13px; color: #666; font-weight: 500; }
        .grid-header { display: flex; padding: 12px 0; border-bottom: 2px solid #e0e0e0; margin-bottom: 16px; }
        .grid-col-task { flex: 1; font-size: 12px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
        .grid-col-progress { width: 120px; flex-shrink: 0; font-size: 12px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; }
        .grid-col-estimate { width: 100px; flex-shrink: 0; font-size: 12px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.5px; text-align: right; }
        .timeline-header-wrapper { border-bottom: 2px solid #e0e0e0; margin-bottom: 16px; }
        .timeline-header { position: relative; height: 40px; }
        .timeline-month { position: absolute; text-align: center; font-size: 12px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid #e0e0e0; display: flex; align-items: center; justify-content: center; }
        .timeline-body { position: relative; }
        .sprint-background { position: absolute; top: 0; bottom: 0; background: rgba(102, 126, 234, 0.03); z-index: 1; pointer-events: none; }
        .weekend-background { position: absolute; top: 0; bottom: 0; background: rgba(0, 0, 0, 0.02); z-index: 2; pointer-events: none; }
        .sprint-separator { position: absolute; top: 0; bottom: 0; width: 2px; background: linear-gradient(to bottom, rgba(102, 126, 234, 0.3) 0%, rgba(102, 126, 234, 0.15) 50%, rgba(102, 126, 234, 0.3) 100%); z-index: 5; pointer-events: none; }
        .timeline-resource-group { margin-bottom: 24px; }
        .timeline-resource-name { font-size: 15px; font-weight: 700; color: #1a1a1a; padding: 8px 0; margin-bottom: 8px; }
        .timeline-row { position: relative; height: 50px; border-bottom: 1px solid #f0f0f0; z-index: 1; }
        .epic-pill { position: absolute; height: 32px; top: 9px; border-radius: 16px; padding: 0 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; color: white; font-size: 12px; font-weight: 600; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); overflow: hidden; z-index: 10; }
        .epic-pill-progress-bg { position: absolute; left: 0; top: 0; height: 100%; background: rgba(255, 255, 255, 0.25); border-radius: 16px; pointer-events: none; }
        .epic-pill-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; position: relative; z-index: 1; }
        .epic-pill-progress { flex-shrink: 0; background: rgba(255, 255, 255, 0.25); padding: 2px 6px; border-radius: 8px; font-size: 9px; font-weight: 600; position: relative; z-index: 1; opacity: 1; }
        * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    `;
    svg.insertBefore(style, svg.firstChild);
    
    // Serialize SVG
    var serializer = new XMLSerializer();
    var svgString = serializer.serializeToString(svg);
    
    // Add XML declaration and DOCTYPE
    svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;
    
    // Create blob and download
    var blob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'roadmap-export-' + new Date().toISOString().split('T')[0] + '.svg';
    a.click();
    URL.revokeObjectURL(url);
    
    // Show epic-link-btn buttons again
    epicLinkButtons.forEach(function(btn) {
        btn.style.display = '';
    });
}

function setupDragAndDrop() {
    var draggedElement = null;
    var draggedEpicId = null;
    var draggedResourceId = null;
    
    document.querySelectorAll('.epic-row').forEach(function(row) {
        row.addEventListener('dragstart', function(e) {
            draggedElement = this;
            draggedEpicId = this.getAttribute('data-epic-id');
            draggedResourceId = this.getAttribute('data-resource-id');
            this.style.opacity = '0.5';
        });
        
        row.addEventListener('dragend', function(e) {
            this.style.opacity = '';
            document.querySelectorAll('.epic-row').forEach(function(r) {
                r.classList.remove('drag-over');
            });
        });
        
        row.addEventListener('dragover', function(e) {
            e.preventDefault();
            return false;
        });
        
        row.addEventListener('dragenter', function(e) {
            if (this !== draggedElement && this.getAttribute('data-resource-id') === draggedResourceId) {
                this.classList.add('drag-over');
            }
        });
        
        row.addEventListener('dragleave', function(e) {
            this.classList.remove('drag-over');
        });
        
        row.addEventListener('drop', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            if (this !== draggedElement && this.getAttribute('data-resource-id') === draggedResourceId) {
                var targetEpicId = parseInt(this.getAttribute('data-epic-id'));
                var resourceId = this.getAttribute('data-resource-id');
                draggedEpicId = parseInt(draggedEpicId);
                
                console.log('Drop event:', {
                    draggedEpicId: draggedEpicId,
                    targetEpicId: targetEpicId,
                    resourceId: resourceId
                });
                
                // Update ordering in localStorage
                var epicOrdering = JSON.parse(localStorage.getItem('epic_ordering') || '{}');
                if (!epicOrdering[resourceId]) {
                    epicOrdering[resourceId] = [];
                }
                
                // Build complete list of epic IDs for this resource if not exists
                if (epicOrdering[resourceId].length === 0) {
                    document.querySelectorAll('.epic-row[data-resource-id="' + resourceId + '"]').forEach(function(r) {
                        var id = parseInt(r.getAttribute('data-epic-id'));
                        if (!epicOrdering[resourceId].includes(id)) {
                            epicOrdering[resourceId].push(id);
                        }
                    });
                }
                
                // Remove dragged epic from current position
                epicOrdering[resourceId] = epicOrdering[resourceId].filter(function(id) {
                    return id !== draggedEpicId;
                });
                
                // Insert at new position
                var targetIndex = epicOrdering[resourceId].indexOf(targetEpicId);
                if (targetIndex === -1) {
                    epicOrdering[resourceId].push(draggedEpicId);
                } else {
                    epicOrdering[resourceId].splice(targetIndex, 0, draggedEpicId);
                }
                
                console.log('New ordering:', epicOrdering[resourceId]);
                
                localStorage.setItem('epic_ordering', JSON.stringify(epicOrdering));
                renderCustomExport();
            }
            
            return false;
        });
    });
}

function setupCategoryDragAndDrop() {
    var draggedCategory = null;
    var draggedResourceId = null;
    
    document.querySelectorAll('.resource-name').forEach(function(nameElement) {
        nameElement.setAttribute('draggable', 'true');
        
        nameElement.addEventListener('dragstart', function(e) {
            e.stopPropagation(); // Prevent bubbling to epic-row
            draggedCategory = this.parentElement; // The resource-group
            draggedResourceId = draggedCategory.getAttribute('data-resource-id');
            draggedCategory.style.opacity = '0.5';
            console.log('Dragging category:', {
                resourceId: draggedResourceId,
                categoryElement: draggedCategory,
                nameElement: this
            });
        });
        
        nameElement.addEventListener('dragend', function(e) {
            if (draggedCategory) {
                draggedCategory.style.opacity = '';
            }
            document.querySelectorAll('.resource-group').forEach(function(g) {
                g.classList.remove('drag-over');
            });
        });
    });
    
    // Add drop handlers to resource groups
    document.querySelectorAll('.resource-group').forEach(function(group) {
        group.addEventListener('dragover', function(e) {
            // ALWAYS prevent default to allow drop
            e.preventDefault();
            
            if (draggedCategory) {
                // Add drag-over class during dragover
                if (this !== draggedCategory) {
                    this.classList.add('drag-over');
                }
            }
            return false;
        });
        
        group.addEventListener('dragenter', function(e) {
            if (draggedCategory && this !== draggedCategory) {
                e.preventDefault();
            }
        });
        
        group.addEventListener('dragleave', function(e) {
            // Only remove if we're actually leaving the group (not entering a child)
            if (draggedCategory && e.target === this) {
                this.classList.remove('drag-over');
            }
        });
        
        group.addEventListener('drop', function(e) {
            console.log('Drop event fired!', {
                hasDraggedCategory: !!draggedCategory,
                targetElement: this,
                isSameAsSource: this === draggedCategory
            });
            
            if (!draggedCategory) {
                console.log('No draggedCategory - aborting');
                return;
            }
            
            e.stopPropagation();
            e.preventDefault();
            
            if (this !== draggedCategory) {
                var targetResourceId = this.getAttribute('data-resource-id');
                
                console.log('Drop category event:', {
                    draggedResourceId: draggedResourceId,
                    targetResourceId: targetResourceId,
                    draggedCategory: draggedCategory,
                    targetGroup: this
                });
                
                // Update category ordering in localStorage
                var categoryOrdering = JSON.parse(localStorage.getItem('category_ordering') || '[]');
                
                // Build complete list if empty
                if (categoryOrdering.length === 0) {
                    document.querySelectorAll('.resource-group').forEach(function(g) {
                        var id = g.getAttribute('data-resource-id');
                        if (!categoryOrdering.includes(id)) {
                            categoryOrdering.push(id);
                        }
                    });
                }
                
                // Remove dragged category from current position
                categoryOrdering = categoryOrdering.filter(function(id) {
                    return id !== draggedResourceId;
                });
                
                // Insert at new position
                var targetIndex = categoryOrdering.indexOf(targetResourceId);
                if (targetIndex === -1) {
                    categoryOrdering.push(draggedResourceId);
                } else {
                    categoryOrdering.splice(targetIndex, 0, draggedResourceId);
                }
                
                console.log('New category ordering:', categoryOrdering);
                console.log('Saving and re-rendering...');
                
                localStorage.setItem('category_ordering', JSON.stringify(categoryOrdering));
                
                // Reset drag state before re-rendering
                draggedCategory = null;
                draggedResourceId = null;
                
                renderCustomExport();
            }
            
            return false;
        });
    });
}

function setupResizeHandles(minDate, totalDays, sprintConfig) {
    var isResizing = false;
    var currentPill = null;
    var resizeDirection = null;
    var startX = 0;
    var originalStartDate = null;
    var originalEndDate = null;
    var originalDuration = 0;
    var pixelsPerDay = 0;
    
    document.querySelectorAll('.resize-handle').forEach(function(handle) {
        handle.addEventListener('mousedown', function(e) {
            e.stopPropagation();
            isResizing = true;
            currentPill = this.parentElement;
            resizeDirection = this.classList.contains('resize-handle-left') ? 'left' : 'right';
            startX = e.clientX;
            
            var epicId = parseInt(currentPill.getAttribute('data-epic-id'));
            var task = gantt.getTask(epicId);
            
            originalStartDate = new Date(task.start_date);
            originalDuration = task.duration;
            originalEndDate = new Date(originalStartDate);
            originalEndDate.setDate(originalEndDate.getDate() + originalDuration);
            
            var containerRect = currentPill.parentElement.parentElement.getBoundingClientRect();
            pixelsPerDay = containerRect.width / totalDays;
            
            currentPill.style.cursor = 'ew-resize';
            e.preventDefault();
        });
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        
        var deltaX = e.clientX - startX;
        var daysDelta = Math.round(deltaX / pixelsPerDay);
        
        // Calculate new positions
        var containerRect = currentPill.parentElement.parentElement.getBoundingClientRect();
        var containerWidth = containerRect.width;
        
        if (resizeDirection === 'left') {
            // Adjust start position
            var newStartDate = new Date(originalStartDate);
            newStartDate.setDate(newStartDate.getDate() + daysDelta);
            var newEndDate = new Date(originalEndDate);
            var newDuration = Math.ceil((newEndDate - newStartDate) / (1000 * 60 * 60 * 24));
            
            if (newDuration >= 1) {
                var startOffset = Math.floor((newStartDate - minDate) / (1000 * 60 * 60 * 24));
                var leftPercent = (startOffset / totalDays) * 100;
                var widthPercent = (newDuration / totalDays) * 100;
                
                currentPill.style.left = leftPercent + '%';
                currentPill.style.width = widthPercent + '%';
            }
        } else {
            // Adjust end position (width)
            var newEndDate = new Date(originalEndDate);
            newEndDate.setDate(newEndDate.getDate() + daysDelta);
            var newStartDate = new Date(originalStartDate);
            var newDuration = Math.ceil((newEndDate - newStartDate) / (1000 * 60 * 60 * 24));
            
            if (newDuration >= 1) {
                var widthPercent = (newDuration / totalDays) * 100;
                currentPill.style.width = widthPercent + '%';
            }
        }
    });
    
    document.addEventListener('mouseup', function(e) {
        if (!isResizing) return;
        isResizing = false;
        currentPill.style.cursor = '';
        
        var epicId = parseInt(currentPill.getAttribute('data-epic-id'));
        var task = gantt.getTask(epicId);
        
        if (task) {
            // Calculate final dates based on mouse position
            var deltaX = e.clientX - startX;
            var daysDelta = Math.round(deltaX / pixelsPerDay);
            
            var newStartDate, newEndDate, newDuration;
            
            if (resizeDirection === 'left') {
                // Adjusted start date
                newStartDate = new Date(originalStartDate);
                newStartDate.setDate(newStartDate.getDate() + daysDelta);
                newEndDate = new Date(originalEndDate);
                newDuration = Math.ceil((newEndDate - newStartDate) / (1000 * 60 * 60 * 24));
                
                if (newDuration >= 1) {
                    task.start_date = newStartDate.toISOString().split('T')[0];
                    task.duration = newDuration;
                } else {
                    // Reset if invalid
                    currentPill = null;
                    return;
                }
            } else {
                // Adjusted end date
                newStartDate = new Date(originalStartDate);
                newEndDate = new Date(originalEndDate);
                newEndDate.setDate(newEndDate.getDate() + daysDelta);
                newDuration = Math.ceil((newEndDate - newStartDate) / (1000 * 60 * 60 * 24));
                
                if (newDuration >= 1) {
                    task.duration = newDuration;
                } else {
                    // Reset if invalid
                    currentPill = null;
                    return;
                }
            }
            
            // Calculate final end date
            var finalStartDate = new Date(task.start_date);
            var finalEndDate = new Date(finalStartDate);
            finalEndDate.setDate(finalEndDate.getDate() + task.duration);
            
            console.log('Before update - Task:', task.text, 'Start:', task.start_date, 'Duration:', task.duration);
            
            // Update gantt task
            gantt.updateTask(epicId);
            
            // Verify the update
            var updatedTask = gantt.getTask(epicId);
            console.log('After update - Task:', updatedTask.text, 'Start:', updatedTask.start_date, 'Duration:', updatedTask.duration);
            
            // Update localStorage FIRST before re-rendering
            var jiras = JSON.parse(localStorage.getItem('mapped_jiras.json') || '[]');
            if (task.originalIndex !== undefined && jiras[task.originalIndex]) {
                jiras[task.originalIndex].startDate = task.start_date;
                jiras[task.originalIndex].endDate = finalEndDate.toISOString().split('T')[0];
                localStorage.setItem('mapped_jiras.json', JSON.stringify(jiras));
                
                console.log('Saved to localStorage - Epic:', task.text);
                console.log('  Start:', task.start_date);
                console.log('  End:', finalEndDate.toISOString().split('T')[0]);
                console.log('  Duration:', task.duration, 'days');
            }
            
            // Notify parent window
            window.parent.postMessage({
                type: 'updateEpicDates',
                originalIndex: task.originalIndex,
                startDate: task.start_date,
                endDate: finalEndDate.toISOString().split('T')[0],
                duration: task.duration
            }, '*');
            
            // Update the duration text in the left panel without full re-render
            var epicRows = document.querySelectorAll('.epic-row');
            epicRows.forEach(function(row) {
                if (row.getAttribute('data-epic-id') === epicId.toString()) {
                    var durationText = row.querySelector('.duration-text');
                    if (durationText) {
                        durationText.textContent = task.duration + ' days';
                    }
                }
            });
            
            // Redraw arrows to reflect new positions
            renderDependencyArrows();
        }
        
        currentPill = null;
    });
}

var currentDependencyEpicId = null;
var selectedDependencyIndex = null;

var allDependencyItems = [];

// Migrate old index-based dependencies to originalIndex-based dependencies
function migrateDependenciesToIds() {
    // Dependencies are now stored as originalIndex values, which are stable
    // No migration needed - originalIndex values don't change when reordering
    console.log('Dependency system uses originalIndex - no migration needed');
}

function openDependencyModal(epicId) {
    try {
        console.log('=== openDependencyModal START ===');
        console.log('epicId:', epicId);
        
        currentDependencyEpicId = epicId;
        selectedDependencyIndex = null;
        allDependencyItems = [];
        
        var modal = document.getElementById('dependencyModal');
        console.log('modal found:', !!modal);
    var list = document.getElementById('dependencyList');
    var removeBtn = document.getElementById('removeDependencyBtn');
    var searchInput = document.getElementById('dependencySearch');
    
    if (!modal || !list) {
        console.error('Dependency modal elements not found!');
        return;
    }
    
    // Clear search
    searchInput.value = '';
    
    // Get current epic
    var currentTask = gantt.getTask(epicId);
    if (!currentTask) {
        console.error('Current task not found:', epicId);
        return;
    }
    
    var currentDependency = currentTask.dependency;
    
    console.log('Opening dependency modal for epic:', epicId, currentTask);
    console.log('Current dependency ID:', currentDependency);
    
    // Show/hide remove button
    if (currentDependency !== null && currentDependency !== undefined) {
        removeBtn.style.display = 'block';
        selectedDependencyIndex = currentDependency;
    } else {
        removeBtn.style.display = 'none';
    }
    
    // Group epics by resource
    var epicsByResource = {};
    var customNames = JSON.parse(localStorage.getItem('gantt_custom_names') || '{}');
    
    gantt.eachTask(function(task) {
        if (task.type !== 'project' && task.id !== epicId) {
            var parentTask = gantt.getTask(task.parent);
            if (!parentTask) {
                console.warn('Parent task not found for:', task.id);
                return;
            }
            
            var resourceName = parentTask.text;
            
            if (!epicsByResource[resourceName]) {
                epicsByResource[resourceName] = [];
            }
            
            // Check if this epic is selected (compare originalIndex)
            var isSelected = task.originalIndex === currentDependency;
            
            // Get custom name if it exists
            var displayName = customNames[task.id] || task.text;
            
            epicsByResource[resourceName].push({
                task: task,
                parentTask: parentTask,
                epicId: task.id,
                originalIndex: task.originalIndex,
                displayName: displayName,
                isSelected: isSelected
            });
            
            allDependencyItems.push({
                task: task,
                parentTask: parentTask,
                epicId: task.id,
                originalIndex: task.originalIndex,
                displayName: displayName,
                isSelected: isSelected,
                resourceName: resourceName
            });
            
            console.log('Added epic:', displayName, 'originalIndex:', task.originalIndex, 'in resource:', resourceName, 
                       'isSelected:', isSelected, '(comparing', task.originalIndex, '===', currentDependency, ')');
        }
    });
    
    console.log('Epics by resource:', epicsByResource);
    console.log('All dependency items:', allDependencyItems);
    
    // Render grouped list
    renderDependencyList(epicsByResource);
    
    modal.classList.add('active');
    console.log('=== openDependencyModal END ===');
    } catch (error) {
        console.error('Error in openDependencyModal:', error);
        console.error('Stack trace:', error.stack);
    }
}

function renderDependencyList(epicsByResource) {
    var list = document.getElementById('dependencyList');
    
    console.log('renderDependencyList called with:', epicsByResource);
    console.log('List element found:', !!list);
    
    if (!list) {
        console.error('dependencyList element not found!');
        return;
    }
    
    list.innerHTML = '';
    
    // Sort resources alphabetically
    var sortedResources = Object.keys(epicsByResource).sort();
    
    console.log('Sorted resources:', sortedResources);
    console.log('Number of resources:', sortedResources.length);
    
    if (sortedResources.length === 0) {
        list.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No other epics available to link</div>';
        return;
    }
    
    sortedResources.forEach(function(resourceName) {
        console.log('Rendering resource:', resourceName, 'with', epicsByResource[resourceName].length, 'epics');
        
        var group = document.createElement('div');
        group.className = 'dependency-group';
        
        var header = document.createElement('div');
        header.className = 'dependency-group-header';
        header.textContent = resourceName;
        group.appendChild(header);
        
        epicsByResource[resourceName].forEach(function(epicData) {
            console.log('  - Adding epic:', epicData.displayName, 'ID:', epicData.epicId, 'isSelected:', epicData.isSelected);
            
            var item = document.createElement('div');
            item.className = 'dependency-item' + (epicData.isSelected ? ' selected' : '');
            item.setAttribute('data-epic-id', epicData.epicId);
            item.setAttribute('data-epic-name', epicData.displayName.toLowerCase());
            item.setAttribute('data-resource-name', resourceName.toLowerCase());
            item.onclick = function() {
                selectDependency(epicData.epicId);
            };
            
            item.innerHTML = '<div class="dependency-item-title">' + epicData.displayName + '</div>';
            
            if (epicData.isSelected) {
                console.log('    -> This epic should be selected!');
            }
            
            group.appendChild(item);
        });
        
        list.appendChild(group);
    });
    
    console.log('Finished rendering dependency list');
}

function filterDependencies() {
    var searchInput = document.getElementById('dependencySearch');
    var searchTerm = searchInput.value.toLowerCase();
    
    if (!searchTerm) {
        // Show all grouped
        var epicsByResource = {};
        allDependencyItems.forEach(function(item) {
            if (!epicsByResource[item.resourceName]) {
                epicsByResource[item.resourceName] = [];
            }
            epicsByResource[item.resourceName].push(item);
        });
        renderDependencyList(epicsByResource);
        return;
    }
    
    // Filter items - search by displayName (custom name) instead of task.text
    var filtered = allDependencyItems.filter(function(item) {
        return item.displayName.toLowerCase().includes(searchTerm) ||
               item.resourceName.toLowerCase().includes(searchTerm);
    });
    
    // Group filtered items
    var epicsByResource = {};
    filtered.forEach(function(item) {
        if (!epicsByResource[item.resourceName]) {
            epicsByResource[item.resourceName] = [];
        }
        epicsByResource[item.resourceName].push(item);
    });
    
    renderDependencyList(epicsByResource);
}

function closeDependencyModal() {
    var modal = document.getElementById('dependencyModal');
    modal.classList.remove('active');
    currentDependencyEpicId = null;
    selectedDependencyIndex = null;
}

function selectDependency(epicId) {
    // Find the task to get its originalIndex
    var selectedTask = gantt.getTask(epicId);
    if (!selectedTask) {
        console.error('Task not found:', epicId);
        return;
    }
    
    selectedDependencyIndex = epicId;
    
    console.log('Selected dependency epic ID:', epicId, 'originalIndex:', selectedTask.originalIndex);
    
    // Update UI
    document.querySelectorAll('.dependency-item').forEach(function(item) {
        // Convert both to strings for comparison since getAttribute returns string
        if (item.getAttribute('data-epic-id') === String(epicId)) {
            item.classList.add('selected');
            console.log('Selected item:', item.querySelector('.dependency-item-title').textContent);
        } else {
            item.classList.remove('selected');
        }
    });
}

function saveDependencyLink() {
    if (currentDependencyEpicId !== null && selectedDependencyIndex !== null) {
        var task = gantt.getTask(currentDependencyEpicId);
        var targetTask = gantt.getTask(selectedDependencyIndex);
        
        if (!targetTask) {
            console.error('Target task not found:', selectedDependencyIndex);
            return;
        }
        
        // Store the originalIndex of the target task as the dependency
        // This is stable and won't change when reordering
        task.dependency = targetTask.originalIndex;
        gantt.updateTask(currentDependencyEpicId);
        
        console.log('Saving dependency link:', {
            fromEpicId: currentDependencyEpicId,
            fromOriginalIndex: task.originalIndex,
            toEpicId: selectedDependencyIndex,
            toOriginalIndex: targetTask.originalIndex,
            savedDependency: task.dependency
        });
        
        // Notify parent window to update the issues page
        window.parent.postMessage({
            type: 'updateEpicDependency',
            originalIndex: task.originalIndex,
            dependency: task.dependency
        }, '*');
        
        closeDependencyModal();
        renderCustomExport();
    }
}

function removeDependencyLink() {
    if (currentDependencyEpicId !== null) {
        var task = gantt.getTask(currentDependencyEpicId);
        task.dependency = null;
        gantt.updateTask(currentDependencyEpicId);
        
        // Notify parent window to update the issues page
        window.parent.postMessage({
            type: 'updateEpicDependency',
            originalIndex: task.originalIndex,
            dependency: null
        }, '*');
        
        closeDependencyModal();
        renderCustomExport();
    }
}

function makeEditable(element) {
    if (element.getAttribute('contenteditable') === 'true') return;
    
    element.setAttribute('contenteditable', 'true');
    element.focus();
    
    // Select all text
    var range = document.createRange();
    range.selectNodeContents(element);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    
    // Save on blur or Enter key
    var saveEdit = function() {
        element.setAttribute('contenteditable', 'false');
        var epicId = element.getAttribute('data-epic-id');
        var newName = element.textContent.trim();
        
        // Save to localStorage
        var customNames = JSON.parse(localStorage.getItem('gantt_custom_names') || '{}');
        customNames[epicId] = newName;
        localStorage.setItem('gantt_custom_names', JSON.stringify(customNames));
        
        // Update the timeline pill as well
        renderCustomExport();
    };
    
    element.addEventListener('blur', saveEdit, { once: true });
    element.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            element.blur();
        } else if (e.key === 'Escape') {
            element.setAttribute('contenteditable', 'false');
            renderCustomExport();
        }
    }, { once: true });
}

function makeProgressEditable(element) {
    var epicId = parseInt(element.getAttribute('data-epic-id'));
    var currentProgress = parseInt(element.textContent);
    
    var input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = '100';
    input.value = currentProgress;
    input.style.width = '50px';
    
    element.textContent = '';
    element.appendChild(input);
    input.focus();
    input.select();
    
    var saveProgress = function() {
        var newProgress = parseInt(input.value);
        if (isNaN(newProgress) || newProgress < 0 || newProgress > 100) {
            newProgress = currentProgress;
        }
        
        // Update gantt task
        var task = gantt.getTask(epicId);
        if (task) {
            task.progress = newProgress / 100;
            gantt.updateTask(epicId);
            
            // Update localStorage (issues page data)
            var jiras = JSON.parse(localStorage.getItem('mapped_jiras.json') || '[]');
            if (task.originalIndex !== undefined && jiras[task.originalIndex]) {
                jiras[task.originalIndex].progress = newProgress;
                localStorage.setItem('mapped_jiras.json', JSON.stringify(jiras));
            }
            
            // Notify parent window
            window.parent.postMessage({
                type: 'updateEpicProgress',
                originalIndex: task.originalIndex,
                progress: newProgress
            }, '*');
        }
        
        renderCustomExport();
    };
    
    input.addEventListener('blur', saveProgress);
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveProgress();
        } else if (e.key === 'Escape') {
            renderCustomExport();
        }
    });
}


// Color Configurator Functions
var categoryColorMap = JSON.parse(localStorage.getItem('category_color_map') || '{}');

function openColorConfigurator() {
    // Load data to get all categories
    gantt.loadFromLocalStorage();
    
    var modal = document.getElementById('colorConfiguratorModal');
    var list = document.getElementById('colorConfigList');
    
    // Get all unique categories
    var categories = {};
    gantt.eachTask(function(task) {
        if (task.type === 'project') {
            categories[task.text] = true;
        }
    });
    
    // Build color selection UI
    var html = '';
    var categoryNames = Object.keys(categories).sort();
    
    categoryNames.forEach(function(category, index) {
        var currentColorIndex = categoryColorMap[category] !== undefined ? categoryColorMap[category] : index % solidColors.length;
        var currentColor = solidColors[currentColorIndex];
        
        html += '<div style="display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #f0f0f0;">';
        html += '<div style="flex: 1; font-weight: 600;">' + category + '</div>';
        html += '<div style="display: flex; gap: 8px; flex-wrap: wrap;">';
        
        // Show all available colors
        solidColors.forEach(function(color, colorIndex) {
            var isSelected = colorIndex === currentColorIndex;
            html += '<div class="color-option' + (isSelected ? ' selected' : '') + '" ';
            html += 'data-category="' + category + '" ';
            html += 'data-color-index="' + colorIndex + '" ';
            html += 'style="width: 32px; height: 32px; border-radius: 6px; background: ' + color + '; ';
            html += 'cursor: pointer; border: 2px solid ' + (isSelected ? '#007aff' : 'transparent') + '; ';
            html += 'transition: all 0.2s;" ';
            html += 'onclick="selectCategoryColor(\'' + category + '\', ' + colorIndex + ')">';
            html += '</div>';
        });
        
        html += '</div></div>';
    });
    
    list.innerHTML = html;
    modal.classList.add('active');
}

function closeColorConfigurator() {
    var modal = document.getElementById('colorConfiguratorModal');
    modal.classList.remove('active');
}

function selectCategoryColor(category, colorIndex) {
    // Update the map
    categoryColorMap[category] = colorIndex;
    
    // Update UI
    document.querySelectorAll('.color-option').forEach(function(option) {
        var optionCategory = option.getAttribute('data-category');
        var optionColorIndex = parseInt(option.getAttribute('data-color-index'));
        
        if (optionCategory === category) {
            if (optionColorIndex === colorIndex) {
                option.classList.add('selected');
                option.style.border = '2px solid #007aff';
            } else {
                option.classList.remove('selected');
                option.style.border = '2px solid transparent';
            }
        }
    });
}

function saveColorConfiguration() {
    // Save to localStorage
    localStorage.setItem('category_color_map', JSON.stringify(categoryColorMap));
    
    // Close modal
    closeColorConfigurator();
    
    // Refresh the view to apply new colors
    renderCustomExport();
}


// Zoom functionality
var zoomLevel = 1.0; // Default zoom level (1.0 = 100%)

function zoomIn() {
    zoomLevel = Math.min(zoomLevel + 0.2, 3.0); // Max 300%
    applyZoom();
}

function zoomOut() {
    zoomLevel = Math.max(zoomLevel - 0.2, 0.4); // Min 40%
    applyZoom();
}

function applyZoom() {
    localStorage.setItem('gantt_zoom_level', zoomLevel.toString());
    renderCustomExport();
}

function getZoomLevel() {
    var stored = localStorage.getItem('gantt_zoom_level');
    if (stored) {
        zoomLevel = parseFloat(stored);
    }
    return zoomLevel;
}


// Text wrap toggle functionality
var textWrapEnabled = false;

function toggleTextWrap() {
    textWrapEnabled = !textWrapEnabled;
    localStorage.setItem('gantt_text_wrap', textWrapEnabled.toString());
    
    var toggleText = document.getElementById('wrapToggleText');
    if (toggleText) {
        toggleText.textContent = textWrapEnabled ? 'Unwrap Text' : 'Wrap Text';
    }
    
    applyTextWrap();
}

function applyTextWrap() {
    var epicNames = document.querySelectorAll('.epic-name');
    epicNames.forEach(function(nameElement) {
        if (textWrapEnabled) {
            nameElement.style.whiteSpace = 'normal';
            nameElement.style.overflow = 'visible';
            nameElement.style.textOverflow = 'clip';
            nameElement.style.lineHeight = '1.3';
            nameElement.style.maxHeight = '50px'; // Keep row height fixed
            nameElement.style.display = '-webkit-box';
            nameElement.style.webkitLineClamp = '3';
            nameElement.style.webkitBoxOrient = 'vertical';
        } else {
            nameElement.style.whiteSpace = 'nowrap';
            nameElement.style.overflow = 'hidden';
            nameElement.style.textOverflow = 'ellipsis';
            nameElement.style.lineHeight = '50px';
            nameElement.style.maxHeight = '';
            nameElement.style.display = '';
            nameElement.style.webkitLineClamp = '';
            nameElement.style.webkitBoxOrient = '';
        }
    });
}

function getTextWrapState() {
    var stored = localStorage.getItem('gantt_text_wrap');
    if (stored) {
        textWrapEnabled = stored === 'true';
    }
    return textWrapEnabled;
}


// Category reordering with buttons
function moveCategoryUp(resourceId) {
    console.log('Moving category up:', resourceId);
    
    // Get current resource order from the DOM
    var resourceGroups = document.querySelectorAll('.resource-group');
    var resourceIds = [];
    resourceGroups.forEach(function(g) {
        resourceIds.push(g.getAttribute('data-resource-id'));
    });
    
    console.log('Current order:', resourceIds);
    
    var currentIndex = resourceIds.indexOf(resourceId);
    console.log('Current index:', currentIndex);
    
    if (currentIndex > 0) {
        // Swap with previous
        var temp = resourceIds[currentIndex - 1];
        resourceIds[currentIndex - 1] = resourceId;
        resourceIds[currentIndex] = temp;
        
        console.log('New order:', resourceIds);
        localStorage.setItem('category_ordering', JSON.stringify(resourceIds));
        renderCustomExport();
    }
}

function moveCategoryDown(resourceId) {
    console.log('Moving category down:', resourceId);
    
    // Get current resource order from the DOM
    var resourceGroups = document.querySelectorAll('.resource-group');
    var resourceIds = [];
    resourceGroups.forEach(function(g) {
        resourceIds.push(g.getAttribute('data-resource-id'));
    });
    
    console.log('Current order:', resourceIds);
    
    var currentIndex = resourceIds.indexOf(resourceId);
    console.log('Current index:', currentIndex);
    
    if (currentIndex >= 0 && currentIndex < resourceIds.length - 1) {
        // Swap with next
        var temp = resourceIds[currentIndex + 1];
        resourceIds[currentIndex + 1] = resourceId;
        resourceIds[currentIndex] = temp;
        
        console.log('New order:', resourceIds);
        localStorage.setItem('category_ordering', JSON.stringify(resourceIds));
        renderCustomExport();
    }
}
