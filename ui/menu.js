;(function () {
    const links = [
        { href: '#/home', label: 'Home' },
        { href: '#/baseline', label: 'Baseline' },
        { href: '#/weighted', label: 'Weighted' },
        { href: '#/segregation', label: 'Segregation' },
        { href: '#/market', label: 'Market' },
    ];

    function render(container) {
        const nav = document.createElement('div');
        nav.className = 'menu';
        const brand = document.createElement('span');
        brand.className = 'brand';
        brand.textContent = 'AE Labs';
        nav.appendChild(brand);
        for (const l of links) {
            const a = document.createElement('a');
            a.href = l.href;
            a.textContent = l.label;
            nav.appendChild(a);
        }
        const spacer = document.createElement('div');
        spacer.className = 'spacer';
        nav.appendChild(spacer);
        const note = document.createElement('div');
        note.className = 'note';
        note.textContent = 'Interactive models of emergence, allocation, adaptation, and collective behavior.';
        nav.appendChild(note);
        container.innerHTML = '';
        container.appendChild(nav);
        setActive(location.hash || '#/baseline');
    }

    function setActive(hash) {
        document.querySelectorAll('#menu a').forEach(a => {
            if (a.getAttribute('href') === hash) a.classList.add('active');
            else a.classList.remove('active');
        });
    }

    window.Menu = { render, setActive };
})();


