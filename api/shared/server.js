// @flow

const fs = require('fs')
const helmet = require('helmet')
const morgan = require('morgan')
const spdy = require('spdy')
const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const compression = require('compression')
const timeout = require('connect-timeout')
const logger = require('./logger')
const { ADMIN_USERS } = require('../_shared/config')
const User = require('../_shared/models/User')

const {
  LOG_FORMAT,
  API_CORS_ALLOWED_ORIGINS,
  TLS_KEY_PATH,
  TLS_CERT_PATH,
  TLS_CHAIN_PATH
} = require('./config')

const server = express()
const bodyParserRaw = bodyParser.raw({ type: '*/*' })
const bodyParserJson = bodyParser.json()
server.use(timeout(30000))
server.use(cookieParser())
server.use((
  req /*: express$Request */,
  res /*: express$Response */,
  next /*: express$NextFunction */
) => {
  req.path === '/stripe-webhook' ? bodyParserRaw(req, res, next) : bodyParserJson(req, res, next)
})
server.use(compression())

let ca
if (TLS_CHAIN_PATH && fs.existsSync(TLS_CHAIN_PATH)) ca = TLS_CHAIN_PATH // eslint-disable-line

const httpsServer = spdy.createServer(
  {
    key: fs.readFileSync(TLS_KEY_PATH), // eslint-disable-line
    cert: fs.readFileSync(TLS_CERT_PATH), // eslint-disable-line
    ca: ca,
    honorCipherOrder: true
  },
  server
)

function getRealIp (req /*: express$Request */) {
  let realIp =
    req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress
  // Some proxies will append a list of ip addresses - the "remote ip" is the first in the list
  if (realIp && realIp.indexOf(',') > -1) {
    realIp = realIp.split(',')[0]
  }
  return realIp
}

server.use((
  req /*: express$Request */,
  res /*: express$Response */,
  next /*: express$NextFunction */
) => {
  res.header('Access-Control-Allow-Origin', API_CORS_ALLOWED_ORIGINS)
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  res.header('Access-Control-Expose-Headers', '*')
  res.header('X-Frame-Options', 'SAMEORIGIN')
  res.header('X-XSS-Protection', '1; mode=block')
  res.header('Referrer-Policy', 'same-origin')
  next()
})

server.get('/robots.txt', (req /*: express$Request */, res /*: express$Response */) => {
  res.setHeader('Cache-Control', 'public, max-age=604800')
  res.setHeader('Content-Type', 'text/plain')
  res.send('User-Agent: *\nDisallow: /\n')
})

server.disable('x-powered-by')

morgan.token('remote-addr', getRealIp)
morgan.token('url', function (req) {
  return escape(req.path)
})
morgan.token('userid', function (req) {
  return req.user || '-'
})

// Dont spam the logs with healthcheck messages
function skipHealthcheckLogs (req, res) {
  return (req.path === '/health' || req.path === '/healthz') && res.statusCode === 200
}

server.use(morgan(LOG_FORMAT, { skip: skipHealthcheckLogs }))

if (process.env.NODE_ENV !== 'development') {
  server.use(
    helmet.hsts({
      maxAge: 31536000000, // One year
      includeSubdomains: true,
      force: true
    })
  )
}

function requireAccessToken (
  req /*: express$Request */,
  res /*: express$Response */,
  next /*: express$NextFunction */
) {
  const { accessToken } = req.cookies
  // Token validation rule is based on an assumption that github's access token
  // length will remain around the same (currently 40 characters).
  if (!accessToken || !/^[a-f0-9]{20,255}$/.test(accessToken)) {
    res.status(401).send({
      error: 'no_access_token',
      error_description: 'Your request did not include an access token'
    })
    return
  }

  next()
}

async function requireAdmin (
  req /*: express$Request */,
  res /*: express$Response */,
  next /*: express$NextFunction */
) {
  // Never cache any admin routes
  res.header('Cache-Control', 'private, no-cache, no-store')
  const user = await User.getPrivateByAccessToken(req.cookies.accessToken)

  if (!user) {
    res.sendStatus(401)
    return
  }

  if (!ADMIN_USERS.includes(user.username)) {
    res.sendStatus(403)
    return
  }

  next()
}

// Note that we _do not call_ next() - this -correctly- sends a 500 forward
// This should be considered a critical error that should _never_ be reached.
// If you are troubleshooting this code being reached in production by bad user input, then
// FIX WHATEVER CONTROLLER REACHED THIS HANDLER!!
// 500s should _never ever_ be a result of bad input, user error, or malicious behavior
// 500s mean _we had an issue_, and we _should never have issues_! :)
function serverErrorHandler (
  err /*: Error|number */,
  req /*: express$Request */,
  res /*: express$Response */,
  next /*: express$NextFunction */
) {
  if (typeof err === 'number' && err !== 500) {
    res.sendStatus(err)
    logger.debug(`serverErrorHandler reached with err status of: ${err}`)
    // $FlowIssue
  } else if (err.type === 'entity.parse.failed') {
    logger.debug('Got invalid JSON!', err)
    res.sendStatus(400)
  } else {
    res.sendStatus(500)
    console.error('Unhandled serverErrorHandler', { err })
    // throw err
  }
}

module.exports = {
  httpsServer,
  server,
  requireAccessToken,
  requireAdmin,
  serverErrorHandler,
  getRealIp
}
