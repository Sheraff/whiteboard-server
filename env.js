import fs from 'fs'

const key = fs.readFileSync('/etc/letsencrypt/live/v2.whiteboard-comics.com/privkey.pem', 'utf8')
const cert = fs.readFileSync('/etc/letsencrypt/live/v2.whiteboard-comics.com/cert.pem', 'utf8')
const ca = fs.readFileSync('/etc/letsencrypt/live/v2.whiteboard-comics.com/chain.pem', 'utf8')

export const CREDENTIALS = { key, cert, ca }

export const HTTPS_PORT = 443
export const HTTP_PORT = 80
export const TIMEOUT = 4000