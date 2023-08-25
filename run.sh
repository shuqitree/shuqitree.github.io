#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

import * as csso from './csso.esm.js'
import { md2json } from './md2json.js'
import { generate_site } from './json2site.js'

const minify_css = async _ => {
	const css = await Deno.readTextFile('site.css')
	await Deno.writeTextFile('docs/style.css', csso.minify(css).css + '\n')
	console.log('wrote minified css to docs/style.css')
}

const dosite = async _ => {
	const md = await(Deno.readTextFile('site.md'))
	const json = await md2json(md)

	// Generate the json file for debug
  await Deno.writeTextFile('docs/json/site_intermediate.json', JSON.stringify(json, null, 2));
  console.log('Saved intermediate JSON to docs/site_intermediate.json');

	return generate_site(json)
}

await Promise.all([minify_css(), dosite()])

// Modify all html file into a tidy format
const files = await Deno.readDir("docs");

for await (const file of files) {
  if (file.name.endsWith(".html")) {
    const p = Deno.run({
      cmd: ["tidy", "-m", "-i", `docs/${file.name}`],
    });
    await p.status();
  }
}

// This file is actually a Deno script