;(function () {
    const routes = {};
    let current = null;
    let currentCleanup = null;
    const contentEl = document.getElementById('content');
    const menuEl = document.getElementById('menu');

    function mount(route) {
        const target = routes[route] || routes['#/baseline'];
        if (!target || !contentEl) return;
        // cleanup previous
        if (current && current.unmount) {
            try { current.unmount(); } catch (e) { /* ignore */ }
        }
        contentEl.innerHTML = '';
        current = target;
        if (current && current.mount) {
            current.mount(contentEl);
        }
        if (window.Menu && window.Menu.setActive) {
            window.Menu.setActive(route);
        }
    }

    function onHashChange() {
        const hash = location.hash || '#/baseline';
        mount(hash);
    }

    // Public API
    window.Router = {
        register(route, lifecycle) {
            routes[route] = lifecycle;
        },
        start() {
            if (menuEl && window.Menu && window.Menu.render) {
                window.Menu.render(menuEl);
            }
            window.addEventListener('hashchange', onHashChange);
            onHashChange();
        }
    };

    // Register known routes provided by other scripts if they exist
    window.addEventListener('DOMContentLoaded', () => {
        if (window.Pages && window.Pages.home) {
            window.Router.register('#/home', window.Pages.home);
        }
        if (window.Models && window.Models.baseline) {
            window.Router.register('#/baseline', window.Models.baseline);
        }
        if (window.Models && window.Models.weighted) {
            window.Router.register('#/weighted', window.Models.weighted);
        }
        if (window.Models && window.Models.segregation) {
            window.Router.register('#/segregation', window.Models.segregation);
        }
        if (window.Models && window.Models.market) {
            window.Router.register('#/market', window.Models.market);
        }
        window.Router.start();
    });
})();


