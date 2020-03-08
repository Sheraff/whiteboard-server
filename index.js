import http2 from 'http2'
import fs from 'fs'
import path from 'path'
import mime from 'mime-type'

const {
	HTTP2_HEADER_PATH,
	HTTP2_HEADER_METHOD,
	HTTP_STATUS_NOT_FOUND,
	HTTP_STATUS_INTERNAL_SERVER_ERROR
} = http2.constants

const serverRoot = "./"

const server = http2.createSecureServer({
	key: fs.readFileSync('localhost-privkey.pem'),
	cert: fs.readFileSync('localhost-cert.pem')
})
server.on('error', (err) => console.error(err))
server.on('connect', console.log)
server.on('ping', console.log)


server.on('stream', (stream, headers) => {
	const reqPath = headers[HTTP2_HEADER_PATH]
	const reqMethod = headers[HTTP2_HEADER_METHOD]

	const fullPath = path.join(serverRoot, reqPath)

	console.log(fullPath)

	stream.respondWithFile(fullPath, {
	}, {
		onError: (err) => respondToStreamError(err, stream)
	});

	// stream.respond({
	// 	'content-type': 'text/html',
	// 	':status': 200
	// })
	// stream.end('<h1>Hello World</h1>')
})

server.listen(8443)


function respondToStreamError(err, stream) {
	console.log(err);
	if (err.code === 'ENOENT') {
		stream.respond({ ":status": HTTP_STATUS_NOT_FOUND });
	} else {
		stream.respond({ ":status": HTTP_STATUS_INTERNAL_SERVER_ERROR });
	}
	stream.end();
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