let socket = io()

let $pj = document.querySelector('#pjPrincipal')
let $room = document.querySelector('#room')
let $chatRead = document.querySelector('#chatRead')
let $chatWrite = document.querySelector('#chatWrite input')
let $infoBeforeMeet = document.querySelector('#infoBeforeMeet')
let $login = document.querySelector('#login')
let $btnLogin = document.querySelector('#btnLogin')
let $txtNombre = document.querySelector('#txtNombre')
let $info = document.querySelector('#info')
let $btnConfig = document.querySelector('#showConfig')
let $userConfig = document.querySelector('#userConfig')
let $meet = document.querySelector('#meet')

let jitsiAPI = null
const jitsidomain = 'meet.jit.si'

const AREA_WORLD = 'world'

let user = {
  nombre: '',
  joinedWorld: false,
  joinedRoom: false,
  atArea: AREA_WORLD,
  isAdminOfArea: false,
  areaDescription: '',
  chat: {},
}
user.chat[AREA_WORLD] = []

let nombre
let started = false
let showingConfig = false

//esto hay que calcularlo en base a la resolución
let tileSize = 0
const gridSizeX = 40
const gridSizeY = 36
//////

let currentX = 0
let currentY = 0
const roomPaddingTop = 0 //absoluto
const roomPaddingBottom = 0 //absoluto
const roomPaddingRight = 0.55 //porcentaje

function moveAllPJsToCoords() {
    let $pjs = document.querySelectorAll('.pj')

    for ( let i = 0 ; i < $pjs.length ; i++ ) {
        let $pj = $pjs[i]
        $pj.style.left = (parseInt($pj.dataset.x) * tileSize) + 'px'
        $pj.style.top = (parseInt($pj.dataset.y) * tileSize) + 'px'
    }
}

function movePJtoCurrentCoords() {
    $pj.style.left = (currentX * tileSize) + 'px'
    $pj.style.top = (currentY * tileSize) + 'px'
}

function updatePos(x, y) {
    currentX = x
    currentY = y
    movePJtoCurrentCoords()
    sendPos()
}

function sendPos() {
  socket.emit('position', {
    x: currentX,
    y: currentY,
  })
}

function setSizes() {
    tileSize = window.innerWidth * 0.013 // si se cambia el multiplicador hay que cambiarlo del CSS

    let $pjs = document.querySelectorAll('.pj')
    for ( let i = 0 ; i < $pjs.length ; i++ ) {
        let $pj = $pjs[i]
        $pj.style.height = getComputedStyle($pj).width //cuadrado forever
    }
}

function isPositionEmpty(x, y) {
  if (x < 0 || y < 0) {
    return false
  }
  if (x > gridSizeX) {
    return false
  }
  if ( y > gridSizeY ) {
    return false
  }

  $pjs = document.querySelectorAll('.pj')

  for (let i = 0; i < $pjs.length; i++) {
    let $pj = $pjs[i]
    let pjX = $pj.dataset.x
    let pjY = $pj.dataset.y

    if (pjX == x && pjY == y) {
      return false
    }
  }

  return true
}

window.addEventListener('load', (ev) => {
  window.dispatchEvent(new Event('resize'));
  $txtNombre.focus()
})

window.addEventListener('resize', (ev) => {
  $room.style.height = window.innerHeight + 'px'
  setSizes()
  movePJtoCurrentCoords()
  moveAllPJsToCoords()
})

window.addEventListener('keydown', (ev) => {
  if (!user.joinedWorld) return

  if (
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(ev.key) != -1 &&
    !user.isAdminOfArea
  ) {
    let x = currentX
    let y = currentY

    switch (ev.key) {
      case 'ArrowUp':
        y -= 1
        break
      case 'ArrowDown':
        y += 1
        break
      case 'ArrowLeft':
        x -= 1
        break
      case 'ArrowRight':
        x += 1
        break
    }

    if (isPositionEmpty(x, y)) {
      updatePos(x,y)
    }

    ev.preventDefault()
  }
})

// Para cerrar la config si clickeo afuera
window.addEventListener('click', function (e) {
  if (showingConfig) {
    document.querySelector('#userConfigWindow').classList.add('hide')
    showingConfig = false
  }
})

$room.addEventListener('click', (ev) => {
  $chatWrite.focus()
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

$txtNombre.addEventListener('keydown', (ev) => {
  if (ev.keyCode == 13) {
    $btnLogin.click()
  }
})

$btnLogin.addEventListener('click', (ev) => {
  var n = document.querySelector('#txtNombre').value
  if (n == '') {
    n = '?'
  }
  $pj.innerHTML = n.substr(0, 1)
  user.nombre = n

  socket.emit('set name', user.nombre)
  $pj.style.visibility = 'visible'
  $pj.style.top = roomPaddingTop + 'px'
  $login.style.display = 'none'
  $info.style.display = 'block'
  $btnConfig.classList.remove('hide')
  $chatWrite.focus()

  user.joinedWorld = true
})

// Oculto o muestro la config
$userConfig
  .querySelector('#showConfig')
  .addEventListener('click', function (e) {
    var config = $userConfig.querySelector('#userConfigWindow')
    showingConfig
      ? config.classList.add('hide')
      : config.classList.remove('hide')

    showingConfig = !showingConfig
    e.stopPropagation()
  })

//Para que no se cierre la ventana de click cuando clickeo en ella
$userConfig
  .querySelector('#userConfigWindow')
  .addEventListener('click', function (e) {
    e.stopPropagation()
  })

$userConfig
  .querySelector('#isAdminOfArea')
  .addEventListener('change', function (e) {
    user.isAdminOfArea = this.checked
    if (user.isAdminOfArea) {
      var peopleNear = getPeopleNear()

      if (canCreateArea(peopleNear)) {
        $pj.classList.add('adminOfArea')
        createArea()
        $pj.dataset.id = socket.id
        buildTooltip($pj, user.areaDescription)
      } else {
        console.log('ya hay un admin en este área')
        e.target.checked = false
      }
    } else {
      //destroy room
      socket.emit('destroyArea')
      $pj.classList.remove('adminOfArea')
    }
  })

function buildTooltip(node, text) {
  var tooltip = document.createElement('div')
  tooltip.className = 'tooltip'
  tooltip.id = node.dataset.id

  console.log(node.dataset)

  node.addEventListener('mouseover', function (e) {
    var tltp = document.querySelector(`#${tooltip.id}.tooltip`)
    if (tltp) {
      tltp.remove()
    }
    tooltip.innerHTML = text //user.areaDescription
    tooltip.style.left = `${parseInt(node.style.left) + 40}px`
    tooltip.style.top = `${parseInt(node.style.top) - 20}px`
    node.before(tooltip)
  })

  node.addEventListener('mouseleave', function (e) {
    document.querySelector(`#${tooltip.id}.tooltip`).remove()
  })
}

function getPeopleNear() {
  var nodes = document.querySelectorAll('.pj')
  var near = []
  var mainPjPos = { x: currentX, y: currentY }

  for (let usr of Array.from(nodes)) {
    if (usr === $pj) continue
    let usrPos = { x: parseInt(usr.dataset.x), y: parseInt(usr.dataset.y) }

    dx = Math.abs(mainPjPos.x - usrPos.x)
    dy = Math.abs(mainPjPos.y - usrPos.y)

    if (dx <= 1 && dy <= 1) {
      near.push(usr)
    }
  }
  return near
}

function canCreateArea(nearbyUsrs) {
  for (usr of nearbyUsrs) {
    if (Array.from(usr.classList).indexOf('adminOfArea') !== -1) {
      return false
    }
  }
  return true
}

function createArea() {
  var allowCams = $userConfig.querySelector('#allowMics').checked
  var allowMics = $userConfig.querySelector('#allowCams').checked
  var areaDescription =
    $userConfig.querySelector('#areaDescription').value || '???'

  var opts = {
    allowCams,
    allowMics,
    areaDescription,
  }

  user.areaDescription = areaDescription

  console.log('opts', opts.allowMics, opts.allowCams)

  socket.emit('createArea', opts)
}

/////////////////////////////////////////

// WEBSOCKET

/////////////////////////////////////////

socket.on('position', (pos) => {
  let $friend = document.querySelector(`.pj[data-id="${pos.id}"]`)

  if (!$friend) {
    $friend = document.createElement('div')
    $friend.classList.add('pj')
    $friend.dataset.id = pos.id
    $friend.innerHTML = pos.name

    $room.appendChild($friend)
    $friend.style.height = getComputedStyle($friend).width
  }

  $friend.dataset.x = pos.x
  $friend.dataset.y = pos.y
  $friend.style.left = (pos.x * tileSize) + 'px'
  $friend.style.top = (pos.y * tileSize) + 'px'
})

socket.on('chat', (chatMessage) => {
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

socket.on('start call', (callOptions) => {
  console.log('start call', callOptions.callID)

  user.atArea = callOptions.callID

  if (!user.chat[user.atArea]) {
    user.chat[user.atArea] = []
  }

  const options = {
    roomName: callOptions.callID,
    width: window.innerWidth * 0.45,
    height: window.innerHeight * 0.54,
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
  user.atArea = AREA_WORLD
  if (jitsiAPI) jitsiAPI.dispose()
  $infoBeforeMeet.style.display = 'block'
})

socket.on('user disconnected', (id) => {
  let $friend = document.querySelector(`.pj[data-id="${id}"]`)
  if ($friend) {
    $friend.remove()
  }
})

socket.on('newAdminOfArea', (opts) => {
  let $friend = document.querySelector(`.pj[data-id="${opts.id}"]`)
  if ($friend) {
    $friend.classList.add('adminOfArea')
  }
  buildTooltip($friend, opts.areaDescription)
  //opts.areaDescription
})

socket.on('removeAdminOfArea', (id) => {
  let $friend = document.querySelector(`.pj[data-id="${id}"]`)
  if ($friend) {
    $friend.classList.remove('adminOfArea')
  }
})
