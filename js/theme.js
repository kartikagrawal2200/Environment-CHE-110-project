/**
 * ============================================================================
 * THEME.JS — Modern Showcase Interactions & UI Enhancements
 * ============================================================================
 * Project: Environmental Sustainability Research & Interactive Showcase
 * Key Features:
 *   1. Smooth Page Transitions (fade and blur overlay between pages)
 *   2. Animated Number Counters (counting up when scrolled into view)
 *   3. Ghost Typography Parallax (faint outlined background words shifting on scroll)
 *   4. IntersectionObserver Scroll Reveals (fade + slide-in animation)
 *   5. Mobile Navigation Pill Menu Toggle
 *   6. Paper vs Digital Interactive Comparison Bars
 * ============================================================================
 */

(function () {
  'use strict';

  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ==========================================================================
  // 1. SMOOTH PAGE TRANSITION OVERLAY
  // ==========================================================================
  // Creates a seamless, modern fade & blur effect when navigating between pages
  const transitionOverlay = document.getElementById('pageTransitionOverlay');

  if (transitionOverlay && !isReducedMotion) {
    // When the DOM is ready, fade out the overlay
    window.addEventListener('pageshow', () => {
      transitionOverlay.classList.remove('is-active');
    });

    // Intercept clicks on internal site links to create smooth exit transition
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      const target = link.getAttribute('target');

      // Only transition internal relative HTML links (ignore anchors, mailto, new tabs)
      if (
        href &&
        !href.startsWith('#') &&
        !href.startsWith('mailto:') &&
        !href.startsWith('javascript:') &&
        target !== '_blank' &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        e.preventDefault();
        transitionOverlay.classList.add('is-active');
        setTimeout(() => {
          window.location.href = href;
        }, 250); // Short 250ms duration for snappy responsiveness
      }
    });
  }

  // ==========================================================================
  // 2. ANIMATED NUMBER COUNTERS (COUNT-UP ON SCROLL)
  // ==========================================================================
  // Demonstrates IntersectionObserver: numbers count up from 0 to their target value
  const statValues = document.querySelectorAll('.stat-value[data-target]');

  if (statValues.length > 0) {
    const countObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const targetNum = parseInt(el.getAttribute('data-target'), 10);
          const duration = 1600; // 1.6 seconds animation duration
          const startTime = performance.now();

          function updateCount(currentTime) {
            const progress = Math.min((currentTime - startTime) / duration, 1);
            // Ease-out cubic curve: 1 - Math.pow(1 - progress, 3)
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentVal = Math.round(easeProgress * targetNum);
            el.textContent = currentVal.toLocaleString();

            if (progress < 1) {
              requestAnimationFrame(updateCount);
            } else {
              el.textContent = targetNum.toLocaleString();
            }
          }

          requestAnimationFrame(updateCount);
          observer.unobserve(el); // Only run once
        }
      });
    }, { threshold: 0.3 });

    statValues.forEach(val => countObserver.observe(val));
  }

  // ==========================================================================
  // 3. GHOST TYPOGRAPHY PARALLAX EFFECT
  // ==========================================================================
  // Huge faint outlined words (PAPER, EARTH, etc.) glide slowly on scroll
  const ghostTexts = document.querySelectorAll('.ghost-text');

  if (ghostTexts.length > 0 && !isReducedMotion) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY || window.pageYOffset;
      ghostTexts.forEach(gt => {
        // Slow parallax shift: 12% of scroll velocity
        const yShift = scrollY * 0.12;
        gt.style.transform = `translate3d(0, ${yShift}px, 0)`;
      });
    }, { passive: true });
  }

  // ==========================================================================
  // 4. PAPER VS DIGITAL MATRIX INTERACTIVE COMPARISON BARS
  // ==========================================================================
  // Animates comparison visual indicators when scrolled into view
  const comparisonBars = document.querySelectorAll('.compare-bar-fill[data-fill]');

  if (comparisonBars.length > 0) {
    const barObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const bar = entry.target;
          const targetWidth = bar.getAttribute('data-fill');
          bar.style.width = targetWidth;
          observer.unobserve(bar);
        }
      });
    }, { threshold: 0.2 });

    comparisonBars.forEach(bar => barObserver.observe(bar));
  }

  // ==========================================================================
  // 5. PILL NAVBAR MOBILE MENU TOGGLE
  // ==========================================================================
  const mobileToggle = document.getElementById('pillMobileToggle');
  const pillLinks = document.getElementById('pillNavLinks');

  if (mobileToggle && pillLinks) {
    const allLinkLists = document.querySelectorAll('.pill-links');
    const leftList = document.querySelector('.pill-links-left');
    const setMenu = (open) => {
      allLinkLists.forEach(l => l.classList.toggle('is-open', open));
      // stack the right-hand list underneath the left-hand one
      pillLinks.style.top = (open && leftList && leftList !== pillLinks) ? (60 + leftList.offsetHeight + 10) + 'px' : '';
      mobileToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    mobileToggle.addEventListener('click', () => {
      setMenu(!pillLinks.classList.contains('is-open'));
    });

    document.addEventListener('click', (e) => {
      const insideMenu = Array.from(allLinkLists).some(l => l.contains(e.target));
      if (!insideMenu && !mobileToggle.contains(e.target)) setMenu(false);
    });

    // close the menu after choosing a link (e.g. the in-page Documentary link)
    allLinkLists.forEach(l => l.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); }));
  }

  // ==========================================================================
  // 6. SCROLL REVEAL OBSERVER
  // ==========================================================================
  // Subtle slide & fade animations for all content sections
  const reveals = document.querySelectorAll('.theme-reveal');

  if ('IntersectionObserver' in window && reveals.length > 0) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    reveals.forEach(el => observer.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-visible'));
  }

})();
