var Rtorrent = require('node-rtorrent')

var rtorrent = new Rtorrent({
  mode: 'xmlrpc',
  host: 'yourserver',
  port: 80,
  path: '/RPC2',
  user: 'bob',
  pass: 'marley'
})

rtorrent.getAll(function(err, data) {
  if (err) return console.log('err: ', err)

  console.log(data)
  // data is : {torrents: [{hash: 'XXXXXX', name: 'ubuntu.iso', path: '/xxx', bitfield: ......... }, {...}], up_total: ...}
})

rtorrent.start('XXXXXXXX', function(err, data) {
  if (err) return console.log('err: ', err)

  console.log(data)
})
