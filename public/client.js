let socket = io()
let $pj = document.querySelector("#pjPrincipal")
let $room = document.querySelector("#room")
let $chatRead = document.querySelector("#chatRead")
let $chatWrite = document.querySelector("#chatWrite input")
let $infoBeforeMeet = document.querySelector("#infoBeforeMeet")
let $login = document.querySelector("#login")
let $btnLogin = document.querySelector("#btnLogin")
let $txtNombre = document.querySelector("#txtNombre")
let $info = document.querySelector("#info")
let nombre
let started = false

const speed = 20
const roomPaddingTop = 90
const roomPaddingBottom = 40

function sendPos() {
    let x = parseInt($pj.style.left)
    let y = parseInt($pj.style.top)

    socket.emit('position', {
        x : x,
        y : y
    })
}

function isPositionEmpty(x,y) {
    if ( x < 0 || y < roomPaddingTop ) {
        return false;
    }
    if ( x > parseInt(getComputedStyle($room).width) - speed ) {
        return false;
    }
    if ( y > parseInt(getComputedStyle($room).height) - roomPaddingBottom - speed ) {
        return false;
    }

    $pjs = document.querySelectorAll(".pj")

    for ( let i = 0 ; i < $pjs.length ; i++ ) {
        let $pj = $pjs[i]
        let pjX = parseInt($pj.style.left)
        let pjY = parseInt($pj.style.top)

        if ( pjX == x && pjY == y ) {
            return false
        }
    }

    return true;
}

window.addEventListener("load", (ev) => {
    $pj.style.left = "10px"
    $pj.style.top = "10px"

    $room.style.height = window.innerHeight + "px"
    $txtNombre.focus();
})

window.addEventListener("keydown", (ev) => {
    if (!started) return

    if ( ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(ev.key) != -1 ) {
        let x = parseInt($pj.style.left)
        let y = parseInt($pj.style.top)

        switch( ev.key ) {
            case "ArrowUp":
                y -= speed
                break
            case "ArrowDown":
                y += speed
                break
            case "ArrowLeft":
                x -= speed
                break
            case "ArrowRight":
                x += speed
                break
        }

        if (isPositionEmpty(x,y)) {
            $pj.style.left = `${x}px`
            $pj.style.top = `${y}px`
            sendPos()
        }

        ev.preventDefault()
    }
})



$chatWrite.addEventListener("keydown", ev => {
    if (ev.keyCode == 13) {
        
        socket.emit('chat', {
            nombre : nombre,
            message : $chatWrite.value
        })

        $chatWrite.value = ""
    }
})

$chatWrite.addEventListener("focusout", ev => {
    if ( !started ) return
    setTimeout( () => $chatWrite.focus(), 100)
})

$txtNombre.addEventListener("keydown", ev => {
    if ( ev.keyCode == 13 ) {
        $btnLogin.click()
    }
})

$btnLogin.addEventListener("click", ev => {
    // let nombre = "Le"
    nombre = document.querySelector("#txtNombre").value
    if ( nombre == "" ) {
        nombre = "x"
    }
    $pj.innerHTML = nombre.substr(0,2)
    
    socket.emit('set name', nombre)
    $pj.style.visibility = "visible"
    $pj.style.top = roomPaddingTop + "px"
    $login.style.display = "none"
    $info.style.display = "block"
    $chatWrite.focus()

    started = true
})

/////////////////////////////////////////
let jitsiAPI = null
let $meet = document.querySelector('#meet')
const jitsidomain = 'meet.jit.si';

/////////////////////////////////////////

socket.on("position", (pos) => {
    let $friend = document.querySelector(`.pj[data-id="${pos.id}"]`)

    if ( !$friend ) {
        $friend = document.createElement("div")
        $friend.classList.add("pj")
        $friend.dataset.id = pos.id
        $friend.innerHTML = pos.name

        $room.appendChild($friend)
    }

    $friend.style.left = pos.x + "px"
    $friend.style.top = pos.y + "px"
})

socket.on("chat", (chatMessage) => {
    console.log( "cath", chatMessage)
    let msg = `<div class="chatLine"><span class="nombre">&lt;${chatMessage.nombre}&gt;</span> ${chatMessage.message}</div>`
    $chatRead.innerHTML += msg
    $chatRead.scrollTop = $chatRead.scrollHeight;
})

socket.on("start call", (callID) => {
    console.log("start call", callID)

    const options = {
        roomName: callID,
        width: window.innerWidth * 0.3,
        height: window.innerHeight,
        parentNode: $meet,
        userInfo : {
            displayName : nombre
        },
        interfaceConfigOverwrite : {
            // filmStripOnly: true,
            // DEFAULT_REMOTE_DISPLAY_NAME: nombre,
            // TOOLBAR_BUTTONS: ["camera", "chat", "tileview", "filmstrip"]
        }
    };
    
    $infoBeforeMeet.style.display = "none"
    jitsiAPI = new JitsiMeetExternalAPI(jitsidomain, options);
    // jitsiAPI.executeCommand('toggleAudio');
})

socket.on("end call", () => {
    console.log("end call")
    if ( jitsiAPI ) jitsiAPI.dispose()
    
    // $meet.querySelector("iframe").remove()
    $infoBeforeMeet.style.display = "block"

})

socket.on("user disconnected", (id) => {
    let $friend = document.querySelector(`.pj[data-id="${id}"]`)
    if ( $friend ) {
        $friend.remove()
    }
})