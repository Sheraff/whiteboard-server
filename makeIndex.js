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
		<link rel="stylesheet" href="/components/Card.css">
		<slot name="internal-link"></slot>
		<span class="credits">
			<slot name="author"></slot>
			<slot name="external-link"></slot>
		</span>
		<slot name="date"></slot>
		<slot name="static"></slot>
		<slot></slot>
		<slot name="erase"></slot>
	</template>
</div>
`