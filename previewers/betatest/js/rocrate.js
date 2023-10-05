$(document).ready(function () {
    startPreview(true);
});

function translateBaseHtmlPage() {
    var mdPreviewText = $.i18n("mdPreviewText");
    $('.mdPreviewText').text(mdPreviewText);
}

function writeContentAndData(data, fileUrl, file, title, authors) {
    addStandardPreviewHeader(file, title, authors);
    const scripts = document.getElementById("scripts");
    var s1 = document.createElement("script");
    s1.type = "application/ld+json";
    s1.text = data;
    scripts.append(s1);
    var s2 = document.createElement("script");
    s2.type = "text/javascript";
    s2.src = "https://unpkg.com/ro-crate-html-js/dist/ro-crate-dynamic.js";
    s2.text = `setTimeout(function(){ onload(); }, 5000);`;
    scripts.append(s2);
}
