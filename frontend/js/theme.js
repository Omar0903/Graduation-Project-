(function() {
    // Apply theme early to prevent Flash of Unstyled Content (FOUC)
    const savedTheme = localStorage.getItem("theme") || "system";
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    // Check if document.body exists
    if (document.body) {
        if (savedTheme === "dark" || (savedTheme === "system" && systemPrefersDark)) {
            document.body.classList.add("dark-mode");
        } else {
            document.body.classList.remove("dark-mode");
        }
    } else {
        document.addEventListener("DOMContentLoaded", () => {
            if (savedTheme === "dark" || (savedTheme === "system" && systemPrefersDark)) {
                document.body.classList.add("dark-mode");
            } else {
                document.body.classList.remove("dark-mode");
            }
        });
    }
})();

function initThemeWidget() {
    const icons = {
        palette: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
        sun: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
        moon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
        system: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`
    };

    const headerToggleBtn = document.getElementById("themeToggle");

    // 1. Create the menu HTML
    const menuHTML = `
        <div id="modern-theme-menu" class="modern-theme-menu hidden">
            <div class="theme-menu-header">Appearance</div>
            <button class="theme-option" data-theme="light" type="button"><span class="icon-wrapper">${icons.sun}</span> Light</button>
            <button class="theme-option" data-theme="dark" type="button"><span class="icon-wrapper">${icons.moon}</span> Dark</button>
            <button class="theme-option" data-theme="system" type="button"><span class="icon-wrapper">${icons.system}</span> System</button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', menuHTML);

    let triggerBtn;

    // 2. Decide where to attach
    if (headerToggleBtn) {
        // We have a header button, use it!
        triggerBtn = headerToggleBtn;
        triggerBtn.title = "Theme Options";
    } else {
        // No header button, inject a professional floating button
        const floatingBtnHTML = `
            <button id="floating-theme-btn" class="floating-theme-btn" title="Theme Settings" type="button">
                ${icons.palette}
            </button>
        `;
        document.body.insertAdjacentHTML('beforeend', floatingBtnHTML);
        triggerBtn = document.getElementById("floating-theme-btn");
    }

    const themeMenu = document.getElementById("modern-theme-menu");
    const themeOptions = document.querySelectorAll(".theme-option");

    // 3. Add styles
    const style = document.createElement('style');
    style.innerHTML = `
        /* Professional floating button */
        .floating-theme-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 99998;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            color: #333;
            border: 1px solid rgba(0,0,0,0.08);
            border-radius: 50%;
            width: 56px;
            height: 56px;
            cursor: pointer;
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        body.dark-mode .floating-theme-btn {
            background: rgba(30, 30, 30, 0.85);
            color: #f1f1f1;
            border-color: rgba(255,255,255,0.1);
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .floating-theme-btn:hover {
            transform: scale(1.1) translateY(-4px);
            box-shadow: 0 12px 30px rgba(0,0,0,0.15);
        }
        body.dark-mode .floating-theme-btn:hover {
            box-shadow: 0 12px 30px rgba(0,0,0,0.5);
        }

        /* Modern Menu */
        .modern-theme-menu {
            position: fixed;
            z-index: 99999;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(0,0,0,0.06);
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            width: 170px;
            transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), visibility 0.25s;
            padding: 8px 0;
        }
        
        ${headerToggleBtn ? `
            .modern-theme-menu {
                transform-origin: top right;
            }
            .modern-theme-menu.hidden {
                opacity: 0;
                visibility: hidden;
                transform: scale(0.85) translateY(-10px);
                pointer-events: none;
            }
        ` : `
            .modern-theme-menu {
                bottom: 100px;
                right: 30px;
                transform-origin: bottom right;
            }
            .modern-theme-menu.hidden {
                opacity: 0;
                visibility: hidden;
                transform: scale(0.85) translateY(10px);
                pointer-events: none;
            }
        `}
        
        .theme-menu-header {
            padding: 10px 16px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            color: #888;
            font-weight: 700;
            margin-bottom: 4px;
        }

        body.dark-mode .modern-theme-menu {
            background: rgba(35, 35, 35, 0.9);
            border-color: rgba(255,255,255,0.08);
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        
        .theme-option {
            background: none;
            border: none;
            padding: 12px 16px;
            text-align: left;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            color: #444;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            position: relative;
        }
        
        body.dark-mode .theme-option {
            color: #e0e0e0;
        }

        .theme-option:hover {
            background: rgba(0,0,0,0.04);
        }
        body.dark-mode .theme-option:hover {
            background: rgba(255,255,255,0.06);
        }

        .theme-option.active {
            color: var(--primary-color, #4A90E2);
            background: rgba(74, 144, 226, 0.08);
        }
        body.dark-mode .theme-option.active {
            color: #64B5F6;
            background: rgba(100, 181, 246, 0.15);
        }
        
        .theme-option .icon-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .theme-option.active::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 3px;
            height: 60%;
            background: currentColor;
            border-radius: 0 4px 4px 0;
        }
    `;
    document.head.appendChild(style);

    // Dynamic positioning for header button
    function updateMenuPosition() {
        if (headerToggleBtn && !themeMenu.classList.contains("hidden")) {
            const rect = triggerBtn.getBoundingClientRect();
            // Position just below the button
            themeMenu.style.top = (rect.bottom + 12) + 'px';
            // Align right edge
            let rightAlign = window.innerWidth - rect.right;
            if(rightAlign < 10) rightAlign = 10;
            themeMenu.style.right = rightAlign + 'px';
            themeMenu.style.left = 'auto';
        }
    }

    if (headerToggleBtn) {
        window.addEventListener('resize', updateMenuPosition);
        window.addEventListener('scroll', updateMenuPosition);
    }

    triggerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        themeMenu.classList.toggle("hidden");
        if (headerToggleBtn) updateMenuPosition();
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".modern-theme-menu") && e.target !== triggerBtn && !triggerBtn.contains(e.target)) {
            themeMenu.classList.add("hidden");
        }
    });

    function applyTheme(theme) {
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const isDark = theme === "dark" || (theme === "system" && systemPrefersDark);
        
        if (isDark) {
            document.body.classList.add("dark-mode");
        } else {
            document.body.classList.remove("dark-mode");
        }

        // Update trigger button icon
        if (headerToggleBtn) {
            // Header button
            triggerBtn.innerHTML = isDark ? icons.moon : icons.sun;
        } else {
            // Floating button
            triggerBtn.innerHTML = icons.palette;
        }
        
        // Update active class in menu
        themeOptions.forEach(opt => {
            if (opt.dataset.theme === theme) {
                opt.classList.add("active");
            } else {
                opt.classList.remove("active");
            }
        });
    }

    themeOptions.forEach(opt => {
        opt.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const selectedTheme = opt.dataset.theme;
            localStorage.setItem("theme", selectedTheme);
            applyTheme(selectedTheme);
            themeMenu.classList.add("hidden");
        });
    });

    // Listen for system theme changes
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if (localStorage.getItem("theme") === "system" || !localStorage.getItem("theme")) {
            applyTheme("system");
        }
    });

    // Initialize
    const savedTheme = localStorage.getItem("theme") || "system";
    applyTheme(savedTheme);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initThemeWidget);
} else {
    initThemeWidget();
}