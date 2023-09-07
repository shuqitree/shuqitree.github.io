// { short: { title, page, group } }
const json = fetch('./site.json').then(r => r.json())

const SEARCH = document.querySelector('#search')
const CONTENT = document.querySelector('#content')
const DETAILS = [...document.querySelectorAll('details')]
const NAVAS = [...document.querySelectorAll('nav a')]

let set_interval = false // index floaty animation

let curr_short = short_base

// enforce one category open at a time
DETAILS.forEach((d, i) => {
	d.addEventListener('click', e => {
		if (e.target.tagName !== 'SUMMARY') return
		const should_be_open_now = !e.target.parentElement.open

		if (!should_be_open_now)
			DETAILS.forEach(x => x.open = false)
		else
			DETAILS.forEach((x, j) => x.open = i === j)

		e.preventDefault()
	})
})

// dynamically display page content from short code
const display = short =>
	json.then(j => {
		CONTENT.style.transition = 'opacity ease-in 0.1s'
		CONTENT.style.opacity = 0

		CONTENT.addEventListener('transitionend', e => {
			document.title = j[short].title
			CONTENT.innerHTML = j[short].page
			if (short === 'index') {
				treeSimulation()
			} else {
				document.querySelector('#content').classList.remove('index-content')
			}

			CONTENT.style.transition = 'opacity ease-in 0.15s'
			CONTENT.style.opacity = 1
		}, { once: true })
	})

// override nav links with dynamic page load
for (const a of NAVAS) {
	a.onclick = e => {
		const short = a.getAttribute('short')
		json.then(j => {
			// close unnecessary open groups
			DETAILS.forEach(d => d.open = d.getAttribute('group') === j[short].group)

			// update .current-page (before page fade in and out)
			document.querySelectorAll('.current-page').forEach(e => e.classList.remove('current-page'))
			NAVAS.find(a => a.getAttribute('short') === short).classList.add('current-page') // css selector ok?
		})
		if (curr_short !== short) {
			if (set_interval !== false) {
				clearInterval(set_interval)
				set_interval = false
			}
			clear_search()
			display(short).then(_ => history.pushState({ short }, '', a.href))
			curr_short = short
		}
		e.preventDefault()
	}
}

// handle browser back button
window.addEventListener('popstate', e => display(e.state?.short ?? short_base))

/* SEARCH STUFF */
function clear_search() {
	SEARCH.value = ''
	// this is probably doing this duplicate in some cases but oh well?.
	json.then(j => {
		DETAILS.forEach(d => d.open = d.getAttribute('group') === j[curr_short].group)
	})

	for (const e of document.querySelectorAll('.title-searchable')) {
		e.innerText = e.getAttribute('title')
	}


}

SEARCH.addEventListener('focusout', _ => {
	// by default retain search results (esp bc if u want to click on them it might close before u can click on them)
	// but if there are no open search results open the current page group
	if (!DETAILS.some(d => d.open)) {
		json.then(j => {
			DETAILS.forEach(d => d.open = d.getAttribute('group') === j[curr_short].group)
		})
	}
})

SEARCH.addEventListener('input', _ => {
	if (SEARCH.value === '') {
		clear_search()
		return
	}
	const term = new RegExp(SEARCH.value, 'i')
	const active_groups = new Set()
	for (const e of document.querySelectorAll('.title-searchable')) {
		const match = e.getAttribute('title').match(term)
		if (!match) {
			if (e.getAttribute('title') !== e.innerHTML)
				e.innerHTML = e.getAttribute('title')
			continue
		}
		active_groups.add(e.getAttribute('group'))
		e.innerHTML = e.getAttribute('title').replace(term, '<mark>$&</mark>')
	}
	DETAILS.forEach(d => d.open = active_groups.has(d.getAttribute('group')))
})