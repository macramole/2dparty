let socket = io()
let $pj = document.querySelector('#pjPrincipal')
let $everyPj = document.querySelectorAll('.pj') //on hover de cada user?
console.log($everyPj)
let $room = document.querySelector('#room')
let $chatRead = document.querySelector('#chatRead')
let $chatWrite = document.querySelector('#chatWrite input')
let $infoBeforeMeet = document.querySelector('#infoBeforeMeet')
let $login = document.querySelector('#login')
let $btnLogin = document.querySelector('#btnLogin')
let $txtNombre = document.querySelector('#txtNombre')
let $info = document.querySelector('#info')
let $userConfig = document.querySelector('#userConfig')

let user = {
  nombre: '',
  joinedUniverse: false,
  joinedRoom: false,
  atArea: 'lobby',
  isAdminOfArea: false,
  areaDescription: '',
  chat: {
    lobby: [],
  },
}

let nombre
let started = false

const speed = 20
const roomPaddingTop = 90
const roomPaddingBottom = 40

function sendPos() {
  let x = parseInt($pj.style.left)
  let y = parseInt($pj.style.top)

  socket.emit('position', {
    x: x,
    y: y,
  })
}

function isPositionEmpty(x, y) {
  if (x < 0 || y < roomPaddingTop) {
    return false
  }
  if (x > parseInt(getComputedStyle($room).width) - speed) {
    return false
  }
  if (
    y >
    parseInt(getComputedStyle($room).height) - roomPaddingBottom - speed
  ) {
    return false
  }

  $pjs = document.querySelectorAll('.pj')

  for (let i = 0; i < $pjs.length; i++) {
    let $pj = $pjs[i]
    let pjX = parseInt($pj.style.left)
    let pjY = parseInt($pj.style.top)

    if (pjX == x && pjY == y) {
      return false
    }
  }

  return true
}

window.addEventListener('load', (ev) => {
  $pj.style.left = '10px'
  $pj.style.top = '10px'

  $room.style.height = window.innerHeight + 'px'
  $txtNombre.focus()
})

window.addEventListener('keydown', (ev) => {
  if (!user.joinedUniverse) return

  if (
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(ev.key) != -1 &&
    !user.isAdminOfArea
  ) {
    let x = parseInt($pj.style.left)
    let y = parseInt($pj.style.top)

    switch (ev.key) {
      case 'ArrowUp':
        y -= speed
        break
      case 'ArrowDown':
        y += speed
        break
      case 'ArrowLeft':
        x -= speed
        break
      case 'ArrowRight':
        x += speed
        break
    }

    if (isPositionEmpty(x, y)) {
      $pj.style.left = `${x}px`
      $pj.style.top = `${y}px`
      sendPos()
    }

    ev.preventDefault()
  }
})

$chatWrite.addEventListener('keydown', (ev) => {
  if (ev.keyCode == 13) {
    socket.emit('chat', {
      nombre: user.nombre,
      message: $chatWrite.value,
    })

    $chatWrite.value = ''
  }
})

$chatWrite.addEventListener('focusout', (ev) => {
  if (!user.joinedUniverse) return
  /* Esto lo duermo para que no me jeda otros inputs, 
   * Está bueno que sea automático igual...
  setTimeout(() => $chatWrite.focus(), 100)
  */
})

$txtNombre.addEventListener('keydown', (ev) => {
  if (ev.keyCode == 13) {
    $btnLogin.click()
  }
})

$btnLogin.addEventListener('click', (ev) => {
  // let nombre = "Le"
  var n = document.querySelector('#txtNombre').value
  if (n == '') {
    n = 'x'
  }
  $pj.innerHTML = n.substr(0, 2)
  user.nombre = n

  socket.emit('set name', user.nombre)
  $pj.style.visibility = 'visible'
  $pj.style.top = roomPaddingTop + 'px'
  $login.style.display = 'none'
  $info.style.display = 'block'
  $chatWrite.focus()

  user.joinedUniverse = true
})

$userConfig
  .querySelector('#isAdminOfArea')
  .addEventListener('change', function (e) {
    user.isAdminOfArea = this.checked
    if (user.isAdminOfArea) {
      $pj.style.background = 'red'
    } else {
      $pj.style.background = 'white'
    }
  })

$userConfig
  .querySelector('#speakerText')
  .addEventListener('blur', function (e) {
    var text = e.target.value.trim()

    if (text.length === 0) {
      $user.querySelector('#speakerText').style.border = '1px solid black'
    } else if (user.areaDescription === '') {
      $user.querySelector('#speakerText').style.border = '2px solid red'
    }
    user.areaDescription = text
  })

$everyPj.forEach(function (node) {
  node.addEventListener('mouseover', function (e) {
    console.log('hover')
  })
})

/////////////////////////////////////////
let jitsiAPI = null
let $meet = document.querySelector('#meet')
const jitsidomain = 'meet.jit.si'

/////////////////////////////////////////

socket.on('position', (pos) => {
  let $friend = document.querySelector(`.pj[data-id="${pos.id}"]`)

  if (!$friend) {
    $friend = document.createElement('div')
    $friend.classList.add('pj')
    $friend.dataset.id = pos.id
    $friend.innerHTML = pos.name

    $room.appendChild($friend)
  }

  $friend.style.left = pos.x + 'px'
  $friend.style.top = pos.y + 'px'
})

socket.on('chat', (chatMessage) => {
  console.log('cath', chatMessage)

  user.chat[user.atArea].push(chatMessage)
  $chatRead.innerHTML = buildChat(user.chat[user.atArea])
  $chatRead.scrollTop = $chatRead.scrollHeight

  function buildChat(msgs) {
    var text = ''

    for (let msg of msgs) {
      text += `
      <div class="chatLine">
        <span class="nombre">
          &lt;${msg.nombre}&gt;
        </span> ${msg.message}
      </div>
      `
      console.log(msg)
    }
    return text
  }
})

socket.on('start call', (callID) => {
  console.log('start call', callID)

  user.atArea = callID

  const options = {
    roomName: callID,
    width: window.innerWidth * 0.3,
    height: window.innerHeight,
    parentNode: $meet,
    userInfo: {
      displayName: user.nombre,
    },
    interfaceConfigOverwrite: {
      // filmStripOnly: true,
      // DEFAULT_REMOTE_DISPLAY_NAME: nombre,
      // TOOLBAR_BUTTONS: ["camera", "chat", "tileview", "filmstrip"]
    },
  }

  $infoBeforeMeet.style.display = 'none'
  jitsiAPI = new JitsiMeetExternalAPI(jitsidomain, options)
  // jitsiAPI.executeCommand('toggleAudio');
})

socket.on('end call', () => {
  console.log('end call')

  user.atArea = null

  if (jitsiAPI) jitsiAPI.dispose()

  // $meet.querySelector("iframe").remove()
  $infoBeforeMeet.style.display = 'block'
})

socket.on('user disconnected', (id) => {
  let $friend = document.querySelector(`.pj[data-id="${id}"]`)
  if ($friend) {
    $friend.remove()
  }
})

