document.addEventListener('DOMContentLoaded', () => {
    // ==================== DARK MODE TOGGLE ==================== //
    const themeToggle = document.getElementById('themeToggle');
    // const htmlElement = document.documentElement; // unused previously

    // Check for saved theme preference or default to light mode
    const currentTheme = localStorage.getItem('theme') || 'light';

    // Apply saved theme on page load (guard themeToggle)
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }

    // Toggle theme (guard themeToggle)
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');

            if (document.body.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            } else {
                localStorage.setItem('theme', 'light');
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            }
        });
    }

    // ==================== SMOOTH SCROLL ==================== //
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href && document.querySelector(href)) {
                e.preventDefault();
                document.querySelector(href).scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ==================== CONTACT FORM ==================== //
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const data = {
                name: contactForm.querySelector('input[type="text"]')?.value || '',
                email: contactForm.querySelector('input[type="email"]')?.value || '',
                message: contactForm.querySelector('textarea')?.value || ''
            };

            // Validate
            if (!data.name || !data.email || !data.message) {
                alert('Please fill in all fields');
                return;
            }

            // Show success message
            const successMsg = document.createElement('div');
            successMsg.style.cssText = `
                position: fixed;
                top: 100px;
                right: 20px;
                background: #22c55e;
                color: white;
                padding: 1rem 2rem;
                border-radius: 10px;
                box-shadow: 0 10px 15px rgba(0,0,0,0.2);
                z-index: 2000;
                animation: slideIn 0.3s ease-out;
            `;
            successMsg.textContent = '✓ Message sent! I\'ll get back to you soon.';
            document.body.appendChild(successMsg);

            // Reset form
            contactForm.reset();

            // Remove message after 4 seconds
            setTimeout(() => {
                successMsg.style.animation = 'slideOut 0.3s ease-out forwards';
                setTimeout(() => successMsg.remove(), 300);
            }, 4000);
        });
    }

    // ==================== ANIMATIONS ==================== //
    // keep animations injected (unchanged)
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }

        @keyframes fadeInUp {
            from {
                transform: translateY(30px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);

    // ==================== INTERSECTION OBSERVER (Fade-in animations) ==================== //
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    let observer = null;
    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
        observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'fadeInUp 0.6s ease-out forwards';
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
    }

    // Observe all cards and items
    document.querySelectorAll('.project-card, .skill-item, .about-card, .timeline-item').forEach(el => {
        if (prefersReducedMotion) {
            el.style.opacity = '1';
        } else {
            el.style.opacity = '0';
            if (observer) observer.observe(el);
        }
    });

    // ==================== CONSOLIDATED SCROLL HANDLER (SMOOTH) ==================== //
    /* Replaced immediate rAF-per-scroll approach with a single rAF-driven smoothing loop.
       - targetScroll is written from the passive scroll listener (cheap)
       - currentScroll is interpolated towards targetScroll in the RAF loop (smooth)
       - NAV active link is handled via IntersectionObserver when available (low-cost)
       - background bands opacity is gently updated to avoid jumps
    */

    const navbarEl = document.querySelector('.navbar');
    const heroEl = document.querySelector('.hero');
    const aboutEl = document.querySelector('.about-section');
    const sections = Array.from(document.querySelectorAll('section[id]'));
    const navLinks = Array.from(document.querySelectorAll('.nav-menu a'));

    // small lerp helper
    const lerp = (a, b, t) => a + (b - a) * t;

    // initial values
    let targetScroll = window.pageYOffset || document.documentElement.scrollTop;
    let currentScroll = targetScroll;
    let rafRunning = false;

    // smoothing factor (1 = no smoothing). If user prefers reduced motion, avoid smoothing.
    const defaultEase = 0.12;
    const ease = (prefersReducedMotion ? 1 : defaultEase);

    // NAVBAR handler (keeps DOM writes minimal)
    const handleNavbar = (scrollY) => {
        if (!navbarEl) return;
        if (scrollY > 50) {
            navbarEl.classList.add('scrolled');
        } else {
            navbarEl.classList.remove('scrolled');
        }
    };

    // PARALLAX (GPU-accelerated transform). Uses smoothed scrollY.
    const handleParallax = (scrollY) => {
        if (!heroEl || prefersReducedMotion) return;
        // subtle parallax, smoothed
        const y = Math.round(scrollY * 0.45);
        heroEl.style.transform = `translate3d(0, ${y}px, 0)`;
    };

    // ABOUT overlay calc (uses smoothed scroll values where appropriate)
    const handleAboutStack = () => {
        if (!aboutEl || !heroEl) return;
        const navH = getNavHeight();
        const heroRect = heroEl.getBoundingClientRect();
        const aboutRect = aboutEl.getBoundingClientRect();

        const heroHeight = Math.max(0, heroRect.height);
        const visibleHero = Math.max(0, Math.min(heroHeight, heroRect.bottom - navH));
        const scrolledOut = heroHeight - visibleHero;

        const maxTranslate = Math.max(0, Math.min(scrolledOut, aboutRect.height || heroHeight));
        const shouldOverlay = (aboutRect.top <= navH + 10) && (heroRect.bottom > navH + 10);

        if (shouldOverlay) {
            aboutEl.style.setProperty('--about-offset', `-${Math.round(maxTranslate)}px`);
            aboutEl.classList.add('overlay');
        } else {
            aboutEl.classList.remove('overlay');
            aboutEl.style.removeProperty('--about-offset');
        }
    };

    // NAV active link: prefer IntersectionObserver for efficiency and accuracy
    let navObserver = null;
    const initNavObserver = () => {
        if (prefersReducedMotion || !('IntersectionObserver' in window) || !sections.length) {
            // fallback to last-known scanning approach
            return;
        }

        const navH = getNavHeight();
        navObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const id = entry.target.id;
                const link = navLinks.find(l => l.getAttribute('href') === `#${id}`);
                if (!link) return;

                if (entry.isIntersecting && entry.intersectionRatio > 0.25) {
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                } else {
                    // If the link is currently active but the section left view, remove it.
                    if (link.classList.contains('active') && !entry.isIntersecting) {
                        link.classList.remove('active');
                    }
                }
            });
        }, {
            root: null,
            rootMargin: `-${navH + 120}px 0px -40% 0px`,
            threshold: [0.25, 0.5]
        });

        sections.forEach(s => navObserver.observe(s));
    };

    initNavObserver();

    // Fallback active-nav updater (runs rarely inside RAF)
    const updateActiveNavFallback = () => {
        if (!sections.length || !navLinks.length) return;
        const navH = getNavHeight();
        let currentId = '';
        for (let i = 0; i < sections.length; i++) {
            const s = sections[i];
            const r = s.getBoundingClientRect();
            if (r.top <= navH + 120 && r.bottom > navH + 120) {
                currentId = s.id;
                break;
            }
        }

        navLinks.forEach(link => {
            const href = link.getAttribute('href') || '';
            if (href.startsWith('#') && href.slice(1) === currentId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    };

    // BACKGROUND BANDS: gentle opacity updates based on section proximity
    let bandElements = [];
    const createBackgroundBands = () => {
        if (prefersReducedMotion) return;

        document.querySelectorAll('.bg-band').forEach(b => b.remove());
        bandElements = [];

        const allSections = Array.from(document.querySelectorAll('.section'));
        allSections.forEach((sec, idx) => {
            const band = document.createElement('div');
            band.className = 'bg-band';
            band.dataset.index = String(idx);

            const secBg = getComputedStyle(sec).backgroundColor || getComputedStyle(document.documentElement).getPropertyValue('--bg-primary') || '#fff';
            band.style.background = secBg;

            const bandZ = (idx % 2 === 0) ? 10 : 20;
            band.style.zIndex = String(bandZ);
            band.style.opacity = '0';

            sec.parentNode.insertBefore(band, sec);
            bandElements.push({ band, sec });
        });
    };
    createBackgroundBands();

    // update bands opacity smoothly based on section's top distance to nav line
    const updateBands = (scrollY) => {
        if (!bandElements.length) return;
        const navH = getNavHeight();
        const viewportCenter = (window.innerHeight) / 2;
        bandElements.forEach(({ band, sec }) => {
            const r = sec.getBoundingClientRect();
            // distance from section top to viewport center (consider nav offset)
            const dist = Math.abs((r.top + r.height / 2) - viewportCenter);
            // map distance -> opacity (closer -> higher)
            const max = window.innerHeight * 0.75;
            let opacity = 1 - (dist / max);
            opacity = Math.max(0, Math.min(1, opacity));
            // soften transitions by applying a low-power lerp
            const current = parseFloat(band.style.opacity || '0');
            const next = lerp(current, opacity, 0.18);
            band.style.opacity = String(next);
            // small translate to reduce pop
            const translate = Math.round((r.top - navH) * 0.03);
            band.style.transform = `translate3d(0, ${translate}px, 0)`;
        });
    };

    // RAF-driven smoothing loop: applies handlers using interpolated currentScroll
    const rafLoop = () => {
        rafRunning = true;
        currentScroll = lerp(currentScroll, targetScroll, ease);
        const scrollY = currentScroll;

        handleNavbar(scrollY);
        handleParallax(scrollY);
        handleAboutStack();

        // update nav active using observer fallback if observer not available
        if (!navObserver) updateActiveNavFallback();

        // background bands smoothing
        updateBands(scrollY);

        // stop when close enough to target to avoid infinite loop
        if (Math.abs(targetScroll - currentScroll) > 0.5) {
            requestAnimationFrame(rafLoop);
        } else {
            rafRunning = false;
        }
    };

    // passive scroll listener writes only to targetScroll and triggers RAF
    window.addEventListener('scroll', () => {
        targetScroll = window.pageYOffset || document.documentElement.scrollTop;
        if (!rafRunning) requestAnimationFrame(rafLoop);
    }, { passive: true });

    // init once
    targetScroll = window.pageYOffset || document.documentElement.scrollTop;
    currentScroll = targetScroll;
    if (!rafRunning) requestAnimationFrame(rafLoop);

    // update on resize (throttled via rAF)
    let resizeRaf = null;
    const onResize = () => {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => {
            // rebuild bands because background or computed styles may change
            createBackgroundBands();
            handleAboutStack();
            if (!navObserver) updateActiveNavFallback();
        });
    };
    window.addEventListener('resize', onResize, { passive: true });

    // ==================== BACKGROUND BANDS (SMOOTH ALTERNATING LAYERS) ==================== //
    // create sticky background bands that alternate stacking order and match each section's background
    const createBackgroundBandsLegacy = () => {
        if (prefersReducedMotion) return;

        // remove any existing bands (recreate on resize)
        document.querySelectorAll('.bg-band').forEach(b => b.remove());

        const allSections = Array.from(document.querySelectorAll('.section'));
        allSections.forEach((sec, idx) => {
            // create band and insert before section
            const band = document.createElement('div');
            band.className = 'bg-band';
            band.dataset.index = String(idx);

            // get computed background of section (falls back to CSS var)
            const secBg = getComputedStyle(sec).backgroundColor || getComputedStyle(document.documentElement).getPropertyValue('--bg-primary') || '#fff';
            band.style.background = secBg;

            // alternate band stacking so bands overlay each other in an alternating pattern
            // but keep bands below section content (sections have higher z-index via CSS)
            const bandZ = (idx % 2 === 0) ? 10 : 20;
            band.style.zIndex = String(bandZ);

            // insert band right before the section so bands cover the area as the user scrolls
            sec.parentNode.insertBefore(band, sec);
        });
    };

    // create once and recreate on resize (throttled via rAF)
    createBackgroundBandsLegacy();
    let bandsRaf = null;
    window.addEventListener('resize', () => {
        if (bandsRaf) cancelAnimationFrame(bandsRaf);
        bandsRaf = requestAnimationFrame(() => {
            createBackgroundBandsLegacy();
            // re-run about overlay calc because layout changed
            handleAboutStack();
            updateActiveNav();
        });
    }, { passive: true });

    console.log('✓ Portfolio loaded successfully!');
    console.log('🌙 Press the moon icon in the top-right to toggle dark mode');
    console.log('📧 Feel free to reach out via the contact form');
});
