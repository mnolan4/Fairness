;(function () {
    function mount(container) {
        const div = document.createElement('div');
        div.className = 'page';
        div.innerHTML = `
            <h1>Self-Organizing Fairness Ecosystem</h1>
            <p>Explore multiple interactive models demonstrating fairness dynamics, weighting, segregation analogs, and market-style exchanges.</p>
            <p>Use the menu above to switch between models. Each page provides controls and real-time metrics.</p>
        `;
        container.appendChild(div);
    }
    function unmount() {
        // nothing to clean for static content
    }
    window.Pages = window.Pages || {};
    window.Pages.home = { mount, unmount };
})();


