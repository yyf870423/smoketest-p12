/**
 * 极简墨笔风 — 公共交互组件
 * smoketest-p12 个人博客系统原型
 */

/* ══════════════════════════════════════════
   1. 主题切换（深色 / 浅色）
══════════════════════════════════════════ */
const ThemeManager = {
  STORAGE_KEY: 'blog-theme',

  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.apply(saved || (prefersDark ? 'dark' : 'light'));
    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem(this.STORAGE_KEY)) {
        this.apply(e.matches ? 'dark' : 'light');
      }
    });
  },

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    // 更新按钮图标
    document.querySelectorAll('.theme-icon').forEach(el => {
      el.textContent = theme === 'dark' ? '☀' : '☾';
    });
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    this.apply(current === 'dark' ? 'light' : 'dark');
  }
};

/* ══════════════════════════════════════════
   2. 导航栏汉堡菜单
══════════════════════════════════════════ */
const NavManager = {
  init() {
    const btn = document.querySelector('.hamburger');
    const menu = document.querySelector('.mobile-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('open');
      btn.classList.toggle('open', isOpen);
      btn.setAttribute('aria-expanded', isOpen);
    });

    // 点击菜单外关闭
    document.addEventListener('click', e => {
      if (!btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('open');
        btn.classList.remove('open');
        btn.setAttribute('aria-expanded', false);
      }
    });

    // 滚动时高亮当前链接
    this.highlightCurrentLink();
  },

  highlightCurrentLink() {
    const links = document.querySelectorAll('.nav-link');
    const path = location.pathname.split('/').pop() || 'index.html';
    links.forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href.includes(path) || (path === 'index.html' && href === './')) {
        link.classList.add('active');
      }
    });
  }
};

/* ══════════════════════════════════════════
   3. 滚动进度条
══════════════════════════════════════════ */
const ScrollProgress = {
  init() {
    const bar = document.querySelector('.scroll-progress');
    if (!bar) return;
    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const pct = scrollHeight === clientHeight ? 100
        : Math.round(scrollTop / (scrollHeight - clientHeight) * 100);
      bar.style.width = pct + '%';
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }
};

/* ══════════════════════════════════════════
   4. 交错进场动画（Intersection Observer）
══════════════════════════════════════════ */
const AnimationManager = {
  init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.animate-fade-in, .animate-fade-in-up, .animate-scale-in').forEach(el => {
      el.style.animationPlayState = 'paused';
      observer.observe(el);
    });
  }
};

/* ══════════════════════════════════════════
   5. Toast 通知
══════════════════════════════════════════ */
const Toast = {
  show(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = { success: '✓', error: '✕', info: '✦' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type] || '✦'}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 300ms ease-in';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error');   },
  info(msg)    { this.show(msg, 'info');    }
};

/* ══════════════════════════════════════════
   6. 模态框
══════════════════════════════════════════ */
const Modal = {
  open(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
      modal.querySelector('.modal-box')?.style.setProperty('transform', 'scale(1)');
    });
    document.body.style.overflow = 'hidden';
  },

  close(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.style.opacity = '0';
    setTimeout(() => {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }, 250);
  },

  init() {
    // 点击遮罩关闭
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) this.close(overlay.id);
      });
    });
    // ESC 键关闭
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => {
          if (m.style.display !== 'none' && m.style.display !== '') {
            this.close(m.id);
          }
        });
      }
    });
  }
};

/* ══════════════════════════════════════════
   7. 图片懒加载
══════════════════════════════════════════ */
const LazyLoad = {
  init() {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.dataset.src;
          if (src) { img.src = src; img.removeAttribute('data-src'); }
          observer.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });
    document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
  }
};

/* ══════════════════════════════════════════
   8. 代码块复制
══════════════════════════════════════════ */
const CodeCopy = {
  init() {
    document.querySelectorAll('pre code').forEach(block => {
      const wrapper = block.parentElement;
      wrapper.style.position = 'relative';
      const btn = document.createElement('button');
      btn.textContent = '复制';
      btn.style.cssText = `
        position:absolute; top:10px; right:10px;
        padding:3px 10px; font-size:12px; border-radius:4px;
        background:var(--color-surface-primary); border:1px solid var(--color-border);
        color:var(--color-text-secondary); cursor:pointer;
        transition:all 150ms ease;
      `;
      btn.addEventListener('click', async () => {
        await navigator.clipboard.writeText(block.textContent).catch(() => {});
        btn.textContent = '已复制✓';
        btn.style.color = 'var(--color-accent)';
        setTimeout(() => { btn.textContent = '复制'; btn.style.color = ''; }, 2000);
      });
      wrapper.appendChild(btn);
    });
  }
};

/* ══════════════════════════════════════════
   9. 全局初始化
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  NavManager.init();
  ScrollProgress.init();
  AnimationManager.init();
  Modal.init();
  LazyLoad.init();
  CodeCopy.init();
});

// 导出供 HTML 内联使用
window.ThemeManager = ThemeManager;
window.Toast = Toast;
window.Modal = Modal;
