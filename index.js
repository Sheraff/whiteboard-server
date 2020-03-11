import http2 from 'http2'
import fs from 'fs'
import path from 'path'
import mime from 'mime-types'
import { INDEX_PUSH } from './constants.js'

const {
	HTTP2_HEADER_PATH,
	HTTP2_HEADER_STATUS,
	HTTP2_HEADER_METHOD,
	HTTP_STATUS_NOT_FOUND,
	HTTP_STATUS_INTERNAL_SERVER_ERROR
} = http2.constants

const serverRoot = "./public"

const server = http2.createSecureServer({
	key: fs.readFileSync('./server/ssl/localhost-privkey.pem'),
	cert: fs.readFileSync('./server/ssl/localhost-cert.pem'),
})
server.on('error', (err) => console.error(err))
server.on('session', (session) => {
	console.log('session open')
	session.on('goaway', console.log)
	session.on('close', () => console.log('session close'))
	session.on('stream', onStream)
})

server.listen(5000)


function onStream(stream, headers) {
	const reqPath = headers[HTTP2_HEADER_PATH] === '/' ? '/index.html' : decodeURI(headers[HTTP2_HEADER_PATH])
	const reqMethod = headers[HTTP2_HEADER_METHOD]

	const fullPath = path.join(serverRoot, reqPath)
	const responseMimeType = mime.lookup(fullPath)

	stream.respondWithFile(fullPath, {
		'content-type': responseMimeType
	}, {
		onError: (err) => respondToStreamError(err, stream)
	})
	
	if(headers[HTTP2_HEADER_PATH] === '/') {
		INDEX_PUSH.forEach(path => push(stream, path))
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
		pushStream.respondWithFile(path.join(serverRoot, filePath), {
			'content-type': mime.lookup(filePath)
		}, {
			onError: (err) => {
				respondToStreamError(err, pushStream);
			}
		});
	});
}