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
  const filePath = `docs/${file.name}`;
  if (file.name.endsWith(".html")) {
    const p = Deno.run({
      cmd: [
        "tidy", 
        "-m", 
        "-i", 
        "--indent", 
        "auto", 
        "--indent-spaces", 
        "4", 
        "--tidy-mark", 
        "n", 
        "--vertical-space", 
        "y",
        "--wrap",
        "100",
        "--quote-ampersand", // 强制转义 `&`
        "--quote-marks",     // 属性值强制使用引号
        "--quote-nbsp",      // 转义不间断空格为 `&nbsp;`
        `docs/${file.name}`
      ],
    });
    await p.status();
  }

  if (file.name.endsWith(".css") || file.name.endsWith(".json")) {
    const p = Deno.run({
      cmd: [
        "prettier",
        "--write",
        `docs/${file.name}`
      ],
    });
    await p.status();
  }
}


// This file is actually a Deno script