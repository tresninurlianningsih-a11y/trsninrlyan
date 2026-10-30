/**
 * SMK Negeri 6 Kendari - Classic Theme Script
 * Interactive features: Mobile Nav, Scroll Reveal, Gallery Filter, Lightbox, FAQs, Form handling, Dark/Light Mode
 */

// Immediate Theme Initialization (Prevents theme flash on reload)
(function () {
  const savedTheme = localStorage.getItem('smk6_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', initialTheme);
})();

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initScrollAnimations();
  initGallery();
  initLightbox();
  initFAQs();
  initContactForm();
  initDynamicContent();
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
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const subject = document.getElementById('subject').value.trim();
      const message = document.getElementById('message').value.trim();

      if (!name || !email || !subject || !message) {
        showFormAlert('Mohon lengkapi semua field formulir.', 'error');
        return;
      }

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim...';
      }

      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, subject, message })
        });

        if (res.ok) {
          showFormAlert('Pesan Anda berhasil dikirim! Kami akan menghubungi Anda segera.', 'success');
          contactForm.reset();
        } else {
          const errData = await res.json();
          showFormAlert(errData.error || 'Gagal mengirim pesan. Silakan coba lagi.', 'error');
        }
      } catch (err) {
        console.error('API submission failed, falling back to local storage', err);
        
        // Fallback to local storage
        const feedbackData = {
          name,
          email,
          subject,
          message,
          timestamp: new Date().toISOString()
        };
        let submissions = JSON.parse(localStorage.getItem('smk6_submissions') || '[]');
        submissions.push(feedbackData);
        localStorage.setItem('smk6_submissions', JSON.stringify(submissions));
        
        showFormAlert('Pesan Anda disimpan secara lokal (offline).', 'success');
        contactForm.reset();
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      }
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

/* --- DYNAMIC NEWS & ANNOUNCEMENTS LOAD --- */
function initDynamicContent() {
  const newsGrid = document.getElementById('newsGrid');
  const announcementList = document.getElementById('announcementList');

  if (newsGrid) {
    fetch('/api/news')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          // Store data globally for modal reference
          window.loadedNewsData = data;
          
          newsGrid.innerHTML = data.slice(0, 4).map(item => {
            const imgSrc = (item.image && item.image.startsWith('uploaded_')) 
              ? '/' + item.image 
              : item.image;
              
            return `
              <article class="news-item" style="opacity: 0; transform: translateY(25px);">
                <img src="${imgSrc}" alt="${escapeHtml(item.title)}" class="news-item-img" onerror="this.src='osis.jpeg'">
                <div class="news-item-content">
                  <span class="news-date"><i class="fa-regular fa-calendar"></i> ${escapeHtml(item.date)}</span>
                  <h4 class="news-title"><a href="#" onclick="openNewsDetail(event, '${item.id}')">${escapeHtml(item.title)}</a></h4>
                  <p class="news-excerpt">${escapeHtml(item.excerpt)}</p>
                  <a href="#" class="major-card-link" style="font-size: 0.8rem;" onclick="openNewsDetail(event, '${item.id}')">Baca Detail <i class="fa-solid fa-arrow-right"></i></a>
                </div>
              </article>
            `;
          }).join('');

          // Re-run scroll animations on newly created dynamic elements
          initScrollAnimations();
        }
      })
      .catch(err => console.warn('Gagal memuat berita dinamis, menggunakan fallback HTML.', err));
  }

  if (announcementList) {
    fetch('/api/announcements')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          announcementList.innerHTML = data.slice(0, 5).map(item => `
            <div class="announcement-item">
              <span class="announcement-date">${escapeHtml(item.date)}</span>
              <a href="${escapeHtml(item.link)}" class="announcement-text">${escapeHtml(item.text)}</a>
            </div>
          `).join('');
        }
      })
      .catch(err => console.warn('Gagal memuat pengumuman dinamis, menggunakan fallback HTML.', err));
  }

  const adminsGrid = document.getElementById('adminsGrid');
  if (adminsGrid) {
    fetch('/api/admins')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          adminsGrid.innerHTML = data.map(admin => {
            const initial = admin.username.charAt(0).toUpperCase();
            return `
              <div class="admin-card">
                <div class="admin-card-avatar">${initial}</div>
                <h3 class="admin-card-name">${escapeHtml(admin.username)}</h3>
                <p class="admin-card-role">Administrator</p>
                <div class="admin-card-status">Aktif</div>
              </div>
            `;
          }).join('');
        } else {
          adminsGrid.innerHTML = `<div class="text-center" style="grid-column: 1/-1; color: var(--color-gray);">Tidak ada administrator terdaftar.</div>`;
        }
      })
      .catch(err => {
        console.warn('Gagal memuat daftar admin.', err);
      });
  }

  // Dynamic Ekstrakurikuler
  const ekskulContainer = document.getElementById('ekskulDynamicGrid');
  if (ekskulContainer) {
    fetch('/api/ekstrakurikuler')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          ekskulContainer.innerHTML = data.map(item => `
            <div class="classic-box">
              <img src="${escapeHtml(item.foto || 'pramuka.jpeg')}" alt="${escapeHtml(item.nama_ekskul)}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;" onerror="this.src='pramuka.jpeg'">
              <h3 style="color: var(--color-navy); font-size: 1.1rem; margin-bottom: 8px;">${escapeHtml(item.nama_ekskul)}</h3>
              <p style="font-size: 0.85rem; color: var(--color-gray); margin-bottom: 10px;"><i class="fa-regular fa-clock"></i> ${escapeHtml(item.jadwal || '-')} | <i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.lokasi || '-')}</p>
              <p style="font-size: 0.9rem; line-height: 1.5; color: var(--color-charcoal);">${escapeHtml(item.deskripsi)}</p>
            </div>
          `).join('');
        }
      }).catch(err => console.warn('Gagal memuat ekskul dinamis.', err));
  }

  // Bind modal close trigger
  const closeBtn = document.getElementById('closeNewsModalBtn');
  const modal = document.getElementById('newsDetailModal');
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
      }
    });
  }
}

function openNewsDetail(event, newsId) {
  event.preventDefault();
  const modal = document.getElementById('newsDetailModal');
  if (!modal || !window.loadedNewsData) return;

  const newsItem = window.loadedNewsData.find(item => item.id === newsId);
  if (!newsItem) return;

  const modalImg = document.getElementById('modalNewsImg');
  const modalDate = document.getElementById('modalNewsDate');
  const modalTitle = document.getElementById('modalNewsTitle');
  const modalText = document.getElementById('modalNewsText');

  const imgSrc = (newsItem.image && newsItem.image.startsWith('uploaded_')) 
    ? '/' + newsItem.image 
    : newsItem.image;

  modalImg.src = imgSrc;
  modalImg.onerror = () => { modalImg.src = 'osis.jpeg'; };
  modalDate.textContent = newsItem.date;
  modalTitle.textContent = newsItem.title;
  modalText.textContent = newsItem.content;

  modal.classList.add('show');
  document.body.style.overflow = 'hidden'; // lock background scroll
}

// HTML escape utility to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// --- ADMIN LOGIN MODAL CONTROLLER ---
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('loginAdminBtn');
  const footerLoginBtn = document.getElementById('footerLoginAdminBtn');
  const loginModal = document.getElementById('adminLoginModal');
  const closeLoginBtn = document.getElementById('closeLoginModalBtn');
  const loginForm = document.getElementById('modalLoginForm');
  const loginSubmit = document.getElementById('modalLoginSubmit');
  const errorAlert = document.getElementById('loginErrorAlert');
  const errorMessage = document.getElementById('loginErrorMessage');

  if (loginModal) {
    const openModal = (e) => {
      e.preventDefault();
      loginModal.style.display = 'flex';
      setTimeout(() => {
        loginModal.style.opacity = '1';
      }, 50);
      document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
      loginModal.style.opacity = '0';
      setTimeout(() => {
        loginModal.style.display = 'none';
      }, 300);
      document.body.style.overflow = '';
      if (loginForm) loginForm.reset();
      if (errorAlert) errorAlert.style.display = 'none';
    };

    if (loginBtn) loginBtn.addEventListener('click', openModal);
    if (footerLoginBtn) footerLoginBtn.addEventListener('click', openModal);
    if (closeLoginBtn) closeLoginBtn.addEventListener('click', closeModal);

    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) {
        closeModal();
      }
    });

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('modalUsername').value.trim();
        const password = document.getElementById('modalPassword').value.trim();

        if (errorAlert) errorAlert.style.display = 'none';
        
        const originalText = loginSubmit.innerHTML;
        loginSubmit.disabled = true;
        loginSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memverifikasi...';

        try {
          const apiUrl = window.location.port === '3001' ? '/api/login' : 'http://localhost:3001/api/login';
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });

          const data = await response.json();

          if (response.ok && data.success) {
            if (window.location.port !== '3001' && window.location.protocol.startsWith('http')) {
              window.location.href = 'http://localhost:3001/admin.html';
            } else {
              window.location.href = 'admin.html';
            }
          } else {
            errorMessage.textContent = data.error || 'Username atau password salah';
            errorAlert.style.display = 'block';
            loginSubmit.disabled = false;
            loginSubmit.innerHTML = originalText;
          }
        } catch (err) {
          console.error(err);
          errorMessage.textContent = 'Gagal terhubung ke server.';
          errorAlert.style.display = 'block';
          loginSubmit.disabled = false;
          loginSubmit.innerHTML = originalText;
        }
      });
    }
  }
});

/* ========================================================
   THEME TOGGLE CONTROLLER (DARK & LIGHT MODES)
   ======================================================== */
function initTheme() {
  const savedTheme = localStorage.getItem('smk6_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');

  applyTheme(currentTheme);
  setupThemeButtons();
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('smk6_theme', theme);

  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    if (theme === 'dark') {
      btn.innerHTML = '<i class="fa-solid fa-sun" style="color: #dfb76c;"></i>';
      btn.setAttribute('aria-label', 'Beralih ke Mode Terang');
      btn.setAttribute('title', 'Beralih ke Mode Terang');
    } else {
      btn.innerHTML = '<i class="fa-solid fa-moon" style="color: #c5a059;"></i>';
      btn.setAttribute('aria-label', 'Beralih ke Mode Gelap');
      btn.setAttribute('title', 'Beralih ke Mode Gelap');
    }
  });
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
}

function setupThemeButtons() {
  // If button is not already present in the DOM, dynamically inject it into .nav-container
  const existingButtons = document.querySelectorAll('.theme-toggle-btn');
  if (existingButtons.length === 0) {
    const navContainer = document.querySelector('.nav-container');
    if (navContainer) {
      let navActions = navContainer.querySelector('.nav-actions');
      if (!navActions) {
        navActions = document.createElement('div');
        navActions.className = 'nav-actions';
        const menuToggle = navContainer.querySelector('.menu-toggle');
        if (menuToggle) {
          navContainer.insertBefore(navActions, menuToggle);
          navActions.appendChild(menuToggle);
        } else {
          navContainer.appendChild(navActions);
        }
      }

      const btn = document.createElement('button');
      btn.id = 'themeToggleBtn';
      btn.className = 'theme-toggle-btn';
      btn.type = 'button';
      navActions.insertBefore(btn, navActions.firstChild);
    }
  }

  // Bind click handlers to all theme buttons
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.removeEventListener('click', toggleTheme);
    btn.addEventListener('click', toggleTheme);
  });

  // Re-sync icon
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(currentTheme);
}
