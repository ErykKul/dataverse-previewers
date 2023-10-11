import { Builder } from 'https://unpkg.com/@deltablot/ro-crate2html@0.1.0/dist/main.js';

document.querySelectorAll('[data-file]').forEach(el => {
    displayContent(el.dataset.file);
});

$(document).ready(function () {
    startPreview(true);
});

function translateBaseHtmlPage() {
    $('.rocratePreviewText').text($.i18n("rocratePreviewText"));
}

function writeContentAndData(data, fileUrl, file, title, authors) {
    const builder = new Builder();
    const result = builder.parse(data);
    const targetDiv = document.getElementById('ro-crate-metadata');
    result.forEach(el => targetDiv.appendChild(el));
}
