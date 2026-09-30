;(function () {
    var META_DESCRIPTION = 'AE Labs is an interactive laboratory for exploring emergence, allocation, adaptation, fairness, diffusion, networks, and collective computational behavior.';
    var BRAND = 'AE Labs';

    function ensureMeta(name, content, attr) {
        var selector = attr === 'property'
            ? 'meta[property="' + name + '"]'
            : 'meta[name="' + name + '"]';
        if (document.querySelector(selector)) return;
        var meta = document.createElement('meta');
        if (attr === 'property') meta.setAttribute('property', name);
        else meta.setAttribute('name', name);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
    }

    function updateNav() {
        var nav = document.querySelector('.menu-bar');
        if (!nav) return;
        var links = nav.querySelectorAll('a[href="index.html"]');
        for (var i = 0; i < links.length; i++) {
            var label = links[i].textContent.replace(/\s+/g, ' ').trim();
            if (label === 'HOME' || label === 'AE LABS') {
                links[i].textContent = 'AE LABS';
            }
        }
    }

    function injectFamily() {
        var family = document.body.getAttribute('data-ae-family');
        if (!family || document.querySelector('.model-family')) return;
        var el = document.createElement('div');
        el.className = 'model-family';
        el.innerHTML = BRAND + ' /<br>' + family;
        document.body.appendChild(el);
    }

    function injectFooter() {
        if (document.querySelector('.ae-footer')) return;
        var overlay = !!document.body.getAttribute('data-ae-family');
        var footer = document.createElement('footer');
        footer.className = overlay ? 'ae-footer ae-footer-overlay' : 'ae-footer';
        footer.innerHTML = '<p><strong>' + BRAND + '</strong> — Algorithmic Ecologies Laboratory</p>' +
            '<p class="ae-footer-tag">Interactive models of emergence, allocation, adaptation, and collective behavior.</p>';
        document.body.appendChild(footer);
    }

    ensureMeta('description', META_DESCRIPTION, 'name');
    ensureMeta('og:title', document.title, 'property');
    ensureMeta('og:description', META_DESCRIPTION, 'property');
    updateNav();
    injectFamily();
    injectFooter();
})();
