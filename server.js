const express = require('express');
const app = express()
const http = require("http").createServer(app)

app.use(express.static("public"));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/views/index.html');
})

let port = process.env.PORT || 3000
http.listen(port, function () {
  console.log(`Example app listening on port ${port}!`)
})

//////////////////////////////
//////////////////////////////
  
let io = require("socket.io")(http)
let users = {}
const speed = 20

function makeCallID() {
  let length = 20;
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function getPeopleNear(userID) {
  let cUser = users[userID]
  let idsNear = []

  for ( let otherUserID in users ) {
    if ( userID == otherUserID ) continue;

    let user = users[otherUserID]
    if ( !user.pos ) {
      continue
    }

    for ( let dx = -1 ; dx <= 1; dx ++ ) {
      for ( let dy = -1 ; dy <= 1; dy ++ ) {
        if (dx==0 && dy==0) continue
        if ( user.pos.x == cUser.pos.x + speed * dx && 
             user.pos.y == cUser.pos.y + speed * dy ) {
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
  for ( let uid in users ) {
    let u = users[uid] 
    if ( u.id == userID ) continue
    if ( u.callID == cUser.callID ) {
      if ( oneFriend == null ) {
        oneFriend = u.id
      } else {
        oneFriend = null
        break;
      }
    }
  }
  if ( oneFriend ) {
    io.to(oneFriend).emit("end call")
    users[oneFriend].callID = null
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
  if ( nearUsers.length == 0 ) {
    if ( cUser.callID ) { // si estaba en una llamada y se fue
      io.to(cUser.id).emit("end call")
      // checkLeftAlone(userID)
      
      cUser.callID = null
    }
  } else { //si hay alguien cerca
    
    if ( cUser.callID == null ) { //si hay gente cerca y no estas en una llamada
      //deberia mirar si los que estan cerca no están en una llamada
      let nearCall = null
      
      for ( let otherUserID of nearUsers ) {
        if ( users[otherUserID].callID ) {
          nearCall = users[otherUserID].callID
          break
        }
      }
      
      if ( nearCall ) {
        cUser.callID = nearCall
        io.to(cUser.id).emit("start call", nearCall)
      } else {
        let newCallID = makeCallID()
        cUser.callID = newCallID
        io.to(cUser.id).emit("start call", newCallID)

        for ( let otherUserID of nearUsers ) {
          users[otherUserID].callID = newCallID
          io.to(otherUserID).emit("start call", newCallID)
        }
      } 
    } else {

    }
  }

}

io.on('connection', function (socket) {
  console.log(`user connected: ${socket.id}`)
  
  for ( let userID in users ) {
    if ( users[userID].pos ) {
      let pos = {
        x : users[userID].pos.x,
        y : users[userID].pos.y,
        id : userID,
        name : users[userID].name ? users[userID].name.substr(0,2) : "pa"
      }
      socket.emit("position", pos)
    }
  }
  
  users[socket.id] = {
    id : socket.id,
    pos : null,
    callID : null
  }
  let user = users[socket.id]

  socket.on("set name", (name) => {
    user.name = name
  })
  
  // POSITION
  socket.on("position", (pos) => {
    if ( !user.pos ) {
      user.pos = {}
    }

    user.pos.x = pos.x
    user.pos.y = pos.y
    
    pos.id = socket.id
    pos.name = user.name ? user.name.substr(0,2) : "x"
    socket.broadcast.emit("position", pos)

    checkNeedCall(socket.id)
  })

  // DISCONNECT
  socket.on('disconnect', () => {
    console.log('user disconnected');
    checkLeftAlone(socket.id)
    
    socket.broadcast.emit("user disconnected", socket.id)
    delete users[socket.id]
    console.log(users)
  });
})