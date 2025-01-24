console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// 2.1
let navLinks = $$("nav a");

//2.2
let currentLink = navLinks.find(
    (a) => a.host === location.host && a.pathname === location.pathname
  );

//2.3
currentLink?.classList.add('current');
