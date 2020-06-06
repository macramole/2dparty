const express = require('express')
const app = express()
const http = require('http').createServer(app)
const sanitizeHtml = require('sanitize-html')

app.use(express.static('public'))

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/views/index.html')
})

let port = process.env.PORT || 3000
http.listen(port, function () {
  console.log(`Example app listening on port ${port}!`)
})

//////////////////////////////
//////////////////////////////

let io = require('socket.io')(http)
let users = {}

function makeCallID() {
  let length = 20
  var result = ''
  var characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  var charactersLength = characters.length
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

function startCall(to, callInfo = null) {
  if (callInfo == null) {
      callInfo = {
          id : makeCallID(),
          mic : true,
          video : true
      }
  } else if ( callInfo.id == null ) {
      callInfo.id = makeCallID()

      if ( users[to].isAdminOfArea ) {
          callInfo.owner = to
      }
  }

  io.sockets.sockets[to].join(callInfo.id)
  users[to].callInfo = callInfo

  io.to(to).emit('start call', callInfo)

  return callInfo
}

function destroyRoom(roomName) {
    var clients = io.sockets.adapter.rooms[roomName].sockets;
    for ( let clientID in clients ) {
        endCall(clientID)
    }
}

function endCall(to) {
  io.to(to).emit('end call')
  io.sockets.sockets[to].leave(users[to].callInfo.id)
  users[to].callInfo = null
}

function getPeopleNear(userID) {
  let cUser = users[userID]
  let idsNear = []

  for (let otherUserID in users) {
    if (userID == otherUserID) continue

    let user = users[otherUserID]
    if (!user.pos) {
      continue
    }

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx == 0 && dy == 0) continue
        if (
          user.pos.x == cUser.pos.x + dx &&
          user.pos.y == cUser.pos.y + dy
        ) {
          idsNear.push(otherUserID)
        }
      }
    }
  }

  return idsNear
}

function checkLeftAlone(userID) {
  //si eran dos y el otro quedó solo deberia desconectarlo
  let cUser = users[userID]

  let oneFriend = null
  for (let uid in users) {
    let u = users[uid]
    if (u.id == userID) continue
    if (u.isAdminOfArea) break //si hay un admin ya fue no se rompe nunca, puede estar solo el admin
    if (u.callInfo && cUser.callInfo && u.callInfo.id == cUser.callInfo.id) {
      if (oneFriend == null) {
        oneFriend = u.id
      } else {
        oneFriend = null
        break
      }
    }
  }
  if (oneFriend) {
    endCall(oneFriend)
  }
}

//chequea si hay que iniciar o terminar una llamada
function checkNeedCall(userID) {
  let cUser = users[userID]
  if (!cUser.pos) {
    return
  }

  let nearUsers = getPeopleNear(userID)

  //si no hay nadie cerca
  if (nearUsers.length == 0) {
    if (cUser.callInfo) {
      // si estaba en una llamada y se fue
      checkLeftAlone(cUser.id)
      endCall(cUser.id)
    }
  } else {
    //si hay alguien cerca
    if (cUser.callInfo == null) {
      //si hay gente cerca y no estas en una llamada
      //deberia mirar si los que estan cerca no están en una llamada
      let nearCall = null

      for (let otherUserID of nearUsers) {
        if (users[otherUserID].callInfo) {
          nearCall = users[otherUserID].callInfo
          break
        }
      }

      if (nearCall) {
        startCall(cUser.id, nearCall)
      } else {
        // Si el user había creado un room ya tenemos call id
        let callInfo = startCall(cUser.id)

        for (let otherUserID of nearUsers) {
          startCall(otherUserID, callInfo)
        }
      }
    } else {
    }
  }
}

io.on('connection', function (socket) {
  console.log(`user connected: ${socket.id}`)

  for (let userID in users) {
    if (users[userID].pos) {
      let pos = {
        x: users[userID].pos.x,
        y: users[userID].pos.y,
        id: userID,
        name: users[userID].name ? users[userID].name.substr(0, 1) : '?',
      }
      socket.emit('position', pos)
    }

    if (users[userID].isAdminOfArea) {
      socket.emit('newAdminOfArea', {
        id: userID,
        areaDescription: users[userID].areaDescription,
      })
    }
  }

  users[socket.id] = {
    id: socket.id,
    isAdminOfArea: false,
    pos: null,
    callInfo: null, //esto es { id: <id>, mic: true/false, video: true/false }
  }
  let user = users[socket.id]

  // ROOMS
  socket.on('createArea', function (opts) {
    socket.broadcast.emit('newAdminOfArea', {
      id: socket.id,
      areaDescription: opts.areaDescription,
    }) //acá habria que pasar el texto. y si el user entra después de que el admin la creó??
    // guardo la descripción
    users[socket.id].areaDescription = opts.areaDescription
    users[socket.id].isAdminOfArea = true

    if (users[socket.id].callInfo) {
      endCall(users[socket.id].callInfo.id)
    }

    let callInfo = startCall(socket.id, {
      mic: opts.allowMics,
      video: opts.allowCams,
      owner: true
    })

    console.log('created room with id', callInfo.id)
  })

  socket.on('destroyArea', function () {
    socket.broadcast.emit('removeAdminOfArea', socket.id)
    users[socket.id].isAdminOfArea = false
    destroyRoom( users[socket.id].callInfo.id )
  })

  socket.on('set name', (name) => {
    user.name = name
  })

  // POSITION
  socket.on('position', (pos) => {
    if (!user.pos) {
      user.pos = {}
    }

    user.pos.x = pos.x
    user.pos.y = pos.y

    pos.id = socket.id
    pos.name = user.name ? user.name.substr(0, 1) : '?'
    socket.broadcast.emit('position', pos)

    checkNeedCall(socket.id)
  })

  socket.on('chat', (chatMessage) => {
    if (!chatMessage.message || chatMessage.message.trim() == '') return

    chatMessage = {
      nombre: chatMessage.nombre ? sanitizeHtml(chatMessage.nombre) : '???',
      message: chatMessage.message ? sanitizeHtml(chatMessage.message) : '???',
    }

    // console.log(chatMessage)
    // Si estás en una llamada manda el msj al room de la llamada
    if (user.callInfo) {
      io.to(socket.rooms[user.callInfo.id]).emit('chat', chatMessage)
    } else {
      // Esto se podría dejar de mandar a todx (podría haber un room default?)
      io.emit('chat', chatMessage)
    }
  })

  // DISCONNECT
  socket.on('disconnect', () => {
    console.log('user disconnected')
    checkLeftAlone(socket.id)

    socket.broadcast.emit('user disconnected', socket.id)
    delete users[socket.id]
    console.log(users)
  })
})
