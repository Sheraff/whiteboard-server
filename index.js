import http2 from 'http2'
import fs from 'fs'
import path from 'path'
import mime from 'mime-types'
import { INDEX_PUSH, PUBLIC_ROOT } from './constants.js'
import makeIndex from './makeIndex.js'

const {
	HTTP2_HEADER_PATH,
	HTTP2_HEADER_STATUS,
	HTTP2_HEADER_METHOD,
	HTTP_STATUS_NOT_FOUND,
	HTTP_STATUS_INTERNAL_SERVER_ERROR
} = http2.constants

const server = http2.createSecureServer({
	key: fs.readFileSync('./server/ssl/localhost-privkey.pem'),
	cert: fs.readFileSync('./server/ssl/localhost-cert.pem'),
})

let totalSessionsOpen = 0

server.on('error', (err) => console.error(err))
server.on('session', (session) => {
	console.log('session open', ++totalSessionsOpen)
	session.on('goaway', console.log)
	session.on('error', () => console.log('session error'))
	session.on('frameError', () => console.log('session frameError'))
	session.on('close', () => console.log('session close', --totalSessionsOpen))
	session.on('stream', onStream)
	session.setTimeout(2000)
	session.on('timeout', () => session.close())
})

server.listen(5000)


function onStream(stream, headers) {
	const reqPath = headers[HTTP2_HEADER_PATH] === '/' ? '/index.html' : decodeURI(headers[HTTP2_HEADER_PATH])
	const reqMethod = headers[HTTP2_HEADER_METHOD]

	const fullPath = path.join(PUBLIC_ROOT, reqPath)
	const responseMimeType = mime.lookup(fullPath)

	stream.on('error', console.log)
	stream.on('destroy', console.log)
	
	if(headers[HTTP2_HEADER_PATH] === '/') {
		makeIndex().then(body => {
			stream.respond({
				'content-type': mime.contentType('text/html')
			})
			stream.end(body)
		})
		if(stream.pushAllowed)
			INDEX_PUSH.forEach(path => push(stream, path))
	} else {
		stream.respondWithFile(fullPath, {
			'content-type': responseMimeType
		}, { onError: respondToStreamError })
	}
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
		pushStream.respondWithFile(path.join(PUBLIC_ROOT, filePath), {
			'content-type': mime.lookup(filePath)
		}, { onError: respondToStreamError })
	})
}