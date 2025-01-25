console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact' },
    { url: 'resume/', title: 'Resume' },
    { url: 'https://github.com/jih084', title: 'GitHub' },
  ];
  
//step 3.1 Adding the navigation menu

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;

    const ARE_WE_HOME = document.documentElement.classList.contains('home');
    url = !ARE_WE_HOME && !url.startsWith('http') ? '../' + url : url;

    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;

//step 3.2  Highlighting the current page and opening external links in a new tab

    a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname
    );
    
    a.toggleAttribute('target', a.host !== location.host);
    if (title === 'GitHub') {
      a.target = '_blank';
    }

    nav.append(a);
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

//4.4
const select = document.querySelector('.color-scheme select');

select.addEventListener('input', function (event) {
  document.documentElement.style.setProperty('color-scheme', event.target.value);
});


//4.5
function setColorScheme(scheme) {
  document.documentElement.style.setProperty('color-scheme', scheme);
  select.value = scheme;
}

select.addEventListener('input', function (event) {
  const scheme = event.target.value;
  localStorage.colorScheme = scheme;
  setColorScheme(scheme);
});

const savedScheme = localStorage.colorScheme || 'light dark';
setColorScheme(savedScheme);

//5 (optional)Better contact form
const form = document.querySelector('form');

form?.addEventListener('submit', (event) => {
  event.preventDefault();

  const data = new FormData(form);

  let url = form.action + '?';

  for (let [name, value] of data) {
    url += `${name}=${encodeURIComponent(value)}&`;
  }

  url = url.slice(0, -1);

  location.href = url;
});
