/**
 * ZoundZ Nation - App Router & Preloader
 * Handles SPA-like navigation and scroll-triggered preloading
 */

const ZoundZApp = {
    // Cache for preloaded artist pages
    pageCache: new Map(),

    // Track if preloading has started
    preloadStarted: false,
    preloadComplete: false,

    // Artist data mapping
    artists: {
        'ravex': {
            file: 'artists/ravex.html',
            name: 'R4Ve X'
        },
        'inferno': {
            file: 'artists/inferno.html',
            name: 'Inferno'
        },
        'musicvibe': {
            file: 'artists/musicvibe.html',
            name: 'MusicVibe'
        }
    },

    /**
     * Initialize the application
     */
    init() {
        this.setupScrollObserver();
        this.setupArtistCardClicks();
        this.setupPopStateHandler();
        this.checkInitialRoute();
        this.setupNavLogoClick();
    },

    /**
     * Setup Intersection Observer for scroll-triggered preloading
     */
    setupScrollObserver() {
        const artistsSection = document.getElementById('artists');
        if (!artistsSection) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.preloadStarted) {
                    this.preloadStarted = true;
                    this.preloadAllArtistPages();
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '100px'
        });

        observer.observe(artistsSection);
    },

    /**
     * Preload all artist pages in the background
     */
    async preloadAllArtistPages() {
        this.showPreloadIndicator();

        const promises = Object.entries(this.artists).map(async ([key, artist]) => {
            try {
                const response = await fetch(artist.file);
                if (response.ok) {
                    const html = await response.text();
                    // Extract main content from the fetched page
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const content = doc.querySelector('.artist-page');
                    if (content) {
                        this.pageCache.set(key, content.outerHTML);
                    }
                }
            } catch (error) {
                console.warn(`Failed to preload ${artist.name}:`, error);
            }
        });

        await Promise.all(promises);
        this.preloadComplete = true;
        this.hidePreloadIndicator();
    },

    /**
     * Show preload indicator
     */
    showPreloadIndicator() {
        let indicator = document.querySelector('.preload-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'preload-indicator';
            indicator.innerHTML = `
                <div class="preload-spinner"></div>
                <span>Loading artist profiles...</span>
            `;
            document.body.appendChild(indicator);
        }

        requestAnimationFrame(() => {
            indicator.classList.add('visible');
        });
    },

    /**
     * Hide preload indicator with success state
     */
    hidePreloadIndicator() {
        const indicator = document.querySelector('.preload-indicator');
        if (indicator) {
            indicator.innerHTML = '<span>All profiles ready!</span>';
            indicator.classList.add('complete');

            setTimeout(() => {
                indicator.classList.remove('visible');
                setTimeout(() => indicator.remove(), 300);
            }, 1500);
        }
    },

    /**
     * Setup click handlers for artist cards
     */
    setupArtistCardClicks() {
        document.querySelectorAll('.artist-card[data-artist]').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't navigate if clicking on social links
                if (e.target.closest('.mini-link')) return;

                const artistKey = card.dataset.artist;
                this.navigateToArtist(artistKey);
            });
        });
    },

    /**
     * Navigate to an artist page
     */
    async navigateToArtist(artistKey, pushHistory = true) {
        const artist = this.artists[artistKey];
        if (!artist) return;

        // Update URL (only if caller wants to push a new history entry)
        if (pushHistory) {
            history.pushState({ artist: artistKey }, artist.name, `#artist/${artistKey}`);
        }

        // Get or fetch content
        let content = this.pageCache.get(artistKey);

        if (!content) {
            // Show loading state
            this.showLoading();

            try {
                const response = await fetch(artist.file);
                if (response.ok) {
                    const html = await response.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const pageContent = doc.querySelector('.artist-page');
                    if (pageContent) {
                        content = pageContent.outerHTML;
                        this.pageCache.set(artistKey, content);
                    }
                }
            } catch (error) {
                console.error('Failed to load artist page:', error);
                return;
            }
        }

        // Transition to artist page
        this.showArtistPage(content);
    },

    /**
     * Show loading state
     */
    showLoading() {
        const artistContent = document.getElementById('artist-content');
        if (artistContent) {
            artistContent.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; min-height: 60vh;">
                    <div class="preload-spinner" style="width: 40px; height: 40px;"></div>
                </div>
            `;
            artistContent.classList.add('active');
        }
    },

    /**
     * Show artist page with transition
     */
    showArtistPage(content) {
        const homeContent = document.getElementById('home-content');
        const artistContent = document.getElementById('artist-content');

        if (homeContent && artistContent) {
            // Fade out home
            homeContent.classList.add('fade-out');

            setTimeout(() => {
                homeContent.style.display = 'none';
                artistContent.innerHTML = content;
                artistContent.classList.add('active');

                // Setup back button in the new content
                this.setupBackButton();

                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 300);
        }
    },

    /**
     * Navigate back to home
     */
    navigateHome() {
        history.pushState({}, 'ZoundZ Nation', window.location.pathname);
        this.showHomePage();
    },

    /**
     * Show home page with transition
     */
    showHomePage() {
        const homeContent = document.getElementById('home-content');
        const artistContent = document.getElementById('artist-content');

        if (homeContent && artistContent) {
            artistContent.classList.remove('active');

            setTimeout(() => {
                artistContent.innerHTML = '';
                homeContent.style.display = 'block';

                requestAnimationFrame(() => {
                    homeContent.classList.remove('fade-out');
                });

                // Optionally scroll to artists section
                // window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 300);
        }
    },

    /**
     * Setup back button click handler
     */
    setupBackButton() {
        const backButton = document.querySelector('.back-home');
        if (backButton) {
            backButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateHome();
            });
        }
    },

    /**
     * Handle browser back/forward buttons
     */
    setupPopStateHandler() {
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.artist) {
                // Load artist without pushing a new history entry
                this.navigateToArtist(e.state.artist, false);
            } else {
                this.showHomePage();
            }
        });
    },

    /**
     * Check initial route on page load
     */
    checkInitialRoute() {
        const hash = window.location.hash;
        if (hash.startsWith('#artist/')) {
            const artistKey = hash.replace('#artist/', '');
            if (this.artists[artistKey]) {
                // Delay to allow page to render first
                setTimeout(() => {
                    this.navigateToArtist(artistKey);
                }, 100);
            }
        }
    },

    /**
     * Setup nav logo click to go home
     */
    setupNavLogoClick() {
        const navLogo = document.querySelector('.nav-logo');
        if (navLogo) {
            navLogo.addEventListener('click', (e) => {
                e.preventDefault();
                if (document.getElementById('artist-content')?.classList.contains('active')) {
                    this.navigateHome();
                } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ZoundZApp.init();
});
