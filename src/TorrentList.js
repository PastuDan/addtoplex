import React, { Component } from 'react'
import './TorrentList.css'

const torrentFields = {
  hash: 'd.get_hash',
  torrent: 'd.get_tied_to_file',
  torrentsession: 'd.get_loaded_file',
  path: 'd.get_base_path',
  name: 'd.get_base_filename',
  size: 'd.get_size_bytes',
  skip: 'd.get_skip_total',
  completed: 'd.get_completed_bytes',
  down_rate: 'd.get_down_rate',
  down_total: 'd.get_down_total',
  up_rate: 'd.get_up_rate',
  up_total: 'd.get_up_total',
  message: 'd.get_message',
  bitfield: 'd.get_bitfield',
  chunk_size: 'd.get_chunk_size',
  chunk_completed: 'd.get_completed_chunks',
  createdAt: 'd.creation_date',
  active: 'd.is_active',
  open: 'd.is_open',
  complete: 'd.get_complete',
  hashing: 'd.is_hash_checking',
  hashed: 'd.is_hash_checked',
  message: 'd.get_message',
  leechers: 'd.get_peers_accounted',
  seeders: 'd.get_peers_complete',
  free_disk_space: 'd.free_diskspace'
}

const fields = ['hash', 'name', 'completed', 'size', 'down_rate']
const params = ['leeching'].concat(fields.map(field => torrentFields[field] + '='))

let updatePending = false
let consecutiveEmptyUpdates = 0

class App extends Component {
  state = {
    torrents: []
  }

  componentDidMount = () => {
    this.update()
  }

  update = () => {
    if (updatePending) {
      return
    }

    updatePending = true
    this.props.client.methodCall('d.multicall', params, (err, torrents) => {
      updatePending = false
      if (err) {
        this.props.toast('error', err.message)
        return
      }

      torrents = torrents
        .map(torrent => {
          const obj = {}
          fields.forEach((field, index) => (obj[field] = torrent[index]))
          return obj
        })
        .map(torrent => {
          torrent.name = torrent.name
            .split(/(?:1080|720|576|480)p/g)[0]
            .replace(/\./g, ' ')
            .trim()

          return torrent
        })

      // Results of the method response
      this.setState({ torrents })

      if (torrents.length === 0) {
        consecutiveEmptyUpdates++

        if (consecutiveEmptyUpdates > 10) {
          return
        }
      } else {
        consecutiveEmptyUpdates = 0
      }

      window.setTimeout(this.update, 1000)
    })
  }

  componentDidUpdate(prevProps) {
    if (prevProps.torrentListTrigger !== this.props.torrentListTrigger) {
      consecutiveEmptyUpdates = 0
      this.update()
    }
  }

  render() {
    const { torrents } = this.state
    return (
      <div className="TorrentList">
        {torrents.map(({ hash, name, size, completed, down_rate }) => (
          <div key={hash} className="torrent">
            <div className="progress" style={{ width: (completed / size) * 100 + '%' }} />
            <h2>{name}</h2>
            <div>{`${((completed / size) * 100).toFixed()}% · ${(
              (size - completed) /
              down_rate /
              60
            ).toFixed()} min left`}</div>
          </div>
        ))}
      </div>
    )
  }
}

export default App
