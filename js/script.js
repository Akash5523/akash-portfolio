// animations.js
// Requires: GSAP + ScrollTrigger loaded before this file.
// Optional but recommended: Lenis for smooth inertia scrolling (CDN below in HTML).
// This file contains safe fallbacks if Lenis is not present.

document.addEventListener('DOMContentLoaded', function () {

  // -------------------------
  // Basic GSAP / ScrollTrigger setup
  // -------------------------
  gsap.registerPlugin(ScrollTrigger);

  // sensible defaults
  gsap.defaults({
    ease: "power3.out",
    duration: 0.8,
    overwrite: "auto"
  });

  // ScrollTrigger performance tweaks
  ScrollTrigger.config({
    ignoreMobileResize: true,
    autoRefreshEvents: "visibilitychange,DOMContentLoaded,load", // reduce frequent auto-refreshes
    // smoothChildTiming is a property on timelines but it's useful to enable for more stable sequences
  });

  // -------------------------
  // Optional: Lenis smooth scrolling integration (recommended)
  // -------------------------
  // If you include Lenis via CDN in your HTML, this block will use it.
  // Otherwise, script falls back to native scrolling with rAF updates for ScrollTrigger.
  let useLenis = (typeof Lenis !== 'undefined');
  let lenis;
  let scrollerElement = document.documentElement; // default scroller

  if (useLenis) {
    // Configure Lenis for smooth inertia scrolling
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // smooth ease
      smoothWheel: true,
      smoothTouch: true,
      infinite: false
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // scrollerProxy for ScrollTrigger to follow Lenis virtual scroll
    ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value) {
        if (arguments.length) {
          lenis.scrollTo(value);
          return;
        }
        return lenis.scroll.instance ? lenis.scroll.instance.scroll : document.documentElement.scrollTop;
      },
      getBoundingClientRect() {
        return { top: 0, left: 0, width: innerWidth, height: innerHeight };
      },
      // we don't need to implement pinType unless using transforms on the container
    });

    // keep ScrollTrigger in sync with Lenis
    lenis.on('scroll', ScrollTrigger.update);
    scrollerElement = document.documentElement; // keep default
  } else {
    // Fallback: simple sync mechanism with RAF for ScrollTrigger
    gsap.ticker.add(() => ScrollTrigger.update());
    // reduce default lag smoothing which sometimes causes jitter on some devices
    try { gsap.ticker.lagSmoothing(0); } catch (e) { }
  }

  // -------------------------
  // Utility: rAF-throttled scroll handler
  // -------------------------
  const rafThrottle = (fn) => {
    let ticking = false;
    return function (...args) {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          fn.apply(this, args);
          ticking = false;
        });
        ticking = true;
      }
    };
  };

  // -------------------------
  // Header: smooth transition, reduced reflows
  // -------------------------
  const header = document.getElementById('header');
  if (header) {
    // Use a single class toggle and CSS transitions instead of many style changes.
    const onHeaderScroll = rafThrottle(() => {
      const scrolled = window.scrollY > 50;
      header.classList.toggle('scrolled', scrolled);
    });
    window.addEventListener('scroll', onHeaderScroll, { passive: true });
    // run once to set initial state
    onHeaderScroll();
  }

  // -------------------------
  // Scroll Indicator (rAF-throttled)
  // -------------------------
  const scrollIndicator = document.getElementById('scroll-indicator');
  if (scrollIndicator) {
    const updateIndicator = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const scrollableHeight = scrollHeight - clientHeight;
      const scrollPercent = scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 0;
      // Use transform scaleX for better performance (avoids layout)
      scrollIndicator.style.transform = `scaleX(${Math.min(Math.max(scrollPercent / 100, 0), 1)})`;
    };
    window.addEventListener('scroll', rafThrottle(updateIndicator), { passive: true });
    // initial
    updateIndicator();
  }

  // -------------------------
  // GSAP Entrance and Scroll Animations
  // -------------------------
  // Hero entrance animation
  gsap.set("#hero h1, #hero h2, #hero .flex.justify-center", { autoAlpha: 0, willChange: "transform,opacity" });
  gsap.set("#hero h1", { y: 30 });
  gsap.set("#hero h2", { y: 20 });
  gsap.set("#hero .flex.justify-center", { scale: 0.95 });

  const heroTl = gsap.timeline({ delay: 0.18 });
  heroTl.to("#hero h1", { autoAlpha: 1, y: 0, duration: 0.8 })
    .to("#hero h2", { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.6")
    .to("#hero .flex.justify-center", { autoAlpha: 1, scale: 1, duration: 0.7, ease: "back.out(1.7)" }, "-=0.4");

  // Section focus fade-out (triggered)
  const sections = gsap.utils.toArray("main > section");
  sections.forEach((section, index) => {
    // Skip hero and last section
    if (section.id === 'hero' || index === sections.length - 1) return;

    gsap.to(section, {
      autoAlpha: 0,
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: section,
        scroller: scrollerElement,
        start: "bottom center",
        end: "bottom top+=5%",
        toggleActions: "play reverse play reverse",
        // markers: true // enable for debug
      }
    });
  });

  // Animate titles (Batch)
  gsap.set(".section-title", { autoAlpha: 0, y: 30, willChange: "transform,opacity" });
  ScrollTrigger.batch(".section-title", {
    scroller: scrollerElement,
    onEnter: batch => gsap.to(batch, {
      autoAlpha: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.15,
      overwrite: true
    }),
    start: "top 90%",
    once: true
  });

  // About section wrapper fade-in
  const aboutContentWrapper = document.querySelector("#about .max-w-3xl");
  if (aboutContentWrapper) {
    gsap.set(aboutContentWrapper, { autoAlpha: 0, y: 40, willChange: "transform,opacity" });
    gsap.to(aboutContentWrapper, {
      autoAlpha: 1,
      y: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: aboutContentWrapper,
        scroller: scrollerElement,
        start: "top 75%",
        toggleActions: "play none none none",
        once: true
      }
    });
  }

  // Batch animate cards and timeline items
  const batchItems = gsap.utils.toArray("#skills .modern-card, #experience .timeline-item, #projects .project-card, #certifications .modern-card");
  if (batchItems.length) {
    gsap.set(batchItems, { autoAlpha: 0, y: 50, willChange: "transform,opacity" });
    ScrollTrigger.batch(batchItems, {
      scroller: scrollerElement,
      interval: 0.12, // batch frequency (seconds)
      onEnter: batch => gsap.to(batch, {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.14,
        overwrite: true
      }),
      start: "top 90%",
      once: true
    });
  }

  // Contact form fade-in
  const contactForm = document.querySelector("#contact form");
  if (contactForm) {
    gsap.set(contactForm, { autoAlpha: 0, y: 40, willChange: "transform,opacity" });
    gsap.to(contactForm, {
      autoAlpha: 1,
      y: 0,
      duration: 0.8,
      ease: "power3.out",
      scrollTrigger: {
        trigger: contactForm,
        scroller: scrollerElement,
        start: "top 90%",
        toggleActions: "play none none none",
        once: true
      }
    });
  }

  // -------------------------
  // Formspree Contact Form Submission (secure + GSAP + animated toast)
  // -------------------------
  if (contactForm) {
    contactForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const form = e.target;
      const data = new FormData(form);

      const submitButton = form.querySelector("button[type='submit']");
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";

      try {
        const response = await fetch(form.action, {
          method: form.method,
          body: data,
          headers: { "Accept": "application/json" },
        });

        if (response.ok) {
          // Small GSAP success animation
          gsap.to(contactForm, { opacity: 0, y: -10, duration: 0.4 });
          showToast("✅ Message sent successfully!", "success");
          form.reset();
          gsap.to(contactForm, { opacity: 1, y: 0, duration: 0.4, delay: 0.3 });
        } else {
          showToast("❌ Something went wrong. Please try again.", "error");
        }
      } catch (error) {
        console.error("Form submission error:", error);
        showToast("⚠️ Network error. Please try again later.", "error");
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Send Message";
      }
    });
  }

  // -------------------------
  // Toast Notification Function (clean + animated)
  // -------------------------
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.className = `fixed bottom-6 right-6 px-4 py-3 rounded-lg text-white shadow-lg z-50 transition-all duration-500 transform
    ${type === "success"
        ? "bg-green-600"
        : type === "error"
          ? "bg-red-600"
          : "bg-gray-700"
      }`;

    document.body.appendChild(toast);

    // Entrance animation
    gsap.fromTo(
      toast,
      { autoAlpha: 0, y: 20 },
      { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" }
    );

    // Exit animation after 3s
    setTimeout(() => {
      gsap.to(toast, {
        autoAlpha: 0,
        y: 20,
        duration: 0.5,
        ease: "power2.in",
        onComplete: () => toast.remove(),
      });
    }, 3000);
  }

  // -------------------------
  // Project Modal Logic (kept intact, optimized)
  // -------------------------
  const modal = document.getElementById('projectModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalDescription = document.getElementById('modalDescription');
  const modalStackContainer = document.getElementById('modalStack');
  const closeModal = document.getElementById('closeModal');
  const projectCards = document.querySelectorAll('.project-card');

  projectCards.forEach(card => {
    card.addEventListener('click', () => {
      modalTitle.textContent = card.dataset.title || 'Project Details';
      modalDescription.textContent = card.dataset.description || 'No description available.';
      modalStackContainer.innerHTML = '';
      const stack = card.dataset.stack ? card.dataset.stack.split(',').map(s => s.trim()) : [];

      if (stack.length > 0) {
        stack.forEach(tech => {
          const span = document.createElement('span');

          // --- THIS IS THE CHANGED LINE ---
          span.className = 'bg-gray-700 text-gray-300 px-2 py-1 rounded';
          // --- END OF CHANGE ---

          span.textContent = tech;
          modalStackContainer.appendChild(span);
        });
      } else {
        modalStackContainer.textContent = 'Tech stack not specified.';
      }

      modal.style.display = "block";
      document.body.style.overflow = 'hidden';
      closeModal && closeModal.focus();
    });
  });

  function hideModal() {
    if (!modal) return;
    modal.style.display = "none";
    document.body.style.overflow = '';
  }

  if (closeModal) closeModal.addEventListener('click', hideModal);

  window.addEventListener('click', function (event) {
    if (event.target === modal) hideModal();
  });

  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
      if (modal && modal.style.display === "block") hideModal();
    }
  });

  // -------------------------
  // Footer current year
  // -------------------------
  const yearSpan = document.getElementById('current-year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // -------------------------
  // Final refresh after everything's loaded
  // -------------------------
  // Wait for load + small timeout so fonts and images settle, then refresh ScrollTrigger
  window.addEventListener('load', () => {
    // tiny delay to ensure layouts are stable
    setTimeout(() => {
      ScrollTrigger.refresh();
      // If Lenis is used, ensure final sync
      if (useLenis && lenis && lenis.update) lenis.update();
    }, 260);
  });

}); // DOMContentLoaded end
