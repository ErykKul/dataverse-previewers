$(document).ready(function () {
    startPreview(true);
    setupEditControls();
});

let shaclFormElement = null;
let currentFileId = null;
let currentSiteUrl = null;
let isEditMode = false;

function setupEditControls() {
    // Show the edit toolbar
    $('.edit-toolbar').show();
    
    // Toggle edit mode
    $('#toggle-edit-btn').click(function() {
        isEditMode = !isEditMode;
        
        if (isEditMode) {
            // Switch to edit mode
            if (shaclFormElement) {
                shaclFormElement.removeAttribute('data-view');
                $(this).html('<span class="glyphicon glyphicon-eye-open"></span> View Mode');
                $(this).removeClass('btn-primary').addClass('btn-warning');
                $('#save-btn').show();
            }
        } else {
            // Switch to view mode
            if (shaclFormElement) {
                shaclFormElement.setAttribute('data-view', 'true');
                $(this).html('<span class="glyphicon glyphicon-edit"></span> Enable Editing');
                $(this).removeClass('btn-warning').addClass('btn-primary');
                $('#save-btn').hide();
            }
        }
    });
    
    // Save button handler
    $('#save-btn').click(async function() {
        const apiToken = $('#api-token-input').val().trim();
        
        if (!apiToken) {
            showSaveStatus('error', 'Please enter your API token');
            return;
        }
        
        if (!currentFileId || !currentSiteUrl) {
            showSaveStatus('error', 'Missing file information');
            return;
        }
        
        if (!shaclFormElement) {
            showSaveStatus('error', 'No form data available');
            return;
        }
        
        try {
            showSaveStatus('info', 'Saving changes...');
            $(this).prop('disabled', true);
            
            // Get the updated data from shacl-form
            const updatedData = shaclFormElement.serialize('application/ld+json');
            
            // Create a blob from the JSON data
            const blob = new Blob([updatedData], { type: 'application/ld+json' });
            const file = new File([blob], 'cdi-metadata.jsonld', { type: 'application/ld+json' });
            
            // Prepare form data for the API call
            const formData = new FormData();
            formData.append('file', file);
            formData.append('jsonData', JSON.stringify({
                description: 'Updated CDI metadata',
                forceReplace: false
            }));
            
            // Make the API call to replace the file
            const response = await fetch(
                `${currentSiteUrl}/api/files/${currentFileId}/replace`,
                {
                    method: 'POST',
                    headers: {
                        'X-Dataverse-key': apiToken
                    },
                    body: formData
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'OK') {
                showSaveStatus('success', 'Changes saved successfully!');
                // Switch back to view mode
                setTimeout(() => {
                    $('#toggle-edit-btn').click();
                }, 1000);
            } else {
                throw new Error(result.message || 'Unknown error occurred');
            }
            
        } catch (error) {
            console.error('Error saving changes:', error);
            showSaveStatus('error', 'Failed to save: ' + error.message);
        } finally {
            $(this).prop('disabled', false);
        }
    });
}

function showSaveStatus(type, message) {
    const statusEl = $('#save-status');
    statusEl.removeClass('text-success text-danger text-info');
    
    if (type === 'success') {
        statusEl.addClass('text-success').html('<span class="glyphicon glyphicon-ok"></span> ' + message);
    } else if (type === 'error') {
        statusEl.addClass('text-danger').html('<span class="glyphicon glyphicon-exclamation-sign"></span> ' + message);
    } else if (type === 'info') {
        statusEl.addClass('text-info').html('<span class="glyphicon glyphicon-refresh"></span> ' + message);
    }
    
    // Clear status after 5 seconds (except for errors)
    if (type !== 'error') {
        setTimeout(() => statusEl.html(''), 5000);
    }
}

function translateBaseHtmlPage() {
    var cdiPreviewText = $.i18n("cdiPreviewText");
    $('.cdiPreviewText').text(cdiPreviewText);
}

async function writeContentAndData(data, fileUrl, file, title, authors) {
    addStandardPreviewHeader(file, title, authors);
    
    // Extract file ID and site URL from the query parameters
    const urlParams = new URLSearchParams(window.location.search);
    currentFileId = urlParams.get('fileid');
    currentSiteUrl = urlParams.get('siteUrl');
    
    try {
        // Parse the JSON-LD data
        let jsonData;
        try {
            jsonData = JSON.parse(data);
        } catch (e) {
            throw new Error("Invalid JSON-LD format: " + e.message);
        }

        // Add informational header
        const info = $('<div/>').addClass('preview-info').html(
            '<p><strong>CDI Data Viewer &amp; Editor</strong></p>' +
            '<p>This viewer displays DDI-CDI (Data Documentation Initiative - Cross Domain Integration) metadata using official SHACL shapes.</p>' +
            '<p>You can enable editing mode to modify the metadata and save changes back to Dataverse (requires API token).</p>'
        );
        $('.preview').append(info);

        // Use shacl-form with official SHACL shapes
        await renderWithShaclForm(jsonData);
        
    } catch (error) {
        console.error('Error rendering CDI preview:', error);
        $('.preview').addClass('alert alert-danger').html(
            '<strong>Error:</strong> Failed to render CDI preview.<br>' +
            '<em>Details:</em> ' + error.message +
            '<br><br>Please ensure the file is a valid DDI-CDI JSON-LD document and that the official SHACL shapes are available.'
        );
    }
}

async function renderWithShaclForm(jsonData) {
    // Load the official SHACL shapes
    const shapesUrl = 'shapes/CDIF-Discovery-Core-Shapes.ttl';
    const response = await fetch(shapesUrl);
    if (!response.ok) {
        throw new Error(`Failed to load official SHACL shapes: ${response.statusText}`);
    }
    let shapesData = await response.text();
    
    // Fix the SHACL target query to allow datasets with incoming schema:about references
    // This is needed because subjectOf/about creates a circular reference
    shapesData = shapesData.replace(
        /SELECT DISTINCT \?this\s+WHERE \{\s+\?this a schema:Dataset \.\s+FILTER \(\s+NOT EXISTS \{ \?s \?p \?this \. \}\s+\)\s+\}/,
        `SELECT DISTINCT ?this
        WHERE {
          ?this a schema:Dataset .
          FILTER (
            NOT EXISTS { 
              ?s ?p ?this . 
              FILTER(?p != schema:about)
            }
          )
        }`
    );
    
    console.log('[CDI Previewer] Modified SHACL shapes to allow schema:about incoming edges');

    // Wait for the shacl-form custom element to be defined
    await customElements.whenDefined('shacl-form');
    
    // Create the shacl-form element
    shaclFormElement = document.createElement('shacl-form');
    
    // Convert JSON-LD to a string
    const valuesString = JSON.stringify(jsonData, null, 2);
    
    // Set attributes on the shacl-form element (start in view mode)
    shaclFormElement.setAttribute('data-shapes', shapesData);
    shaclFormElement.setAttribute('data-values', valuesString);
    shaclFormElement.setAttribute('data-view', 'true');
    shaclFormElement.setAttribute('data-collapse', 'open');
    shaclFormElement.setAttribute('data-language', locale || 'en');
    
    // Don't set data-values-subject - let shacl-form auto-detect the root from SHACL shapes
    // The SHACL shapes define targets (e.g., schema:Dataset) that will be matched automatically
    
    console.log('[CDI Previewer] JSON-LD data loaded:', jsonData);
    console.log('[CDI Previewer] Looking for schema:Dataset nodes...');
    
    // Debug: Find all Dataset nodes in the data
    if (jsonData['@graph']) {
        const datasets = jsonData['@graph'].filter(node => {
            const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
            return types.some(t => t === 'schema:Dataset' || t === 'http://schema.org/Dataset');
        });
        console.log('[CDI Previewer] Found', datasets.length, 'Dataset node(s):', datasets.map(d => d['@id']));
    }

    // Listen for form rendering events
    shaclFormElement.addEventListener('shacl-form-ready', () => {
        console.log('[CDI Previewer] SHACL form is ready and rendered');
    });
    
    shaclFormElement.addEventListener('shacl-validation-complete', (event) => {
        console.log('[CDI Previewer] SHACL validation complete:', event.detail);
        if (event.detail?.validationReport) {
            displayValidationReport(event.detail.validationReport);
        }
    });

    // Create a container for the form
    const formContainer = $('<div/>').addClass('cdi-form-container');
    formContainer.append(shaclFormElement);
    $('.preview').append(formContainer);
    
    // Check after a delay if the form is empty
    setTimeout(() => {
        const formContent = $(shaclFormElement).find('shacl-property, .shacl-group').length;
        if (formContent === 0) {
            console.error('[CDI Previewer] Form appears empty - no properties rendered');
            $('.preview').append(
                $('<div/>').addClass('alert alert-warning').css('margin-top', '20px').html(
                    '<strong>Warning:</strong> The SHACL form appears empty. This may indicate:<br>' +
                    '<ul>' +
                    '<li>No root <code>schema:Dataset</code> node was found in the data</li>' +
                    '<li>The SHACL target query did not match any nodes</li>' +
                    '<li>There is a structural issue with the CDI JSON-LD document</li>' +
                    '</ul>' +
                    'Check the browser console for detailed debugging information.'
                )
            );
        }
    }, 2000);
}

function displayValidationReport(report) {
    if (!report || !report.violations || report.violations.length === 0) {
        return; // No violations to display
    }
    
    console.log('[CDI Previewer] Validation violations:', report.violations);
    
    const violationContainer = $('<div/>').addClass('alert alert-info').css('margin-top', '20px');
    violationContainer.append('<strong>SHACL Validation Report:</strong>');
    
    const violationList = $('<ul/>');
    report.violations.forEach((violation, index) => {
        const item = $('<li/>');
        item.append($('<strong/>').text(`Violation ${index + 1}: `));
        item.append(violation.message || 'No message provided');
        if (violation.focusNode) {
            item.append($('<br/>')).append($('<em/>').text(`Focus node: ${violation.focusNode}`));
        }
        if (violation.path) {
            item.append($('<br/>')).append($('<em/>').text(`Property path: ${violation.path}`));
        }
        violationList.append(item);
    });
    
    violationContainer.append(violationList);
    $('.preview').append(violationContainer);
}
