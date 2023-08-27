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
				set_up_fun()
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
		// e.preventDefault()
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




/* GRAPH STUFF */
/* This part of codes build a funny combination of multiple photos and you can drag them for fun */

const images = [
	"221024uva.webp",
	"221020uva.webp",
	"221018southlawn.webp",
	"220909uva.webp",
	"220901xbox.webp"
].map(x => `media/node_images/${x}`)

// up is the Y, -90 move to bot, +90 move to top
// over is the X, -90 move to right, +90 moves to left
// It is coordinate system
// Zero point is the top left corner of an image
const nodes = [
	// a在最下，b在左上，c在右上
	{ id: "a", height: 700, x: 1000, y: 0, up: '-10%', over: '-90%' },
	{ id: "b", height: 700, x: -1000, y: -1300, up: '-90%', over: '-90%' },
	{ id: 'c', height: 700, x: 1000, y: -1800, up: '-10%', over: '-20%' },
	// { id: 'd', height: 400, x: 300, y: 300, up: '-10%', over: '-60%' },
	// { id: "e", height: 280, x: 100, y: -200, up: '-15%', over: '-80%' },
	// { id: "f", height: 280, x: -200, y: 200, up: '-10%', over: '-90%' },
	// { id: "g", height: 280, x: 0, y: 400, up: '-5%', over: '-85%' },
]

const links = [
	{ source: "a", target: "b", distance: 800, thick: 8, xShift: -33, back_dx: -30, back_dy: 0 },
	{ source: "b", target: "c", distance: 700, thick: 8, xShift: 33, back_dx: -30, back_dy: 0 },
	// { source: "a", target: "c", distance: 800, thick: 8, xShift: 25, back_dx: -20, back_dy: 0 },
	// { source: "a", target: "e", distance: 500, thick: 6, xShift: 25, back_dx: -20, back_dy: 0 },
	// { source: "f", target: "e", distance: 400, thick: 6, xShift: -15, back_dx: -10, back_dy: 0 },
	// { source: "e", target: "g", distance: 400, thick: 6, xShift: 15, back_dx: 10, back_dy: 0 },
]

Array.prototype.rande = function () {
	return this[Math.floor(Math.random() * this.length)]
}

// may explode
Array.prototype.randes = function (n) {
	const res = new Set()
	while (res.size < n) res.add(this.rande())
	return [...res]
}

// i copy and pasted this from some demo
function drag(simulation) {
	function dragstarted(event) {
		if (!event.active) simulation.alphaTarget(0.3).restart();
		event.subject.fx = event.subject.x;
		event.subject.fy = event.subject.y;
	}

	function dragged(event) {
		event.subject.fx = event.x;
		event.subject.fy = event.y;
	}

	function dragended(event) {
		if (!event.active) simulation.alphaTarget(0);
		event.subject.fx = null;
		event.subject.fy = null;
	}

	return d3.drag()
		.on("start", dragstarted)
		.on("drag", dragged)
		.on("end", dragended);
}

const change_images = _ => {
	const imgs = images.randes(nodes.length)
	for (let i = 0; i < imgs.length; i += 1) {
		nodes[i].img = imgs[i]
	}
}

change_images()

document.querySelector('#name').addEventListener('click', _ => {
	if (curr_short === 'index')
		change_images()
})

let floati = 0

function set_up_fun() {
	// note: should be here rn.
	document.querySelector('#content').classList.add('index-content')

	const forceNode = d3.forceManyBody().strength(-Math.sin(floati) * (770 + Math.random() * 4))

	const forceLink = d3.forceLink(links)
		.distance(x => x.distance)
		.id(x => x.id)

	const forceCenter = d3.forceCenter().strength(.05)


	const simulation = d3.forceSimulation(nodes)
		.force("link", forceLink)
		.force("charge", forceNode)
		.force("center", forceCenter)
		.on("tick", ticked)
		.alphaDecay(.001)
		.alpha(.25)
		.alphaTarget(0)


	const svg = d3.select('#fun')

	const linkBACK = svg.append("g")
		.attr('stroke', '#000')
		.attr("stroke-linecap", 'round')
		.selectAll("line")
		.data(links)
		.join("line")
		.attr("stroke-width", x => x.thick)

	set_interval = setInterval(_ => {
		forceNode.strength(-Math.sin(floati) * (770 + Math.random() * 7))
		forceCenter.strength(0.05 + 0.008 * Math.random())
		simulation.alpha(0.25)
		floati += 0.15
	}, 200)

	const umm = svg.selectAll('image')
		.data(nodes)
		.join(enter => enter.append("svg:image")
			.attr('xlink:href', x => x.img)
			.attr('height', d => d.height)
			.style('position', 'absolute')
			.style('top', '100%')
			.style('left', '50%')
			.style('transform-box', 'fill-box')
			.style('transform', x => `translate(${x.over}, ${x.up})`)
			, update => update, exit => exit.remove())
		.call(drag(simulation))

	const link = svg.append("g")
		.attr('stroke', '#000')
		.attr("stroke-linecap", 'round')
		.selectAll("line")
		.data(links)
		.join("line")
		.attr("stroke-width", x => x.thick);

	function ticked() {
		umm.attr("x", d => d.x)
		umm.attr("y", d => d.y)
			.attr('xlink:href', x => x.img)

		link
			.attr("x1", d => d.source.x + d.xShift)
			.attr("y1", d => d.source.y)
			.attr("x2", d => d.target.x + d.xShift)
			.attr("y2", d => d.target.y);

		linkBACK
			.attr("x1", d => d.source.x + d.back_dx + d.xShift)
			.attr("y1", d => d.source.y + d.back_dy)
			.attr("x2", d => d.target.x + d.back_dx + d.xShift)
			.attr("y2", d => d.target.y + d.back_dy)
	}

}

if (curr_short === 'index') set_up_fun()
