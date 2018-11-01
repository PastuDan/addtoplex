const logger = require('./shared/logger')
const { fetchMovie } = require('./shared/ptp')

module.exports = async function movieHandler(req, res) {
  const id = parseInt(req.params.id, 10)

  let movie = {}
  try {
    movie = await fetchMovie(id)
  } catch (err) {
    logger.error('searchHandler() Movie request error', {
      errMsg: err.message,
      code: err.statusCode
    })
    return res.sendStatus(500)
  }

  res.send(movie)
}
