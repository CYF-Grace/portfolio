console.log('IT’S ALIVE!');

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

const BASE_PATH =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1'
        ? '/'
        : '/portfolio/';

let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact' },
    { url: 'cv/', title: 'CV' },
    { url: 'https://github.com/CYF-Grace', title: 'GitHub' },
];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;

    if (!url.startsWith('http')) {
        url = BASE_PATH + url;
    }

    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;

    if (a.host === location.host && a.pathname === location.pathname) {
        a.classList.add('current');
    }

    if (a.host !== location.host) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
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
  `,
);

let select = document.querySelector('.color-scheme select');

function setColorScheme(colorScheme) {
    document.documentElement.style.setProperty('color-scheme', colorScheme);
    select.value = colorScheme;
}

if ('colorScheme' in localStorage) {
    setColorScheme(localStorage.colorScheme);
}

select.addEventListener('input', function (event) {
    let colorScheme = event.target.value;

    setColorScheme(colorScheme);
    localStorage.colorScheme = colorScheme;

    console.log('color scheme changed to', colorScheme);
});

let form = document.querySelector('form');

form?.addEventListener('submit', function (event) {
    event.preventDefault();

    let data = new FormData(form);
    let params = [];

    for (let [name, value] of data) {
        params.push(
            `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
        );
    }

    let url = form.action + '?' + params.join('&');

    console.log(url);
    location.href = url;
});