export {};
const toc = document.querySelector<HTMLDetailsElement>('#toc-details')!;
const desktop = matchMedia('(min-width: 960px)');
function sync() { toc.open = desktop.matches; }
sync(); desktop.addEventListener('change', sync);
// Desktop contents stays expanded, including when activated from the keyboard.
toc.querySelector('summary')!.addEventListener('click', event => { if (desktop.matches) event.preventDefault(); });
const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.d-toc a'));
links.forEach(link => link.addEventListener('click', () => { if (!desktop.matches) toc.open = false; }));
const observer = new IntersectionObserver(entries => {
  const active = entries.find(entry => entry.isIntersecting); if (!active) return;
  links.forEach(link => { const on = link.hash === `#${active.target.id}`; link.classList.toggle('d-is-active', on); if (on) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
}, { rootMargin: '-20% 0px -70% 0px' });
document.querySelectorAll('.d-doc section').forEach(section => observer.observe(section));
