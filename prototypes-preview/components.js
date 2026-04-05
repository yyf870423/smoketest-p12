/**
 * 公共 JS — prototypes-preview
 * 个人博客 smoketest-p12 风格预选
 */

// ——— 主题切换 ———
function initThemeToggle() {
  const savedTheme = localStorage.getItem('preview-theme') || 'light';
  applyTheme(savedTheme);

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.theme-toggle');
    if (!btn) return;
    const isDark = document.documentElement.classList.contains('dark');
    applyTheme(isDark ? 'light' : 'dark');
  });
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('preview-theme', theme);
}

// ——— 导航高亮（根据当前页面文件名）———
function initNavHighlight() {
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    const href = a.getAttribute('href');
    if (href && (href === current || href.endsWith('/' + current))) {
      a.classList.add('active');
    }
  });
}

// ——— 入场动效：观察元素进入视口时添加动画类 ———
function initScrollReveal() {
  if (!('IntersectionObserver' in window)) return;
  const items = document.querySelectorAll('.reveal-on-scroll');
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-up');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  items.forEach(function (el) { observer.observe(el); });
}

// ——— 初始化入口 ———
document.addEventListener('DOMContentLoaded', function () {
  initThemeToggle();
  initNavHighlight();
  initScrollReveal();
});
