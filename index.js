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
	session.on('goaway', console.log)
})
// server.on('request', console.log)


server.on('stream', (stream, headers) => {
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
	
	// stream.respond({
	// 	'content-type': 'text/html',
	// 	':status': 200
	// })
	// stream.end('<h1>Hello World</h1>')
})

server.listen(5000)


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


// import fs from 'fs'
// import http2 from 'http2'

// const server = http2.createSecureServer(
// 	{
// 		key: fs.readFileSync('localhost-privkey.pem'),
// 		cert: fs.readFileSync('localhost-cert.pem')
// 	},
// 	onRequest
// )

// function push(stream, filePath) {
// 	const { file, headers } = getFile(filePath)
// 	const pushHeaders = { [HTTP2_HEADER_PATH]: filePath }

// 	stream.pushStream(pushHeaders, (pushStream) => {
// 		pushStream.respondWithFD(file, headers)
// 	})
// }

// function onRequest(req, res) {
// 	// Push files with index.html
// 	// if (reqPath === '/index.html') {
// 	// 	push(res.stream, 'bundle1.js')
// 	// 	push(res.stream, 'bundle2.js')
// 	// }

// 	// Serve file
// 	res.stream.respondWithFD(file.fileDescriptor, file.headers)
// }

// server.listen(8843)