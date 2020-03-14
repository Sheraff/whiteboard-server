import { PUBLIC_ROOT } from './constants.js'
import path from 'path'
import fs from 'fs'

const NUMBER_OF_FULL_GRAPHS = 20

export default async function makeIndex() {
	return pageTemplate(await makeBody())
}

// TODO: use stream.write() to continuously output to stream instead of outputing in one single block with stream.end()

async function makeBody() {
	const folder = path.join(PUBLIC_ROOT, '/graphs')
	const dataFile = path.join(PUBLIC_ROOT, '/data/graph_list.tsv')
	const tsv = fs.readFileSync(dataFile, 'utf8')
	const data = tsvToJson(tsv)

	const now = Date.now()

	return await Promise.all(data.reverse().map(async (graph, index) => {
		if (new Date(graph.release) < now) {

			if(index > NUMBER_OF_FULL_GRAPHS)
				return cardTemplate(graph)
			
			const file = path.join(folder, `/graphs_${graph.name}.svg`)
			const svg = await readFilePromise(file, 'utf8')
			return cardTemplate(graph, svg)
		}
	})).then(results => results.join(''))
}

function readFilePromise(path, options) {
	return new Promise((resolve, reject) => {
		fs.readFile(path, options, (err, data) => {
			if (err) reject(err)
			resolve(data)
		})
	})
}

function tsvToJson(tsv) {
	const array = tsv.split('\n')
	const headers = array.shift().split('\t')
	return array.map(item => {
		const json = {}
		item.split('\t').forEach((point, i) => json[headers[i]] = point)
		return json
	})
}

const cardTemplate = (graph, svg) => `
<svg-card name="${graph.name}" tags="${graph.tags}">
	<a slot="internal-link" href="/${graph.name}"></a>
	${graph.author ? `
		<span class="credits">
			<span slot="author">${graph.credit}</span>
			<a slot="external-link" href="${graph.source}">${graph.author}</a>
		</span>
	` : ''}
	<span slot="date">${graph.release}</span>
	${svg || ''}
</svg-card>
`

const pageTemplate = (body) => `
<!DOCTYPE html>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#AD123C">
<title>Whiteboard Comics</title>
<script src="script.js" type="module"></script>
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Permanent+Marker&display=block">
<link rel="manifest" href="/manifest.json">

<link rel="apple-touch-icon" sizes="57x57" href="/icons/apple-icon-57x57.png">
<link rel="apple-touch-icon" sizes="60x60" href="/icons/apple-icon-60x60.png">
<link rel="apple-touch-icon" sizes="72x72" href="/icons/apple-icon-72x72.png">
<link rel="apple-touch-icon" sizes="76x76" href="/icons/apple-icon-76x76.png">
<link rel="apple-touch-icon" sizes="114x114" href="/icons/apple-icon-114x114.png">
<link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-icon-120x120.png">
<link rel="apple-touch-icon" sizes="144x144" href="/icons/apple-icon-144x144.png">
<link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-icon-152x152.png">
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-icon-180x180.png">
<link rel="icon" type="image/png" sizes="192x192"  href="/icons/android-icon-192x192.png">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="96x96" href="/icons/favicon-96x96.png">
<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png">

<header>
	<h1>Whiteboard Comics</h1>
</header>
<nav>
	<ol>
		<li><a href="">previous</a></li>
		<li><a href="">next</a></li>
	</ol>
</nav>

<grid-layout>
	${body}
</grid-layout>

<div id="dom-tricks">
	<template id="svg-card">
		<div class="background"></div>
		<link rel="stylesheet" href="/components/Card.css">
		<slot name="internal-link"></slot>
		<span class="credits">
			<slot name="author"></slot>
			<slot name="external-link"></slot>
		</span>
		<slot name="date"></slot>
		<div class="containment">
			<slot name="static"></slot>
			<slot></slot>
			<slot name="erase"></slot>
		</div>
	</template>
</div>
`