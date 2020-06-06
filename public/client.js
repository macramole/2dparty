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
let $btnSerParlante = document.querySelector('#btnSerParlante')
let $serParlanteWrapper = document.querySelector('#serParlanteWrapper')
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
const gridSizeY = 34
//////

const roomPadding = { //porcentaje
    top: 0.065,
    // right : 0, definido por cantidad de tiles
    // bottom: 0.01, definido por cantidad de tiles
    left : 0.005
}

function moveAllPJsToCoords() {
  let $pjs = document.querySelectorAll('.pj')

  for (let i = 0; i < $pjs.length; i++) {
    let $pj = $pjs[i]
    $pj.style.left = parseInt($pj.dataset.x) * tileSize + (roomPadding.left * window.innerWidth) + 'px'
    $pj.style.top = parseInt($pj.dataset.y) * tileSize + (roomPadding.top * window.innerHeight) + 'px'
  }
}

function movePJtoCurrentCoords( $movePJ ) {
    $movePJ.style.left = parseInt($movePJ.dataset.x) * tileSize + (roomPadding.left * window.innerWidth) + 'px'
    $movePJ.style.top = parseInt($movePJ.dataset.y) * tileSize + (roomPadding.top * window.innerHeight) + 'px'
}

function updatePos(x, y) {
    $pj.dataset.x = x
    $pj.dataset.y = y

    movePJtoCurrentCoords($pj)
    sendPos()
}

function sendPos() {
  socket.emit('position', {
    x: parseInt($pj.dataset.x),
    y: parseInt($pj.dataset.y),
  })
}

function setSizes() {
  tileSize = window.innerWidth * 0.013 // si se cambia el multiplicador hay que cambiarlo del CSS

  let $pjs = document.querySelectorAll('.pj')
  for (let i = 0; i < $pjs.length; i++) {
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
  if (y > gridSizeY) {
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
    $pj.dataset.x = 0
    $pj.dataset.y = 0

    window.dispatchEvent(new Event('resize'))
    $txtNombre.focus()
})

window.addEventListener('resize', (ev) => {
  $room.style.height = window.innerHeight + 'px'
  setSizes()
  moveAllPJsToCoords()
})

window.addEventListener('keydown', (ev) => {
  if (!user.joinedWorld) return

  if (
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(ev.key) != -1 &&
    !user.isAdminOfArea
  ) {
    let x = parseInt($pj.dataset.x)
    let y = parseInt($pj.dataset.y)

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
      updatePos(x, y)
    }

    ev.preventDefault()
  }
})

// Para cerrar la config si clickeo afuera
window.addEventListener('click', function (e) {
  if (showingConfig) {
    document.querySelector('#serParlanteWindow').classList.add('hide')
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
  let n = document.querySelector('#txtNombre').value
  if (n == '') {
    n = '?'
  }
  $pj.innerHTML = n.substr(0, 1)
  user.nombre = n

  socket.emit('set name', user.nombre)

  $pj.style.top = (roomPadding.top * window.innerHeight) + 'px'
  $pj.style.left = (roomPadding.left * window.innerWidth) + 'px'

  $pj.style.visibility = 'visible'
  $login.style.display = 'none'
  $info.style.display = 'block'
  $btnSerParlante.classList.remove('hide')
  $chatWrite.focus()

  user.joinedWorld = true
})

// Oculto o muestro la config
$btnSerParlante.addEventListener('click', function (e) {
  let $serParlanteWindow = $serParlanteWrapper.querySelector(
    '#serParlanteWindow'
  )
  showingConfig
    ? $serParlanteWindow.classList.add('hide')
    : $serParlanteWindow.classList.remove('hide')

  showingConfig = !showingConfig
  e.stopPropagation()
})

//Para que no se cierre la ventana de click cuando clickeo en ella
$serParlanteWrapper
  .querySelector('#serParlanteWindow')
  .addEventListener('click', function (e) {
    e.stopPropagation()
  })

$serParlanteWrapper
  .querySelector('#btnIsAdminOfArea')
  .addEventListener('click', function (e) {
    user.isAdminOfArea = !user.isAdminOfArea
    if (user.isAdminOfArea) {
      var peopleNear = getPeopleNear()

      if (canCreateArea(peopleNear)) {
        $pj.classList.add('adminOfArea')
        createArea()
        $pj.dataset.id = socket.id
        user.areaDescription = document.querySelector(
          'textarea#areaDescription'
        ).value
        buildTooltip($pj, user.areaDescription)
        this.innerHTML = 'Dejar Área'
      } else {
        alert('No se puede crear el área acá.')
      }
    } else {
      //destroy room
      socket.emit('destroyArea')
      $pj.classList.remove('adminOfArea')

      this.innerHTML = 'Inaugurar área'
    }
  })

function buildTooltip(node, text) {
  var tooltip = document.createElement('div')
  tooltip.classList.add('tooltip')
  tooltip.classList.add('hide')
  tooltip.id = node.dataset.id

  tooltip.innerHTML = text //user.areaDescription
  tooltip.style.left = `${parseInt(node.style.left) + 40}px`
  tooltip.style.top = `${parseInt(node.style.top) - 20}px`
  node.before(tooltip)
  console.log(node.dataset)

  node.addEventListener('mouseover', function (e) {
    /*
    var tltp = document.querySelector(`#${tooltip.id}.tooltip`)
    if (tltp) {
      tltp.remove()
    }
    */
    tooltip.classList.remove('hide')
  })

  node.addEventListener('mouseleave', function (e) {
    //tooltip.remove()
    tooltip.classList.add('hide')
    //document.querySelector(`#${tooltip.id}.tooltip`).remove()
  })
}

function getPeopleNear() {
  var nodes = document.querySelectorAll('.pj')
  var near = []
  var mainPjPos = { x: parseInt($pj.dataset.x), y: parseInt($pj.dataset.y) }

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
  let allowCams = $serParlanteWrapper.querySelector('#allowCams').checked
  let allowMics = $serParlanteWrapper.querySelector('#allowMics').checked
  let areaDescription =
    $serParlanteWrapper.querySelector('#areaDescription').value || ''

  let opts = {
    allowCams: allowCams,
    allowMics: allowMics,
    areaDescription: areaDescription,
  }

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

  movePJtoCurrentCoords($friend)
})

socket.on('chat', (chatMessage) => {
  user.chat[user.atArea].push(chatMessage)
  $chatRead.innerHTML = buildChat(user.chat[user.atArea])
  $chatRead.scrollTop = $chatRead.scrollHeight
})

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

socket.on('start call', (callOptions) => {
  console.log('start call', callOptions.id)

  user.atArea = callOptions.id

  if (!user.chat[user.atArea]) {
    user.chat[user.atArea] = []
  }

  const options = {
    roomName: callOptions.id,
    width: window.innerWidth * 0.45,
    height: window.innerHeight * 0.54,
    parentNode: $meet,
    userInfo: {
      displayName: user.nombre,
    },
    configOverwrite : {
        enableWelcomePage: false
    },
    interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'desktop', 'fullscreen',
            'fodeviceselection', 'recording', 'livestreaming',
            'videoquality', 'filmstrip', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur',
        ],
        SETTINGS_SECTIONS: [ 'devices', 'language' ],
        RECENT_LIST_ENABLED : false,
        DISABLE_JOIN_LEAVE_NOTIFICATIONS : true,
        DISABLE_PRESENCE_STATUS : true,
    },
  }

  //Esto sucede sólo cuando se crea un area (sino no están esos parámetros)
  if ( callOptions.mic === false ) {
    options.configOverwrite = {
        enableWelcomePage: false,

        stereo: true,
        disableAP: true,
        disableAEC: true,
        disableNS: true,
        disableAGC: true,
        disableHPF: true,
        p2p : {
            enabled : false
        },

        startAudioMuted : 1,
    }

    if ( callOptions.owner != socket.id ) {
        let idxMic = options.interfaceConfigOverwrite.TOOLBAR_BUTTONS.indexOf("microphone")
        options.interfaceConfigOverwrite.TOOLBAR_BUTTONS.splice(idxMic, 1)

        // options.configOverwrite.startSilent = true
        options.configOverwrite.enableNoAudioDetection = false
        options.configOverwrite.enableNoisyMicDetection = false
    }
  }

  if ( callOptions.video === false ) {
    options.configOverwrite.startVideoMuted = 1

    if ( callOptions.owner != socket.id ) {
        let idxCam = options.interfaceConfigOverwrite.TOOLBAR_BUTTONS.indexOf("camera")
        options.interfaceConfigOverwrite.TOOLBAR_BUTTONS.splice(idxCam, 1)
    }
  }

  console.log(callOptions)
  console.log(options)

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
})

socket.on('removeAdminOfArea', (id) => {
  let $friend = document.querySelector(`.pj[data-id="${id}"]`)
  if ($friend) {
    $friend.classList.remove('adminOfArea')
  }
})
