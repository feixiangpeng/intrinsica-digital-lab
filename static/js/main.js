document.addEventListener('DOMContentLoaded', function() {
    // Base API URL - adjust if needed
    const API_BASE_URL = '';
    
    // Chart instance
    let chartInstance = null;
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Load initial data
    loadDatasets();
    
    function initializeEventListeners() {
        // File upload form
        document.getElementById('uploadForm').addEventListener('submit', function(e) {
            e.preventDefault();
            uploadFile();
        });
        
        // Refresh datasets button
        document.getElementById('refreshDatasets').addEventListener('click', loadDatasets);
        
        // Query form
        document.getElementById('queryForm').addEventListener('submit', function(e) {
            e.preventDefault();
            submitQuery();
        });
        
        // Visualization form
        document.getElementById('vizForm').addEventListener('submit', function(e) {
            e.preventDefault();
            generateVisualization();
        });
        
        // Dataset select for visualization - update columns
        document.getElementById('vizDatasetSelect').addEventListener('change', function() {
            loadDatasetColumns(this.value);
        });
    }
    
    async function loadDatasets() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/data/list`);
            const data = await response.json();
            
            updateDatasetsList(data);
            updateDatasetSelects(data);
        } catch (error) {
            showError('Failed to load datasets: ' + error.message);
        }
    }
    
    function updateDatasetsList(data) {
        const container = document.getElementById('datasetsList');
        container.innerHTML = '';
        
        // Display structured datasets
        if (data.structured_datasets && data.structured_datasets.length > 0) {
            const list = document.createElement('div');
            list.className = 'list-group';
            
            data.structured_datasets.forEach(dataset => {
                const item = document.createElement('div');
                item.className = 'dataset-item';
                item.innerText = dataset;
                item.addEventListener('click', () => loadDatasetPreview(dataset));
                list.appendChild(item);
            });
            
            container.appendChild(list);
        } else {
            container.innerHTML = '<p class="text-muted">No datasets available. Upload a CSV file to get started.</p>';
        }
    }
    
    function updateDatasetSelects(data) {
        const querySelect = document.getElementById('datasetSelect');
        const vizSelect = document.getElementById('vizDatasetSelect');
        
        // Clear existing options except the first one
        querySelect.innerHTML = '<option value="">-- Select a dataset --</option>';
        vizSelect.innerHTML = '<option value="">-- Select a dataset --</option>';
        
        // Add structured datasets
        if (data.structured_datasets && data.structured_datasets.length > 0) {
            data.structured_datasets.forEach(dataset => {
                querySelect.add(new Option(dataset, dataset));
                vizSelect.add(new Option(dataset, dataset));
            });
        }
        
        // Add manipulated datasets
        if (data.manipulated_datasets && data.manipulated_datasets.length > 0) {
            data.manipulated_datasets.forEach(dataset => {
                querySelect.add(new Option(dataset + ' (processed)', dataset));
                vizSelect.add(new Option(dataset + ' (processed)', dataset));
            });
        }
    }
    
    async function loadDatasetPreview(dataset) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/data/view/${dataset}`);
            const data = await response.json();
            
            // Update UI
            const container = document.getElementById('datasetPreview');
            
            // Mark the selected dataset in the list
            const datasetItems = document.querySelectorAll('.dataset-item');
            datasetItems.forEach(item => {
                item.classList.remove('active');
                if (item.innerText === dataset) {
                    item.classList.add('active');
                }
            });
            
            // Display preview
            if (data.preview && data.preview.length > 0) {
                container.innerHTML = createTable(data.preview);
                container.innerHTML += `<p class="mt-2">Total rows: ${data.row_count}</p>`;
            } else {
                container.innerHTML = '<p class="text-muted">No preview available.</p>';
            }
        } catch (error) {
            showError('Failed to load dataset preview: ' + error.message);
        }
    }
    
    async function loadDatasetColumns(dataset) {
        if (!dataset) {
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/data/view/${dataset}`);
            const data = await response.json();
            
            const xColumnSelect = document.getElementById('xColumnSelect');
            const yColumnSelect = document.getElementById('yColumnSelect');
            
            // Clear existing options
            xColumnSelect.innerHTML = '<option value="">-- Select column --</option>';
            yColumnSelect.innerHTML = '<option value="">-- Select column --</option>';
            
            // Add columns
            if (data.columns && data.columns.length > 0) {
                data.columns.forEach(column => {
                    xColumnSelect.add(new Option(column, column));
                    yColumnSelect.add(new Option(column, column));
                });
            }
        } catch (error) {
            showError('Failed to load dataset columns: ' + error.message);
        }
    }
    
    async function uploadFile() {
        const fileInput = document.getElementById('dataFile');
        const file = fileInput.files[0];
        
        if (!file) {
            showError('Please select a file to upload.');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/data/upload`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showSuccess(`File ${data.filename} uploaded successfully! ${data.row_count} rows processed.`);
                loadDatasets();
            } else {
                showError(data.error || 'Upload failed');
            }
        } catch (error) {
            showError('Upload failed: ' + error.message);
        }
        
        // Reset file input
        fileInput.value = '';
    }
    
    async function submitQuery() {
        const dataset = document.getElementById('datasetSelect').value;
        const query = document.getElementById('queryInput').value;
        
        if (!dataset) {
            showError('Please select a dataset.');
            return;
        }
        
        if (!query) {
            showError('Please enter a query.');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dataset: dataset,
                    query: query
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Display results
                displayQueryResults(data);
            } else {
                showError(data.error || 'Query failed');
            }
        } catch (error) {
            showError('Query failed: ' + error.message);
        }
    }
    
    function displayQueryResults(data) {
        // Display explanation if available
        const explanationBox = document.getElementById('explanationBox');
        const explanationText = document.getElementById('explanationText');
        
        if (data.explanation) {
            explanationText.innerHTML = data.explanation;
            explanationBox.classList.remove('d-none');
        } else {
            explanationBox.classList.add('d-none');
        }
        
        // Display generated code if available
        const codeBox = document.getElementById('codeBox');
        const generatedCode = document.getElementById('generatedCode');
        
        if (data.code) {
            generatedCode.innerText = data.code;
            codeBox.classList.remove('d-none');
        } else {
            codeBox.classList.add('d-none');
        }
        
        // Display results table
        const resultsTable = document.getElementById('resultsTable');
        
        if (data.result && data.result.length > 0) {
            resultsTable.innerHTML = createTable(data.result);
            
            if (data.result_row_count > data.result.length) {
                resultsTable.innerHTML += `<p class="mt-2">Showing ${data.result.length} of ${data.result_row_count} rows.</p>`;
            }
        } else if (data.preview && data.preview.length > 0) {
            // Fallback to preview if no results
            resultsTable.innerHTML = createTable(data.preview);
            resultsTable.innerHTML += `<p class="mt-2">Showing preview (OpenAI API may not be configured).</p>`;
        } else {
            resultsTable.innerHTML = '<p class="text-muted">No results available.</p>';
        }
    }
    
    async function generateVisualization() {
        const dataset = document.getElementById('vizDatasetSelect').value;
        const xColumn = document.getElementById('xColumnSelect').value;
        const yColumn = document.getElementById('yColumnSelect').value;
        const chartType = document.getElementById('chartTypeSelect').value;
        
        if (!dataset || !xColumn || !yColumn) {
            showError('Please select dataset, X and Y columns.');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/visualize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dataset: dataset,
                    x_column: xColumn,
                    y_column: yColumn,
                    type: chartType
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.chart_config) {
                // Render chart
                renderChart(data.chart_config);
            } else {
                showError(data.error || 'Visualization failed');
            }
        } catch (error) {
            showError('Visualization failed: ' + error.message);
        }
    }
    
    function renderChart(config) {
        const canvas = document.getElementById('vizChart');
        const ctx = canvas.getContext('2d');
        
        // Destroy previous chart if exists
        if (chartInstance) {
            chartInstance.destroy();
        }
        
        // Create new chart
        chartInstance = new Chart(ctx, config);
    }
    
    function createTable(data) {
        if (!data || data.length === 0) {
            return '<p class="text-muted">No data available.</p>';
        }
        
        const keys = Object.keys(data[0]);
        
        // Build table HTML
        let tableHtml = '<div class="table-responsive"><table class="table table-striped">';
        
        // Header row
        tableHtml += '<thead><tr>';
        keys.forEach(key => {
            tableHtml += `<th>${key}</th>`;
        });
        tableHtml += '</tr></thead>';
        
        // Body rows
        tableHtml += '<tbody>';
        data.forEach(row => {
            tableHtml += '<tr>';
            keys.forEach(key => {
                let value = row[key];
                // Format value if needed
                if (value === null || value === undefined) {
                    value = '';
                } else if (typeof value === 'number') {
                    // Format numbers with commas and limited decimal places
                    value = value.toLocaleString(undefined, {
                        maximumFractionDigits: 4
                    });
                }
                tableHtml += `<td>${value}</td>`;
            });
            tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table></div>';
        
        return tableHtml;
    }
    
    function showError(message) {
        // Simple error alert, could be enhanced
        alert('Error: ' + message);
    }
    
    function showSuccess(message) {
        // Simple success alert, could be enhanced
        alert('Success: ' + message);
    }
});