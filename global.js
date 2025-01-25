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
    a.target = '_blank';


    nav.append(a);
}

