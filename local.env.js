import fs from 'fs'

const key = fs.readFileSync('./server/ssl/privkey.pem')
const cert = fs.readFileSync('./server/ssl/fullchain.pem')

export const CREDENTIALS = { key, cert }

export const HTTPS_PORT = 5000
export const HTTP_PORT = 5001
export const TIMEOUT = 10000