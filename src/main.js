/**
 * Main Application Script — Alif Bayu Y. Portfolio
 */

import { SITE_CONFIG } from './site.config.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Dynamic Year in Footer
  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // 2. Mobile Navigation Toggle & Smooth Backdrop
  const mobileToggle = document.querySelector('.mobile-nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (mobileToggle && navLinks) {
    // Inject backdrop overlay if not present
    let navBackdrop = document.querySelector('.nav-backdrop');
    if (!navBackdrop) {
      navBackdrop = document.createElement('div');
      navBackdrop.className = 'nav-backdrop';
      navBackdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(navBackdrop);
    }

    const openMenu = () => {
      mobileToggle.setAttribute('aria-expanded', 'true');
      navLinks.classList.add('nav-open');
      navBackdrop.classList.add('active');
      document.body.classList.add('menu-open');
    };

    const closeMenu = () => {
      mobileToggle.setAttribute('aria-expanded', 'false');
      navLinks.classList.remove('nav-open');
      navBackdrop.classList.remove('active');
      document.body.classList.remove('menu-open');
    };

    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = mobileToggle.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close when tapping backdrop
    navBackdrop.addEventListener('click', closeMenu);

    // Close menu when any anchor link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('nav-open')) {
        closeMenu();
        mobileToggle.focus();
      }
    });

    // Close if window resizes beyond mobile breakpoint
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && navLinks.classList.contains('nav-open')) {
        closeMenu();
      }
    }, { passive: true });
  }

  // 3. Contact & Signal Action Handler
  const signalBtn = document.getElementById('signal-action-btn');
  const signalStatus = document.getElementById('signal-status');

  if (signalBtn) {
    const configuredEmail = (SITE_CONFIG.contact.email && SITE_CONFIG.contact.email.trim()) || "bayualif828@gmail.com";

    signalBtn.href = `mailto:${configuredEmail}`;
    signalBtn.innerHTML = `<span>Transmit to ${configuredEmail} ↗</span>`;
    if (signalStatus) {
      signalStatus.textContent = `FREQUENCY ACTIVE // DIRECT TRANSMISSION READY`;
    }
  }

  // 4. Ambient Parallax on Hero Illustrations (Desktop fine pointers only)
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (!prefersReducedMotion && isFinePointer) {
    const heroSection = document.querySelector('.hero-section');
    const parallaxItems = document.querySelectorAll('[data-parallax]');

    if (heroSection && parallaxItems.length > 0) {
      let rafId = null;
      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;

      heroSection.addEventListener('mousemove', (e) => {
        const rect = heroSection.getBoundingClientRect();
        const normX = (e.clientX - rect.left) / rect.width - 0.5;
        const normY = (e.clientY - rect.top) / rect.height - 0.5;

        targetX = normX;
        targetY = normY;

        if (!rafId) {
          rafId = requestAnimationFrame(updateParallax);
        }
      }, { passive: true });

      heroSection.addEventListener('mouseleave', () => {
        targetX = 0;
        targetY = 0;
      });

      function updateParallax() {
        currentX += (targetX - currentX) * 0.08;
        currentY += (targetY - currentY) * 0.08;

        parallaxItems.forEach(el => {
          const depth = parseFloat(el.getAttribute('data-parallax') || '10');
          const moveX = currentX * depth;
          const moveY = currentY * depth;
          el.style.transform = `translate3d(${moveX.toFixed(2)}px, ${moveY.toFixed(2)}px, 0)`;
        });

        if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
          rafId = requestAnimationFrame(updateParallax);
        } else {
          rafId = null;
        }
      }
    }
  }
});
