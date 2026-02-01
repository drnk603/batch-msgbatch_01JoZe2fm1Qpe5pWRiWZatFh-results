(function() {
  'use strict';

  if (window.__appCore) return;
  window.__appCore = true;

  const STATE = {
    burgerOpen: false,
    activeFilters: new Set(['all']),
    submitting: new Map()
  };

  const CONFIG = {
    headerHeight: 80,
    debounceDelay: 200,
    throttleDelay: 100,
    scrollOffset: 20
  };

  const REGEX = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[\+]?[\d\s\-\(\)]{7,20}$/,
    name: /^[a-zA-ZÀ-ÿ\s\-']{2,50}$/
  };

  function debounce(fn, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function throttle(fn, limit) {
    let waiting = false;
    return function(...args) {
      if (!waiting) {
        fn.apply(this, args);
        waiting = true;
        setTimeout(() => waiting = false, limit);
      }
    };
  }

  function showNotification(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'position-fixed top-0 end-0 p-3';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show`;
    toast.role = 'alert';
    toast.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Schließen"></button>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  function initBurgerMenu() {
    const toggle = document.querySelector('.navbar-toggler, .c-nav__toggle');
    const nav = document.querySelector('.navbar-collapse, .c-nav');
    const body = document.body;

    if (!toggle || !nav) return;

    const close = () => {
      STATE.burgerOpen = false;
      nav.classList.remove('show', 'is-open');
      toggle.setAttribute('aria-expanded', 'false');
      body.classList.remove('u-no-scroll');
    };

    const open = () => {
      STATE.burgerOpen = true;
      nav.classList.add('show', 'is-open');
      toggle.setAttribute('aria-expanded', 'true');
      body.classList.add('u-no-scroll');
    };

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      STATE.burgerOpen ? close() : open();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && STATE.burgerOpen) close();
    });

    document.addEventListener('click', (e) => {
      if (STATE.burgerOpen && !nav.contains(e.target) && !toggle.contains(e.target)) {
        close();
      }
    });

    nav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', close);
    });

    window.addEventListener('resize', debounce(() => {
      if (window.innerWidth >= 768 && STATE.burgerOpen) close();
    }, CONFIG.debounceDelay));
  }

  function initSmoothScroll() {
    const header = document.querySelector('.l-header, header');
    const headerHeight = header ? header.offsetHeight : CONFIG.headerHeight;

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (!href || href === '#' || href === '#!') return;

        const targetId = href.substring(1);
        const target = document.getElementById(targetId);

        if (target) {
          e.preventDefault();
          const offsetTop = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
          window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
          });
          if (window.history && window.history.pushState) {
            window.history.pushState(null, null, href);
          }
        }
      });
    });

    if (window.location.hash) {
      setTimeout(() => {
        const target = document.getElementById(window.location.hash.substring(1));
        if (target) {
          const offsetTop = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
          window.scrollTo({ top: offsetTop, behavior: 'smooth' });
        }
      }, 100);
    }
  }

  function initScrollSpy() {
    const sections = document.querySelectorAll('[id^="section-"]');
    const navLinks = document.querySelectorAll('.nav-link[href^="#section-"]');

    if (!sections.length || !navLinks.length) return;

    const header = document.querySelector('.l-header, header');
    const offset = header ? header.offsetHeight + CONFIG.scrollOffset : CONFIG.headerHeight;

    const highlightNav = throttle(() => {
      let currentSection = '';
      sections.forEach(section => {
        const sectionTop = section.offsetTop - offset;
        if (window.pageYOffset >= sectionTop) {
          currentSection = section.getAttribute('id');
        }
      });

      navLinks.forEach(link => {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
        if (link.getAttribute('href') === `#${currentSection}`) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'page');
        }
      });
    }, CONFIG.throttleDelay);

    window.addEventListener('scroll', highlightNav);
    highlightNav();
  }

  function initActiveMenu() {
    const path = window.location.pathname;
    const links = document.querySelectorAll('.nav-link');

    links.forEach(link => {
      link.classList.remove('active');
      link.removeAttribute('aria-current');

      const href = link.getAttribute('href');
      if (!href) return;

      const linkPath = href.split('#')[0];
      if (
        linkPath === path ||
        (path === '/' && linkPath === '/index.html') ||
        (path === '/index.html' && linkPath === '/')
      ) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  function validateField(field) {
    const value = field.value.trim();
    const type = field.type;
    const id = field.id;
    let isValid = true;
    let message = '';

    if (field.hasAttribute('required') && !value) {
      isValid = false;
      message = 'Dieses Feld ist erforderlich.';
    } else if (type === 'email' && value && !REGEX.email.test(value)) {
      isValid = false;
      message = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
    } else if (type === 'tel' && value && !REGEX.phone.test(value)) {
      isValid = false;
      message = 'Bitte geben Sie eine gültige Telefonnummer ein.';
    } else if (id && id.toLowerCase().includes('name') && value && !REGEX.name.test(value)) {
      isValid = false;
      message = 'Bitte geben Sie einen gültigen Namen ein (2-50 Zeichen).';
    } else if (field.tagName === 'TEXTAREA' && value && value.length < 10) {
      isValid = false;
      message = 'Bitte geben Sie mindestens 10 Zeichen ein.';
    } else if (type === 'checkbox' && field.hasAttribute('required') && !field.checked) {
      isValid = false;
      message = 'Sie müssen diese Option akzeptieren.';
    }

    return { isValid, message };
  }

  function showFieldError(field, message) {
    field.classList.add('is-invalid');
    field.classList.remove('is-valid');

    let feedback = field.parentElement.querySelector('.invalid-feedback');
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.className = 'invalid-feedback';
      field.parentElement.appendChild(feedback);
    }
    feedback.textContent = message;
  }

  function clearFieldError(field) {
    field.classList.remove('is-invalid');
    field.classList.add('is-valid');

    const feedback = field.parentElement.querySelector('.invalid-feedback');
    if (feedback) feedback.textContent = '';
  }

  function initForms() {
    const forms = document.querySelectorAll('form.c-form, form.needs-validation');

    forms.forEach(form => {
      const fields = form.querySelectorAll('input, textarea, select');
      fields.forEach(field => {
        field.addEventListener('blur', () => {
          const { isValid, message } = validateField(field);
          if (!isValid) {
            showFieldError(field, message);
          } else {
            clearFieldError(field);
          }
        });
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formId = form.id || 'form';
        if (STATE.submitting.get(formId)) return;

        let hasErrors = false;
        fields.forEach(field => {
          const { isValid, message } = validateField(field);
          if (!isValid) {
            showFieldError(field, message);
            hasErrors = true;
          } else {
            clearFieldError(field);
          }
        });

        if (hasErrors) {
          showNotification('Bitte korrigieren Sie die Fehler im Formular.', 'danger');
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerHTML : '';

        STATE.submitting.set(formId, true);
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Wird gesendet...';
        }

        try {
          const formData = new FormData(form);
          const data = {};
          formData.forEach((value, key) => {
            data[key] = value;
          });

          const response = await fetch('process.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });

          if (!response.ok) throw new Error('Network response was not ok');

          const result = await response.json();

          if (result.success) {
            showNotification('Vielen Dank! Ihre Nachricht wurde erfolgreich gesendet.', 'success');
            setTimeout(() => {
              window.location.href = 'thank_you.html';
            }, 1000);
          } else {
            showNotification(result.message || 'Es gab einen Fehler. Bitte versuchen Sie es erneut.', 'danger');
          }
        } catch (error) {
          showNotification('Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.', 'danger');
        } finally {
          STATE.submitting.set(formId, false);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
          }
        }
      });
    });
  }

  function initPortfolioFilter() {
    const filterButtons = document.querySelectorAll('[data-filter]');
    const portfolioItems = document.querySelectorAll('[data-category]');

    if (!filterButtons.length || !portfolioItems.length) return;

    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        const filter = button.getAttribute('data-filter');

        filterButtons.forEach(btn => btn.classList.remove('is-active'));
        button.classList.add('is-active');

        portfolioItems.forEach(item => {
          const categories = item.getAttribute('data-category').split(',');
          if (filter === 'all' || categories.includes(filter)) {
            item.style.display = '';
          } else {
            item.style.display = 'none';
          }
        });
      });
    });
  }

  function initModals() {
    const modalTriggers = document.querySelectorAll('[data-bs-toggle="modal"]');
    
    modalTriggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = trigger.getAttribute('data-bs-target') || trigger.getAttribute('href');
        const modal = document.querySelector(targetId);
        
        if (modal) {
          modal.classList.add('show');
          modal.style.display = 'block';
          modal.setAttribute('aria-hidden', 'false');
          document.body.classList.add('modal-open');
          
          const backdrop = document.createElement('div');
          backdrop.className = 'modal-backdrop fade show';
          document.body.appendChild(backdrop);
          
          const closeModal = () => {
            modal.classList.remove('show');
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
            backdrop.remove();
          };
          
          modal.querySelectorAll('[data-bs-dismiss="modal"]').forEach(closeBtn => {
            closeBtn.addEventListener('click', closeModal);
          });
          
          backdrop.addEventListener('click', closeModal);
          
          document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
              closeModal();
              document.removeEventListener('keydown', escHandler);
            }
          });
        }
      });
    });
  }

  function initScrollToTop() {
    let scrollBtn = document.getElementById('scroll-to-top');
    
    if (!scrollBtn) {
      scrollBtn = document.createElement('button');
      scrollBtn.id = 'scroll-to-top';
      scrollBtn.className = 'btn btn-primary';
      scrollBtn.innerHTML = '↑';
      scrollBtn.setAttribute('aria-label', 'Nach oben scrollen');
      scrollBtn.style.cssText = 'position:fixed;bottom:2rem;right:2rem;width:48px;height:48px;border-radius:50%;display:none;z-index:999;';
      document.body.appendChild(scrollBtn);
    }

    const toggleVisibility = throttle(() => {
      if (window.pageYOffset > 300) {
        scrollBtn.style.display = 'flex';
      } else {
        scrollBtn.style.display = 'none';
      }
    }, CONFIG.throttleDelay);

    window.addEventListener('scroll', toggleVisibility);

    scrollBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function initCountUp() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const animateCounter = (element) => {
      const target = parseInt(element.getAttribute('data-count'));
      const duration = 2000;
      const increment = target / (duration / 16);
      let current = 0;

      const updateCounter = () => {
        current += increment;
        if (current < target) {
          element.textContent = Math.floor(current);
          requestAnimationFrame(updateCounter);
        } else {
          element.textContent = target;
        }
      };

      updateCounter();
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
  }

  function initImageFallback() {
    document.querySelectorAll('img').forEach(img => {
      if (!img.hasAttribute('loading') && !img.classList.contains('c-logo__img')) {
        img.setAttribute('loading', 'lazy');
      }

      img.addEventListener('error', function() {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#e9ecef"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#6c757d" font-family="sans-serif" font-size="18">Bild nicht verfügbar</text></svg>`;
        this.src = 'data:image/svg+xml;base64,' + btoa(svg);
        this.style.objectFit = 'contain';
      });
    });
  }

  function init() {
    initBurgerMenu();
    initSmoothScroll();
    initScrollSpy();
    initActiveMenu();
    initForms();
    initPortfolioFilter();
    initModals();
    initScrollToTop();
    initCountUp();
    initImageFallback();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();