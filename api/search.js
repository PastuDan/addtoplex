const logger = require('./shared/logger')
const { search, fetchMovie } = require('./shared/ptp')

module.exports = async function searchHandler(req, res) {
  const { query } = req.params

  let results = []
  try {
    results = await search(query)
  } catch (err) {
    if (err.statusCode === 429) {
      res.sendStatus(429)
    }

    logger.error('searchHandler() Search request error', { errMsg: err.message })
    return res.sendStatus(500)
  }

  try {
    const fetchers = results.map(({ id }) => fetchMovie(id, { cacheOnly: true }))
    const movies = await Promise.all(fetchers)

    results = results.map((result, i) => Object.assign(result, movies[i]))
  } catch (err) {
    logger.error('searchHandler() Error merging movie cache', { errMsg: err.message })
    return res.sendStatus(500)
  }

  res.send(results)
}
