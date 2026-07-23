/**
 * SMK Negeri 6 Kendari - Classic Theme Script
 * Interactive features: Mobile Nav, Scroll Reveal, Gallery Filter, Lightbox, FAQs, Form handling
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initScrollAnimations();
  initGallery();
  initLightbox();
  initFAQs();
  initContactForm();
});

/* --- NAVIGATION CONTROL --- */
function initNavigation() {
  const header = document.querySelector('header');
  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const topBar = document.querySelector('.top-bar');

  // Sticky Header on Scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Mobile Menu Toggle
  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navMenu.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!header.contains(e.target) && navMenu.classList.contains('active')) {
        menuToggle.classList.remove('active');
        navMenu.classList.remove('active');
      }
    });

    // Close menu when clicking a link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });
  }
}

/* --- SCROLL REVEAL ANIMATIONS --- */
function initScrollAnimations() {
  // Simple reveal utility using Intersection Observer
  const revealElements = document.querySelectorAll('.major-card, .news-item, .announcement-box, .classic-box, .timeline-item, .facility-card, .contact-info-card, .contact-form-column');
  
  if ('IntersectionObserver' in window && revealElements.length > 0) {
    const revealCallback = (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    };

    const revealObserver = new IntersectionObserver(revealCallback, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(25px)';
      el.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
      revealObserver.observe(el);
    });
  }
}

/* --- GALLERY FILTERING --- */
function initGallery() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');

  if (filterBtns.length > 0 && galleryItems.length > 0) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active class from all buttons
        filterBtns.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        btn.classList.add('active');

        const filterValue = btn.getAttribute('data-filter');

        galleryItems.forEach(item => {
          if (filterValue === 'all' || item.getAttribute('data-category') === filterValue) {
            item.style.display = 'block';
            setTimeout(() => {
              item.style.opacity = '1';
              item.style.transform = 'scale(1)';
            }, 50);
          } else {
            item.style.opacity = '0';
            item.style.transform = 'scale(0.8)';
            setTimeout(() => {
              item.style.display = 'none';
            }, 300);
          }
        });
      });
    });
  }
}

/* --- LIGHTBOX MODAL --- */
function initLightbox() {
  const galleryItems = document.querySelectorAll('.gallery-item');
  const lightbox = document.getElementById('lightbox');
  
  if (galleryItems.length > 0 && lightbox) {
    const lightboxImg = lightbox.querySelector('.lightbox-img');
    const lightboxCaption = lightbox.querySelector('.lightbox-caption');
    const lightboxClose = lightbox.querySelector('.lightbox-close');

    galleryItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const imgSrc = item.querySelector('img').getAttribute('src');
        const imgCaption = item.querySelector('.gallery-item-title').textContent;

        lightboxImg.setAttribute('src', imgSrc);
        lightboxCaption.textContent = imgCaption;
        lightbox.classList.add('show');
        document.body.style.overflow = 'hidden'; // Lock background scroll
      });
    });

    // Close Lightbox
    const closeLightbox = () => {
      lightbox.classList.remove('show');
      document.body.style.overflow = '';
      setTimeout(() => {
        lightboxImg.setAttribute('src', '');
        lightboxCaption.textContent = '';
      }, 300);
    };

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
        closeLightbox();
      }
    });

    // Keyboard support (Escape to close)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('show')) {
        closeLightbox();
      }
    });
  }
}

/* --- FAQ ACCORDION --- */
function initFAQs() {
  const faqHeaders = document.querySelectorAll('.faq-header');

  faqHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const body = item.querySelector('.faq-body');
      const isActive = item.classList.contains('active');

      // Close all other FAQ items
      document.querySelectorAll('.faq-item').forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
          otherItem.querySelector('.faq-body').style.maxHeight = null;
        }
      });

      // Toggle current FAQ item
      if (isActive) {
        item.classList.remove('active');
        body.style.maxHeight = null;
      } else {
        item.classList.add('active');
        body.style.maxHeight = body.scrollHeight + 'px';
      }
    });
  });
}

/* --- CONTACT FORM HANDLING --- */
function initContactForm() {
  const contactForm = document.getElementById('contactForm');
  
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const subject = document.getElementById('subject').value.trim();
      const message = document.getElementById('message').value.trim();

      if (!name || !email || !subject || !message) {
        showFormAlert('Mohon lengkapi semua field formulir.', 'error');
        return;
      }

      // Simulating database storage or email dispatch
      const feedbackData = {
        name,
        email,
        subject,
        message,
        timestamp: new Date().toISOString()
      };

      // Save to local storage for demonstration
      let submissions = JSON.parse(localStorage.getItem('smk6_submissions') || '[]');
      submissions.push(feedbackData);
      localStorage.setItem('smk6_submissions', JSON.stringify(submissions));

      showFormAlert('Pesan Anda berhasil dikirim! Kami akan menghubungi Anda segera.', 'success');
      contactForm.reset();
    });
  }
}

function showFormAlert(message, type) {
  // Check if there is an existing alert and remove it
  const existingAlert = document.querySelector('.form-alert');
  if (existingAlert) {
    existingAlert.remove();
  }

  const alertDiv = document.createElement('div');
  alertDiv.className = `form-alert alert-${type}`;
  alertDiv.textContent = message;

  // Add styles dynamically or rely on global classes
  alertDiv.style.padding = '15px';
  alertDiv.style.marginTop = '20px';
  alertDiv.style.fontFamily = 'var(--font-sans)';
  alertDiv.style.fontSize = '0.9rem';
  alertDiv.style.zIndex = '10';
  alertDiv.style.position = 'relative';

  if (type === 'success') {
    alertDiv.style.backgroundColor = '#e1f5fe';
    alertDiv.style.color = '#0288d1';
    alertDiv.style.border = '1px solid #b3e5fc';
  } else {
    alertDiv.style.backgroundColor = '#ffebee';
    alertDiv.style.color = '#c62828';
    alertDiv.style.border = '1px solid #ffcdd2';
  }

  const submitBtn = document.querySelector('#contactForm button[type="submit"]');
  if (submitBtn) {
    submitBtn.parentNode.insertBefore(alertDiv, submitBtn.nextSibling);
    
    // Auto-remove success alert after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        alertDiv.style.opacity = '0';
        alertDiv.style.transition = 'opacity 0.5s ease';
        setTimeout(() => alertDiv.remove(), 500);
      }, 5000);
    }
  }
}
