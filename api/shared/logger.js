// @flow

const { createLogger, format, transports } = require('winston')
const { combine, timestamp, printf, label } = format
const serializeError = require('serialize-error')

const { getRelease } = require('./node')
const { LOG_FILE, LOG_LEVEL, LOGGING_LABEL, APP_ENV } = require('./config')

const release = getRelease().substr(0, 7)

let loggingFormat = combine(
  timestamp(),
  label({ app: LOGGING_LABEL, env: APP_ENV, release }),
  format.json({
    replacer: (key, value) => {
      if (value instanceof Buffer) {
        return value.toString('base64')
      } else if (value instanceof Error) {
        return serializeError(value)
      }
      return value
    }
  })
)
const loggingTransports = [new transports.Console()]

if (LOG_FILE) {
  loggingTransports.push(
    new transports.File({
      filename: LOG_FILE,
      level: LOG_LEVEL
    })
  )
}

if (process.env.NODE_ENV === 'development') {
  const logFormat = printf(info => {
    const c = Object.assign({}, info)
    delete c.level
    delete c.message
    delete c.timestamp
    const o = Object.keys(c).length > 0 ? JSON.stringify(serializeError(c)) : ''
    return `${info.level}: ${info.message} ${o}`
  })
  loggingFormat = combine(format.colorize(), timestamp(), logFormat)
}

const logger = createLogger({
  level: LOG_LEVEL,
  format: loggingFormat,
  transports: loggingTransports,
  colorize: true,
  prettyPrint: true
})

logger.onlyInProduction = function (loggerFunc /*: string */ = 'info') {
  Array.prototype.shift.apply(arguments)
  if (process.env.NODE_ENV !== 'development') logger[loggerFunc](...arguments)
}

logger.onlyInDevelopment = function (loggerFunc /*: string */ = 'info') {
  Array.prototype.shift.apply(arguments)
  if (process.env.NODE_ENV === 'development') logger[loggerFunc](...arguments)
}

module.exports = logger
