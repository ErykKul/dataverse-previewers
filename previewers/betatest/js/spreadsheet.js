$(document).ready(function () {
    startPreview(false);
});

function translateBaseHtmlPage() {
    const spreadsheetViewerText = $.i18n("spreadsheetViewerText");
    $('.spreadsheetViewerText').text(spreadsheetViewerText);
}

function writeContent(fileUrl, file, title, authors) {
    addStandardPreviewHeader(file, title, authors);

    const handsontableContainer = document.getElementById('handsontable-container');
    const request = new XMLHttpRequest();

    request.open('GET', fileUrl, true);
    request.responseType = 'blob';
    request.onload = function () {
        const reader = new FileReader()

        reader.onload = function (e) {
            const csv = e.target.result;
            const data = Papa.parse(csv, {
                skipEmptyLines: true,
                quoteChar: '"',
                delimitersToGuess: ['\t', ',']
            });
            // separate table header row from other rows
            const headers = data.data.shift();

            handsontableContainer.innerHTML = '';
            handsontableContainer.className = '';

            Handsontable(handsontableContainer, {
                data: data.data,
                rowHeaders: true,
                colHeaders: headers,
                columnSorting: true
            })
        }

        reader.readAsText(request.response);
    };
    request.send();
}
