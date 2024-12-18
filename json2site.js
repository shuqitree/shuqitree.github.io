#!/usr/bin/env -S deno run --allow-write --allow-run

const ISIN = (...groups) => group => groups.includes(group)
// str (group) => bool
const IS_FILM = ISIN('photography', 'narrative', 'experimental', 'photography')
const IS_PHOTOGRAPHY = ISIN('photography')
const IS_SINGLE = ISIN('about')
const IS_WRITING = ISIN('writing')

Array.prototype.to_h = function () { return Object.fromEntries(this) }
Object.prototype.to_a = function () { return Object.entries(this) }

const pandoc_markdown = async md => {
	const p = Deno.run({ cmd: ['pandoc'], stdout: 'piped', stdin: 'piped' })
	await p.stdin.write(new TextEncoder().encode(md))
	await p.stdin.close()
	const out = await p.output()
	p.close();
	return new TextDecoder().decode(out)
}

const PAGEGEN =
	[[IS_FILM, (html, { title, yt, md, date, stills }) => {
		const yt_disp = yt
			? `<iframe class=film-yt src="https://www.youtube.com/embed/${yt}" title="YouTube player for ${title}" frameborder=0 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`
			: ''
		const stills_disp = stills.length === 0
			? ''
			: `<div class=stills>${stills.map(src => `<img class=still src='${src}'>`).join('')}</div>`

		return `<div class=film-intro><h2 class=film-title>${title}</h2><div class=film-medium>${md}</div>${html}</div>`
			+ `<span class=story-date>${date}</span>` + yt_disp + stills_disp 
	}]
		, [IS_PHOTOGRAPHY, (html, { title, stills }) => {
			const stills_disp = stills.length === 0
				? ''
				: `<div class=stills>${stills.map(src => `<img class=still src='${src}'>`).join('')}</div>`

			return `<div class=photography-intro><h2 class=photography-title>${title}</h2>${html}</div>`
				+ stills_disp
		}]
		, [IS_WRITING, async (html, { title, date, writing }) => {
			if (!writing) throw `writing has no writing: ${title}`
			const writing_content = await pandoc_markdown(writing)
			return `<div class=story>
		<h2>${title}</h2>
		<span class=story-date>${date}</span>
		<hr>${writing_content}</div>`
		}]
		, [g => g === 'about', (html, { title }) => `<div><h2>${title}</h2></div>${html}`]
		, [g => g === 'index', (html) => html]
	]

const page2page = async p => {
	const html = await pandoc_markdown(p.content)

	const gen = PAGEGEN.find(([pred]) => pred(p.group))

	if (!gen) throw `no generator for group: ${p.group}`

	const [, f] = gen

	return f(html, p)
}

// normal form for links
const short2path = short => short === 'index'
	? '.' // so you can host in a folder if you want
	: `${short}`

// generate nav for `curr` page
const navstuff = ({ pages, navs }) => curr => navs.map(g => {
	if (g === 'index') return null

	if (IS_SINGLE(g)) {
		const page = pages.find(({ group }) => g === group)
		return `<a short='${page.short}' href='${short2path(page.short)}'${page.short === curr.short ? ' class=current-page' : ''}>${g}</a>` // alert: bad hack
	}

	// The details are only open when you browsing current page
	// return `<details group='${g}'${g === curr.group ? ' open' : ' open'}>
	// Keep the detail always open
	return `<details group='${g}'${g === curr.group ? ' open' : ' open'}>
		<summary>${g}</summary>
		<ul>
		${pages.filter(({ group }) => g === group)
			.map(({ sidebar, title, short, md, stills }) => {
				const thumbnail = md
					? `<img class=thumb src='${stills[0]}'>`
					: ''
				return `<li><a short='${short}' class='${curr.short === short ? 'current-page ' : ''}title' href='${short2path(short)}'>
					${thumbnail}
					<span class=title-searchable group=${g} title="${sidebar ?? title}">${sidebar ?? title}</span>
				</a>`
			})
			.join('')}
		</ul>
	</details>`
}).filter(x => x).join('')

const page2ogdescription = p => {
	const { group } = p
	// if (group === 'experimental')
	// 	return `An experimental film by Shuqi Jiang`
	// if (group === 'narrative')
	// 	return `A narrative film by Shuqi Jiang`
	if (group === 'photography')
		return `A series of photos taken by Shuqi Jiang`
	else
		throw `page2description error: ${JSON.stringify(p)}`
}

// { ...page, page } => string
const to_html = site => p => `<!DOCTYPE html>
<html>

<head>
	<script async src="https://www.googletagmanager.com/gtag/js?id=G-5RJJVBLRBV"></script>
	<script> window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-5RJJVBLRBV'); </script>

	<title>${p.short === 'index' ? "Shuqi's Forest" : p.title}</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta charset="UTF-8">

	${!IS_FILM(p.group) && !IS_PHOTOGRAPHY(p.group) ? `` : `<meta property='og:title' content="${p.title /* NOTE: double quoted */}" />
	<meta property='og:description' content="${page2ogdescription(p)}" />
	<meta property='og:image' content="https://shuqitree.github.io/${p.stills[0]}" />`}

	<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
	<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
	<link rel="icon" type="ico" href="/favicon.ico">

	<link rel=stylesheet href=style.css>
</head>

<body>
    <img id="watermark" src="logo.png" alt="Shuqi's Logo">
</body>

<body>
	<div id=header>
		<nav>
			<a short=index id=name href=${short2path('index')}${p.short === 'index' ? ' class=current-page' : ''}>Shuqi Jiang</a>
			<input id=search type=text placeholder=search autocomplete=off hidden>
			<div id="dynamicText">All photographs are taken with my camera<span id="cursor"></span></div>
			<script src="./js/cameraText.js" defer></script>
			${navstuff(site)(p)}
		</nav>

		<div id="clustrmaps-container">
      <script type="text/javascript" id="clstr_globe"
        src="//clustrmaps.com/globe.js?d=PCSZy7iScpHn6ahiRsdRNiI01uSCxiXLNSP_9VRszwc">
        </script>
    </div>
	</div>

	<div id=content${p.short === 'index' ? ' class=index-content' : ''}>
		${p.page}
	</div>
</body>

<script>const short_base = '${p.short}'</script>

<script src="./js/d3.v7.min.js"></script>
<script src="./js/d3-dispatch@3.js"></script>
<script src="./js/d3-quadtree@3.js"></script>
<script src="./js/d3-timer@3.js"></script>
<script src="./js/d3-force@3.js"></script>
<script src="./js/script.js"></script>
<script src="./js/treeSimulator.js"></script>

</html>
`

const generate_site = async pages => {
	// all groups across all pages
	const navs = [...new Set(pages.map(x => x.group))]

	const generated = await Promise.all(
		pages.map(async p => ({ ...p, page: await page2page(p) }))
	)

	const dynamic = generated
		.map(({ short, title, page, group }) => [short, { title, page, group }])
		.to_h()

	const describe = async (x, y) => {
		await Deno.writeTextFile(x, y)
		return `wrote to ${x} (${y.length} chars)`
	}

	const output = [
		...await Promise.all(generated.map(p => describe(`docs/${p.short}.html`, to_html({ pages, navs })(p)))),
		await describe('docs/site.json', JSON.stringify(dynamic)),
	]

	console.log(output.join('\n'))

	console.log('OK')
}

export { generate_site }
