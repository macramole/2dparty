const express = require('express')
const app = express()
const http = require('http').createServer(app)
const sanitizeHtml = require('sanitize-html')

const speed = 25 //esto tiene que ser igual en cliente y servidor !!!

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

function startCall(to, callID, options = {} ) {
	if ( callID == null ) {
		callID = makeCallID()
	}
	io.sockets.sockets[to].join(callID)
	users[to].callID = callID
	
	options.callID = callID
	io.to(to).emit('start call', options)

	return callID
}

function endCall(to) {
    io.to(to).emit('end call')
	io.sockets.sockets[to].leave(users[to].callID)
	users[to].callID = null
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
          user.pos.x == cUser.pos.x + speed * dx &&
          user.pos.y == cUser.pos.y + speed * dy
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
    if (u.callID == cUser.callID) {
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
    if (cUser.callID) {
      // si estaba en una llamada y se fue
	  //(acá deliberadamente no llamo a endCall)
      checkLeftAlone(cUser.id)
	  endCall(cUser.id)
    }
  } else {
    //si hay alguien cerca
    if (cUser.callID == null) {
      //si hay gente cerca y no estas en una llamada
      //deberia mirar si los que estan cerca no están en una llamada
      let nearCall = null

      for (let otherUserID of nearUsers) {
        if (users[otherUserID].callID) {
          nearCall = users[otherUserID].callID
          break
        }
      }

      if (nearCall) {
        startCall(cUser.id, nearCall)
      } else {
        // Si el user había creado un room ya tenemos call id
        let newCallID = startCall(cUser.id, null)

        for (let otherUserID of nearUsers) {
          startCall(otherUserID, newCallID)
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
              name: users[userID].name ? users[userID].name.substr(0, 2) : 'pa',
          }
          socket.emit('position', pos)
      }
  }

  users[socket.id] = {
      id: socket.id,
      isAdminOfArea: false,
      pos: null,
      callID: null, //esto es el nombre del room en el que está también
  }
  let user = users[socket.id]

  // ROOMS
  socket.on('createArea', function () {
    //creo un call id para identificar el room. Se usará para futuras llamadas
    socket.broadcast.emit('newAdminOfArea', socket.id) //acá habria que pasar el texto ??
    if ( users[socket.id].callID ) {
		endCall( users[socket.id].callID )
    }

	let callID = startCall(socket.id, callID, { mic : false, video : false } )
    console.log('created room with id', callID)
  })

  socket.on('destroyArea', function () {
    //Destruyo el room sólo cuando se va el último user
    // Que pasa si un adminOfArea se va del room? (por ahora nada con el room)
	// TODO: acá habria que hacer que heche a todos
    socket.broadcast.emit('removeAdminOfArea', socket.id)
    var destroyRoom = true
    for (let userID in users) {
      if (userID !== socket.id) {
        if (users[userID].callID === socket.id) {
          destroyRoom = false
        }
      }
    }
    if (destroyRoom) {
      socket.leave(users[socket.id].callID)
      console.log('destroyed room', socket.id)
    }
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
    pos.name = user.name ? user.name.substr(0, 2) : 'x'
    socket.broadcast.emit('position', pos)

    checkNeedCall(socket.id)
  })

  socket.on('chat', (chatMessage) => {
    if (!chatMessage.message || chatMessage.message.trim() == '') return

    chatMessage = {
      nombre: chatMessage.nombre ? sanitizeHtml(chatMessage.nombre) : '???',
      message: chatMessage.message ? sanitizeHtml(chatMessage.message) : '???',
    }

    console.log(chatMessage)
    // Si estás en una llamada manda el msj al room de la llamada
    if (user.callID) {
      io.to(socket.rooms[user.callID]).emit('chat', chatMessage)
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
