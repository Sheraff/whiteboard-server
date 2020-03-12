import http2 from 'http2'
import fs from 'fs'
import path from 'path'
import mime from 'mime-types'
import { INDEX_PUSH, PUBLIC_ROOT } from './constants.js'
import makeIndex from './makeIndex.js'

const PORT = 5000
const TIMEOUT = 4000

const {
	HTTP2_HEADER_PATH,
	HTTP2_HEADER_STATUS,
	HTTP2_HEADER_METHOD,
	HTTP_STATUS_NOT_FOUND,
	HTTP_STATUS_INTERNAL_SERVER_ERROR,
	NGHTTP2_CANCEL,
} = http2.constants

const server = http2.createSecureServer({
	key: fs.readFileSync('./server/ssl/localhost-privkey.pem'),
	cert: fs.readFileSync('./server/ssl/localhost-cert.pem'),
})

server.on('session', (session) => {
	session.on('stream', onStream)
	session.setTimeout(TIMEOUT, () => void session.close(NGHTTP2_CANCEL))
})

server.listen(PORT)


function onStream(stream, headers) {
	stream.on('error', err => void console.log('stream', err))

	if(headers[HTTP2_HEADER_PATH] === '/')
		respondWithIndex(stream)
	else
		respondWithAnyFile(stream, headers)
}

function respondToStreamError(err, stream) {
	console.log(err);
	if (err.code === 'ENOENT') {
		stream.respond({ [HTTP2_HEADER_STATUS]: HTTP_STATUS_NOT_FOUND });
	} else {
		stream.respond({ [HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR });
	}
	stream.end();
}

function push(stream, filePath) {
	stream.pushStream({ [HTTP2_HEADER_PATH]: filePath }, { parent: stream.id }, (err, pushStream, headers) => {
		pushStream.on('error', err => void console.log('pushStream', err))
		pushStream.respondWithFile(path.join(PUBLIC_ROOT, filePath), {
			'content-type': mime.lookup(filePath)
		}, { onError: respondToStreamError })
	})
}

function respondWithIndex(stream) {
	makeIndex().then(body => {
		stream.respond({
			'content-type': mime.contentType('text/html')
		})
		stream.end(body)
	})
	if(stream.pushAllowed)
		INDEX_PUSH.forEach(path => push(stream, path))
}

function respondWithAnyFile(stream, headers) {
	let requestedPath = decodeURI(headers[HTTP2_HEADER_PATH])
	if(!requestedPath.includes('.')) {
		const bits = requestedPath.split('/')
		const fileName = `graphs_${bits.pop()}.svg`
		requestedPath = path.join(...bits, '/graphs', fileName)
	}
	const fullPath = path.join(PUBLIC_ROOT, requestedPath)
	const responseMimeType = mime.lookup(fullPath)

	stream.respondWithFile(fullPath, {
		'content-type': responseMimeType
	}, { onError: respondToStreamError })
}