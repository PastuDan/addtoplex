import React, { Component } from 'react'
import './Movie.css'

class Movie extends Component {
  state = {
    torrents: this.props.torrents,
    poster: this.props.poster
  }

  componentDidMount() {
    if (this.props.prefetchMetadata) {
      //setTimeout
      this.fetchMetadata()
    }
  }

  fetchMetadata() {
    window.fetch(`/api/movie/id${this.props.id}`)
  }

  render() {
    const { title, year, id, desiredQuality } = this.props
    const { torrents, poster } = this.state
    const torrent = torrents.filter(({ quality }) => quality <= desiredQuality)[0] || {}
    const { link, size, quality } = torrent

    return (
      <div key={id} className="Movie" onClick={() => console.log(link)}>
        {poster ? <img src={poster} alt="poster" className="poster" /> : <div className="poster" />}
        <div className="info">
          <h2 className="title">{title}</h2>
          <div className="metadata">
            {year} &middot;{' '}
            {torrents ? (
              size ? (
                `${quality} &middot; ${size.toFixed(1)} Gb`
              ) : (
                `No ${desiredQuality}p torrents`
              )
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
