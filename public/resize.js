// ResizeX

const sidebar = () => { return document.getElementById("sidebar"); }
const header = () => { return document.getElementById("header"); }

const barraX = () => { return document.getElementById("barraX"); }
const barraY = () => { return document.getElementById("barraY"); }

const meet = () => { return document.getElementById("meet"); }
const chat = () => { return document.getElementById("chat"); }

let mouseDirection = 0;

const setWidth = (width) => {
  sidebar().style.setProperty('width', `${width}px`);
  header().style.setProperty('width', `calc(100vw - ${width}px)`)
};

const getSidebarWidth = () => {
    const pxWidth = getComputedStyle(sidebar()).getPropertyValue('width');
    return parseInt(pxWidth, 10);
};

const startDraggingX = (event) => {
  event.preventDefault();
  const xOffset = event.pageX;
  const sidebarWidth = getSidebarWidth()
  const mouseDragHandlerX = (moveEvent) => {
    moveEvent.preventDefault();
    const primaryButtonPressed = moveEvent.buttons === 1;
    if (!primaryButtonPressed) {
      document.body.removeEventListener('pointermove', mouseDragHandlerX);
      return;
    }
    setWidth((xOffset - moveEvent.pageX ) + sidebarWidth);
  };
  const remove = document.body.addEventListener('pointermove', mouseDragHandlerX);
};

const setearAltos = (offset, mouseY, meetHeight) => {
    const height = offset + mouseY;
    const meetNewHeight = height - meetHeight;
    meet().style.setProperty('height', `${meetNewHeight}px`)
    chat().style.setProperty('height', `calc(100vh - ${meetNewHeight}px)`)
};

const getMeetHeight = () => {
    const pxHeight = getComputedStyle(meet()).getPropertyValue('height');

    return parseInt(pxHeight, 10);
};

const startDraggingY = (event) => {
    event.preventDefault();
    const yOffset = event.pageY;
    const meetHeight = getMeetHeight()
    const mouseDragHandlerY = (moveEvent) => {
        moveEvent.preventDefault();
        const primaryButtonPressed = moveEvent.buttons === 1;
        if (!primaryButtonPressed) {
            document.body.removeEventListener('pointermove', mouseDragHandlerY);
            return;
        }
        setearAltos(yOffset, moveEvent.pageY, meetHeight);
        mouseDirection = event.pageY;
    };
    const remove = document.body.addEventListener('pointermove', mouseDragHandlerY);
};

barraX().addEventListener('mousedown', startDraggingX);
barraY().addEventListener('mousedown', startDraggingY);
