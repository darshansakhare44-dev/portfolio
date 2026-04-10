const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const navLinks = [...document.querySelectorAll(".site-nav a")];
const revealItems = document.querySelectorAll(".reveal");
const main = document.querySelector("main");
const sections = [...document.querySelectorAll("main section[id]")];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const getHeaderOffset = () => document.querySelector(".site-header")?.offsetHeight ?? 0;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const closeNav = () => {
  if (!navToggle || !siteNav) {
    return;
  }

  siteNav.classList.remove("is-open");
  navToggle.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
};

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.classList.toggle("is-open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  },
  {
    threshold: 0.15,
    rootMargin: "0px 0px -40px 0px",
  }
);

revealItems.forEach((item) => revealObserver.observe(item));

const setActiveSection = () => {
  if (!sections.length) {
    return;
  }

  const focusLine = window.scrollY + getHeaderOffset() + window.innerHeight * 0.28;
  let currentSection = sections[0];
  let smallestDistance = Number.POSITIVE_INFINITY;

  sections.forEach((section) => {
    const top = section.offsetTop;
    const bottom = top + section.offsetHeight;
    const withinSection = focusLine >= top && focusLine < bottom;

    if (withinSection) {
      currentSection = section;
      smallestDistance = -1;
      return;
    }

    if (smallestDistance === -1) {
      return;
    }

    const center = top + section.offsetHeight / 2;
    const distance = Math.abs(focusLine - center);

    if (distance < smallestDistance) {
      smallestDistance = distance;
      currentSection = section;
    }
  });

  sections.forEach((section) => {
    section.classList.toggle("is-current", section === currentSection);
  });

  navLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${currentSection.id}`;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
};

if (main && sections.length) {
  main.classList.add("has-section-focus");
  main.classList.add("is-focus-active");
  setActiveSection();
}

let ticking = false;
window.addEventListener(
  "scroll",
  () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(() => {
      setActiveSection();
      ticking = false;
    });
  },
  { passive: true }
);

window.addEventListener("resize", setActiveSection);

const isEditableTarget = (target) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT"
  );
};

const hasScrollableParent = (target, deltaY) => {
  let node = target instanceof HTMLElement ? target : null;

  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const canScroll = /(auto|scroll|overlay)/.test(style.overflowY);

    if (canScroll && node.scrollHeight > node.clientHeight) {
      const movingDown = deltaY > 0;
      const maxScrollTop = node.scrollHeight - node.clientHeight;
      const canMoveDown = movingDown && node.scrollTop < maxScrollTop;
      const canMoveUp = !movingDown && node.scrollTop > 0;

      if (canMoveDown || canMoveUp) {
        return true;
      }
    }

    node = node.parentElement;
  }

  return false;
};

if (!prefersReducedMotion.matches) {
  document.body.classList.add("is-smooth-scrolling");

  let targetY = window.scrollY;
  let currentY = window.scrollY;
  let animationFrame = null;

  const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

  const animateScroll = () => {
    currentY += (targetY - currentY) * 0.14;

    if (Math.abs(targetY - currentY) < 0.5) {
      currentY = targetY;
      window.scrollTo(0, currentY);
      animationFrame = null;
      return;
    }

    window.scrollTo(0, currentY);
    animationFrame = window.requestAnimationFrame(animateScroll);
  };

  const startSmoothScroll = () => {
    if (animationFrame !== null) {
      return;
    }

    animationFrame = window.requestAnimationFrame(animateScroll);
  };

  const smoothScrollTo = (y) => {
    targetY = clamp(y, 0, maxScroll());
    startSmoothScroll();
  };

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");
      const targetSection = targetId ? document.querySelector(targetId) : null;

      closeNav();

      if (!targetSection) {
        return;
      }

      event.preventDefault();
      const nextY = targetSection.getBoundingClientRect().top + window.scrollY - getHeaderOffset() - 12;
      smoothScrollTo(nextY);
    });
  });

  document.querySelectorAll('a[href="#top"], a[href="/#top"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      closeNav();
      smoothScrollTo(0);
    });
  });

  window.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey || isEditableTarget(event.target) || hasScrollableParent(event.target, event.deltaY)) {
        return;
      }

      event.preventDefault();
      targetY = clamp(targetY + event.deltaY, 0, maxScroll());
      startSmoothScroll();
    },
    { passive: false }
  );

  window.addEventListener("keydown", (event) => {
    if (isEditableTarget(event.target)) {
      return;
    }

    const step = window.innerHeight * 0.85;
    const shortcuts = {
      ArrowDown: 80,
      ArrowUp: -80,
      PageDown: step,
      PageUp: -step,
      Home: -maxScroll(),
      End: maxScroll(),
      " ": event.shiftKey ? -step : step,
    };

    if (!(event.key in shortcuts)) {
      return;
    }

    event.preventDefault();

    if (event.key === "Home") {
      smoothScrollTo(0);
      return;
    }

    if (event.key === "End") {
      smoothScrollTo(maxScroll());
      return;
    }

    smoothScrollTo(targetY + shortcuts[event.key]);
  });

  let syncTimer;
  window.addEventListener(
    "scroll",
    () => {
      window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(() => {
        if (animationFrame === null) {
          currentY = window.scrollY;
          targetY = window.scrollY;
        }
      }, 120);
    },
    { passive: true }
  );

  window.addEventListener("resize", () => {
    currentY = clamp(window.scrollY, 0, maxScroll());
    targetY = clamp(targetY, 0, maxScroll());
  });
} else {
  navLinks.forEach((link) => {
    link.addEventListener("click", closeNav);
  });
}

// Background Thunders (Visual Lightning Flashes)
const stormContainer = document.querySelector(".page-storm");

// Smooth scroll glow
const stormVeins = document.querySelectorAll(".storm-vein");
let lastScrollY = window.scrollY;
let scrollGlowOpacity = 0;

window.addEventListener("scroll", () => {
  const deltaY = Math.abs(window.scrollY - lastScrollY);
  lastScrollY = window.scrollY;

  // increase glow intensity depending on scroll speed, capped at 0.8
  scrollGlowOpacity = Math.min(scrollGlowOpacity + deltaY * 0.008, 0.8);
}, { passive: true });

const decayScrollGlow = () => {
  if (scrollGlowOpacity > 0) {
    scrollGlowOpacity = Math.max(0, scrollGlowOpacity - 0.015);
    stormVeins.forEach((vein) => {
      vein.style.opacity = scrollGlowOpacity;
    });
  }
  requestAnimationFrame(decayScrollGlow);
};
requestAnimationFrame(decayScrollGlow);

if (stormContainer && !prefersReducedMotion.matches) {
  const triggerThunder = () => {
    stormContainer.classList.remove("thunder-flash-active");
    void stormContainer.offsetWidth;
    stormContainer.classList.add("thunder-flash-active");

    const nextStrike = Math.random() * 9000 + 3000;
    setTimeout(triggerThunder, nextStrike);
  };
  
  setTimeout(triggerThunder, Math.random() * 2000 + 1000);
}

// Interactive RGB Grid Background
const createGrid = () => {
  let gridContainer = document.getElementById('interactive-grid');
  if (!gridContainer) {
    gridContainer = document.createElement('div');
    gridContainer.id = 'interactive-grid';
    gridContainer.setAttribute('aria-hidden', 'true');
    // Prepend as first element to stay strictly in the background
    document.body.prepend(gridContainer);
  }
  
  const blockSize = 50; // Size of each hoverable block
  const updateGrid = () => {
    // Avoid rebuilding if page is hidden
    if (document.hidden) return;
    
    gridContainer.innerHTML = '';
    const cols = Math.ceil(window.innerWidth / blockSize) + 2;
    const rows = Math.ceil(window.innerHeight / blockSize) + 2;
    const totalBlocks = cols * rows;
    
    gridContainer.style.setProperty('--cols', cols);
    gridContainer.style.setProperty('--rows', rows);
    
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < totalBlocks; i++) {
        const block = document.createElement('div');
        block.className = 'grid-block';
        // Random neon rgb hue (saturated)
        const hue = Math.floor(Math.random() * 360);
        block.style.setProperty('--block-color', `hsl(${hue}, 100%, 65%)`);
        fragment.appendChild(block);
    }
    gridContainer.appendChild(fragment);
  };
  
  updateGrid();
  
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateGrid, 300);
  });
};

createGrid();

