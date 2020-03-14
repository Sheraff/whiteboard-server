import http2 from 'http2'
import http from 'http'
import path from 'path'
import mime from 'mime-types'
import { PUBLIC_ROOT, STYLE_PUSH, SCRIPT_PUSH, SW_PUSH } from './constants.js'
import { CREDENTIALS, HTTPS_PORT, HTTP_PORT, TIMEOUT } from './local.env.js'
import { streamIndex } from './makeIndex.js'



// respond w/ 404 if file doesn't exist
// stream index instead of .end(body)
// named endpoints should respond similarly to index (w/ ≠ pre-fetched graphs and `current` set in <grid-layout>)

const {
	HTTP2_HEADER_PATH,
	HTTP2_HEADER_STATUS,
	HTTP2_HEADER_METHOD,
	HTTP_STATUS_NOT_FOUND,
	HTTP_STATUS_INTERNAL_SERVER_ERROR,
	HTTP2_HEADER_CONTENT_TYPE,
	NGHTTP2_CANCEL,
	NGHTTP2_REFUSED_STREAM,
	HTTP2_METHOD_GET,
} = http2.constants

const server = http2.createSecureServer(CREDENTIALS)

server.on('stream', onStream)

// server.on('session', (session) => {
// 	session.setTimeout(TIMEOUT, () => void session.close(NGHTTP2_CANCEL))
// })

server.listen(HTTPS_PORT)

http.createServer((req, res) => {
	console.log('HTTP 301 redirect')
	res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url })
	res.end()
}).listen(HTTP_PORT)


function onStream(stream, headers) {

	// swallow error b/c abrupt interrupt shouldn't kill server
	stream.on('error', err => void console.log('stream', err))

	if (headers[':method'] !== HTTP2_METHOD_GET)
		return stream.end('♥')

	if (headers[HTTP2_HEADER_PATH] === '/')
		respondWithIndex(stream)
	else if (headers[HTTP2_HEADER_PATH] === '/style.css')
		respondWithPushList(stream, headers, STYLE_PUSH, '/style.css')
	else if (headers[HTTP2_HEADER_PATH] === '/script.js')
		respondWithPushList(stream, headers, SCRIPT_PUSH, '/script.js')
	else if (headers[HTTP2_HEADER_PATH] === '/sw.js')
		respondWithPushList(stream, headers, SW_PUSH, '/sw.js')
	else
		respondWithAnyFile(stream, headers)
}

function respondToStreamError(err, stream) {
	console.log(err);
	// most likely a NGHTTP2_REFUSED_STREAM sent by the client because pushed resource is not needed (already cached)
	if (err.code === 'ENOENT') {
		stream.respond({ [HTTP2_HEADER_STATUS]: HTTP_STATUS_NOT_FOUND });
	} else {
		stream.respond({ [HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR });
	}
	stream.end();
}

function push(stream, filePath) {
	stream.pushStream(
		{ [HTTP2_HEADER_PATH]: filePath }, 
		{ parent: stream.id }, 
		(err, pushStream, headers) => {

			// swallow error b/c abrupt interrupt shouldn't kill server
			pushStream.on('error', err => void console.log('pushStream', err))

			pushStream.respondWithFile(
				path.join(PUBLIC_ROOT, filePath),
				{ [HTTP2_HEADER_CONTENT_TYPE]: mime.lookup(filePath) },
				{ onError: respondToStreamError }
			)
		}
	)
}

// critical path: script.js > Card.js > ReadySVGNode.js > IdlePromise.js
//                                                      > hex2hsl.js
//                          > Grid.js > Routing.js

// SW path: sw.js > Debouncer.js
//                > alphabetCaching.js > alphabet.json
//                > staticImagesCaching.js

async function respondWithPushList(stream, headers, pushList, debugName) {
	console.log(debugName, 'pushing along', stream.pushAllowed)
	if (stream.pushAllowed)
		pushList.forEach(path => push(stream, path))
	respondWithAnyFile(stream, headers)
}

async function respondWithIndex(stream) {
	// in theory, a PUSH_PROMISE should be sent before the response to the request (or at least the push promise header frame)
	// https://developers.google.com/web/fundamentals/performance/http2#push_promise_101

	// pushing resources might benefit from being split up more (for example, sw scripts pushed when sw.js is requested)
	// using `<link preload>` in index.html head will help requesting only what's not in cache (and push associated resources then)

	// Push resources in evaluation-dependence order.

	// if possible, try to push less bytes than available in congestion window (including final stream response)
	// use stream.localWindowSize or stream.remoteWindowSize for this?
	// would require maintining a table of file sizes (built on server startup)

	stream.respond({ 
		[HTTP2_HEADER_STATUS]: 200,
		[HTTP2_HEADER_CONTENT_TYPE]: mime.contentType('text/html') 
	})
	await streamIndex(stream)
	stream.end()
}

function respondWithAnyFile(stream, headers) {
	let requestedPath = decodeURI(headers[HTTP2_HEADER_PATH])
	const { ext, name, dir } = path.parse(requestedPath)

	if(dir === '/static') {
		// TODO: 🚧 this is to prevent crashes, but these requests shouldn't reach the server 🚧
		console.log('requested static', requestedPath)
		stream.respond({ [HTTP2_HEADER_STATUS]: HTTP_STATUS_NOT_FOUND }, { endStream: true })
		return
	}

	if (!ext) {
		const fileName = `graphs_${name}.svg`
		requestedPath = path.join(dir, '/graphs', fileName)
	}
	const fullPath = path.join(PUBLIC_ROOT, requestedPath)
	const responseMimeType = mime.lookup(fullPath)

	stream.respondWithFile(
		fullPath,
		{ [HTTP2_HEADER_CONTENT_TYPE]: responseMimeType },
		{ onError: respondToStreamError }
	)
}