;(function () {
    function mount(container) {
        const div = document.createElement('div');
        div.className = 'page';
        div.innerHTML = `
            <h1>AE Labs</h1>
            <p>Algorithmic Ecologies Laboratory — interactive models of emergence, allocation, adaptation, and collective behavior.</p>
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


