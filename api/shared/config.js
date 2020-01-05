// @flow

const { getRelease } = require('./node')
const release = getRelease().substr(0, 7)

// Parses a string of URIs like: "host:port,host:port..."
// into an array of objects like: [ { host: "host", port: "port" }]
function parseUris(urisStr /*: any */) /*: Array<{ host: string, port: number }> */ {
  if (typeof urisStr !== 'string') return []
  const uris = urisStr.split(',')
  const out = []
  for (let i = 0; i < uris.length; i++) {
    const [host, port] = uris[i].split(':')
    out.push({ host, port: parseInt(port, 10) })
  }
  return out
}

const APP_ENV = process.env.APP_ENV || 'local'
const LOGGING_LABEL = process.env.LOGGING_LABEL || 'addtoplex'

const config = {
  // HTTPS Server configuration
  TLS_KEY_PATH: process.env.TLS_KEY_PATH || `${process.cwd()}/secrets/selfsigned.key.pem`,
  TLS_CERT_PATH: process.env.TLS_CERT_PATH || `${process.cwd()}/secrets/selfsigned.crt.pem`,
  TLS_CHAIN_PATH: process.env.TLS_CHAIN_PATH,
  API_CORS_ALLOWED_ORIGINS: process.env.API_CORS_ALLOWED_ORIGINS || '',
  // HTTPS Access logging format
  LOG_FORMAT: `{"type":"ACCESS","date":":date[iso]","addr":":remote-addr","status":":status","method":":method","path":":url","responseTime"::response-time,"length":":res[content-length]","user":":userid","agent":":user-agent","app": "${LOGGING_LABEL}", "env": "${APP_ENV}", "release":"${release}"}`,

  // Logging configuration
  LOG_FILE: process.env.LOG_FILE,
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  LOGGING_LABEL,
  APP_ENV,

  // Redis configuration
  REDIS_CACHE_SERVERS: parseUris(process.env.REDIS_CACHE_URIS),
  REDIS_RATELIMIT_SERVERS: parseUris(process.env.REDIS_RATELIMIT_URIS),

  // Tracker config
  PTP_HEADERS: {
    'user-agent': 'Mozilla/5.0 AppleWebKit/537.36 AddToPlex/1.0.0 Safari/537.36',
    accept: '*/*',
    referer: 'https://passthepopcorn.me',
    authority: 'passthepopcorn.me',
    cookie: process.env.PTP_COOKIE || 'null'
  },

  BTN_HEADERS: {},

  API_SHUTDOWN_TIMEOUT: parseInt(process.env.API_SHUTDOWN_TIMEOUT, 10) || 1
}

if (process.env.NODE_ENV === 'development') {
  config.LOG_FORMAT =
    '{"access":":date[iso] :remote-addr :status :method :url :response-time :res[content-length] :userid"}'
}

module.exports = config
