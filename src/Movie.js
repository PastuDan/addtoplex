import React, { Component } from 'react'
import './Movie.css'
import { CircleNotch, Star } from './icons'

const posterRegex = /ptpimg\.me\/view\/[0-9a-f]+\/(.*)+/i

class Movie extends Component {
  state = {
    torrents: this.props.torrents,
    rating: this.props.rating,
    poster: this.props.poster,
    fetching: false
  }

  componentDidMount() {
    if (this.props.prefetchMetadata) {
      window.setTimeout(this.recheckThenFetch, 1000)
    }
  }

  componentDidUpdate() {
    if (this.props.prefetchMetadata) {
      window.setTimeout(this.recheckThenFetch, 1000)
    }
  }

  recheckThenFetch = () => {
    if (this.props.prefetchMetadata) {
      this.fetchMetadata()
    }
  }

  fetchMetadata = () => {
    if (this.state.fetching || this.state.torrents) {
      return
    }

    this.setState({ fetching: true })

    this.controller = new AbortController()
    window
      .fetch(`/api/movie/${this.props.id}`, { signal: this.controller.signal })
      .then(res => {
        if (res.status >= 299) {
          throw new Error(`Error fetching ${this.props.title}`)
        }

        return res.json()
      })
      .then(({ torrents, poster, rating }) =>
        this.setState({ torrents, poster, fetching: false, rating })
      )
      .catch(err => this.props.toast('error', err.message))
  }

  componentWillUnmount() {
    if (this.controller) {
      this.controller.abort()
    }
  }

  backupPoster = () => {
    const posterMatches = this.state.poster.match(posterRegex)
    this.setState({ poster: posterMatches ? posterMatches[1] : null })
  }

  render() {
    const { title, year, desiredQuality } = this.props
    const { torrents, poster, fetching, rating } = this.state
    const torrent = torrents
      ? torrents.filter(({ quality }) => quality <= desiredQuality)[0] || {}
      : {}
    const { link, size, quality } = torrent

    return (
      <div
        className="Movie"
        onClick={() => {
          if (!this.state.torrents) {
            this.fetchMetadata()
            return
          }

          console.log(link)
        }}
      >
        {poster ? (
          <img onError={this.backupPoster} src={poster} alt="poster" className="poster" />
        ) : (
          <div className="poster" />
        )}
        <div className="info">
          <h2 className="title">{title}</h2>
          <div className="metadata">
            {year + ' · '}
            {rating ? (
              <span>
                <Star />
                {`${rating} · `}
              </span>
            ) : null}
            {quality ? `${quality} · ${size.toFixed(1)} Gb` : null}
            {torrents ? (
              torrents.length === 0 ? (
                'No torrents'
              ) : null
            ) : fetching ? (
              <CircleNotch />
            ) : (
              <a onClick={this.fetchMetadata}>Fetch Info</a>
            )}
          </div>
        </div>
      </div>
    )
  }
}

export default Movie
